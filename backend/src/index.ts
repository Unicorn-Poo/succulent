import {
  LocalNode,
  ControlledAccount,
  CoMap,
  CoStream,
  Account,
  Profile,
  CoID,
  Media,
  BinaryStreamInfo,
} from 'cojson';
import 'dotenv/config';

import { createOrResumeWorker, autoSub } from 'jazz-nodejs';

import { Brand, Image, Post } from '../sharedDataModel';

type WorkerAccountRoot = CoMap<{
  scheduledPosts: ScheduledPosts['id'];
}>;

type ScheduledPosts = CoStream<Post['id']>;

async function runner() {
  const { localNode: node, worker } = await createOrResumeWorker({
    workerName: 'SucculentScheduler',
    migration: async (account, profile) => {
      console.log(new Date(), account.toJSON());
      if (!account.get('root')) {
        const scheduledPostsGroup = account.createGroup();
        scheduledPostsGroup.addMember('everyone', 'writer');

        const scheduledPosts =
          scheduledPostsGroup.createStream<ScheduledPosts>();

        console.log(
          new Date(),
          'scheduledPosts in migration',
          scheduledPosts.id
        );

        const after = account.set(
          'root',
          account.createMap<WorkerAccountRoot>({
            scheduledPosts: scheduledPosts.id,
          }).id
        );

        console.log(new Date(), after.toJSON());
      }
    },
  });

  const actuallyScheduled = new Map<
    Post['id'],
    | { state: 'posting' }
    | {
        state: 'ready';
        content: string;
        imageFileIds: CoID<Media.ImageDefinition>[];
        scheduledAt: Date;
      }
  >();
  const loadedImages = new Map<
    Media.ImageDefinition['id'],
    { mimeType?: string; chunks: Uint8Array[] }
  >();

  console.log(
    new Date(),
    'root after migration',
    (node.account as ControlledAccount<Profile, WorkerAccountRoot>).get('root')
  );

  const postErrorTimeouts = new Map<Post['id'], NodeJS.Timeout>();

  autoSub(
    node.account.id as CoID<Account<Profile, WorkerAccountRoot>>,
    node,
    async (account) => {
      if (account?.root?.scheduledPosts) {
        console.log(
          new Date(),
          'scheduledPosts',
          account.root.scheduledPosts.id,

          '\n\t' +
            account.root.scheduledPosts.perSession
              .flatMap((entry) =>
                entry[1].all.map((post) =>
                  JSON.stringify({
                    id: post.value?.id,
                    state: post.value?.instagram?.state,
                    scheduledAt:
                      post.value &&
                      'scheduledAt' in post.value.instagram &&
                      post.value?.instagram?.scheduledAt,
                    content: post.value?.content?.slice(0, 50),
                    imageFileIds: post.value?.images?.map(
                      (image) => image?.imageFile?.id
                    ),
                  })
                )
              )
              .join('\n\t')
        );

        for (let perSession of account.root.scheduledPosts.perSession) {
          for (let post of perSession[1].all) {
            if (!post?.value?.instagram?.state || !post.value.id) continue;
            if (actuallyScheduled.get(post.value.id)?.state === 'posting') {
              console.log(
                new Date(),
                'ignoring update to currently posting post',
                post.value.id
              );
              continue;
            }

            if (post.value.instagram.state === 'scheduled') {
              const actuallyScheduledPost = actuallyScheduled.get(
                post.value.id
              );
              if (
                actuallyScheduledPost?.state !== 'ready' ||
                post.value.content !== actuallyScheduledPost.content ||
                post.value.images
                  ?.map((image) => image?.imageFile?.id)
                  .join() !== actuallyScheduledPost.imageFileIds.join() ||
                post.value.instagram.scheduledAt !==
                  actuallyScheduledPost.scheduledAt.toISOString()
              ) {
                console.log(
                  new Date(),
                  'Got previously scheduled post, or scheduled post that changed, resetting to scheduleDesired',
                  post.value.id
                );
                actuallyScheduled.delete(post.value.id);
                post.value.set('instagram', {
                  state: 'scheduleDesired',
                  scheduledAt: post.value.instagram.scheduledAt,
                });
              }
            } else if (post.value.instagram.state === 'scheduleDesired') {
              console.log(
                new Date(),
                'Update, deleting from actually scheduled',
                post.value.id
              );
              actuallyScheduled.delete(post.value.id);
              console.log(new Date(), 'loading images', post.value.id);
              const streams =
                post.value.images &&
                (await Promise.all(
                  post.value.images.map(
                    async (image) =>
                      image?.imageFile?.id && {
                        id: image.imageFile.id,
                        ...(await loadImageFile(node, image.imageFile.id)),
                      }
                  )
                ));

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
                console.log(
                  new Date(),
                  'images loaded, adding to actually scheduled',
                  post.value.id
                );
                actuallyScheduled.set(post.value.id, {
                  state: 'ready',
                  content: post.value.content || '',
                  imageFileIds: post.value.images!.map(
                    (image) => image!.imageFile!.id
                  ),
                  scheduledAt: new Date(post.value.instagram.scheduledAt),
                });
                if (post.value.instagram.state === 'scheduleDesired') {
                  post.value.set('instagram', {
                    state: 'scheduled',
                    scheduledAt: post.value.instagram.scheduledAt,
                  });
                }
              } else {
                console.log(
                  new Date(),
                  'One or several images unavailable',
                  post.value.id,
                  streams
                );
                const erroredPost = post.value;
                if (postErrorTimeouts.get(erroredPost.id)) {
                  clearTimeout(postErrorTimeouts.get(erroredPost.id)!);
                }
                postErrorTimeouts.set(
                  erroredPost.id,
                  setTimeout(() => {
                    if (
                      erroredPost.instagram.state === 'notScheduled' ||
                      erroredPost.instagram.state === 'posted'
                    )
                      return;
                    erroredPost.set('instagram', {
                      state: 'scheduleDesired',
                      scheduledAt: erroredPost.instagram.scheduledAt,
                      notScheduledReason:
                        'One or several images unavailable as of ' +
                        new Date().toISOString(),
                    });
                  }, 1_000)
                );
              }
            }
          }
        }
      }
    }
  );

  Bun.serve({
    async fetch(req) {
      if (req.url.includes('/connectFB')) {
        const code = new URL(req.url).searchParams.get('code');

        if (!code) return new Response('no code');

        const shortLivedResult = await (
          await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${
              process.env.FB_CLIENT_ID
            }&redirect_uri=${encodeURIComponent(
              (process.env.SUCCULENT_BACKEND_ADDR || 'http://localhost:3331') +
                '/connectFB'
            )}&client_secret=${process.env.FB_CLIENT_SECRET}&code=${code}`
          )
        ).json();

        console.log(new Date(), 'shortLivedResult', shortLivedResult);

        const longLivedResult = await (
          await fetch(
            `https://graph.facebook.com/v2.3/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FB_CLIENT_ID}&client_secret=${process.env.FB_CLIENT_SECRET}&fb_exchange_token=${shortLivedResult.access_token}`
          )
        ).json();

        console.log(new Date(), 'longLivedResult', longLivedResult);

        const brandId = new URL(req.url).searchParams.get('state');

        if (!brandId) return new Response('no brandId');

        const brand = await node.load(brandId as CoID<Brand>);

        if (brand === 'unavailable') return new Response('unavailable');

        brand.set('instagramAccessToken', longLivedResult.access_token);
        brand.set(
          'instagramAccessTokenValidUntil',
          Date.now() + longLivedResult.expires_in * 1000
        );

        console.log(new Date(), brand.toJSON());

        // redirect to frontend
        return Response.redirect(
          process.env.SUCCULENT_FRONTEND_ADDR || 'http://localhost:3889/'
        );
      } else if (req.url.includes('/image/')) {
        console.log(new Date(), req.url);
        const imageFileId = req.url.split('/image/')[1];
        console.log(new Date(), imageFileId);

        const streamInfo = loadedImages.get(
          imageFileId as CoID<Media.ImageDefinition>
        );

        if (!streamInfo) return new Response('not found', { status: 404 });

        return new Response(new Blob(streamInfo.chunks), {
          headers: {
            'Content-Type': streamInfo.mimeType || 'application/octet-stream',
          },
        });
      } else {
        return new Response('not found', { status: 404 });
      }
    },
    port: 3331,
  });

  let tryN = 0;

  const tryPosting = async () => {
    if (tryN % 10 === 0) {
      console.log(new Date(), 'actuallyScheduled', actuallyScheduled);
    }
    tryN++;

    if (process.env.NODE_ENV === 'development') {
      console.log(new Date(), 'not actually scheduling in dev mode');
      return;
    }

    for (let [postId, state] of actuallyScheduled.entries()) {
      if (state.state === 'ready' && state.scheduledAt < new Date()) {
        console.log(new Date(), 'posting', postId);
        actuallyScheduled.set(postId, { state: 'posting' });

        try {
          const post = await node.load(postId);
          if (post === 'unavailable') throw new Error('post unavailable');

          try {
            if (!post.get('inBrand')) throw new Error('no brand');

            const brand = await node.load(post.get('inBrand')!);
            if (brand === 'unavailable') throw new Error('brand unavailable');

            const imagesListId = post.get('images');
            if (!imagesListId) throw new Error('no images');
            const imagesList = await node.load(imagesListId);

            if (imagesList === 'unavailable')
              throw new Error('images unavailable');
            const maybeImages = await Promise.all(
              imagesList.asArray().map((imageId) => node.load(imageId))
            );

            if (maybeImages.some((image) => image === 'unavailable'))
              throw new Error('image unavailable');

            const images = maybeImages as Image[];

            if (images.length === 0) {
              throw new Error('no images');
            }

            let topContainerId;

            if (images.length === 1) {
              const url = `https://graph.facebook.com/v18.0/${brand.get(
                'instagramPage'
              )?.id}/media?caption=${encodeURIComponent(
                post.get('content') || ''
              )}&image_url=${encodeURIComponent(
                (process.env.SUCCULENT_BACKEND_ADDR ||
                  'http://localhost:3331') +
                  '/image/' +
                  images[0].get('imageFile')
              )}&access_token=${brand.get('instagramAccessToken')}`;
              console.log(new Date(), 'POST', url);
              const res = await fetch(url, {
                method: 'POST',
              });
              if (res.status !== 200)
                throw new Error(
                  'FB API error ' + res.status + ': ' + (await res.text())
                );
              topContainerId = ((await res.json()) as { id: string }).id;
            } else {
              const containerIds = await Promise.all(
                images.map(async (image) => {
                  const existingContainerId = image.get('instagramContainerId');
                  // if (existingContainerId) {
                  //     return existingContainerId;
                  // } else {
                  const url = `https://graph.facebook.com/v18.0/${brand.get(
                    'instagramPage'
                  )?.id}/media?image_url=${encodeURIComponent(
                    (process.env.SUCCULENT_BACKEND_ADDR ||
                      'http://localhost:3331') +
                      '/image/' +
                      image.get('imageFile')
                  )}&access_token=${brand.get('instagramAccessToken')}`;

                  console.log(new Date(), 'POST', url);

                  const res = await fetch(url, {
                    method: 'POST',
                  });
                  if (res.status !== 200)
                    throw new Error(
                      'FB API error ' + res.status + ': ' + (await res.text())
                    );
                  const containerId = ((await res.json()) as { id: string }).id;

                  image.set('instagramContainerId', containerId);

                  return containerId;
                  // }
                })
              );

              const url = `https://graph.facebook.com/v18.0/${brand.get(
                'instagramPage'
              )?.id}/media?caption=${encodeURIComponent(
                post.get('content') || ''
              )}&media_type=CAROUSEL&children=${containerIds.join(
                '%2C'
              )}&access_token=${brand.get('instagramAccessToken')}`;
              console.log(new Date(), 'POST', url);
              const res = await fetch(url, {
                method: 'POST',
              });
              if (res.status !== 200)
                throw new Error(
                  'FB API error ' + res.status + ': ' + (await res.text())
                );
              topContainerId = ((await res.json()) as { id: string }).id;
            }

            if (!topContainerId) throw new Error('no container id');

            const url = `https://graph.facebook.com/v18.0/${brand.get(
              'instagramPage'
            )
              ?.id}/media_publish?creation_id=${topContainerId}&access_token=${brand.get(
              'instagramAccessToken'
            )}`;
            console.log(new Date(), 'POST', url);
            const res = await fetch(url, {
              method: 'POST',
            });
            if (res.status !== 200)
              throw new Error(
                'FB API error ' + res.status + ': ' + (await res.text())
              );
            const postMediaId = ((await res.json()) as { id: string }).id;

            if (!postMediaId) throw new Error('no post media id');

            const permalinkReqUrl = `https://graph.facebook.com/v18.0/${postMediaId}?fields=permalink&access_token=${brand.get(
              'instagramAccessToken'
            )}`;
            console.log(new Date(), 'GET', permalinkReqUrl);
            const permalinkRes = await fetch(permalinkReqUrl);
            permalinkRes.status !== 200 &&
              console.error(
                new Date(),
                'error getting permalink',
                permalinkRes.status,
                await permalinkRes.text()
              );

            const postPermalink = (
              (await permalinkRes.json()) as {
                permalink: string;
              }
            ).permalink;

            post.set('instagram', {
              state: 'posted',
              postedAt: new Date().toISOString(),
              postId: postMediaId,
              permalink: postPermalink,
            });

            actuallyScheduled.delete(postId);
          } catch (e) {
            console.error(
              new Date(),
              'Error posting after post load',
              postId,
              e
            );
            post.set('instagram', {
              state: 'scheduleDesired',
              scheduledAt: state.scheduledAt.toISOString(),
              notScheduledReason: e + '',
            });
          }
        } catch (e) {
          console.error(
            new Date(),
            'Error posting - no post info at all',
            postId,
            e
          );
          actuallyScheduled.delete(postId);
        }
      }
    }

    setTimeout(tryPosting, 10_000);
  };
  setTimeout(tryPosting, 10_000);
}

async function loadImageFile(
  node: LocalNode,
  imageFileId: CoID<Media.ImageDefinition>
) {
  const image = await node.load(imageFileId);
  if (image === 'unavailable') {
    console.error(new Date(), 'image unavailable');
    return undefined;
  }
  const originalRes = image.get('originalSize');
  if (!originalRes) {
    console.error(new Date(), 'no originalRes');
    return undefined;
  }
  const resName =
    `${originalRes[0]}x${originalRes[1]}` as `${number}x${number}`;
  const resId = image.get(resName);
  if (!resId) {
    console.error(new Date(), 'no resId');
    return undefined;
  }

  const streamInfo = await new Promise<
    (BinaryStreamInfo & { chunks: Uint8Array[] }) | undefined
  >(async (resolve) => {
    const unsub = node.subscribe(resId, async (res) => {
      if (res === 'unavailable') {
        resolve(undefined);
        return;
      }
      const streamInfo = res.getBinaryChunks();
      if (streamInfo) {
        resolve(streamInfo);
        return;
      }
    });

    setTimeout(() => {
      unsub();
      resolve(undefined);
    }, 10_000);
  });

  return streamInfo;
}

runner();
