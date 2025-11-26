import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Ayrshare API base URL
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

interface ReplyRequest {
  commentId: string;
  commentText: string;
  commentAuthor: string;
  postId: string;
  platform: string;
  profileKey?: string;
  brandPersona?: {
    tone: string;
    personality: string[];
    commentStyle?: string;
  };
}

/**
 * Generate AI reply based on brand persona
 */
async function generateAIReply(
  commentText: string,
  commentAuthor: string,
  brandPersona?: ReplyRequest["brandPersona"]
): Promise<string> {
  const tone = brandPersona?.tone || "friendly";
  const personality =
    brandPersona?.personality?.join(", ") || "helpful, authentic";
  const commentStyle = brandPersona?.commentStyle || "supportive";

  const prompt = `You are a social media manager responding to a comment on behalf of a brand.

BRAND VOICE:
- Tone: ${tone}
- Personality: ${personality}
- Comment style: ${commentStyle}

COMMENT TO RESPOND TO:
From: @${commentAuthor}
Comment: "${commentText}"

Generate a natural, engaging reply that:
1. Acknowledges the commenter appropriately
2. Matches the brand voice
3. Is concise (1-2 sentences max)
4. Encourages further engagement if appropriate
5. Uses emojis sparingly (0-2 max)

Reply:`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      temperature: 0.7,
    });

    return text.trim();
  } catch (error) {
    console.error("AI reply generation error:", error);
    // Fallback to a simple thank you
    return `Thanks for your comment, @${commentAuthor}! 🙏`;
  }
}

/**
 * POST /api/automation/reply
 * Auto-reply to a comment on social media
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReplyRequest = await request.json();
    const {
      commentId,
      commentText,
      commentAuthor,
      postId,
      platform,
      profileKey,
      brandPersona,
    } = body;

    if (!commentId || !commentText || !postId || !platform) {
      return NextResponse.json(
        { error: "commentId, commentText, postId, and platform are required" },
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

    // Generate AI reply
    const replyText = await generateAIReply(
      commentText,
      commentAuthor,
      brandPersona
    );

    // Call Ayrshare API to post the reply
    // Note: Ayrshare's comment API varies by platform
    const replyPayload: any = {
      id: postId,
      platforms: [platform],
      comment: replyText,
    };

    if (profileKey) {
      replyPayload.profileKey = profileKey;
    }

    // For Instagram/Facebook, we need to reply to the specific comment
    if (platform === "instagram" || platform === "facebook") {
      replyPayload.commentId = commentId;
    }

    const response = await fetch(`${AYRSHARE_API_URL}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(replyPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Ayrshare reply error:", result);
      return NextResponse.json(
        {
          error: "Failed to post reply",
          details: result.message || result.error,
          generatedReply: replyText, // Still return the generated reply
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      replyId: result.id,
      replyText,
      platform,
      originalComment: {
        id: commentId,
        author: commentAuthor,
        text: commentText,
      },
      ayrshareResponse: result,
    });
  } catch (error) {
    console.error("Reply API error:", error);
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
 * GET /api/automation/reply
 * Get comments that need replies (from Ayrshare)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform") || "instagram";
    const profileKey = searchParams.get("profileKey");

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ayrshare API key not configured" },
        { status: 500 }
      );
    }

    // Fetch recent comments that need replies
    const params = new URLSearchParams({ platform });
    if (profileKey) params.append("profileKey", profileKey);

    const response = await fetch(`${AYRSHARE_API_URL}/comments?${params}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch comments", details: result },
        { status: response.status }
      );
    }

    // Filter comments that haven't been replied to (if that info is available)
    const unrepliedComments =
      result.comments?.filter((c: any) => !c.replied) || result;

    return NextResponse.json({
      platform,
      comments: unrepliedComments,
      count: Array.isArray(unrepliedComments) ? unrepliedComments.length : 0,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
