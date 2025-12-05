import { NextRequest, NextResponse } from "next/server";

const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

/**
 * GET /api/messages/unread-count
 * Returns the count of unread messages, optionally filtered by platform
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const profileKey = searchParams.get("profileKey");

    // Get API key from environment
    const apiKey = process.env.AYRSHARE_API_KEY || process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ayrshare API key not configured" },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (profileKey) {
      headers["Profile-Key"] = profileKey;
    }

    // Build query params for Ayrshare API
    const queryParams = new URLSearchParams();
    if (platform) queryParams.append("platform", platform);
    queryParams.append("limit", "100"); // Fetch enough to count unread

    // Fetch messages from Ayrshare
    const messagesUrl = `${AYRSHARE_API_URL}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    const response = await fetch(messagesUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If messages endpoint isn't available, return zero count
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({
          success: true,
          unreadCount: 0,
          byPlatform: {},
          info: "Messaging may not be available for this subscription tier",
        });
      }

      return NextResponse.json(
        {
          error: "Failed to fetch unread count",
          details: errorData.message || errorData.error || `Status: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const messages = Array.isArray(data) ? data : data.messages || [];
    
    // Count unread messages
    const unreadMessages = messages.filter((m: any) => !m.read && !m.isRead);
    
    // Group by platform
    const byPlatform: Record<string, number> = {};
    unreadMessages.forEach((msg: any) => {
      const platform = msg.platform || "unknown";
      byPlatform[platform] = (byPlatform[platform] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      unreadCount: unreadMessages.length,
      byPlatform,
      total: messages.length,
    });
  } catch (error) {
    console.error("Unread count fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch unread count",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

