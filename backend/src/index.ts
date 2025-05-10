import 'dotenv/config';

import { startWorker } from 'jazz-nodejs';
import { ID, ImageDefinition } from 'jazz-tools';

import {
  Brand,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from './sharedDataModel';
import { handleImageRequest } from './handleImageRequest';
import { handleFBConnectRequest } from './handleFBConnectRequest';
import { SchedulerAccount, SchedulerAccountRoot } from './workerAccount';
import { handleStateRequest } from './handleStateRequest';
import { syncedWithAllPeers } from './missingTxsComparedTo';
import { PostHandler } from './PostHandler';
import { Client as IGClient } from 'instagram-graph-api';
const postHandlers: Record<ID<Brand>, Record<ID<Post>, PostHandler>> = {};

async function runner() {
  const { worker } = await startWorker({
    AccountSchema: SchedulerAccount,
    syncServer: 'wss://mesh.jazz.tools/?key=succulent-backend@gcmp.io',
  });

  console.log(new Date(), 'root after migration', worker.root);

  let lastWorkerUpdateAt: Date | undefined;
  let lastWorkerUpdate: SchedulerAccountRoot | null;
  let accountStateChanged = false;

  worker.subscribe(
    { resolve: { root: { brands: { $each: { posts: true } } } } },
    (workerUpdate) => {
      lastWorkerUpdateAt = new Date();
      lastWorkerUpdate = workerUpdate?.root;
      accountStateChanged = true;

      for (let brand of workerUpdate.root.brands) {
        if (!syncedWithAllPeers(brand)) {
          console.log(
            new Date(),
            'brand not synced with all peers yet',
            brand.id
          );
          continue;
        }

        if (!process.env.ARMED_BRANDS?.includes(brand.id)) {
          continue;
        }

        if (!brand.instagramPage) {
          console.log(new Date(), 'brand has no instagram page', brand.id);
          continue;
        }

        if (!brand.metaAPIConnection) {
          console.log(new Date(), 'brand has no meta api connection', brand.id);
          continue;
        }

        for (let post of brand?.posts._refs || []) {
          if (!postHandlers[brand.id]?.[post.id]) {
            postHandlers[brand.id] = {
              ...postHandlers[brand.id],
              [post.id]: new PostHandler(
                worker,
                post.id,
                new IGClient(
                  brand.metaAPIConnection.longLivedToken,
                  brand.instagramPage.id
                )
              ),
            };
          }
        }

        const currentPostIDs = new Set([...brand.posts._refs].map((p) => p.id));

        for (let handlerID of Object.keys(postHandlers[brand.id] || {}).map(
          (id) => id as ID<Post>
        )) {
          if (!currentPostIDs.has(handlerID)) {
            postHandlers[brand.id][handlerID].cancel();
            delete postHandlers[brand.id][handlerID];
          }
        }
      }
    }
  );

  Bun.serve({
    async fetch(req) {
      if (req.url.includes('/connectFB')) {
        return handleFBConnectRequest(req, worker);
      } else if (req.url.includes('/image/')) {
        return handleImageRequest(req, worker);
      } else if (req.url.includes('/state')) {
        return handleStateRequest(req, worker, lastWorkerUpdate);
      } else {
        return new Response('not found', { status: 404 });
      }
    },
    port: 3331,
  });
}

runner();
