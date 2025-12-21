import { NextRequest, NextResponse } from "next/server";

// Ayrshare API base URL
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

interface ScheduleRequest {
  content: string;
  platform: string;
  profileKey?: string;
  scheduledFor?: string; // ISO date string - if provided, use this exact time
  mediaUrls?: string[];
  hashtags?: string[];
  // Ayrshare enhanced features
  autoHashtag?: boolean;
  shortenLinks?: boolean;
  // Smart scheduling
  slotIndex?: number; // Which slot in the queue (0 = next available, 1 = after that, etc.)
  avoidSlots?: string[]; // ISO date strings of slots already taken
}

interface OptimalTimeResult {
  scheduledTime: Date;
  reason: string;
}

// Platform-specific optimal hours (based on general engagement data)
const PLATFORM_OPTIMAL_HOURS: Record<string, number[]> = {
  instagram: [9, 12, 14, 17, 20],
  facebook: [9, 13, 16, 19],
  twitter: [8, 12, 17, 21],
  x: [8, 12, 17, 21],
  linkedin: [8, 10, 12, 17],
  tiktok: [12, 15, 19, 21],
  youtube: [14, 16, 21],
  pinterest: [12, 14, 20, 21],
  reddit: [9, 12, 17, 20],
  bluesky: [9, 12, 17, 20],
  threads: [9, 12, 17, 20],
};

/**
 * Get all optimal time slots for the next N days
 */
