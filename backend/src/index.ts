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
import { syncedWithAllPeers } from './missingTxsComparedTo';

async function runner() {
  const { worker } = await startWorker({
    AccountSchema: SchedulerAccount,
    syncServer: 'wss://mesh.jazz.tools/?key=succulent-backend@gcmp.io',
  });

  console.log(new Date(), 'root after migration', worker.root);

  let lastWorkerUpdateAt: Date | undefined;
  let lastWorkerUpdate: SchedulerAccountRoot | null;
  let accountStateChanged = false;

  worker.subscribe({ root: { brands: [{ posts: [] }] } }, (workerUpdate) => {
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

      for (let post of brand?.posts || []) {
        if (!post) continue;
        if (!syncedWithAllPeers(post)) {
          console.log(
            new Date(),
            'post not synced with all peers yet',
            post?.id
          );
          continue;
        }

        if (!post.images || !syncedWithAllPeers(post.images)) {
          console.log(
            new Date(),
            'post not synced with all peers yet',
            post.id
          );
          continue;
        }

        console.log(new Date(), 'post synced', post.id, post.instagram.state);
      }
    }
  });

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
