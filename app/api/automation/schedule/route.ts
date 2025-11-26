import { NextRequest, NextResponse } from "next/server";

// Ayrshare API base URL
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

interface ScheduleRequest {
  content: string;
  platform: string;
  profileKey?: string;
  scheduledFor?: string; // ISO date string - if not provided, we calculate optimal time
  mediaUrls?: string[];
  hashtags?: string[];
}

interface OptimalTimeResult {
  scheduledTime: Date;
  reason: string;
}

/**
 * Calculate optimal posting time based on platform and current time
 */
function calculateOptimalTime(platform: string): OptimalTimeResult {
  const now = new Date();

  // Platform-specific optimal hours (based on general engagement data)
  const platformOptimalHours: Record<string, number[]> = {
    instagram: [9, 12, 14, 17, 20], // 9am, 12pm, 2pm, 5pm, 8pm
    facebook: [9, 13, 16, 19], // 9am, 1pm, 4pm, 7pm
    twitter: [8, 12, 17, 21], // 8am, 12pm, 5pm, 9pm
    x: [8, 12, 17, 21],
    linkedin: [8, 10, 12, 17], // 8am, 10am, 12pm, 5pm (business hours)
    tiktok: [12, 15, 19, 21], // 12pm, 3pm, 7pm, 9pm
    youtube: [14, 16, 21], // 2pm, 4pm, 9pm
  };

  const optimalHours = platformOptimalHours[platform.toLowerCase()] || [
    9, 12, 17, 20,
  ];
  const currentHour = now.getHours();

  // Find next optimal hour
  let nextOptimalHour = optimalHours.find((h) => h > currentHour);
  const scheduledTime = new Date(now);

  if (!nextOptimalHour) {
    // No more optimal hours today, schedule for tomorrow's first optimal hour
    nextOptimalHour = optimalHours[0];
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  scheduledTime.setHours(nextOptimalHour, 0, 0, 0);

  const reason = `Scheduled for ${nextOptimalHour}:00 - optimal engagement time for ${platform}`;

  return { scheduledTime, reason };
}

/**
 * POST /api/automation/schedule
 * Schedule a post at optimal time via Ayrshare
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json();
    const { content, platform, profileKey, scheduledFor, mediaUrls, hashtags } =
      body;

    if (!content || !platform) {
      return NextResponse.json(
        { error: "Content and platform are required" },
        { status: 400 }
      );
    }

    // Get API key from environment
    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ayrshare API key not configured" },
        { status: 500 }
      );
    }

    // Calculate optimal time if not provided
    let scheduleTime: Date;
    let scheduleReason: string;

    if (scheduledFor) {
      scheduleTime = new Date(scheduledFor);
      scheduleReason = "User-specified time";
    } else {
      const optimal = calculateOptimalTime(platform);
      scheduleTime = optimal.scheduledTime;
      scheduleReason = optimal.reason;
    }

    // Build Ayrshare post payload
    const postPayload: any = {
      post: content,
      platforms: [platform],
      scheduleDate: scheduleTime.toISOString(),
    };

    // Add profile key for business accounts
    if (profileKey) {
      postPayload.profileKey = profileKey;
    }

    // Add media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      postPayload.mediaUrls = mediaUrls;
    }

    // Add hashtags if provided (append to post)
    if (hashtags && hashtags.length > 0) {
      const hashtagString = hashtags
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");
      postPayload.post = `${content}\n\n${hashtagString}`;
    }

    // Call Ayrshare API to schedule the post
    const response = await fetch(`${AYRSHARE_API_URL}/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(postPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Ayrshare schedule error:", result);
      return NextResponse.json(
        {
          error: "Failed to schedule post",
          details: result.message || result.error,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      postId: result.id,
      platform,
      scheduledFor: scheduleTime.toISOString(),
      reason: scheduleReason,
      ayrshareResponse: {
        id: result.id,
        status: result.status,
        postIds: result.postIds,
      },
    });
  } catch (error) {
    console.error("Schedule API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/automation/schedule
 * Get optimal posting times for a platform
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "instagram";

  const optimal = calculateOptimalTime(platform);

  // Also return next 5 optimal times
  const now = new Date();
  const platformOptimalHours: Record<string, number[]> = {
    instagram: [9, 12, 14, 17, 20],
    facebook: [9, 13, 16, 19],
    twitter: [8, 12, 17, 21],
    x: [8, 12, 17, 21],
    linkedin: [8, 10, 12, 17],
    tiktok: [12, 15, 19, 21],
    youtube: [14, 16, 21],
  };

  const hours = platformOptimalHours[platform.toLowerCase()] || [9, 12, 17, 20];
  const currentHour = now.getHours();

  const upcomingTimes: { time: string; label: string }[] = [];
  let day = 0;

  for (let i = 0; i < 5; i++) {
    const hourIndex =
      (hours.findIndex((h) => h > currentHour) + i) % hours.length;
    if (hourIndex <= i && i > 0) day++;

    const slotTime = new Date(now);
    slotTime.setDate(slotTime.getDate() + day);
    slotTime.setHours(hours[hourIndex], 0, 0, 0);

    upcomingTimes.push({
      time: slotTime.toISOString(),
      label: slotTime.toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }

  return NextResponse.json({
    platform,
    nextOptimal: {
      time: optimal.scheduledTime.toISOString(),
      reason: optimal.reason,
    },
    upcomingSlots: upcomingTimes,
  });
}
