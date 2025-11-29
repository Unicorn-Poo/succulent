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

    // 🔍 DEBUG: Log what we received from frontend
    console.log('🔍 [AI-GROWTH-AUTOPILOT] Received from frontend:', {
      platform,
      hasBrandPersona: !!brandPersona,
      brandPersonaName: brandPersona?.name,
      contentPillarsType: typeof brandPersona?.contentPillars,
      contentPillarsIsArray: Array.isArray(brandPersona?.contentPillars),
      contentPillarsLength: brandPersona?.contentPillars?.length,
      contentPillars: brandPersona?.contentPillars,
      samplePostsLength: brandPersona?.samplePosts?.length,
    });

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
        // CRITICAL: Validate that contentPillars is actually an array with content
        const contentPillars = Array.isArray(brandPersona.contentPillars) && brandPersona.contentPillars.length > 0
          ? brandPersona.contentPillars
          : null;

        // 🔍 DEBUG: Log content pillars validation
        console.log('🔍 [AI-GROWTH-AUTOPILOT] Content pillars validation:', {
          rawContentPillars: brandPersona.contentPillars,
          isArray: Array.isArray(brandPersona.contentPillars),
          length: brandPersona.contentPillars?.length,
          validatedPillars: contentPillars,
          willGenerateContent: !!contentPillars,
        });

        // If no valid content pillars, skip brand-aware generation - don't generate garbage
        if (!contentPillars) {
          console.error("❌ [AI-GROWTH-AUTOPILOT] No valid content pillars found - skipping brand-aware content generation");
        } else {
          // Extract accepted/rejected patterns from feedback
          const acceptedContent = contentFeedback
            .filter((f: any) => f.accepted)
            .slice(-5)
            .map((f: any) => f.generatedContent);
          const rejectedReasons = contentFeedback
            .filter((f: any) => !f.accepted && f.reason)
            .slice(-5)
            .map((f: any) => f.reason);

          // Get sample posts for few-shot learning
          const samplePosts = Array.isArray(brandPersona.samplePosts) && brandPersona.samplePosts.length > 0
            ? brandPersona.samplePosts
            : [];

          const brandContext = `
BRAND IDENTITY:
- Name: ${brandPersona.name || "Brand"}
- Tone: ${brandPersona.tone || "friendly"}
- Writing Style: ${brandPersona.writingStyle || "conversational"}
- Emoji Usage: ${brandPersona.emojiUsage || "moderate"}
- Language Level: ${brandPersona.languageLevel || "intermediate"}

YOUR CONTENT PILLARS (ONLY create content about these topics):
${contentPillars.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

TARGET AUDIENCE: ${brandPersona.targetAudience || "not specified"}
VALUE PROPOSITION: ${brandPersona.valueProposition || "not specified"}

TOPICS TO STRICTLY AVOID: ${
            Array.isArray(brandPersona.avoidTopics) && brandPersona.avoidTopics.length > 0
              ? brandPersona.avoidTopics.join(", ")
              : "none specified"
          }

PLATFORM: ${platform.toUpperCase()}

${
  samplePosts.length > 0
    ? `
EXAMPLE POSTS FROM THIS BRAND (MATCH THIS EXACT STYLE AND VOICE):
${samplePosts.slice(0, 3).map((p: string, i: number) => `${i + 1}. "${p}"`).join("\n\n")}
`
    : ""
}

${
  acceptedContent.length > 0
    ? `
PREVIOUSLY APPROVED CONTENT (this style works):
${acceptedContent.map((c: string, i: number) => `${i + 1}. "${c.slice(0, 300)}..."`).join("\n")}
`
    : ""
}

${
  rejectedReasons.length > 0
    ? `
PREVIOUSLY REJECTED - AVOID THESE PATTERNS:
${rejectedReasons.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}
`
    : ""
}
`;

          // 🔍 DEBUG: Log what we're sending to GPT-4
          // Add platform-specific formatting rules
          const platformSpecificRules = platform.toLowerCase() === 'tiktok' 
            ? `
⚠️ TIKTOK-SPECIFIC RULES (CRITICAL):
- MAX 150 characters per caption
- This is a CAPTION to accompany a video, NOT a video script
- NO "[Scene:]", NO "**Hook**:", NO "**Outro**:", NO script directions
- Just write a catchy one-liner or question
- Example good TikTok captions:
  "this changes everything about how I work 👀"
  "POV: when the code finally compiles"
  "tell me you're a designer without telling me"
` 
            : '';

          const promptForAI = `${brandContext}
${platformSpecificRules}
Generate 3 unique ${platform} posts. Each post MUST be about a DIFFERENT content pillar from the list above.

Requirements:
1. Post 1: About "${contentPillars[0]}"
2. Post 2: About "${contentPillars[1] || contentPillars[0]}"
3. Post 3: About "${contentPillars[2] || contentPillars[0]}"

Each post must:
- Be written in the brand's authentic voice (match the sample posts if provided)
- Be SPECIFIC to the content pillar topic - not generic advice
- Include relevant hashtags at the end
- Be ready to copy-paste and post immediately
- Sound human and natural, not AI-generated
${platform.toLowerCase() === 'tiktok' ? '- BE UNDER 150 CHARACTERS - this is a caption, not a script!' : ''}

Put timing suggestions in "bestTimeToPost" field, NOT in the content.`;

          console.log('🔍 [AI-GROWTH-AUTOPILOT] Sending to GPT-4:', {
            pillarsInPrompt: [contentPillars[0], contentPillars[1], contentPillars[2]],
            promptLength: promptForAI.length,
            brandContextPreview: brandContext.slice(0, 500) + '...',
          });

          const response = await generateObject({
            model: openai("gpt-4"),
            schema: ContentSuggestionSchema,
            system: `You are the voice of "${brandPersona.name || "this brand"}". Generate AUTHENTIC content that sounds like it was written by this specific brand.

CRITICAL FORMATTING RULES:
1. NO MARKDOWN - social platforms don't render **bold** or *italic* or # headers. Just use plain text.
2. Use ACTUAL LINE BREAKS (newlines) to format content - not markdown
3. For TikTok: Write a SHORT caption (under 150 chars) - NOT a video script. No "[Scene:]" or "**Hook**:" directions.
4. For Instagram/LinkedIn: Use line breaks between paragraphs for readability
5. Hashtags go at the END, each on its own line or space-separated
6. NEVER use em-dashes (—) - they scream AI-generated content. Use commas, periods, or line breaks instead.

CRITICAL CONTENT RULES:
1. Each post must be about ONE of the provided content pillars - NO generic productivity/lifestyle garbage
2. Write as the brand IN FIRST PERSON - you ARE this brand
3. Match the exact tone, style, and voice from the example posts
4. Output ONLY the actual post text - copy-paste ready to publish
5. NO metadata: no "Best Time to Post", no "Engagement Tip", no "Suggested Content:" headers
6. NO video script formatting: no "[Scene:]", no "**Hook**:", no "**Script**:", no "**Outro**:"
7. Be SPECIFIC and AUTHENTIC - reference the actual topics from the content pillars
8. NO generic clickbait like "Productivity Hack" or "Morning Routine" unless that's actually in the pillars
9. NO em-dashes (—), NO "let's dive in", NO "here's the thing", NO "game-changer" - these are AI clichés

PLATFORM FORMATS:
- Instagram: Hook line, then 2-3 short paragraphs with line breaks, then hashtags
- TikTok: ONE short punchy sentence or question (this is a CAPTION, not a script)
- LinkedIn: Professional but personal, use line breaks, 3-5 paragraphs
- X/Twitter: Under 280 chars, punchy, 1-2 hashtags max

REMEMBER: You are creating CAPTIONS/POSTS, not video scripts or articles.`,
            prompt: promptForAI,
            temperature: 0.85,
          });

          // 🔍 DEBUG: Log what GPT-4 returned
          console.log('🔍 [AI-GROWTH-AUTOPILOT] GPT-4 returned:', {
            suggestionsCount: response.object?.suggestions?.length,
            firstSuggestionPillar: response.object?.suggestions?.[0]?.contentPillar,
            firstSuggestionContentPreview: response.object?.suggestions?.[0]?.content?.slice(0, 100),
          });

          brandAwareContent = response.object;
        }
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
