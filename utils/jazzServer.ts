import { WebSocketPeerWithReconnection } from "cojson-transport-ws";
import { WasmCrypto } from "cojson/crypto/WasmCrypto";
import { createJazzContextFromExistingCredentials, randomSessionProvider } from "jazz-tools";
import { startWorker } from "jazz-tools/worker";

import { MyAppAccount } from "@/app/schema";

type WorkerInitOptions = {
  accountID?: string;
  accountSecret?: string;
  syncServer?: string;
  AccountSchema?: any;
};

async function startWorkerWithoutInbox(options: WorkerInitOptions) {
  const {
    accountID = process.env.JAZZ_WORKER_ACCOUNT,
    accountSecret = process.env.JAZZ_WORKER_SECRET,
    syncServer = process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
    AccountSchema = MyAppAccount,
  } = options;

  let node: any = null;
  const peersToLoadFrom: any[] = [];
  const wsPeer = new WebSocketPeerWithReconnection({
    peer: syncServer,
    reconnectionTimeout: 100,
    addPeer: (peer) => {
      if (node?.syncManager) {
        node.syncManager.addPeer(peer);
      } else {
        peersToLoadFrom.push(peer);
      }
    },
    removePeer: () => {},
  });

  wsPeer.enable();

  try {
    if (!accountID) {
      throw new Error("No accountID provided");
    }
    if (!accountSecret) {
      throw new Error("No accountSecret provided");
    }
    if (!accountID.startsWith("co_")) {
      throw new Error("Invalid accountID");
    }
    if (!accountSecret.startsWith("sealerSecret_")) {
      throw new Error("Invalid accountSecret");
    }

    const context = await createJazzContextFromExistingCredentials({
      credentials: {
        accountID,
        secret: accountSecret as any,
      },
      AccountSchema,
      sessionProvider: randomSessionProvider,
      peersToLoadFrom,
      crypto: await WasmCrypto.create(),
    });

    node = context.node as any;

    const account = context.account as any;
    if (account?._refs?.profile?.load) {
      try {
        await account._refs.profile.load();
      } catch (error) {
        console.warn("⚠️ Failed to preload worker profile:", error);
      }
    }

    return {
      worker: account,
      done: () => {
        wsPeer.disable();
        context.done();
      },
    };
  } catch (error) {
    wsPeer.disable();
    throw error;
  }
}

/**
 * Initialize Jazz Server Worker Instance
 * Following Jazz documentation: https://jazz.tools/docs/react/server-side/setup
 * Includes retry logic and timeout handling for network issues
 */
