import { NextRequest, NextResponse } from "next/server";

const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

// Unified engagement item type
interface EngagementItem {
  id: string;
  type: "dm" | "comment" | "review";
  platform: string;
  sender: {
    id: string;
    username: string;
    displayName?: string;
    profileUrl?: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  isRead: boolean;
  // Type-specific fields
  postId?: string; // For comments
  rating?: number; // For reviews
  conversationId?: string; // For DMs
  sentiment?: "positive" | "negative" | "neutral"; // For comments
  replied?: boolean; // For reviews/comments
  requiresResponse?: boolean;
  attachments?: any[];
}

interface EngagementStats {
  total: number;
  unread: number;
  byType: {
    dm: number;
    comment: number;
    review: number;
  };
  byPlatform: Record<string, number>;
  needsResponse: number;
}

/**
 * GET /api/engagement
 * Fetch all engagement (DMs, Comments, Reviews) from connected social accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "dm" | "comment" | "review" | null (all)
    const platform = searchParams.get("platform");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const needsResponse = searchParams.get("needsResponse") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");
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

    const allItems: EngagementItem[] = [];
    const errors: string[] = [];

    // Fetch DMs if not filtering by type or type is "dm"
    if (!type || type === "dm") {
      try {
        const dmParams = new URLSearchParams();
        if (platform) dmParams.append("platform", platform);
        dmParams.append("limit", limit.toString());

        const dmResponse = await fetch(
          `${AYRSHARE_API_URL}/messages?${dmParams.toString()}`,
          { method: "GET", headers }
        );

        if (dmResponse.ok) {
          const dmData = await dmResponse.json();
          const messages = Array.isArray(dmData) ? dmData : dmData.messages || [];
          
          messages.forEach((msg: any) => {
            allItems.push({
              id: msg.id || msg._id || `dm-${Date.now()}-${Math.random()}`,
              type: "dm",
              platform: msg.platform || "unknown",
              sender: {
                id: msg.senderId || msg.from?.id || "unknown",
                username: msg.senderUsername || msg.from?.username || msg.from?.name || "Unknown",
                profileUrl: msg.senderProfileUrl || msg.from?.profileUrl,
                avatar: msg.from?.avatar,
              },
              content: msg.content || msg.message || msg.text || "",
              timestamp: msg.createdAt || msg.timestamp || msg.date || new Date().toISOString(),
              isRead: msg.read || msg.isRead || false,
              conversationId: msg.conversationId || msg.threadId,
              attachments: msg.attachments || msg.media || [],
            });
          });
        }
      } catch (e) {
        errors.push(`DMs: ${e instanceof Error ? e.message : "Failed to fetch"}`);
      }
    }

    // Fetch Comments if not filtering by type or type is "comment"
    if (!type || type === "comment") {
      try {
        const commentParams = new URLSearchParams();
        if (platform) commentParams.append("platform", platform);
        commentParams.append("limit", limit.toString());

        const commentResponse = await fetch(
          `${AYRSHARE_API_URL}/comments?${commentParams.toString()}`,
          { method: "GET", headers }
        );

        if (commentResponse.ok) {
          const commentData = await commentResponse.json();
          const comments = commentData.comments || commentData || [];
          
          if (Array.isArray(comments)) {
            comments.forEach((comment: any) => {
              // Analyze sentiment based on content
              const sentiment = analyzeSentiment(comment.comment || comment.text || "");
              
              allItems.push({
                id: comment.id || comment._id || `comment-${Date.now()}-${Math.random()}`,
                type: "comment",
                platform: comment.platform || "unknown",
                sender: {
                  id: comment.authorId || comment.userId || "unknown",
                  username: comment.authorUsername || comment.author || "Unknown",
                  displayName: comment.authorName,
                  profileUrl: comment.authorProfileUrl,
                  avatar: comment.authorAvatar,
                },
                content: comment.comment || comment.text || "",
                timestamp: comment.createdAt || comment.timestamp || new Date().toISOString(),
                isRead: comment.read || false,
                postId: comment.postId,
                sentiment,
                replied: comment.replied || false,
                requiresResponse: !comment.replied && sentiment !== "positive",
              });
            });
          }
        }
      } catch (e) {
        errors.push(`Comments: ${e instanceof Error ? e.message : "Failed to fetch"}`);
      }
    }

    // Fetch Reviews if not filtering by type or type is "review"
    if (!type || type === "review") {
      try {
        const reviewParams = new URLSearchParams();
        if (platform) reviewParams.append("platform", platform);
        reviewParams.append("limit", limit.toString());

        const reviewResponse = await fetch(
          `${AYRSHARE_API_URL}/reviews?${reviewParams.toString()}`,
          { method: "GET", headers }
        );

        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          const reviews = reviewData.reviews || reviewData || [];
          
          if (Array.isArray(reviews)) {
            reviews.forEach((review: any) => {
              const sentiment = review.rating >= 4 ? "positive" : review.rating <= 2 ? "negative" : "neutral";
              
              allItems.push({
                id: review.id || review._id || `review-${Date.now()}-${Math.random()}`,
                type: "review",
                platform: review.platform || "google",
                sender: {
                  id: review.authorId || "unknown",
                  username: review.authorName || "Anonymous",
                  displayName: review.authorName,
                },
                content: review.content || review.text || "",
                timestamp: review.timestamp || review.createdAt || new Date().toISOString(),
                isRead: review.read || false,
                rating: review.rating,
                sentiment,
                replied: review.replied || false,
                requiresResponse: !review.replied,
              });
            });
          }
        }
      } catch (e) {
        errors.push(`Reviews: ${e instanceof Error ? e.message : "Failed to fetch"}`);
      }
    }

    // Apply filters
    let filteredItems = allItems;

    if (unreadOnly) {
      filteredItems = filteredItems.filter((item) => !item.isRead);
    }

    if (needsResponse) {
      filteredItems = filteredItems.filter((item) => item.requiresResponse);
    }

    // Sort by timestamp (newest first)
    filteredItems.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Limit results
    filteredItems = filteredItems.slice(0, limit);

    // Calculate stats
    const stats: EngagementStats = {
      total: filteredItems.length,
      unread: filteredItems.filter((i) => !i.isRead).length,
      byType: {
        dm: filteredItems.filter((i) => i.type === "dm").length,
        comment: filteredItems.filter((i) => i.type === "comment").length,
        review: filteredItems.filter((i) => i.type === "review").length,
      },
      byPlatform: {},
      needsResponse: filteredItems.filter((i) => i.requiresResponse).length,
    };

    // Count by platform
    filteredItems.forEach((item) => {
      stats.byPlatform[item.platform] = (stats.byPlatform[item.platform] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      items: filteredItems,
      stats,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Engagement fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch engagement",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Simple sentiment analysis based on keywords
 */
function analyzeSentiment(text: string): "positive" | "negative" | "neutral" {
  const lowerText = text.toLowerCase();
  
  const positiveWords = ["love", "great", "amazing", "awesome", "excellent", "thank", "thanks", "beautiful", "perfect", "best", "wonderful", "fantastic", "good", "nice", "helpful", "appreciate"];
  const negativeWords = ["hate", "bad", "terrible", "awful", "worst", "horrible", "disappointed", "disappointing", "poor", "sucks", "annoying", "frustrated", "angry", "scam", "fake", "spam"];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach((word) => {
    if (lowerText.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach((word) => {
    if (lowerText.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return "positive";
  if (negativeCount > positiveCount) return "negative";
  return "neutral";
}