function getOptimalSlots(platform: string, daysAhead: number = 7): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  const hours = PLATFORM_OPTIMAL_HOURS[platform.toLowerCase()] || [
    9, 12, 17, 20,
  ];

  for (let day = 0; day < daysAhead; day++) {
    for (const hour of hours) {
      const slotTime = new Date(now);
      slotTime.setDate(slotTime.getDate() + day);
      slotTime.setHours(hour, 0, 0, 0);

      // Only include future slots (at least 10 minutes from now)
      if (slotTime.getTime() > now.getTime() + 10 * 60 * 1000) {
        slots.push(slotTime);
      }
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Calculate the next available optimal time, avoiding already-taken slots
 */
function calculateOptimalTime(
  platform: string,
  slotIndex: number = 0,
  avoidSlots: string[] = []
): OptimalTimeResult {
  const allSlots = getOptimalSlots(platform, 14); // Look 2 weeks ahead
  const avoidSet = new Set(avoidSlots.map((s) => new Date(s).toISOString()));

  // Filter out taken slots
  const availableSlots = allSlots.filter(
    (slot) => !avoidSet.has(slot.toISOString())
  );

  if (availableSlots.length === 0) {
    // Fallback: schedule for tomorrow at noon
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(12, 0, 0, 0);
    return {
      scheduledTime: fallback,
      reason: "Fallback slot - all optimal times taken",
    };
  }

  const selectedSlot =
    availableSlots[Math.min(slotIndex, availableSlots.length - 1)];

  const dayName = selectedSlot.toLocaleDateString("en-US", { weekday: "long" });
  const timeStr = selectedSlot.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    scheduledTime: selectedSlot,
    reason: `Optimal time for ${platform}: ${dayName} at ${timeStr}`,
  };
}

/**
 * POST /api/automation/schedule
 * Schedule a post at optimal time via Ayrshare
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json();
    const {
      content,
      platform,
      profileKey,
      scheduledFor,
      mediaUrls,
      hashtags,
      autoHashtag,
      shortenLinks,
      slotIndex = 0,
      avoidSlots = [],
    } = body;

    console.log("📬 [SCHEDULE API] Request received:", {
      hasContent: !!content,
      contentLength: content?.length,
      platform,
      hasProfileKey: !!profileKey,
      hasMediaUrls: !!mediaUrls && mediaUrls.length > 0,
      slotIndex,
      avoidSlotsCount: avoidSlots.length,
    });

    // Validate required fields
    if (!content?.trim()) {
      console.error("❌ [SCHEDULE API] Missing content");
      return NextResponse.json(
        {
          error: "Content is required",
          details: "Post content cannot be empty",
        },
        { status: 400 }
      );
    }

    if (!platform) {
      console.error("❌ [SCHEDULE API] Missing platform");
      return NextResponse.json(
        {
          error: "Platform is required",
          details: "Specify which platform to post to",
        },
        { status: 400 }
      );
    }

    // Platform-specific validation
    const platformLower = platform.toLowerCase();

    // Platforms that REQUIRE media
    const mediaRequiredPlatforms = ["pinterest", "tiktok", "instagram"];
    if (
      mediaRequiredPlatforms.includes(platformLower) &&
      (!mediaUrls || mediaUrls.length === 0)
    ) {
      const platformName =
        platformLower.charAt(0).toUpperCase() + platformLower.slice(1);
      return NextResponse.json(
        {
          error: `${platformName} requires an image`,
          details: `Add at least one image URL to post to ${platformName}. This is a platform requirement.`,
          requiresMedia: true,
          platform: platformLower,
        },
        { status: 400 }
      );
    }
    if (platformLower === "youtube") {
      return NextResponse.json(
        {
          error: "YouTube requires video upload",
          details: "Use the main post creator with video upload for YouTube",
        },
        { status: 400 }
      );
    }

    // Get API key
    const apiKey =
      process.env.AYRSHARE_API_KEY || process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ayrshare API key not configured" },
        { status: 500 }
      );
    }

    // Calculate schedule time
    let scheduleTime: Date;
    let scheduleReason: string;

    if (scheduledFor) {
      scheduleTime = new Date(scheduledFor);
      scheduleReason = "User-specified time";
    } else {
      const optimal = calculateOptimalTime(platform, slotIndex, avoidSlots);
      scheduleTime = optimal.scheduledTime;
      scheduleReason = optimal.reason;
    }

    console.log("📅 [SCHEDULE API] Scheduling for:", {
      time: scheduleTime.toISOString(),
      reason: scheduleReason,
    });

    // Build Ayrshare post payload
    const postPayload: any = {
      post: content,
      platforms: [platformLower],
      scheduleDate: scheduleTime.toISOString(),
    };

    // Add profile key for business accounts
    if (profileKey) {
      postPayload.profileKey = profileKey;
    }

    // Add media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      // CRITICAL: Don't decode URLs - preserve them exactly as-is
      // Lunary OG image URLs have specific query parameters that must not be modified
      // Decoding can corrupt query parameters (e.g., + becomes space, then %20)
      const cleanMediaUrls = mediaUrls
        .filter((url) => url && typeof url === "string")
        .map((url) => {
          // Just trim whitespace, but don't decode - preserve URL exactly as-is
          return url.trim();
        });

      // Log Lunary URLs to verify they're preserved
      const lunaryUrls = cleanMediaUrls.filter((url) =>
        url.includes("lunary.app/api/og/")
      );
      if (lunaryUrls.length > 0) {
        console.log("🔍 [SCHEDULE API] Preserving Lunary URLs exactly as-is:", {
          count: lunaryUrls.length,
          urls: lunaryUrls.map((url) => ({
            original: url,
            queryParams: url.includes("?") ? url.split("?")[1] : "none",
          })),
        });
      }

      if (cleanMediaUrls.length > 0) {
        postPayload.mediaUrls = cleanMediaUrls;
      }
    }

    // Platform-specific options
    if (platformLower === "pinterest") {
      postPayload.pinterestOptions = {
        title: content.split("\n")[0]?.slice(0, 100) || "Pin",
        // Note: boardId should be set up in Ayrshare dashboard
      };
    }

    if (platformLower === "tiktok") {
      // CRITICAL FIX: Use lowercase 'tiktokOptions' to match Ayrshare API and rest of codebase
      // TikTok requires media (video or image), and options are optional
      postPayload.tiktokOptions = {
        // TikTok options are optional - Ayrshare will handle media type automatically
        // Valid options: privacyLevel, disableComment, disableDuet, disableStitch
      };
    }

    if (platformLower === "reddit") {
      postPayload.redditOptions = {
        title: content.split("\n")[0]?.slice(0, 300) || "Post",
        // Subreddit should be configured in Ayrshare dashboard
      };
    }

    // Ayrshare enhanced features
    if (autoHashtag) {
      postPayload.autoHashtag = true;
    }
    if (shortenLinks) {
      postPayload.shortenLinks = true;
    }

    // Add hashtags if provided
    if (hashtags && hashtags.length > 0 && !autoHashtag) {
      const hashtagString = hashtags
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");
      postPayload.post = `${content}\n\n${hashtagString}`;
    }

    console.log("📤 [SCHEDULE API] Sending to Ayrshare:", {
      platforms: postPayload.platforms,
      scheduleDate: postPayload.scheduleDate,
      hasMedia: !!postPayload.mediaUrls,
      mediaCount: postPayload.mediaUrls?.length || 0,
    });

    // Call Ayrshare API
    const response = await fetch(`${AYRSHARE_API_URL}/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(postPayload),
    });

    const result = await response.json();

    console.log("📥 [SCHEDULE API] Ayrshare response:", {
      status: response.status,
      ok: response.ok,
      result: JSON.stringify(result).slice(0, 500),
    });

    if (!response.ok) {
      console.error("❌ [SCHEDULE API] Ayrshare error:", result);
      return NextResponse.json(
        {
          error: "Failed to schedule post",
          details: result.message || result.error || JSON.stringify(result),
          ayrshareError: result,
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
    console.error("❌ [SCHEDULE API] Error:", error);
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
 * Get optimal posting times for platforms
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "instagram";
  const count = parseInt(searchParams.get("count") || "10");

  const slots = getOptimalSlots(platform, 7);

  const upcomingSlots = slots.slice(0, count).map((slot) => ({
    time: slot.toISOString(),
    label: slot.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    dayOfWeek: slot.toLocaleDateString("en-US", { weekday: "long" }),
    hour: slot.getHours(),
  }));

  return NextResponse.json({
    platform,
    optimalHours: PLATFORM_OPTIMAL_HOURS[platform.toLowerCase()] || [
      9, 12, 17, 20,
    ],
    upcomingSlots,
  });
}
