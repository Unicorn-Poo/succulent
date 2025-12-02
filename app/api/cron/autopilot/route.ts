import { NextRequest, NextResponse } from "next/server";

/**
 * Autopilot Cron Endpoint
 * 
 * Called hourly by Cloudflare Worker to run the autopilot for all enabled account groups.
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 * 
 * Flow:
 * 1. Verify authorization
 * 2. Get all account groups with autopilot enabled (via webhook/callback or stored state)
 * 3. For each group, check if more posts are needed based on goals
 * 4. Generate content via AI
 * 5. Schedule via Ayrshare if auto-execute is enabled
 */

const CRON_SECRET = process.env.CRON_SECRET || process.env.AUTOPILOT_CRON_SECRET;

interface AutopilotTask {
  accountGroupId: string;
  platform: string;
  profileKey?: string;
  settings: {
    postsPerWeek: number;
    postsPerDayPerPlatform: number;
    autoExecuteThreshold: number;
    autoHashtags: boolean;
  };
  brandPersona?: any;
  postsThisWeek: number;
  postsToday: number;
}

/**
 * POST /api/cron/autopilot
 * 
 * Body can optionally include tasks to process, or we can process all enabled groups.
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && authHeader !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results: any[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    const tasks: AutopilotTask[] = body.tasks || [];

    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No autopilot tasks provided. Pass tasks array in body.",
        hint: "The Cloudflare Worker should fetch enabled account groups and pass them as tasks.",
      });
    }

    for (const task of tasks) {
      const taskResult: any = {
        accountGroupId: task.accountGroupId,
        platform: task.platform,
        status: "pending",
        actions: [],
      };

      try {
        // Check if more posts are needed
        const weeklyLimit = task.settings.postsPerWeek;
        const dailyLimit = task.settings.postsPerDayPerPlatform;
        
        if (task.postsThisWeek >= weeklyLimit) {
          taskResult.status = "skipped";
          taskResult.reason = `Weekly limit reached (${task.postsThisWeek}/${weeklyLimit})`;
          results.push(taskResult);
          continue;
        }

        if (task.postsToday >= dailyLimit) {
          taskResult.status = "skipped";
          taskResult.reason = `Daily limit reached (${task.postsToday}/${dailyLimit})`;
          results.push(taskResult);
          continue;
        }

        // Generate content via AI
        const aiResponse = await fetch(`${getBaseUrl(request)}/api/ai-growth-autopilot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: task.platform,
            profileKey: task.profileKey,
            aggressiveness: "moderate",
            accountGroupId: task.accountGroupId,
            brandPersona: task.brandPersona,
            userGoals: {
              postsPerWeek: task.settings.postsPerWeek,
            },
          }),
        });

        if (!aiResponse.ok) {
          taskResult.status = "error";
          taskResult.reason = "AI content generation failed";
          results.push(taskResult);
          continue;
        }

        const aiData = await aiResponse.json();
        const contentSuggestions = aiData.contentSuggestions || [];

        // Filter high-confidence suggestions
        const threshold = task.settings.autoExecuteThreshold || 85;
        const highConfidence = contentSuggestions.filter(
          (s: any) => s.engagementPotential >= threshold
        );

        if (highConfidence.length === 0) {
          taskResult.status = "no_content";
          taskResult.reason = `No content above ${threshold}% confidence threshold`;
          results.push(taskResult);
          continue;
        }

        // Schedule the highest confidence post
        const bestContent = highConfidence[0];
        
        const scheduleResponse = await fetch(`${getBaseUrl(request)}/api/automation/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: bestContent.content,
            platform: task.platform,
            profileKey: task.profileKey,
            autoHashtag: task.settings.autoHashtags,
            shortenLinks: true,
          }),
        });

        if (!scheduleResponse.ok) {
          const error = await scheduleResponse.json();
          taskResult.status = "schedule_failed";
          taskResult.reason = error.error || "Failed to schedule";
          results.push(taskResult);
          continue;
        }

        const scheduleResult = await scheduleResponse.json();
        
        taskResult.status = "success";
        taskResult.actions.push({
          type: "post_scheduled",
          postId: scheduleResult.postId,
          scheduledFor: scheduleResult.scheduledFor,
          content: bestContent.content.substring(0, 100) + "...",
          confidence: bestContent.engagementPotential,
        });

      } catch (taskError: any) {
        taskResult.status = "error";
        taskResult.reason = taskError.message;
      }

      results.push(taskResult);
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: results.filter((r) => r.status === "success").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "error" || r.status === "schedule_failed").length,
      duration: `${duration}ms`,
      results,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Cron execution failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/autopilot
 * 
 * Health check and status endpoint.
 */
export async function GET(request: NextRequest) {
  // Verify authorization for health check too
  const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-secret");
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}` && authHeader !== CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    status: "ok",
    endpoint: "/api/cron/autopilot",
    description: "Autopilot cron endpoint for background content generation and scheduling",
    usage: {
      method: "POST",
      headers: {
        "Authorization": "Bearer <CRON_SECRET>",
        "Content-Type": "application/json",
      },
      body: {
        tasks: [
          {
            accountGroupId: "string",
            platform: "instagram | twitter | facebook | linkedin | tiktok",
            profileKey: "optional Ayrshare profile key",
            settings: {
              postsPerWeek: 7,
              postsPerDayPerPlatform: 2,
              autoExecuteThreshold: 85,
              autoHashtags: true,
            },
            brandPersona: "optional brand persona object",
            postsThisWeek: 3,
            postsToday: 1,
          },
        ],
      },
    },
    environment: {
      hasCronSecret: !!CRON_SECRET,
    },
  });
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  return `${protocol}://${host}`;
}

