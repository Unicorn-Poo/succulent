import 'dotenv/config';

import { startWorker } from 'jazz-nodejs';
import { ID, ImageDefinition } from 'jazz-tools';

import {
  Brand,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from './sharedDataModel';
import { actuallyPost } from './actuallyPost';
import { handleImageRequest } from './handleImageRequest';
import { handleFBConnectRequest } from './handleFBConnectRequest';
import { SchedulerAccount, SchedulerAccountRoot } from './workerAccount';
import { handlePostUpdate } from './handlePostUpdate';
import { loadImageFile } from './loadImageFile';
import { handleStateRequest } from './handleStateRequest';

export type ActuallyScheduled = Map<
  Post['id'],
  | { state: 'posting' }
  | {
      state: 'imagesNotLoaded';
      content: string;
      imageFileIds: ID<ImageDefinition>[];
      scheduledAt: Date;
      post: Post<InstagramScheduleDesired | InstagramScheduled>;
    }
  | {
      state: 'loadingImages';
      content: string;
      imageFileIds: ID<ImageDefinition>[];
      scheduledAt: Date;
      brandId: ID<Brand>;
    }
  | {
      state: 'loadingImagesFailed';
    }
  | {
      state: 'ready';
      content: string;
      imageFileIds: ID<ImageDefinition>[];
      scheduledAt: Date;
      brandId: ID<Brand>;
    }
>;

async function runner() {
  const { worker } = await startWorker({
    AccountSchema: SchedulerAccount,
    syncServer: 'wss://mesh.jazz.tools/?key=succulent-backend@gcmp.io',
  });

  const actuallyScheduled: ActuallyScheduled = new Map();
  const loadedImages = new Map<
    ImageDefinition['id'],
    { mimeType?: string; chunks: Uint8Array[] }
  >();

  console.log(new Date(), 'root after migration', worker.root);

  let lastWorkerUpdateAt: Date | undefined;
  let lastWorkerUpdate: SchedulerAccountRoot | null;
  let accountStateChanged = false;

  worker.subscribe({}, (workerUpdate) => {
    lastWorkerUpdateAt = new Date();
    lastWorkerUpdate = workerUpdate?.root;
    accountStateChanged = true;

    if (workerUpdate?.root?.brands) {
      const seenPosts = [];

      for (let brand of workerUpdate.root?.brands) {
        for (let post of brand?.posts || []) {
          if (post) {
            seenPosts.push(post.id);
            handlePostUpdate(
              actuallyScheduled,
              loadedImages,
              workerUpdate
            )(post);
          }
        }
      }

      for (let postId of actuallyScheduled.keys()) {
        if (!seenPosts.includes(postId)) {
          console.log(
            `No longer seeing ${postId}, removing from actuallyScheduled`
          );
          actuallyScheduled.delete(postId);
        }
      }
    }
  });

  Bun.serve({
    async fetch(req) {
      if (req.url.includes('/connectFB')) {
        return handleFBConnectRequest(req, worker);
      } else if (req.url.includes('/image/')) {
        return handleImageRequest(req, loadedImages);
      } else if (req.url.includes('/state')) {
        return handleStateRequest(
          req,
          worker,
          actuallyScheduled,
          lastWorkerUpdate
        );
      } else {
        return new Response('not found', { status: 404 });
      }
    },
    port: 3331,
  });

  const tryReclaimingOldScheduledPosts = async () => {
    if (Date.now() - lastWorkerUpdateAt!.getTime() < 10_000) {
      console.log(
        new Date(),
        'skipping reclaiming old scheduled, last worker update less than 10s ago'
      );
      return;
    }
    for (let brand of lastWorkerUpdate?.brands || []) {
      for (let post of brand?.posts || []) {
        if (post) {
          if (post.instagram.state === 'scheduled') {
            const actuallyScheduledPost = actuallyScheduled.get(post.id);
            if (actuallyScheduledPost?.state === 'loadingImagesFailed') {
              // this should never happen
              continue;
            }
            if (actuallyScheduledPost?.state === 'posting') continue;
            if (
              !actuallyScheduledPost ||
              post.content !== actuallyScheduledPost.content ||
              post.images?.map((image) => image?.imageFile?.id).join() !==
                actuallyScheduledPost.imageFileIds.join() ||
              post.instagram.scheduledAt !==
                actuallyScheduledPost.scheduledAt.toISOString()
            ) {
              console.log(
                new Date(),
                'Got previously scheduled post, or scheduled post that changed, resetting to scheduleDesired',
                post.id
              );
              actuallyScheduled.delete(post.id);
              post.instagram = {
                state: 'scheduleDesired',
                scheduledAt: post.instagram.scheduledAt,
              };
            }
          }
        }
      }
    }
  };

  setInterval(tryReclaimingOldScheduledPosts, 10_000);

  const tryLoadingImages = async () => {
    if (Date.now() - lastWorkerUpdateAt!.getTime() < 10_000) {
      return;
    }

    for (let [postId, state] of actuallyScheduled.entries()) {
      if (state.state === 'imagesNotLoaded') {
        console.log(new Date(), 'loading images for', postId);
        actuallyScheduled.set(postId, {
          ...state,
          state: 'loadingImages',
          brandId: state.post._refs.inBrand.id,
        });

        const streams = await Promise.all(
          state.imageFileIds.map(async (imageId) => {
            const loadedImage = await loadImageFile(imageId, {
              as: worker,
            });
            return (
              loadedImage && {
                id: imageId,
                ...loadedImage,
              }
            );
          })
        );

        if (
          streams &&
          streams.length > 0 &&
          streams.every((stream) => stream)
        ) {
          for (let stream of streams) {
            loadedImages.set(stream!.id, {
              mimeType: stream!.mimeType,
              chunks: stream!.chunks!,
            });
          }
          console.log(new Date(), 'images loaded', postId);
          actuallyScheduled.set(postId, {
            ...state,
            state: 'ready',
            brandId: state.post._refs.inBrand.id,
          });
          if (state.post.instagram.state === 'scheduleDesired') {
            state.post.instagram = {
              state: 'scheduled',
              scheduledAt: state.post.instagram.scheduledAt,
            };
          }
        } else {
          console.error(new Date(), 'Loading images failed', postId, streams);
          actuallyScheduled.set(postId, { state: 'loadingImagesFailed' });
          state.post.instagram = {
            state: 'scheduleDesired',
            scheduledAt: state.post.instagram.scheduledAt,
            notScheduledReason:
              'One or several images unavailable as of ' +
              new Date().toISOString(),
          };
        }
      }
    }
  };

  setInterval(tryLoadingImages, 10_000);

  const tryPosting = async () => {
    if (Date.now() - lastWorkerUpdateAt!.getTime() < 10_000) {
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(new Date(), 'not actually posting in dev mode');
    }

    if (!process.env.ARMED_BRANDS) {
      console.log(new Date(), 'no armed brands, not actually posting');
    }

    for (let [postId, state] of actuallyScheduled.entries()) {
      if (state.state === 'ready' && state.scheduledAt < new Date()) {
        console.log(new Date(), 'posting', postId);
        actuallyScheduled.set(postId, { state: 'posting' });
        await actuallyPost(
          worker,
          postId,
          actuallyScheduled,
          state,
          process.env.NODE_ENV === 'production' &&
            process.env.ARMED_BRANDS?.includes(state.brandId)
            ? fetch
            : async (...params) => {
                const url = params[0] as URL;
                const opts = params[1];
                console.log(
                  new Date(),
                  'simulating fetch',
                  opts?.method,
                  url.host,
                  url.pathname,
                  Object.fromEntries(url.searchParams.entries())
                );
                if (
                  url.toString().includes('/media?') &&
                  opts?.method === 'POST'
                ) {
                  return new Response(
                    JSON.stringify({
                      id: 'simulatedId_' + Math.random().toString(36).slice(2),
                    }),
                    { status: 200 }
                  );
                }
                return new Response('simulated response', { status: 500 });
              }
        );
      }
    }
  };

  setInterval(tryPosting, 10_000);
}

runner();
