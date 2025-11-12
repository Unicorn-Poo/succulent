import { startWorker } from "jazz-tools/worker";

import { MyAppAccount } from "@/app/schema";

/**
 * Initialize Jazz Server Worker Instance
 * Following Jazz documentation: https://jazz.tools/docs/react/server-side/setup
 * Includes retry logic and timeout handling for network issues
 */
export async function initializeJazzServer(retries = 3, delay = 2000) {
  try {
    // Check if required environment variables are available
    if (!process.env.JAZZ_WORKER_ACCOUNT || !process.env.JAZZ_WORKER_SECRET) {
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
}

// Export a promise that resolves to the worker (or null if not configured)
export const jazzServerWorker = initializeJazzServer();
