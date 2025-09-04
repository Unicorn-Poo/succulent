import { startWorker } from "jazz-tools/worker";

import { MyAppAccount } from '@/app/schema';

/**
 * Initialize Jazz Server Worker Instance
 * Following Jazz documentation: https://jazz.tools/docs/react/server-side/setup
 */
export async function initializeJazzServer() {
  try {
    // Check if required environment variables are available
    if (!process.env.JAZZ_WORKER_ACCOUNT || !process.env.JAZZ_WORKER_SECRET) {
      console.log('⚠️ Jazz server worker environment variables not configured. Server-side Jazz features will be disabled.');
      console.log('📝 To enable server-side Jazz features, set JAZZ_WORKER_ACCOUNT and JAZZ_WORKER_SECRET environment variables.');
      return null;
    }

    const { worker } = await startWorker({
      AccountSchema: MyAppAccount,
      syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools", 
      accountID: process.env.JAZZ_WORKER_ACCOUNT,
      accountSecret: process.env.JAZZ_WORKER_SECRET,
    });

    console.log('🎷 Jazz Server Worker started successfully:', {
      accountID: process.env.JAZZ_WORKER_ACCOUNT,
      syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
      workerName: worker.profile?.name
    });

    return worker;
  } catch (error) {
    console.error('❌ Failed to start Jazz Server Worker:', error);
    console.log('⚠️ Server-side Jazz features will be disabled. API will use in-memory storage as fallback.');
    return null;
  }
}

// Export a promise that resolves to the worker (or null if not configured)
export const jazzServerWorker = initializeJazzServer(); 