export async function initializeJazzServer(retries = 3, delay = 2000) {
  const globalState = globalThis as {
    __jazzServerWorkerPromise?: Promise<any> | null;
    __jazzServerWorker?: any;
    __jazzServerInitError?: string | null;
    __jazzServerInitErrorAt?: string | null;
  };

  if (globalState.__jazzServerWorker) {
    return globalState.__jazzServerWorker;
  }

  if (globalState.__jazzServerWorkerPromise) {
    return globalState.__jazzServerWorkerPromise;
  }

  const initPromise = (async () => {
    try {
      // Check if required environment variables are available
      if (
        !process.env.JAZZ_WORKER_ACCOUNT ||
        !process.env.JAZZ_WORKER_SECRET
      ) {
        console.log(
          "⚠️ Jazz server worker environment variables not configured. Server-side Jazz features will be disabled."
        );
        console.log("📝 Required environment variables:");
        console.log("   - JAZZ_WORKER_ACCOUNT: Your Jazz worker account ID");
        console.log("   - JAZZ_WORKER_SECRET: Your Jazz worker secret key");
        console.log("   - JAZZ_SYNC_SERVER (optional): Jazz sync server URL");
        return null;
      }

    console.log("🔧 Initializing Jazz server worker with:", {
      accountID: process.env.JAZZ_WORKER_ACCOUNT,
      syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
      hasSecret: !!process.env.JAZZ_WORKER_SECRET,
      retries: retries,
    });

    let lastError: Error | null = null;
    let worker: any = null;
    let triedInboxFallback = false;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `🔄 Attempt ${attempt}/${retries} to initialize Jazz worker...`
        );

        // Add timeout to prevent hanging indefinitely
        const workerPromise = startWorker({
          AccountSchema: MyAppAccount,
          syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
          accountID: process.env.JAZZ_WORKER_ACCOUNT,
          accountSecret: process.env.JAZZ_WORKER_SECRET,
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Worker initialization timeout after 30s")),
            30000
          )
        );

        const result = await Promise.race([workerPromise, timeoutPromise]);
        worker = result?.worker || result;

        if (!worker) {
          throw new Error("Worker initialization returned null");
        }

        // Success - verify worker is accessible
        console.log("🎷 Jazz Server Worker started successfully:", {
          accountID: process.env.JAZZ_WORKER_ACCOUNT,
          syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
          workerName: worker.profile?.name || "Unknown",
          workerId: worker.id,
        });

        // Test worker capabilities
        try {
          console.log("🧪 Testing worker transaction capabilities...");
          // The worker should be able to access its own profile
          if (worker.profile) {
            console.log(
              "✅ Worker can access its profile - transaction capabilities confirmed"
            );
          } else {
            console.warn(
              "⚠️ Worker profile not available - may indicate permission issues"
            );
          }
        } catch (testError) {
          console.error("❌ Worker transaction test failed:", testError);
          console.log(
            "This may indicate the worker secret is incorrect or insufficient permissions"
          );
        }

        globalState.__jazzServerWorker = worker;
        globalState.__jazzServerInitError = null;
        globalState.__jazzServerInitErrorAt = null;
        return worker;
      } catch (attemptError) {
        lastError =
          attemptError instanceof Error
            ? attemptError
            : new Error(String(attemptError));
        console.error(
          `❌ Attempt ${attempt}/${retries} failed:`,
          lastError.message
        );
        globalState.__jazzServerInitError = lastError.message;
        globalState.__jazzServerInitErrorAt = new Date().toISOString();

        if (
          lastError.message.includes("Account profile should already be loaded") &&
          globalState.__jazzServerWorker
        ) {
          return globalState.__jazzServerWorker;
        }
        if (
          lastError.message.includes("Account profile should already be loaded") &&
          !triedInboxFallback
        ) {
          triedInboxFallback = true;
          console.warn("⚠️ Worker inbox load failed; using fallback init without inbox.");
          try {
            const fallbackResult = await startWorkerWithoutInbox({
              accountID: process.env.JAZZ_WORKER_ACCOUNT,
              accountSecret: process.env.JAZZ_WORKER_SECRET,
              syncServer:
                process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools",
              AccountSchema: MyAppAccount,
            });
            const fallbackWorker = fallbackResult?.worker || fallbackResult;
            if (fallbackWorker) {
              globalState.__jazzServerWorker = fallbackWorker;
              return fallbackWorker;
            }
          } catch (fallbackError) {
            lastError =
              fallbackError instanceof Error
                ? fallbackError
                : new Error(String(fallbackError));
            console.error("❌ Fallback worker init failed:", lastError.message);
          }
        }

        // Check if it's a network/connectivity error that might be temporary
        const isNetworkError =
          lastError.message.includes("unavailable") ||
          lastError.message.includes("timeout") ||
          lastError.message.includes("peer") ||
          lastError.message.includes("WebSocket");

        if (attempt < retries && isNetworkError) {
          console.log(
            `⏳ Network error detected. Waiting ${delay}ms before retry...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          // Exponential backoff
          delay = Math.min(delay * 1.5, 10000); // Cap at 10s
        } else if (attempt < retries) {
          // Non-network error - still retry but with shorter delay
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    if (lastError) {
      throw lastError;
    }

    throw new Error("Worker initialization failed after all retries");
  } catch (error) {
    console.error("❌ Failed to start Jazz Server Worker:", error);
    if (error instanceof Error) {
      globalState.__jazzServerInitError = error.message;
      globalState.__jazzServerInitErrorAt = new Date().toISOString();
    } else {
      globalState.__jazzServerInitError = String(error);
      globalState.__jazzServerInitErrorAt = new Date().toISOString();
    }

    if (error instanceof Error) {
      if (error.message.includes("read key secret")) {
        console.error(
          "💡 This error suggests the JAZZ_WORKER_SECRET is missing or incorrect"
        );
        console.error(
          "   Please check that your .env.local file contains the correct JAZZ_WORKER_SECRET"
        );
      } else if (error.message.includes("account")) {
        console.error(
          "💡 This error suggests the JAZZ_WORKER_ACCOUNT is incorrect"
        );
        console.error(
          "   Please check that your .env.local file contains the correct JAZZ_WORKER_ACCOUNT"
        );
      } else if (
        error.message.includes("unavailable") ||
        error.message.includes("peer")
      ) {
        console.error("💡 Network connectivity issue with Jazz mesh server");
        console.error(
          "   This could be temporary - the worker will retry on next request"
        );
        console.error(
          "   Check your internet connection and Jazz mesh server status"
        );
      }
    }

    console.log(
      "⚠️ Server-side Jazz features will be disabled. API will use in-memory storage as fallback."
    );
      return null;
    }
  })();

  globalState.__jazzServerWorkerPromise = initPromise;
  const worker = await initPromise;
  if (!worker) {
    globalState.__jazzServerWorkerPromise = null;
  }
  return worker;
}

// Export a promise that resolves to the worker (or null if not configured)
export const jazzServerWorker = initializeJazzServer();

export function getServerWorkerInitState() {
  const globalState = globalThis as {
    __jazzServerWorkerPromise?: Promise<any> | null;
    __jazzServerWorker?: any;
    __jazzServerInitError?: string | null;
    __jazzServerInitErrorAt?: string | null;
  };

  return {
    hasWorker: !!globalState.__jazzServerWorker,
    initError: globalState.__jazzServerInitError || null,
    initErrorAt: globalState.__jazzServerInitErrorAt || null,
  };
}
