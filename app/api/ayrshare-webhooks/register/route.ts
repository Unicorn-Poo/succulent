import { NextRequest, NextResponse } from "next/server";

const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

interface WebhookRegistrationRequest {
  action: "subscribe" | "unsubscribe" | "list";
  url?: string;
  events?: string[];
  profileKey?: string;
}

// Available webhook events from Ayrshare
const AVAILABLE_EVENTS = [
  "post",           // Post created/published
  "schedule",       // Post scheduled
  "delete",         // Post deleted
  "comment",        // New comment received
  "message",        // New DM received
  "analytics",      // Analytics updated
  "link",           // Social account linked/unlinked
  "review",         // New review received
];

/**
 * POST /api/ayrshare-webhooks/register
 * Register, unregister, or list webhooks with Ayrshare
 */
export async function POST(request: NextRequest) {
  try {
    const body: WebhookRegistrationRequest = await request.json();
    const { action, url, events, profileKey } = body;

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

    // Add profile key for business accounts
    if (profileKey) {
      headers["Profile-Key"] = profileKey;
    }

    switch (action) {
      case "subscribe": {
        if (!url) {
          return NextResponse.json(
            { error: "Webhook URL is required for subscription" },
            { status: 400 }
          );
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          return NextResponse.json(
            { error: "Invalid webhook URL format" },
            { status: 400 }
          );
        }

        // Filter to only valid events
        const validEvents = events?.filter(e => AVAILABLE_EVENTS.includes(e)) || AVAILABLE_EVENTS;

        const subscribePayload = {
          action: "subscribe",
          url,
          ...(validEvents.length > 0 && { events: validEvents }),
        };

        const subscribeResponse = await fetch(`${AYRSHARE_API_URL}/webhook`, {
          method: "POST",
          headers,
          body: JSON.stringify(subscribePayload),
        });

        const subscribeResult = await subscribeResponse.json();

        if (!subscribeResponse.ok) {
          return NextResponse.json(
            {
              error: "Failed to register webhook",
              details: subscribeResult.message || subscribeResult.error,
            },
            { status: subscribeResponse.status }
          );
        }

        return NextResponse.json({
          success: true,
          action: "subscribed",
          url,
          events: validEvents,
          response: subscribeResult,
        });
      }

      case "unsubscribe": {
        if (!url) {
          return NextResponse.json(
            { error: "Webhook URL is required for unsubscription" },
            { status: 400 }
          );
        }

        const unsubscribePayload = {
          action: "unsubscribe",
          url,
        };

        const unsubscribeResponse = await fetch(`${AYRSHARE_API_URL}/webhook`, {
          method: "POST",
          headers,
          body: JSON.stringify(unsubscribePayload),
        });

        const unsubscribeResult = await unsubscribeResponse.json();

        if (!unsubscribeResponse.ok) {
          return NextResponse.json(
            {
              error: "Failed to unregister webhook",
              details: unsubscribeResult.message || unsubscribeResult.error,
            },
            { status: unsubscribeResponse.status }
          );
        }

        return NextResponse.json({
          success: true,
          action: "unsubscribed",
          url,
          response: unsubscribeResult,
        });
      }

      case "list": {
        // Get current webhook registrations
        const listResponse = await fetch(`${AYRSHARE_API_URL}/webhook`, {
          method: "GET",
          headers,
        });

        const listResult = await listResponse.json();

        if (!listResponse.ok) {
          return NextResponse.json(
            {
              error: "Failed to list webhooks",
              details: listResult.message || listResult.error,
            },
            { status: listResponse.status }
          );
        }

        return NextResponse.json({
          success: true,
          webhooks: listResult,
          availableEvents: AVAILABLE_EVENTS,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'subscribe', 'unsubscribe', or 'list'` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Webhook registration error:", error);
    return NextResponse.json(
      {
        error: "Webhook registration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ayrshare-webhooks/register
 * Get available webhook events and current registrations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileKey = searchParams.get("profileKey");

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

    // Get current webhook registrations
    const listResponse = await fetch(`${AYRSHARE_API_URL}/webhook`, {
      method: "GET",
      headers,
    });

    const listResult = await listResponse.json();

    // Get the base URL for webhook endpoint
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const webhookEndpoint = `${protocol}://${host}/api/webhooks/ayrshare`;

    return NextResponse.json({
      success: true,
      currentWebhooks: listResult,
      availableEvents: AVAILABLE_EVENTS,
      suggestedWebhookUrl: webhookEndpoint,
      eventDescriptions: {
        post: "Triggered when a post is created or published",
        schedule: "Triggered when a post is scheduled",
        delete: "Triggered when a post is deleted",
        comment: "Triggered when a new comment is received",
        message: "Triggered when a new direct message is received",
        analytics: "Triggered when analytics data is updated",
        link: "Triggered when a social account is linked or unlinked",
        review: "Triggered when a new review is received",
      },
    });
  } catch (error) {
    console.error("Webhook list error:", error);
    return NextResponse.json(
      {
        error: "Failed to get webhook information",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

