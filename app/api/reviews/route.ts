import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const dynamic = 'force-dynamic';

const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

interface Review {
  id: string;
  platform: string;
  authorName: string;
  authorId?: string;
  rating: number;
  content: string;
  timestamp: string;
  replied: boolean;
  replyContent?: string;
  replyTimestamp?: string;
}

interface ReviewFilters {
  platform?: string;
  minRating?: number;
  maxRating?: number;
  unrepliedOnly?: boolean;
  since?: string;
}

/**
 * GET /api/reviews
 * Fetch reviews from connected platforms (Google Business, Facebook, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const minRating = searchParams.get("minRating");
    const maxRating = searchParams.get("maxRating");
    const unrepliedOnly = searchParams.get("unrepliedOnly") === "true";
    const profileKey = searchParams.get("profileKey");
    const limit = parseInt(searchParams.get("limit") || "50");

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

    // Build query params
    const queryParams = new URLSearchParams();
    if (platform) queryParams.append("platform", platform);
    if (limit) queryParams.append("limit", limit.toString());

    // Fetch reviews from Ayrshare
    const reviewsUrl = `${AYRSHARE_API_URL}/reviews${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(reviewsUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // If reviews endpoint isn't available, return empty with info
      if (response.status === 404 || response.status === 501) {
        return NextResponse.json({
          success: true,
          reviews: [],
          info: "Review management may require additional platform connections or subscription tiers",
          supportedPlatforms: ["google", "facebook", "yelp"],
        });
      }

      return NextResponse.json(
        {
          error: "Failed to fetch reviews",
          details: errorData.message || errorData.error || `Status: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    let reviews: Review[] = Array.isArray(data) ? data : data.reviews || [];

    // Apply local filters
    if (minRating) {
      reviews = reviews.filter((r) => r.rating >= parseInt(minRating));
    }
    if (maxRating) {
      reviews = reviews.filter((r) => r.rating <= parseInt(maxRating));
    }
    if (unrepliedOnly) {
      reviews = reviews.filter((r) => !r.replied);
    }

    // Calculate stats
    const stats = {
      total: reviews.length,
      averageRating: reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : 0,
      unreplied: reviews.filter((r) => !r.replied).length,
      byRating: {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      },
    };

    return NextResponse.json({
      success: true,
      reviews: reviews.map((review) => ({
        id: review.id,
        platform: review.platform,
        authorName: review.authorName,
        authorId: review.authorId,
        rating: review.rating,
        content: review.content,
        timestamp: review.timestamp,
        replied: review.replied || false,
        replyContent: review.replyContent,
        replyTimestamp: review.replyTimestamp,
      })),
      stats,
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch reviews",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Reply to a review with AI-generated or custom response
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reviewId,
      platform,
      reply,
      generateAI,
      reviewContent,
      reviewRating,
      authorName,
      brandPersona,
      profileKey,
    } = body;

    if (!reviewId || !platform) {
      return NextResponse.json(
        { error: "reviewId and platform are required" },
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

    let replyContent = reply;

    // Generate AI reply if requested
    if (generateAI && reviewContent) {
      replyContent = await generateAIReply(
        reviewContent,
        reviewRating || 5,
        authorName,
        brandPersona
      );
    }

    if (!replyContent) {
      return NextResponse.json(
        { error: "Reply content is required (provide reply or set generateAI=true)" },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    if (profileKey) {
      headers["Profile-Key"] = profileKey;
    }

    // Post reply to Ayrshare
    const replyPayload = {
      reviewId,
      platform,
      reply: replyContent,
    };

    const response = await fetch(`${AYRSHARE_API_URL}/reviews/reply`, {
      method: "POST",
      headers,
      body: JSON.stringify(replyPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Failed to post reply",
          details: result.message || result.error,
          generatedReply: replyContent, // Return generated reply even if posting fails
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      reviewId,
      reply: replyContent,
      wasAIGenerated: generateAI || false,
      response: result,
    });
  } catch (error) {
    console.error("Review reply error:", error);
    return NextResponse.json(
      {
        error: "Failed to reply to review",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI reply based on review content and brand persona
 */
async function generateAIReply(
  reviewContent: string,
  rating: number,
  authorName?: string,
  brandPersona?: { tone?: string; personality?: string[]; businessName?: string }
): Promise<string> {
  const tone = brandPersona?.tone || "professional and warm";
  const personality = brandPersona?.personality?.join(", ") || "helpful, genuine, appreciative";
  const businessName = brandPersona?.businessName || "our team";

  const isPositive = rating >= 4;
  const isNegative = rating <= 2;
  const isNeutral = rating === 3;

  let contextPrompt = "";
  if (isPositive) {
    contextPrompt = `This is a positive review (${rating}/5 stars). Express genuine gratitude and appreciation.`;
  } else if (isNegative) {
    contextPrompt = `This is a negative review (${rating}/5 stars). Be empathetic, apologetic, and offer to make things right. Do not be defensive.`;
  } else {
    contextPrompt = `This is a neutral review (${rating}/5 stars). Thank them for the feedback and ask how you can improve.`;
  }

  const prompt = `You are responding to a customer review on behalf of a business.

BRAND VOICE:
- Tone: ${tone}
- Personality: ${personality}
- Business: ${businessName}

REVIEW:
${authorName ? `From: ${authorName}` : ""}
Rating: ${rating}/5 stars
Content: "${reviewContent}"

${contextPrompt}

Guidelines:
1. Keep response concise (2-4 sentences)
2. Be genuine, not corporate or scripted
3. ${isPositive ? "Thank them warmly and invite them back" : ""}
4. ${isNegative ? "Apologize sincerely and offer a solution or contact method" : ""}
5. ${isNeutral ? "Acknowledge feedback and express desire to improve" : ""}
6. Address them by name if provided
7. Sign off naturally (avoid "Best regards" etc)
8. Do not use em-dashes
9. Sound human, not AI-generated

Response:`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      temperature: 0.7,
    });

    return text.trim();
  } catch (error) {
    console.error("AI review reply generation error:", error);

    // Fallback responses
    if (isPositive) {
      return `Thank you so much${authorName ? `, ${authorName}` : ""}! We're thrilled you had a great experience. Looking forward to seeing you again soon!`;
    } else if (isNegative) {
      return `We're sorry to hear about your experience${authorName ? `, ${authorName}` : ""}. This isn't the standard we aim for, and we'd love the chance to make it right. Please reach out to us directly so we can help.`;
    } else {
      return `Thank you for your feedback${authorName ? `, ${authorName}` : ""}! We appreciate you taking the time to share your thoughts and are always looking for ways to improve.`;
    }
  }
}

/**
 * Generate suggested replies for multiple reviews
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviews, brandPersona, profileKey } = body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { error: "reviews array is required" },
        { status: 400 }
      );
    }

    // Generate AI replies for each review
    const suggestedReplies = await Promise.all(
      reviews.slice(0, 10).map(async (review: any) => {
        const reply = await generateAIReply(
          review.content,
          review.rating,
          review.authorName,
          brandPersona
        );

        return {
          reviewId: review.id,
          suggestedReply: reply,
          rating: review.rating,
        };
      })
    );

    return NextResponse.json({
      success: true,
      suggestedReplies,
      generated: suggestedReplies.length,
    });
  } catch (error) {
    console.error("Bulk reply generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate suggested replies",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

