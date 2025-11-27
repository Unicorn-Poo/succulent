import { NextRequest, NextResponse } from "next/server";

const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

interface MessageFilters {
  platform?: string;
  unreadOnly?: boolean;
  since?: string;
  limit?: number;
}

/**
 * GET /api/messages
 * Fetch messages/DMs from connected social accounts via Ayrshare
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const since = searchParams.get("since");
    const limit = parseInt(searchParams.get("limit") || "50");
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
    if (limit) queryParams.append("limit", limit.toString());

    // Fetch messages from Ayrshare
    const messagesUrl = `${AYRSHARE_API_URL}/messages${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    const response = await fetch(messagesUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If messages endpoint isn't available, return empty with info
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({
          success: true,
          messages: [],
          info: "Direct message retrieval may not be available for all platforms or subscription tiers",
          supportedPlatforms: ["twitter", "instagram", "facebook"],
        });
      }

      return NextResponse.json(
        {
          error: "Failed to fetch messages",
          details: errorData.message || errorData.error || `Status: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Process and format messages
    const messages = Array.isArray(data) ? data : data.messages || [];
    
    // Filter by unread if requested
    const filteredMessages = unreadOnly 
      ? messages.filter((m: any) => !m.read && !m.isRead)
      : messages;

    // Filter by date if provided
    const dateFilteredMessages = since
      ? filteredMessages.filter((m: any) => new Date(m.createdAt || m.timestamp) > new Date(since))
      : filteredMessages;

    return NextResponse.json({
      success: true,
      messages: dateFilteredMessages.map((msg: any) => ({
        id: msg.id || msg._id,
        platform: msg.platform,
        senderId: msg.senderId || msg.from?.id,
        senderUsername: msg.senderUsername || msg.from?.username || msg.from?.name,
        senderProfileUrl: msg.senderProfileUrl || msg.from?.profileUrl,
        content: msg.content || msg.message || msg.text,
        timestamp: msg.createdAt || msg.timestamp || msg.date,
        isRead: msg.read || msg.isRead || false,
        conversationId: msg.conversationId || msg.threadId,
        attachments: msg.attachments || msg.media || [],
      })),
      total: dateFilteredMessages.length,
      hasMore: data.hasMore || false,
      nextCursor: data.nextCursor,
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Send a direct message via Ayrshare
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      platform, 
      recipientId, 
      recipientUsername,
      message, 
      profileKey,
      conversationId,
    } = body;

    if (!platform || !message) {
      return NextResponse.json(
        { error: "Platform and message are required" },
        { status: 400 }
      );
    }

    if (!recipientId && !recipientUsername && !conversationId) {
      return NextResponse.json(
        { error: "recipientId, recipientUsername, or conversationId is required" },
        { status: 400 }
      );
    }

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

    const messagePayload = {
      platform,
      message,
      ...(recipientId && { recipientId }),
      ...(recipientUsername && { recipientUsername }),
      ...(conversationId && { conversationId }),
    };

    const response = await fetch(`${AYRSHARE_API_URL}/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(messagePayload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to send message",
          details: result.message || result.error,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.id || result.messageId,
      status: result.status || "sent",
      platform,
      recipient: recipientUsername || recipientId,
    });
  } catch (error) {
    console.error("Message send error:", error);
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages
 * Mark messages as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageIds, platform, profileKey } = body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: "messageIds array is required" },
        { status: 400 }
      );
    }

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

    // Mark messages as read
    const response = await fetch(`${AYRSHARE_API_URL}/messages/read`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messageIds,
        ...(platform && { platform }),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to mark messages as read",
          details: result.message || result.error,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      markedAsRead: messageIds.length,
    });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json(
      {
        error: "Failed to mark messages as read",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

