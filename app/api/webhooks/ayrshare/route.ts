import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Webhook event types from Ayrshare
type WebhookEventType = 
  | "post.created"
  | "post.published" 
  | "post.failed"
  | "comment.received"
  | "follower.new"
  | "mention.received"
  | "analytics.updated";

interface AyrshareWebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: {
    id?: string;
    platform?: string;
    profileKey?: string;
    postId?: string;
    content?: string;
    author?: {
      username: string;
      id: string;
      avatar?: string;
    };
    error?: string;
    [key: string]: any;
  };
}

/**
 * Verify webhook signature from Ayrshare
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Handle new comment webhook - trigger auto-reply if enabled
 */
async function handleNewComment(data: AyrshareWebhookPayload["data"]) {
  // In production, you would:
  // 1. Check if auto-reply is enabled for this account
  // 2. Generate AI reply
  // 3. Post the reply
  // 4. Log the automation action

  return {
    action: "comment.received",
    processed: true,
    message: `New comment from @${data.author?.username || "unknown"}`,
  };
}

/**
 * Handle new follower webhook - trigger welcome DM if enabled
 */
async function handleNewFollower(data: AyrshareWebhookPayload["data"]) {
  // In production, you would:
  // 1. Check if auto-DM is enabled for this account
  // 2. Generate welcome message
  // 3. Send the DM (if platform allows)
  // 4. Log the automation action

  return {
    action: "follower.new",
    processed: true,
    message: `New follower: @${data.author?.username || "unknown"}`,
  };
}

/**
 * Handle post published webhook - update Jazz records
 */
async function handlePostPublished(data: AyrshareWebhookPayload["data"]) {
  // Update the post status in Jazz
  return {
    action: "post.published",
    processed: true,
    postId: data.postId || data.id,
    platform: data.platform,
  };
}

/**
 * Handle post failed webhook - log error
 */
async function handlePostFailed(data: AyrshareWebhookPayload["data"]) {
  console.error("Post failed:", data.error);
  
  return {
    action: "post.failed",
    processed: true,
    postId: data.postId || data.id,
    error: data.error,
  };
}

/**
 * POST /api/webhooks/ayrshare
 * Handle incoming webhooks from Ayrshare
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-ayrshare-signature") || "";
    const webhookSecret = process.env.AYRSHARE_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const payload: AyrshareWebhookPayload = JSON.parse(rawBody);
    const { event, data, timestamp } = payload;

    let result;

    switch (event) {
      case "comment.received":
        result = await handleNewComment(data);
        break;
      
      case "follower.new":
        result = await handleNewFollower(data);
        break;
      
      case "post.published":
        result = await handlePostPublished(data);
        break;
      
      case "post.failed":
        result = await handlePostFailed(data);
        break;
      
      case "mention.received":
        // Handle mentions - could trigger notifications or auto-replies
        result = {
          action: "mention.received",
          processed: true,
          from: data.author?.username,
        };
        break;
      
      case "analytics.updated":
        // Trigger analytics refresh
        result = {
          action: "analytics.updated",
          processed: true,
        };
        break;
      
      default:
        result = {
          action: event,
          processed: false,
          message: "Unhandled event type",
        };
    }

    // Log the webhook for debugging
    console.log(`Webhook received: ${event}`, {
      timestamp,
      platform: data.platform,
      result,
    });

    return NextResponse.json({
      received: true,
      event,
      timestamp,
      ...result,
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/ayrshare
 * Webhook verification endpoint (some services use GET for verification)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = searchParams.get("hub.verify_token");
  
  // For webhook verification (e.g., Facebook/Instagram)
  if (challenge && verifyToken) {
    const expectedToken = process.env.AYRSHARE_WEBHOOK_VERIFY_TOKEN;
    
    if (verifyToken === expectedToken) {
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    status: "Webhook endpoint active",
    supportedEvents: [
      "post.created",
      "post.published",
      "post.failed",
      "comment.received",
      "follower.new",
      "mention.received",
      "analytics.updated",
    ],
  });
}

