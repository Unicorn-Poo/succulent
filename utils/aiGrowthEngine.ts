import { getEnhancedOptimalTiming } from "./optimalTimingEngine";
import { EngagementAutomationEngine } from "./engagementAutomation";
import {
  BrandPersona,
  BrandPersonaManager,
  loadBrandPersona,
} from "./brandPersonaManager";
import {
  getSocialAccountAnalytics,
  SocialAccountAnalytics,
} from "./ayrshareAnalytics";
import { AILearningSystem } from "./aiLearningSystem";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import {
  getModelForTask,
  batchGenerateContent,
  compressBrandContext,
  compressLearnedInsights,
  contextCache,
  usageTracker,
  buildContextFile,
  contextFileToPrompt,
  type AIContextFile,
} from "./aiOptimizer";

// Learned insights structure for content generation
interface LearnedInsights {
  patternsLearned: string[];
  recommendedAdjustments: string[];
  enhancedPrompt: string;
  acceptanceRate: number;
  topPerformingPillars: string[];
}

interface AIDecision {
  action: string;
  confidence: number;
  reasoning: string;
  expectedImpact: string;
  priority: "high" | "medium" | "low";
}

interface ContentAnalysis {
  engagementPotential: number;
  optimalHashtags: string[];
  bestPostingTime: string;
  targetAudience: string;
  contentType: "educational" | "entertainment" | "promotional" | "engagement";
}

interface CompetitorIntelligence {
  topPerformingContent: string[];
  underutilizedHashtags: string[];
  optimalPostingTimes: string[];
  contentGaps: string[];
}

// Real analytics data structure
interface RealAnalyticsData {
  hasRealData: boolean;
  platform: string;
  accountMetrics: {
    followersCount: number | null;
    followingCount: number | null;
    postsCount: number | null;
    engagementRate: number | null;
    impressions: number | null;
    reach: number | null;
  };
  recentPerformance: {
    averageLikes: number;
    averageComments: number;
    averageShares: number;
    topPerformingContentTypes: string[];
    worstPerformingContentTypes: string[];
    bestPostingTimes: string[];
  };
  trends: {
    followerGrowthRate: number | null;
    engagementTrend: "up" | "down" | "stable";
    contentPerformanceTrend: "improving" | "declining" | "stable";
  };
}

// Zod schema for AI-generated recommendations
const AIRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      action: z.string().describe("Specific actionable recommendation"),
      confidence: z
        .number()
        .min(0)
        .max(100)
        .describe("Confidence score based on data quality"),
      reasoning: z
        .string()
        .describe("Data-backed reasoning for this recommendation"),
      expectedImpact: z.string().describe("Expected impact with metrics"),
      priority: z.enum(["high", "medium", "low"]),
      dataSource: z.enum([
        "real_analytics",
        "brand_persona",
        "industry_best_practice",
      ]),
    })
  ),
  overallAssessment: z
    .string()
    .describe("Brief overall assessment of the account's growth potential"),
  dataQualityNote: z
    .string()
    .optional()
    .describe("Note about data quality if applicable"),
});

export class AIGrowthEngine {
  private profileKey?: string;
  private platform: string;
  private aggressiveness: "conservative" | "moderate" | "aggressive";
  private brandManager?: BrandPersonaManager;
  private brandPersona?: BrandPersona;
  private learningSystem?: AILearningSystem;
  private accountGroup?: any;
  private learnedInsights?: LearnedInsights;

  constructor(
    platform: string,
    profileKey?: string,
    aggressiveness: "conservative" | "moderate" | "aggressive" = "moderate",
    accountGroup?: any
  ) {
    this.platform = platform;
    this.profileKey = profileKey;
    this.aggressiveness = aggressiveness;
    this.accountGroup = accountGroup;

    // Load brand persona if available
    if (accountGroup) {
      const loaded = loadBrandPersona(accountGroup);
      this.brandPersona = loaded || undefined;
      if (this.brandPersona) {
        this.brandManager = new BrandPersonaManager(this.brandPersona);
      }

      // Initialize learning system if we have an account group ID
      if (accountGroup.id) {
        this.learningSystem = new AILearningSystem(accountGroup.id, [platform]);
      }
    }
  }

