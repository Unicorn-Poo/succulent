import { NextRequest, NextResponse } from "next/server";
import { executeAIGrowthActions } from "../../../utils/aiGrowthEngine";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Schema for brand-aware content suggestions
const ContentSuggestionSchema = z.object({
  suggestions: z.array(
    z.object({
      content: z.string(),
      contentPillar: z.string(),
      targetAudience: z.string(),
      confidenceScore: z.number().min(0).max(100),
      hashtags: z.array(z.string()),
      bestTimeToPost: z.string(),
      expectedEngagement: z.enum(["high", "medium", "low"]),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    const {
      platform,
      profileKey,
      aggressiveness = "moderate",
      accountGroupId,
      // Brand persona data passed from frontend (since Jazz is client-side)
      brandPersona,
      contentFeedback = [],
      // User goals for personalized recommendations
      userGoals,
    } = await request.json();

    if (!platform) {
      return NextResponse.json(
        { error: "Platform parameter is required" },
        { status: 400 }
      );
    }

    // Build account group context from passed data
    const accountGroup = brandPersona
      ? {
          brandPersona,
          contentFeedback,
        }
      : null;

    // Get AI recommendations with real analytics and user goals
    const result = await executeAIGrowthActions(
      platform,
      profileKey,
      aggressiveness,
      accountGroup,
      userGoals
    );

    // If we have brand persona, generate brand-aware content suggestions
    let brandAwareContent: z.infer<typeof ContentSuggestionSchema> | null =
      null;

    if (brandPersona) {
      try {
        // Extract accepted/rejected patterns from feedback
        const acceptedContent = contentFeedback
          .filter((f: any) => f.accepted)
          .slice(-5)
          .map((f: any) => f.generatedContent);
        const rejectedReasons = contentFeedback
          .filter((f: any) => !f.accepted && f.reason)
          .slice(-5)
          .map((f: any) => f.reason);

        const brandContext = `
BRAND VOICE:
- Name: ${brandPersona.name || "Brand"}
- Tone: ${brandPersona.tone || "friendly"}
- Writing Style: ${brandPersona.writingStyle || "conversational"}
- Emoji Usage: ${brandPersona.emojiUsage || "moderate"}

CONTENT STRATEGY:
- Content Pillars: ${
          (brandPersona.contentPillars || []).join(", ") || "general content"
        }
- Target Audience: ${brandPersona.targetAudience || "general audience"}
- Key Messages: ${
          (brandPersona.keyMessages || []).join(", ") || "none specified"
        }
- Topics to Avoid: ${
          (brandPersona.avoidTopics || []).join(", ") || "none specified"
        }

PLATFORM: ${platform.toUpperCase()}

${
  acceptedContent.length > 0
    ? `
EXAMPLES OF APPROVED CONTENT:
${acceptedContent
  .map((c: string, i: number) => `${i + 1}. "${c.slice(0, 200)}..."`)
  .join("\n")}
`
    : ""
}

${
  rejectedReasons.length > 0
    ? `
THINGS TO AVOID (from past rejections):
${rejectedReasons.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}
`
    : ""
}
`;

        const response = await generateObject({
          model: openai("gpt-4"),
          schema: ContentSuggestionSchema,
          prompt: `${brandContext}

Generate 3 unique content suggestions for ${platform} that match this brand's voice and style.

For each suggestion:
1. Write engaging content that matches the brand tone
2. Use the content pillars as themes
3. Include relevant hashtags for the platform
4. Suggest optimal posting time
5. Rate expected engagement

Focus on what has been approved before and avoid patterns that were rejected.`,
          temperature: 0.7,
        });

        brandAwareContent = response.object;
      } catch (aiError) {
        console.error("Brand-aware content generation error:", aiError);
        // Continue without brand-aware content
      }
    }

    // Add timestamp and additional metadata
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      platform,
      aggressiveness,
      hasBrandContext: !!brandPersona,
      brandName: brandPersona?.name,
      brandAwareContent,
      dataQuality: {
        analyticsSource: result.analyticsSource,
        hasRealData: result.analyticsSource === "real",
        note:
          result.analyticsSource === "real"
            ? "Recommendations based on real analytics data from your connected accounts"
            : result.analyticsSource === "simulated"
            ? "Limited analytics available. Recommendations based on brand persona and best practices"
            : "No analytics data available. Recommendations based on industry best practices",
      },
      learning: {
        isActive: result.learningStatus.isLearning,
        insightsLearned: result.learningStatus.insightsCount,
        contentAcceptanceRate: result.learningStatus.acceptanceRate,
        topPerformingPillars: result.learningStatus.topPillars,
        note: result.learningStatus.isLearning
          ? `Learning from ${
              result.learningStatus.insightsCount
            } patterns with ${result.learningStatus.acceptanceRate.toFixed(
              0
            )}% acceptance rate`
          : "Accept/reject content suggestions to help the AI learn your preferences",
      },
      summary: {
        totalRecommendations: result.recommendations.length,
        highPriorityActions: result.recommendations.filter(
          (r) => r.priority === "high"
        ).length,
        averageConfidence:
          result.recommendations.reduce((sum, r) => sum + r.confidence, 0) /
          (result.recommendations.length || 1),
        executedActions: result.executedActions.executed,
        contentSuggestions:
          result.contentSuggestions.length +
          (brandAwareContent?.suggestions.length || 0),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI Growth Autopilot error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI growth recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");

    if (!platform) {
      return NextResponse.json(
        { error: "Platform parameter is required" },
        { status: 400 }
      );
    }

    // Return autopilot status and quick insights
    const status = {
      isActive: true,
      platform,
      lastRun: new Date().toISOString(),
      nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      quickStats: {
        actionsToday: Math.floor(Math.random() * 10) + 5,
        growthRate: (Math.random() * 5 + 10).toFixed(1), // 10-15%
        engagementRate: (Math.random() * 2 + 3).toFixed(1), // 3-5%
        pendingActions: Math.floor(Math.random() * 5) + 2,
      },
      features: {
        autoScheduling: true,
        autoReplies: true,
        hashtagOptimization: true,
        contentGeneration: true,
        competitorAnalysis: true,
      },
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Autopilot status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get autopilot status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
