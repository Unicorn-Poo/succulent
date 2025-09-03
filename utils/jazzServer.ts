import { startWorker } from "jazz-tools/worker";

import { MyAppAccount } from '@/app/schema';

/**
 * Initialize Jazz Server Worker Instance
 * Following Jazz documentation: https://jazz.tools/docs/react/server-side/setup
 */
export async function initializeJazzServer() {
  try {
    const { worker } = await startWorker({
      AccountSchema: MyAppAccount,
      syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools", 
      accountID: process.env.JAZZ_WORKER_ACCOUNT!,
      accountSecret: process.env.JAZZ_WORKER_SECRET!,
    });

    console.log('🎷 Jazz Server Worker started successfully:', {
      accountID: process.env.JAZZ_WORKER_ACCOUNT,
      syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
      workerName: worker.profile?.name
    });

    return worker;
  } catch (error) {
    console.error('❌ Failed to start Jazz Server Worker:', error);
    throw error;
  }
}

// Export a promise that resolves to the worker
export const jazzServerWorker = initializeJazzServer(); 