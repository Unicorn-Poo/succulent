/**
 * Cloudflare Worker - Autopilot Cron Trigger
 * 
 * This worker runs every hour and triggers the autopilot cron endpoint
 * to generate and schedule content for enabled account groups.
 * 
 * Deployment:
 * 1. Create a new Worker in Cloudflare Dashboard
 * 2. Copy this code into the Worker
 * 3. Add environment variables:
 *    - CRON_SECRET: Same as your app's CRON_SECRET
 *    - APP_URL: Your app URL (e.g., https://succulent.vercel.app)
 *    - AUTOPILOT_TASKS: JSON string of tasks to process (see format below)
 * 4. Configure Cron Trigger: 0 * * * * (every hour)
 * 
 * Task Format (store in AUTOPILOT_TASKS env var):
 * [
 *   {
 *     "accountGroupId": "co_xxx",
 *     "platform": "instagram",
 *     "profileKey": "your-ayrshare-profile-key",
 *     "settings": {
 *       "postsPerWeek": 7,
 *       "postsPerDayPerPlatform": 2,
 *       "autoExecuteThreshold": 85,
 *       "autoHashtags": true
 *     },
 *     "postsThisWeek": 0,
 *     "postsToday": 0
 *   }
 * ]
 */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAutopilot(env));
  },

  async fetch(request, env, ctx) {
    // Allow manual trigger via HTTP for testing
    const url = new URL(request.url);
    
    if (url.pathname === "/trigger") {
      // Verify secret for manual triggers
      const secret = request.headers.get("x-cron-secret");
      if (secret !== env.CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
      
      const result = await runAutopilot(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      service: "Succulent Autopilot Cron",
      status: "running",
      endpoints: {
        trigger: "POST /trigger (requires x-cron-secret header)",
      },
      nextRun: "Runs every hour via Cloudflare Cron Trigger",
    }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

async function runAutopilot(env) {
  const startTime = Date.now();
  
  // Get app URL from env
  const appUrl = env.APP_URL || "https://succulent.vercel.app";
  const cronSecret = env.CRON_SECRET;
  
  if (!cronSecret) {
    return {
      success: false,
      error: "CRON_SECRET not configured",
    };
  }

  // Parse tasks from env or use empty array
  let tasks = [];
  try {
    if (env.AUTOPILOT_TASKS) {
      tasks = JSON.parse(env.AUTOPILOT_TASKS);
    }
  } catch (e) {
    return {
      success: false,
      error: "Failed to parse AUTOPILOT_TASKS",
      details: e.message,
    };
  }

  // If no static tasks configured, you could fetch from a database here
  // For now, we'll just pass whatever is configured
  
  if (tasks.length === 0) {
    return {
      success: true,
      message: "No tasks configured. Set AUTOPILOT_TASKS env var.",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`${appUrl}/api/cron/autopilot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ tasks }),
    });

    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
      result: data,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to call autopilot endpoint",
      details: error.message,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
    };
  }
}