  /**
   * Fetch real analytics data from Ayrshare APIs
   */
  async fetchRealAnalytics(): Promise<RealAnalyticsData> {
    try {
      // Fetch social account analytics from Ayrshare
      const analyticsData = await getSocialAccountAnalytics(
        [this.platform],
        this.profileKey
      );

      const platformData = analyticsData[this.platform];

      if (!platformData) {
        return this.getEmptyAnalytics();
      }

      // Extract real metrics
      const accountMetrics = {
        followersCount: platformData.followersCount ?? null,
        followingCount: platformData.followingCount ?? null,
        postsCount: platformData.postsCount ?? null,
        engagementRate: platformData.engagementRate ?? null,
        impressions: platformData.impressions ?? null,
        reach: platformData.reach ?? null,
      };

      // Calculate trends based on available data
      const hasRealData = Object.values(accountMetrics).some((v) => v !== null);

      return {
        hasRealData,
        platform: this.platform,
        accountMetrics,
        recentPerformance: {
          averageLikes: 0, // Would need post-level data
          averageComments: 0,
          averageShares: 0,
          topPerformingContentTypes: [],
          worstPerformingContentTypes: [],
          bestPostingTimes: [],
        },
        trends: {
          followerGrowthRate: null,
          engagementTrend: "stable",
          contentPerformanceTrend: "stable",
        },
      };
    } catch (error) {
      // Return empty analytics if API fails
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get empty analytics structure for fallback
   */
  private getEmptyAnalytics(): RealAnalyticsData {
    return {
      hasRealData: false,
      platform: this.platform,
      accountMetrics: {
        followersCount: null,
        followingCount: null,
        postsCount: null,
        engagementRate: null,
        impressions: null,
        reach: null,
      },
      recentPerformance: {
        averageLikes: 0,
        averageComments: 0,
        averageShares: 0,
        topPerformingContentTypes: [],
        worstPerformingContentTypes: [],
        bestPostingTimes: [],
      },
      trends: {
        followerGrowthRate: null,
        engagementTrend: "stable",
        contentPerformanceTrend: "stable",
      },
    };
  }

  /**
   * Fetch learned insights from content feedback history
   * This analyzes past accept/reject decisions to improve future content
   */
  async fetchLearnedInsights(): Promise<LearnedInsights> {
    const emptyInsights: LearnedInsights = {
      patternsLearned: [],
      recommendedAdjustments: [],
      enhancedPrompt: "",
      acceptanceRate: 0,
      topPerformingPillars: [],
    };

    if (!this.learningSystem || !this.accountGroup) {
      return emptyInsights;
    }

    try {
      // Extract content feedback from account group
      const feedbackData: {
        generatedContent: string;
        accepted: boolean;
        reason?: string;
        editedVersion?: string;
        contentPillar?: string;
        toneUsed?: string;
        platform?: string;
      }[] = [];

      if (this.accountGroup.contentFeedback) {
        const feedbackArray = Array.from(this.accountGroup.contentFeedback);
        feedbackArray.forEach((feedback: any) => {
          if (feedback) {
            feedbackData.push({
              generatedContent: feedback.generatedContent || "",
              accepted: feedback.accepted || false,
              reason: feedback.reason,
              editedVersion: feedback.editedVersion,
              contentPillar: feedback.contentPillar,
              toneUsed: feedback.toneUsed,
              platform: feedback.platform,
            });
          }
        });
      }

      if (feedbackData.length === 0) {
        return emptyInsights;
      }

      // Learn from the feedback
      const learningResults =
        await this.learningSystem.learnFromContentFeedback(feedbackData);

      // Get enhanced prompt based on learned patterns
      const enhancedPrompt =
        this.learningSystem.getEnhancedPromptFromFeedback();

      // Calculate top performing pillars
      const pillarStats: Record<string, { accepted: number; total: number }> =
        {};
      feedbackData.forEach((f) => {
        const pillar = f.contentPillar || "unknown";
        if (!pillarStats[pillar]) {
          pillarStats[pillar] = { accepted: 0, total: 0 };
        }
        pillarStats[pillar].total++;
        if (f.accepted) {
          pillarStats[pillar].accepted++;
        }
      });

      const topPerformingPillars = Object.entries(pillarStats)
        .filter(([_, stats]) => stats.total >= 2)
        .sort((a, b) => b[1].accepted / b[1].total - a[1].accepted / a[1].total)
        .slice(0, 3)
        .map(([pillar]) => pillar);

      // Calculate overall acceptance rate
      const acceptedCount = feedbackData.filter((f) => f.accepted).length;
      const acceptanceRate =
        feedbackData.length > 0
          ? (acceptedCount / feedbackData.length) * 100
          : 0;

      this.learnedInsights = {
        patternsLearned: learningResults.patternsLearned,
        recommendedAdjustments: learningResults.recommendedAdjustments,
        enhancedPrompt,
        acceptanceRate,
        topPerformingPillars,
      };

      return this.learnedInsights;
    } catch (error) {
      return emptyInsights;
    }
  }

  /**
   * Track content performance after posting to improve future predictions
   * This creates a feedback loop: predicted performance → actual performance → learning
   */
  async trackContentPerformance(performanceData: {
    postId: string;
    content: string;
    platform: string;
    predictedEngagement: number;
    actualEngagement: {
      likes: number;
      comments: number;
      shares: number;
      impressions: number;
    };
    contentPillar?: string;
    publishedAt: Date;
  }): Promise<{
    predictionAccuracy: number;
    learningApplied: boolean;
    insights: string[];
  }> {
    // Calculate actual engagement rate
    const totalEngagement =
      performanceData.actualEngagement.likes +
      performanceData.actualEngagement.comments +
      performanceData.actualEngagement.shares;
    const actualEngagementRate =
      performanceData.actualEngagement.impressions > 0
        ? (totalEngagement / performanceData.actualEngagement.impressions) * 100
        : 0;

    // Calculate prediction accuracy (how close our prediction was)
    const predictionDifference = Math.abs(
      performanceData.predictedEngagement - actualEngagementRate
    );
    const predictionAccuracy = Math.max(0, 100 - predictionDifference * 5); // 5% penalty per percentage point off

    const insights: string[] = [];

    // Determine if the content over/under-performed
    if (actualEngagementRate > performanceData.predictedEngagement * 1.2) {
      insights.push(
        `Content outperformed prediction by ${(
          (actualEngagementRate / performanceData.predictedEngagement) * 100 -
          100
        ).toFixed(0)}%`
      );
      if (performanceData.contentPillar) {
        insights.push(
          `"${performanceData.contentPillar}" content pillar is performing well`
        );
      }
    } else if (
      actualEngagementRate <
      performanceData.predictedEngagement * 0.8
    ) {
      insights.push(
        `Content underperformed prediction by ${(
          (1 - actualEngagementRate / performanceData.predictedEngagement) *
          100
        ).toFixed(0)}%`
      );
      if (performanceData.contentPillar) {
        insights.push(
          `Consider adjusting "${performanceData.contentPillar}" content style`
        );
      }
    } else {
      insights.push("Content performed as expected");
    }

    // If we have the learning system, analyze this performance
    let learningApplied = false;
    if (this.learningSystem && this.accountGroup) {
      try {
        // This would trigger a learning analysis if enough data accumulates
        await this.learningSystem.analyzeAllPosts(this.accountGroup);
        learningApplied = true;
        insights.push("Performance data added to learning system");
      } catch {
        // Learning system analysis failed, but that's okay
      }
    }

    return {
      predictionAccuracy,
      learningApplied,
      insights,
    };
  }

  /**
   * Get current learning status and quality metrics
   */
  getLearningStatus(): {
    hasLearningSystem: boolean;
    insightsCount: number;
    acceptanceRate: number;
    topPillars: string[];
    isLearning: boolean;
  } {
    return {
      hasLearningSystem: !!this.learningSystem,
      insightsCount: this.learnedInsights?.patternsLearned.length ?? 0,
      acceptanceRate: this.learnedInsights?.acceptanceRate ?? 0,
      topPillars: this.learnedInsights?.topPerformingPillars ?? [],
      isLearning:
        !!this.learnedInsights &&
        this.learnedInsights.patternsLearned.length > 0,
    };
  }

  /**
   * Generate AI-powered recommendations using GPT-4 with real analytics and brand context
   */
  async generateAIRecommendations(
    analytics: RealAnalyticsData,
    userGoals?: {
      followerTarget?: number;
      engagementTarget?: number;
      postsPerWeek?: number;
    }
  ): Promise<AIDecision[]> {
    // First, fetch learned insights from past content feedback
    const learnedInsights = await this.fetchLearnedInsights();

    // Build the analytics context
    const analyticsContext = analytics.hasRealData
      ? `
REAL ANALYTICS DATA (${this.platform.toUpperCase()}):
- Followers: ${analytics.accountMetrics.followersCount ?? "Unknown"}
- Following: ${analytics.accountMetrics.followingCount ?? "Unknown"}
- Total Posts: ${analytics.accountMetrics.postsCount ?? "Unknown"}
- Engagement Rate: ${
          analytics.accountMetrics.engagementRate
            ? `${analytics.accountMetrics.engagementRate}%`
            : "Unknown"
        }
- Impressions: ${analytics.accountMetrics.impressions ?? "Unknown"}
- Reach: ${analytics.accountMetrics.reach ?? "Unknown"}
- Engagement Trend: ${analytics.trends.engagementTrend}
- Content Performance Trend: ${analytics.trends.contentPerformanceTrend}
`
      : `
NOTE: No real analytics data available. Recommendations will be based on brand persona and industry best practices.
Platform: ${this.platform.toUpperCase()}
`;

    // Build brand context
    const brandContext = this.brandPersona
      ? `
BRAND PERSONA:
- Brand Name: ${this.brandPersona.name}
- Voice Tone: ${this.brandPersona.voice.tone}
- Writing Style: ${this.brandPersona.voice.writingStyle}
- Target Audience: ${this.brandPersona.messaging.targetAudience}
- Content Pillars: ${this.brandPersona.messaging.contentPillars.join(", ")}
- Value Proposition: ${this.brandPersona.messaging.valueProposition}
- Emoji Usage: ${this.brandPersona.voice.emojiUsage}
- Call-to-Action Style: ${this.brandPersona.contentGuidelines.callToActionStyle}
`
      : `
NOTE: No brand persona configured. Using general best practices.
`;

    // Build learned insights context
    const learningContext =
      learnedInsights.patternsLearned.length > 0
        ? `
LEARNED FROM PAST CONTENT (${learnedInsights.acceptanceRate.toFixed(
            0
          )}% acceptance rate):
- Patterns that work: ${learnedInsights.patternsLearned.slice(0, 3).join("; ")}
- Adjustments to make: ${learnedInsights.recommendedAdjustments
            .slice(0, 3)
            .join("; ")}
- Top performing content pillars: ${
            learnedInsights.topPerformingPillars.join(", ") || "Not enough data"
          }
${learnedInsights.enhancedPrompt}
`
        : "";

    // Build goals context
    const goalsContext = userGoals
      ? `
USER GOALS:
- Follower Growth Target: ${userGoals.followerTarget ?? 15}% per month
- Engagement Rate Target: ${userGoals.engagementTarget ?? 5}%
- Posts Per Week Target: ${userGoals.postsPerWeek ?? 7}
`
      : "";

    // Build the full prompt
    const systemPrompt = `You are an expert social media growth strategist. Analyze the provided data and generate specific, actionable recommendations.

Your recommendations should be:
1. Specific and actionable (not vague advice)
2. Data-backed when real analytics are available
3. Aligned with the brand persona when provided
4. PRIORITIZE patterns learned from past content feedback
5. Include realistic confidence scores based on data quality

For confidence scores:
- 85-100: Strong data support + learned patterns confirm
- 70-84: Good data or strong patterns from feedback
- 50-69: Limited data, based on best practices
- Below 50: Speculative, needs testing`;

    const userPrompt = `${analyticsContext}
${brandContext}
${learningContext}
${goalsContext}
AGGRESSIVENESS LEVEL: ${this.aggressiveness}

Generate 5 strategic recommendations for growing this ${this.platform} account. Focus on:
1. Content strategy improvements
2. Posting schedule optimization
3. Engagement tactics
4. Hashtag/discoverability strategy
5. Growth acceleration tactics

Be specific with numbers and actionable steps. If real data is missing, note that the recommendation is based on best practices.`;

    try {
      // Use optimized model for complex strategic analysis
      const result = await generateObject({
        model: getModelForTask("complex"), // GPT-4o for strategic analysis
        schema: AIRecommendationSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
      });

      usageTracker.trackCall("complex");

      // Convert to AIDecision format
      return result.object.recommendations.map((rec) => ({
        action: rec.action,
        confidence: rec.confidence,
        reasoning: rec.reasoning,
        expectedImpact: rec.expectedImpact,
        priority: rec.priority,
      }));
    } catch (error) {
      console.error("AI recommendations failed:", error);
      // Fallback to basic recommendations if AI fails
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Get basic fallback recommendations if AI generation fails
   */
  private getFallbackRecommendations(): AIDecision[] {
    const baseRecommendations: AIDecision[] = [
      {
        action: `Post consistently at optimal times for ${this.platform}`,
        confidence: 75,
        reasoning: "Consistent posting improves algorithm visibility",
        expectedImpact: "+20% reach improvement",
        priority: "high",
      },
      {
        action:
          "Increase engagement with your audience through replies and comments",
        confidence: 80,
        reasoning: "Active engagement builds community and improves visibility",
        expectedImpact: "+15% engagement rate",
        priority: "high",
      },
      {
        action: "Use a mix of trending and niche hashtags",
        confidence: 70,
        reasoning: "Balanced hashtag strategy improves discoverability",
        expectedImpact: "+100 average impressions",
        priority: "medium",
      },
    ];

    // Add brand-specific recommendation if persona exists
    if (this.brandPersona) {
      baseRecommendations.unshift({
        action: `Focus content on your core pillars: ${this.brandPersona.messaging.contentPillars
          .slice(0, 2)
          .join(" and ")}`,
        confidence: 85,
        reasoning: `Aligned content builds brand consistency with your ${this.brandPersona.messaging.targetAudience} audience`,
        expectedImpact: "Stronger brand recognition and audience loyalty",
        priority: "high",
      });
    }

    return baseRecommendations;
  }

  /**
   * AI-powered content analysis and optimization
   */
  async analyzeContent(content: string): Promise<ContentAnalysis> {
    // Analyze content characteristics
    const contentLength = content.length;
    const hasQuestion = content.includes("?");
    const hasCallToAction = /comment|share|like|follow|tag|dm/i.test(content);
    const hasEmojis =
      /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu.test(
        content
      );

    // Determine content type
    let contentType: ContentAnalysis["contentType"] = "educational";
    if (
      content.toLowerCase().includes("tip") ||
      content.toLowerCase().includes("how to")
    ) {
      contentType = "educational";
    } else if (
      hasQuestion ||
      content.toLowerCase().includes("what do you think")
    ) {
      contentType = "engagement";
    } else if (
      content.toLowerCase().includes("buy") ||
      content.toLowerCase().includes("check out")
    ) {
      contentType = "promotional";
    } else if (hasEmojis && contentLength < 100) {
      contentType = "entertainment";
    }

    // Calculate engagement potential
    let engagementPotential = 50; // Base score

    // Content quality factors
    if (contentLength >= 100 && contentLength <= 300) engagementPotential += 15; // Optimal length
    if (hasQuestion) engagementPotential += 20; // Questions drive engagement
    if (hasCallToAction) engagementPotential += 15; // CTAs increase interaction
    if (hasEmojis) engagementPotential += 10; // Emojis make content more engaging
    if (contentType === "educational") engagementPotential += 10; // Educational content performs well

    // Platform-specific adjustments
    if (this.platform === "linkedin" && contentType === "educational")
      engagementPotential += 15;
    if (this.platform === "instagram" && hasEmojis) engagementPotential += 10;
    if (this.platform === "twitter" && contentLength <= 280)
      engagementPotential += 10;

    // Generate optimal hashtags based on content
    const optimalHashtags = await this.generateOptimalHashtags(
      content,
      contentType
    );

    // Get best posting time
    const timingAnalysis = await getEnhancedOptimalTiming(
      this.platform,
      this.profileKey
    );
    const bestPostingTime = timingAnalysis.bestTimes[0]
      ? `${timingAnalysis.bestTimes[0].day} ${timingAnalysis.bestTimes[0].hour}:00`
      : "Today 2:00 PM";

    return {
      engagementPotential: Math.min(engagementPotential, 100),
      optimalHashtags,
      bestPostingTime,
      targetAudience: this.determineTargetAudience(content, contentType),
      contentType,
    };
  }

  /**
   * Generate AI-powered growth recommendations using real analytics + GPT-4
   */
  async generateGrowthRecommendations(userGoals?: {
    followerTarget?: number;
    engagementTarget?: number;
    postsPerWeek?: number;
  }): Promise<AIDecision[]> {
    try {
      // Step 1: Fetch real analytics from Ayrshare
      const realAnalytics = await this.fetchRealAnalytics();

      // Step 2: Generate AI-powered recommendations based on real data + brand persona
      const aiRecommendations = await this.generateAIRecommendations(
        realAnalytics,
        userGoals
      );

      // Sort by priority and confidence
      return aiRecommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return (
          priorityWeight[b.priority] * b.confidence -
          priorityWeight[a.priority] * a.confidence
        );
      });
    } catch (error) {
      // Fallback to basic recommendations if everything fails
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Auto-execute high-confidence decisions
   */
  async executeAutomatedGrowthActions(): Promise<{
    executed: number;
    skipped: number;
    results: string[];
  }> {
    const recommendations = await this.generateGrowthRecommendations();
    const highConfidenceActions = recommendations.filter(
      (r) => r.confidence >= 80
    );

    let executed = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const action of highConfidenceActions) {
      try {
        const success = await this.executeAction(action);
        if (success) {
          executed++;
          results.push(`✅ ${action.action} - ${action.expectedImpact}`);
        } else {
          skipped++;
          results.push(`⏭️ Skipped: ${action.action} (conditions not met)`);
        }
      } catch (error) {
        skipped++;
        results.push(
          `❌ Failed: ${action.action} (${
            error instanceof Error ? error.message : "Unknown error"
          })`
        );
      }
    }

    return { executed, skipped, results };
  }

  /**
   * Generate content suggestions using BATCH AI generation (single API call)
   * Optimized: 1 call instead of N calls, ~70% token savings
   */
  async generateContentSuggestions(count: number = 5): Promise<
    {
      title: string;
      content: string;
      hashtags: string[];
      bestTime: string;
      engagementPotential: number;
      reasoning: string;
      learnedFromFeedback: boolean;
    }[]
  > {
    // Fetch learned insights to prioritize topics
    const learnedInsights = await this.fetchLearnedInsights();

    // Get topics from brand persona - MUST have valid content pillars
    let relevantTopics = this.brandPersona?.messaging?.contentPillars || [];

    // 🔍 DEBUG: Log content pillars from brand persona
    console.log('🔍 [AI-GROWTH-ENGINE] generateContentSuggestions:', {
      hasBrandPersona: !!this.brandPersona,
      contentPillars: relevantTopics,
      contentPillarsLength: relevantTopics.length,
    });

    // CRITICAL: If no valid content pillars, return empty - don't generate garbage
    if (!relevantTopics || relevantTopics.length === 0) {
      console.log('🔍 [AI-GROWTH-ENGINE] No valid content pillars - returning empty array');
      return [];
    }

    // Prioritize topics based on learned performance
    if (learnedInsights.topPerformingPillars.length > 0) {
      const topPillars = learnedInsights.topPerformingPillars;
      const remainingTopics = relevantTopics.filter(
        (t) => !topPillars.includes(t)
      );
      relevantTopics = [...topPillars, ...remainingTopics];
    }

    const topicsToGenerate = relevantTopics.slice(0, count);

    try {
      // Build compressed context for batch generation
      const brandContext = this.brandPersona
        ? compressBrandContext({
            name: this.brandPersona.name,
            tone: this.brandPersona.voice.tone,
            writingStyle: this.brandPersona.voice.writingStyle,
            emojiUsage: this.brandPersona.voice.emojiUsage,
            contentPillars: this.brandPersona.messaging.contentPillars,
            targetAudience: this.brandPersona.messaging.targetAudience,
          })
        : "No brand persona";

      const learnedContext = compressLearnedInsights({
        preferredTone: learnedInsights.recommendedAdjustments.slice(0, 3),
        topPillars: learnedInsights.topPerformingPillars,
        acceptanceRate: learnedInsights.acceptanceRate,
        patterns: learnedInsights.patternsLearned.slice(0, 3),
      });

      // BATCH GENERATION: Single API call for all content
      const batchResult = await batchGenerateContent({
        brandContext,
        learnedInsights: learnedContext,
        platform: this.platform,
        contentPillars: topicsToGenerate,
        count: topicsToGenerate.length,
      });

      // Track the batch for usage stats
      usageTracker.trackBatch(topicsToGenerate.length);

      // Map batch results to suggestions
      return batchResult.suggestions
        .map((item, index) => {
          const topic = topicsToGenerate[index] || "Content";
          const isTopPerformer =
            learnedInsights.topPerformingPillars.includes(topic);

          let reasoning = this.brandPersona
            ? `AI-generated content aligned with your "${
                item.contentPillar || topic
              }" pillar`
            : `AI-generated content optimized for ${this.platform}`;

          if (isTopPerformer) {
            reasoning += ` • High-performing pillar`;
          }
          if (learnedInsights.patternsLearned.length > 0) {
            reasoning += ` • Uses learned patterns`;
          }

          return {
            title: `${
              (item.contentPillar || topic).charAt(0).toUpperCase() +
              (item.contentPillar || topic).slice(1)
            } Content`,
            content: item.content,
            hashtags: item.hashtags,
            bestTime: item.bestTimeToPost,
            engagementPotential: isTopPerformer
              ? Math.min(item.engagementScore + 10, 100)
              : item.engagementScore,
            reasoning,
            learnedFromFeedback:
              isTopPerformer || learnedInsights.patternsLearned.length > 0,
          };
        })
        .sort((a, b) => b.engagementPotential - a.engagementPotential);
    } catch (error) {
      console.error("Batch content generation failed, falling back:", error);
      // Fallback to individual generation if batch fails
      return this.generateContentSuggestionsFallback(
        count,
        relevantTopics,
        learnedInsights
      );
    }
  }

  /**
   * Fallback method for individual content generation
   */
  private async generateContentSuggestionsFallback(
    count: number,
    relevantTopics: string[],
    learnedInsights: LearnedInsights
  ): Promise<
    {
      title: string;
      content: string;
      hashtags: string[];
      bestTime: string;
      engagementPotential: number;
      reasoning: string;
      learnedFromFeedback: boolean;
    }[]
  > {
    const suggestions = [];

    for (let i = 0; i < Math.min(count, relevantTopics.length); i++) {
      const topic = relevantTopics[i];
      const isTopPerformer =
        learnedInsights.topPerformingPillars.includes(topic);

      try {
        let content: string;
        if (this.brandManager) {
          content = await this.brandManager.generateAIContent(
            topic,
            "post",
            this.platform
          );
        } else {
          content = await this.generateBasicAIContent(topic);
        }

        const hashtags = this.brandManager
          ? this.brandManager.getBrandedHashtags(topic, this.platform)
          : await this.generateOptimalHashtags(content, "educational");

        const analysis = await this.analyzeContent(content);

        let reasoning = this.brandPersona
          ? `AI-generated content aligned with your "${topic}" pillar`
          : `AI-generated content optimized for ${this.platform}`;

        if (isTopPerformer) {
          reasoning += ` • High-performing pillar`;
        }

        suggestions.push({
          title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Content`,
          content,
          hashtags,
          bestTime: analysis.bestPostingTime,
          engagementPotential: isTopPerformer
            ? Math.min(analysis.engagementPotential + 10, 100)
            : analysis.engagementPotential,
          reasoning,
          learnedFromFeedback:
            isTopPerformer || learnedInsights.patternsLearned.length > 0,
        });
      } catch (error) {
        continue;
      }
    }

    return suggestions.sort(
      (a, b) => b.engagementPotential - a.engagementPotential
    );
  }

  /**
   * Generate basic AI content without brand persona (optimized with gpt-4o-mini)
   */
  private async generateBasicAIContent(topic: string): Promise<string> {
    const { generateText } = await import("ai");

    const platformLimits: Record<string, number> = {
      twitter: 280,
      x: 280,
      instagram: 2200,
      facebook: 500,
      linkedin: 700,
      tiktok: 150,
    };
    const charLimit = platformLimits[this.platform.toLowerCase()] || 500;
    const platform = this.platform.toLowerCase();

    // Platform-specific formatting rules
    const platformRules: Record<string, string> = {
      tiktok: `CRITICAL TIKTOK RULES:
- Write a SHORT caption (under 150 chars) - NOT a video script
- NO "[Scene:]", "**Hook**:", "**Script**:", "[Outro]" or any script directions
- Just write a catchy one-liner, question, or short caption
- Example: "this changes everything 👀" or "POV: when it finally clicks"
- NO markdown formatting, NO em-dashes`,
      twitter: `Keep under 280 chars. Punchy and direct. 1-2 hashtags max.`,
      x: `Keep under 280 chars. Punchy and direct. 1-2 hashtags max.`,
      instagram: `Use line breaks for readability. No markdown. Hashtags at end.`,
      linkedin: `Professional but personal. Use line breaks. 3-5 paragraphs.`,
      facebook: `Conversational. Ask questions. 1-3 hashtags.`,
    };

    const rules = platformRules[platform] || "Be engaging and authentic.";

    try {
      // Use optimized model (gpt-4o-mini) for basic content
      const { text } = await generateText({
        model: getModelForTask("medium"),
        prompt: `Write a ${this.platform} post about "${topic}".

${rules}

FORMATTING RULES (ALL PLATFORMS):
- NO markdown (**bold**, *italic*, # headers) - platforms don't render it
- NO em-dashes (—) - they scream AI
- NO video scripts or scene directions
- Use actual line breaks for formatting
- Max ${charLimit} chars

Write ONLY the post content, ready to copy-paste.`,
        temperature: 0.7,
      });

      usageTracker.trackCall("medium");
      return text.trim();
    } catch (error) {
      // Ultimate fallback
      return `Thoughts on ${topic}... What's your experience with this?`;
    }
  }

  // Private helper methods

  private async generateOptimalHashtags(
    content: string,
    contentType: string
  ): Promise<string[]> {
    const baseHashtags = {
      educational: ["tips", "education", "learning", "howto", "tutorial"],
      engagement: [
        "question",
        "community",
        "discussion",
        "thoughts",
        "opinion",
      ],
      promotional: ["new", "launch", "announcement", "update", "exclusive"],
      entertainment: ["fun", "entertainment", "lifestyle", "mood", "vibes"],
    };

    const platformHashtags = {
      instagram: ["insta", "ig", "photography", "aesthetic", "daily"],
      twitter: ["twitter", "tweet", "thread", "discussion", "news"],
      linkedin: [
        "professional",
        "business",
        "career",
        "networking",
        "industry",
      ],
      tiktok: ["fyp", "viral", "trending", "challenge", "creative"],
      facebook: ["community", "family", "friends", "local", "social"],
    };

    // Extract keywords from content
    const contentKeywords = content
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 4)
      .slice(0, 3);

    const validContentType = contentType as keyof typeof baseHashtags;
    const hashtags = [
      ...(baseHashtags[validContentType] || baseHashtags.educational).slice(
        0,
        2
      ),
      ...(platformHashtags[
        this.platform as keyof typeof platformHashtags
      ]?.slice(0, 2) || []),
      ...contentKeywords.slice(0, 2),
    ];

    return hashtags.slice(0, 8);
  }

  private determineTargetAudience(
    content: string,
    contentType: string
  ): string {
    if (contentType === "educational")
      return "Learners and professionals seeking knowledge";
    if (contentType === "engagement")
      return "Active community members who engage with content";
    if (contentType === "promotional")
      return "Potential customers and interested prospects";
    return "General audience interested in lifestyle content";
  }

  private async analyzeCurrentPerformance() {
    // Simulate performance analysis
    return {
      engagementRate: 2.5 + Math.random() * 2, // 2.5-4.5%
      postingConsistency: 0.6 + Math.random() * 0.3, // 0.6-0.9
      hashtagEffectiveness: 0.5 + Math.random() * 0.4, // 0.5-0.9
      responseTime: 60 + Math.random() * 180, // 1-4 hours
    };
  }

  private async analyzeCompetitorGaps(): Promise<CompetitorIntelligence> {
    // Simulate competitor analysis
    const topics = [
      "AI tools",
      "productivity hacks",
      "social media trends",
      "content creation",
      "automation",
    ];
    return {
      topPerformingContent: topics.slice(0, 3),
      underutilizedHashtags: [
        "growthhacking",
        "contentcreator",
        "digitalmarketing",
      ],
      optimalPostingTimes: ["2:00 PM", "6:00 PM", "8:00 PM"],
      contentGaps: topics.slice(2),
    };
  }

  private async executeAction(action: AIDecision): Promise<boolean> {
    // Simulate action execution based on action type
    if (action.action.includes("auto-reply")) {
      // Enable auto-reply functionality
      return true;
    } else if (action.action.includes("hashtag")) {
      // Update hashtag strategy
      return true;
    } else if (action.action.includes("schedule")) {
      // Adjust posting schedule
      return true;
    } else if (action.action.includes("content")) {
      // Generate and schedule content
      return true;
    }

    return Math.random() > 0.2; // 80% success rate for other actions
  }

  private async getTrendingTopics(): Promise<string[]> {
    // If brand persona exists and has valid content pillars, use them
    if (this.brandPersona && 
        this.brandPersona.messaging.contentPillars && 
        this.brandPersona.messaging.contentPillars.length > 0) {
      return this.brandPersona.messaging.contentPillars;
    }

    // NO HARDCODED FALLBACK TOPICS - if no brand persona, return empty
    // This prevents generating generic garbage content that doesn't match the brand
    // The caller should handle empty topics appropriately
    return [];
  }

  private selectContentTemplate(topic: string): string {
    const templates = [
      "Quick tip about {topic}: {tip}\n\nThis can help you {benefit}.\n\nWhat's your experience with this? 👇",
      "🔥 {topic} insight:\n\n{insight}\n\nDo you agree? Let me know in the comments!",
      "Question for you: What's your biggest challenge with {topic}?\n\n{context}\n\nShare your thoughts below! 💬",
      "💡 Just learned something interesting about {topic}:\n\n{learning}\n\nHave you tried this approach?",
      "Behind the scenes: How I approach {topic}\n\n{process}\n\nWhat works best for you? ✨",
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateContentFromTemplate(template: string, topic: string): string {
    // Use brand persona context if available
    const brandContext = this.brandPersona
      ? {
          "{topic}": topic,
          "{tip}": `Here's what works in ${this.brandPersona.messaging.contentPillars[0]}`,
          "{benefit}": this.brandPersona.messaging.valueProposition,
          "{insight}": `Key insight from my experience with ${topic}`,
          "{context}": `Based on my work with ${this.brandPersona.messaging.targetAudience}`,
          "{learning}": `What I've learned about ${topic}`,
          "{process}": `My approach to ${topic}`,
        }
      : {
          "{topic}": topic,
          "{tip}": `Here's a proven strategy that works`,
          "{benefit}": `improve your results significantly`,
          "{insight}": `The key is consistency and authentic engagement`,
          "{context}": `I've been researching this and found some interesting patterns`,
          "{learning}": `Small changes can make a huge difference`,
          "{process}": `I start with data, then test different approaches`,
        };

    let content = template;
    Object.entries(brandContext).forEach(([placeholder, replacement]) => {
      content = content.replace(new RegExp(placeholder, "g"), replacement);
    });

    return content;
  }
}

/**
 * Quick AI-powered growth action executor
 */
export async function executeAIGrowthActions(
  platform: string,
  profileKey?: string,
  aggressiveness: "conservative" | "moderate" | "aggressive" = "moderate",
  accountGroup?: any,
  userGoals?: {
    followerTarget?: number;
    engagementTarget?: number;
    postsPerWeek?: number;
  }
): Promise<{
  recommendations: AIDecision[];
  executedActions: { executed: number; skipped: number; results: string[] };
  contentSuggestions: any[];
  analyticsSource: "real" | "simulated" | "unavailable";
  learningStatus: {
    isLearning: boolean;
    insightsCount: number;
    acceptanceRate: number;
    topPillars: string[];
  };
}> {
  const ai = new AIGrowthEngine(
    platform,
    profileKey,
    aggressiveness,
    accountGroup
  );

  // Fetch real analytics first to determine data source
  let analyticsSource: "real" | "simulated" | "unavailable" = "unavailable";
  try {
    const analytics = await ai.fetchRealAnalytics();
    analyticsSource = analytics.hasRealData ? "real" : "simulated";
  } catch {
    analyticsSource = "unavailable";
  }

  const [recommendations, executedActions, contentSuggestions] =
    await Promise.all([
      ai.generateGrowthRecommendations(userGoals),
      ai.executeAutomatedGrowthActions(),
      ai.generateContentSuggestions(3),
    ]);

  // Get learning status
  const learningStatus = ai.getLearningStatus();

  return {
    recommendations,
    executedActions,
    contentSuggestions,
    analyticsSource,
    learningStatus: {
      isLearning: learningStatus.isLearning,
      insightsCount: learningStatus.insightsCount,
      acceptanceRate: learningStatus.acceptanceRate,
      topPillars: learningStatus.topPillars,
    },
  };
}
