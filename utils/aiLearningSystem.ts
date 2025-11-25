/**
 * AI Learning System - Learns from past posts and performance to improve future decisions
 * Integrates with AI Autopilot and existing analytics
 */

import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Learning schemas
const PostPerformanceSchema = z.object({
  postId: z.string(),
  content: z.string(),
  platforms: z.array(z.string()),
  publishedAt: z.date(),
  engagement: z.object({
    likes: z.number(),
    comments: z.number(),
    shares: z.number(),
    impressions: z.number(),
    engagementRate: z.number()
  }),
  hashtags: z.array(z.string()),
  postingTime: z.object({
    hour: z.number(),
    dayOfWeek: z.number(),
    timezone: z.string()
  }),
  contentMetrics: z.object({
    length: z.number(),
    hasImages: z.boolean(),
    hasVideo: z.boolean(),
    questionCount: z.number(),
    hashtagCount: z.number(),
    mentionCount: z.number()
  })
});

const LearningInsightSchema = z.object({
  category: z.enum(['content', 'timing', 'hashtags', 'engagement', 'platform']),
  insight: z.string(),
  confidence: z.number().min(0).max(100),
  supportingData: z.array(z.string()),
  actionableRecommendation: z.string(),
  impactPotential: z.enum(['high', 'medium', 'low']),
  applicablePlatforms: z.array(z.string())
});

const LearningReportSchema = z.object({
  totalPostsAnalyzed: z.number(),
  analysisTimeframe: z.string(),
  keyInsights: z.array(LearningInsightSchema),
  performancePatterns: z.object({
    bestPerformingContentTypes: z.array(z.string()),
    optimalPostingTimes: z.record(z.string(), z.string()),
    topHashtags: z.array(z.string()),
    engagementDrivers: z.array(z.string())
  }),
  improvements: z.object({
    contentStrategy: z.string(),
    timingStrategy: z.string(),
    hashtagStrategy: z.string(),
    engagementStrategy: z.string()
  }),
  confidenceScore: z.number().min(0).max(100)
});

interface LearningMemory {
  insights: z.infer<typeof LearningInsightSchema>[];
  patterns: Record<string, any>;
  lastAnalysis: Date;
  postCount: number;
  version: string;
}

export class AILearningSystem {
  private accountGroupId: string;
  private memory: LearningMemory;
  private platforms: string[];

  constructor(accountGroupId: string, platforms: string[] = ['instagram', 'x']) {
    this.accountGroupId = accountGroupId;
    this.platforms = platforms;
    this.memory = {
      insights: [],
      patterns: {},
      lastAnalysis: new Date(0),
      postCount: 0,
      version: '1.0'
    };
  }

  /**
   * Analyze all past posts and extract learning insights
   */
  async analyzeAllPosts(accountGroup: any): Promise<z.infer<typeof LearningReportSchema>> {
    console.log('🧠 AI Learning: Starting comprehensive post analysis...');

    // Extract all posts from the account group
    const allPosts = await this.extractAllPosts(accountGroup);
    
    if (allPosts.length === 0) {
      throw new Error('No posts found to analyze');
    }

    console.log(`📊 Analyzing ${allPosts.length} posts for learning insights...`);

    // Convert posts to performance data
    const performanceData = allPosts.map(post => this.convertPostToPerformanceData(post));

    // Limit data sent to AI to prevent token limit issues and improve performance
    const limitedData = performanceData.slice(0, Math.min(50, performanceData.length));
    
    // Generate AI-powered learning insights with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('AI analysis timeout after 60 seconds')), 60000)
    );
    
    const learningReportResult = await Promise.race([
      generateObject({
        model: openai('gpt-4'),
        schema: LearningReportSchema,
        prompt: `Analyze this social media performance data and extract actionable learning insights.

POST PERFORMANCE DATA:
${JSON.stringify(limitedData, null, 2)}

ANALYSIS REQUIREMENTS:
1. Identify patterns in high-performing vs low-performing content
2. Find optimal timing patterns across platforms
3. Discover effective hashtag strategies
4. Understand engagement drivers
5. Provide specific, actionable improvements

FOCUS AREAS:
- Content types that drive engagement
- Timing patterns that maximize reach
- Hashtag combinations that work
- Platform-specific optimizations
- Audience behavior patterns

Be specific and data-driven in your analysis. Provide confidence scores based on data strength.`,
        temperature: 0.2 // Low temperature for analytical accuracy
      }),
      timeoutPromise
    ]).catch(error => {
      console.error('❌ AI analysis failed:', error);
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });

    const learningReport = learningReportResult.object;

    // Store insights in memory
    this.memory.insights = learningReport.keyInsights;
    this.memory.patterns = learningReport.performancePatterns;
    this.memory.lastAnalysis = new Date();
    this.memory.postCount = allPosts.length;

    // Save memory to account group
    await this.saveMemoryToAccountGroup(accountGroup);

    console.log(`✅ AI Learning: Analysis complete. Found ${learningReport.keyInsights.length} key insights.`);

    return learningReport;
  }

  /**
   * Get personalized recommendations based on learned patterns
   */
  async getPersonalizedRecommendations(context: string): Promise<{
    recommendations: string[];
    reasoning: string;
    confidenceScore: number;
  }> {
    if (this.memory.insights.length === 0) {
      return {
        recommendations: ['Analyze past posts first to generate personalized recommendations'],
        reasoning: 'No learning data available yet',
        confidenceScore: 0
      };
    }

    const result = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        recommendations: z.array(z.string()),
        reasoning: z.string(),
        confidenceScore: z.number().min(0).max(100)
      }),
      prompt: `Based on learned patterns from past performance, provide personalized recommendations.

LEARNED INSIGHTS:
${JSON.stringify(this.memory.insights, null, 2)}

PERFORMANCE PATTERNS:
${JSON.stringify(this.memory.patterns, null, 2)}

CURRENT CONTEXT: ${context}

Provide specific recommendations based on what has worked well in the past.`,
      temperature: 0.3
    });

    return result.object;
  }

  /**
   * Predict content performance before posting (platform-aware)
   */
  async predictContentPerformance(content: string, platforms: string[]): Promise<{
    expectedEngagement: number;
    riskFactors: string[];
    optimizationSuggestions: string[];
    confidenceLevel: number;
    platformPredictions: Record<string, any>;
  }> {
    const predictionResult = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        expectedEngagement: z.number().min(0).max(100),
        riskFactors: z.array(z.string()),
        optimizationSuggestions: z.array(z.string()),
        confidenceLevel: z.number().min(0).max(100),
        platformPredictions: z.record(z.string(), z.object({
          expectedEngagement: z.number().min(0).max(100),
          platformSpecificRisks: z.array(z.string()),
          platformOptimizations: z.array(z.string()),
          confidenceLevel: z.number().min(0).max(100)
        }))
      }),
      prompt: `Predict the performance of this social media content based on learned patterns for each platform.

CONTENT TO ANALYZE:
"${content}"

PLATFORMS: ${platforms.join(', ')}

PLATFORM-SPECIFIC LEARNED PATTERNS:
${JSON.stringify(this.memory.patterns, null, 2)}

PLATFORM-SPECIFIC INSIGHTS:
${JSON.stringify(
  platforms.map(platform => ({
    platform,
    insights: this.memory.insights.filter(i => i.applicablePlatforms.includes(platform)).slice(0, 5)
  })), null, 2
)}

PLATFORM CHARACTERISTICS:
- Instagram: Visual-first, hashtag-heavy, story engagement, younger audience
- X: News-driven, conversation-focused, real-time engagement, diverse audience  
- LinkedIn: Professional network, thought leadership, B2B focus, working professionals
- TikTok: Entertainment-first, algorithm-driven, Gen Z focus, trend-sensitive
- Facebook: Community-driven, family/friends, older demographic, discussion-focused

For each platform, predict:
1. Expected engagement based on historical performance on THAT platform
2. Platform-specific risks (algorithm changes, audience preferences)
3. Platform-specific optimizations based on what has worked before
4. Confidence level based on available data for that platform

Be specific about how this content would perform differently on each platform based on YOUR historical data.`,
      temperature: 0.4
    });

    return predictionResult.object;
  }

  /**
   * Learn from content feedback (accept/reject decisions)
   */
  async learnFromContentFeedback(feedback: {
    generatedContent: string;
    accepted: boolean;
    reason?: string;
    editedVersion?: string;
    contentPillar?: string;
    toneUsed?: string;
    platform?: string;
  }[]): Promise<{
    patternsLearned: string[];
    recommendedAdjustments: string[];
  }> {
    if (feedback.length === 0) {
      return { patternsLearned: [], recommendedAdjustments: [] };
    }

    const accepted = feedback.filter(f => f.accepted);
    const rejected = feedback.filter(f => !f.accepted);
    const edited = feedback.filter(f => f.accepted && f.editedVersion);

    const result = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        patternsLearned: z.array(z.string()),
        recommendedAdjustments: z.array(z.string()),
        tonePreferences: z.object({
          preferred: z.array(z.string()),
          avoid: z.array(z.string())
        }),
        contentPillarPerformance: z.record(z.string(), z.object({
          acceptanceRate: z.number(),
          recommendation: z.string()
        })),
        lengthPreference: z.enum(['shorter', 'same', 'longer']),
        emojiPreference: z.enum(['more', 'same', 'fewer', 'none']),
        styleInsights: z.array(z.string())
      }),
      prompt: `Analyze this content feedback to learn user preferences and improve future content generation.

ACCEPTED CONTENT (${accepted.length} items):
${accepted.slice(-10).map(a => `
- Content: "${a.generatedContent.slice(0, 200)}..."
- Pillar: ${a.contentPillar || 'unknown'}
- Tone: ${a.toneUsed || 'unknown'}
- Platform: ${a.platform || 'unknown'}
`).join('\n')}

REJECTED CONTENT (${rejected.length} items):
${rejected.slice(-10).map(r => `
- Content: "${r.generatedContent.slice(0, 200)}..."
- Reason: ${r.reason || 'No reason given'}
- Pillar: ${r.contentPillar || 'unknown'}
- Tone: ${r.toneUsed || 'unknown'}
- Platform: ${r.platform || 'unknown'}
`).join('\n')}

EDITED BEFORE ACCEPTING (${edited.length} items):
${edited.slice(-5).map(e => `
- Original: "${e.generatedContent.slice(0, 100)}..."
- Edited to: "${e.editedVersion?.slice(0, 100)}..."
`).join('\n')}

Analyze patterns and determine:
1. What content styles, tones, and pillars get accepted vs rejected?
2. What common reasons are given for rejection?
3. What changes do users typically make when editing?
4. What adjustments should be made to improve acceptance rate?
5. Are there platform-specific preferences?`,
      temperature: 0.3
    });

    // Update internal memory with learned patterns
    const learningData = result.object;
    
    // Store in memory patterns
    this.memory.patterns.feedbackLearning = {
      lastUpdated: new Date().toISOString(),
      tonePreferences: learningData.tonePreferences,
      lengthPreference: learningData.lengthPreference,
      emojiPreference: learningData.emojiPreference,
      contentPillarPerformance: learningData.contentPillarPerformance,
      totalFeedbackAnalyzed: feedback.length,
      acceptanceRate: accepted.length / feedback.length
    };

    return {
      patternsLearned: learningData.patternsLearned,
      recommendedAdjustments: learningData.recommendedAdjustments
    };
  }

  /**
   * Get enhanced content generation prompt based on learned feedback
   */
  getEnhancedPromptFromFeedback(): string {
    const feedbackLearning = this.memory.patterns.feedbackLearning;
    if (!feedbackLearning) return '';

    let enhancedPrompt = '\n\n## LEARNED PREFERENCES FROM USER FEEDBACK:\n';

    if (feedbackLearning.tonePreferences) {
      if (feedbackLearning.tonePreferences.preferred.length > 0) {
        enhancedPrompt += `\n- Preferred tones: ${feedbackLearning.tonePreferences.preferred.join(', ')}`;
      }
      if (feedbackLearning.tonePreferences.avoid.length > 0) {
        enhancedPrompt += `\n- Tones to avoid: ${feedbackLearning.tonePreferences.avoid.join(', ')}`;
      }
    }

    if (feedbackLearning.lengthPreference && feedbackLearning.lengthPreference !== 'same') {
      enhancedPrompt += `\n- User prefers ${feedbackLearning.lengthPreference} content`;
    }

    if (feedbackLearning.emojiPreference && feedbackLearning.emojiPreference !== 'same') {
      enhancedPrompt += `\n- Emoji usage: use ${feedbackLearning.emojiPreference} emojis`;
    }

    if (feedbackLearning.contentPillarPerformance) {
      const topPillars = Object.entries(feedbackLearning.contentPillarPerformance)
        .sort((a, b) => (b[1] as any).acceptanceRate - (a[1] as any).acceptanceRate)
        .slice(0, 3);
      if (topPillars.length > 0) {
        enhancedPrompt += `\n- Top performing content pillars: ${topPillars.map(p => p[0]).join(', ')}`;
      }
    }

    return enhancedPrompt;
  }

  /**
   * Continuous learning from new post performance
   */
  async learnFromNewPost(post: any): Promise<void> {

    const performanceData = this.convertPostToPerformanceData(post);
    
    // Generate insights from this single post
    const newInsightsResult = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        insights: z.array(LearningInsightSchema),
        shouldUpdateStrategy: z.boolean(),
        strategyAdjustment: z.string().optional()
      }),
      prompt: `Analyze this new post performance and extract learning insights.

NEW POST DATA:
${JSON.stringify(performanceData, null, 2)}

EXISTING INSIGHTS:
${JSON.stringify(this.memory.insights.slice(-5), null, 2)}

Determine:
1. What new insights can be learned from this post?
2. Does this contradict or confirm existing patterns?
3. Should we adjust our strategy based on this data?`,
      temperature: 0.3
    });

    const newInsights = newInsightsResult.object;

    // Update memory with new insights
    this.memory.insights.push(...newInsights.insights);
    
    // Keep only the most recent and relevant insights (max 100)
    if (this.memory.insights.length > 100) {
      this.memory.insights = this.memory.insights
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 100);
    }

    console.log(`✅ AI Learning: Added ${newInsights.insights.length} new insights from post.`);
  }

  /**
   * Get learning-based content suggestions
   */
  async generateLearningBasedContent(topic: string, targetPlatform?: string): Promise<{
    content: string;
    hashtags: string[];
    bestTime: string;
    expectedPerformance: number;
    reasoning: string;
    platformOptimizations: Record<string, any>;
  }> {
    // Filter insights for target platform if specified
    const platformInsights = targetPlatform 
      ? this.memory.insights.filter(insight => 
          insight.applicablePlatforms.includes(targetPlatform))
      : this.memory.insights;

    const result = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        content: z.string(),
        hashtags: z.array(z.string()),
        bestTime: z.string(),
        expectedPerformance: z.number().min(0).max(100),
        reasoning: z.string(),
        platformOptimizations: z.record(z.string(), z.object({
          adaptedContent: z.string(),
          platformHashtags: z.array(z.string()),
          optimalLength: z.number(),
          engagementStrategy: z.string(),
          bestPostingTime: z.string()
        }))
      }),
      prompt: `Generate platform-optimized social media content based on learned performance patterns.

TOPIC: ${topic}
TARGET PLATFORM: ${targetPlatform || 'all platforms'}

PLATFORM-SPECIFIC INSIGHTS:
${JSON.stringify(platformInsights.slice(0, 15), null, 2)}

LEARNED PATTERNS BY PLATFORM:
${JSON.stringify(this.memory.patterns, null, 2)}

PLATFORM OPTIMIZATION REQUIREMENTS:
- Instagram: Visual storytelling, 8-10 hashtags, emojis, carousel-friendly
- X (Twitter): Concise (280 chars), trending topics, 1-2 hashtags, conversational
- LinkedIn: Professional tone, industry insights, minimal hashtags, thought leadership
- TikTok: Hook in first 3 seconds, trend-aware, entertainment focus
- Facebook: Community discussion, longer form, question-driven
- YouTube: Educational value, SEO-optimized titles, detailed descriptions
- Pinterest: Visual discovery, keyword-rich descriptions, seasonal relevance

Generate content optimized for ${targetPlatform || 'each platform'} based on what has performed best historically for THIS specific account.`,
      temperature: 0.6
    });

    return result.object;
  }

  /**
   * Extract all posts from account group for analysis
   */
  private async extractAllPosts(accountGroup: any): Promise<any[]> {
    const posts = [];
    
    if (accountGroup.posts) {
      for (const post of accountGroup.posts) {
        if (post && post.variants) {
          // Extract post data for each platform variant
          for (const [platform, variant] of Object.entries(post.variants)) {
            if (variant && (variant as any).status === 'published') {
              posts.push({
                id: post.id,
                title: post.title?.toString() || '',
                content: (variant as any).text?.toString() || '',
                platform,
                publishedAt: (variant as any).publishedAt,
                performance: (variant as any).performance,
                ayrsharePostId: (variant as any).ayrsharePostId,
                socialPostUrl: (variant as any).socialPostUrl
              });
            }
          }
        }
      }
    }

    return posts;
  }

  /**
   * Convert post data to performance analysis format
   */
  private convertPostToPerformanceData(post: any): z.infer<typeof PostPerformanceSchema> {
    const publishedDate = new Date(post.publishedAt || Date.now());
    
    return {
      postId: post.id || 'unknown',
      content: post.content || '',
      platforms: [post.platform || 'unknown'],
      publishedAt: publishedDate,
      engagement: {
        likes: post.performance?.likes || 0,
        comments: post.performance?.comments || 0,
        shares: post.performance?.shares || 0,
        impressions: post.performance?.impressions || 0,
        engagementRate: post.performance?.engagementRate || 0
      },
      hashtags: this.extractHashtags(post.content || ''),
      postingTime: {
        hour: publishedDate.getHours(),
        dayOfWeek: publishedDate.getDay(),
        timezone: 'UTC'
      },
      contentMetrics: {
        length: (post.content || '').length,
        hasImages: false, // Would need to check media
        hasVideo: false,
        questionCount: (post.content || '').split('?').length - 1,
        hashtagCount: this.extractHashtags(post.content || '').length,
        mentionCount: (post.content || '').split('@').length - 1
      }
    };
  }

  /**
   * Extract hashtags from content
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    return content.match(hashtagRegex)?.map(tag => tag.slice(1)) || [];
  }

  /**
   * Save learning memory to account group
   */
  async saveMemoryToAccountGroup(accountGroup: any): Promise<void> {
    try {
      // Store learning memory in account group settings
      if (!accountGroup.settings) {
        (accountGroup as any).settings = {};
      }
      
      // Ensure dates are serialized properly
      const memoryToSave = {
        ...this.memory,
        lastAnalysis: this.memory.lastAnalysis instanceof Date 
          ? this.memory.lastAnalysis.toISOString() 
          : this.memory.lastAnalysis
      };
      
      (accountGroup.settings as any).aiLearningMemory = JSON.stringify(memoryToSave);
      
      console.log(`💾 AI Learning: Memory saved to account group`);
    } catch (error) {
      console.error('❌ Failed to save learning memory:', error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Load learning memory from account group
   */
  async loadMemoryFromAccountGroup(accountGroup: any): Promise<void> {
    try {
      const memoryJson = accountGroup?.settings?.aiLearningMemory;
      
      if (memoryJson && typeof memoryJson === 'string') {
        const parsed = JSON.parse(memoryJson);
        // Ensure dates are properly converted
        this.memory = {
          ...parsed,
          lastAnalysis: parsed.lastAnalysis ? new Date(parsed.lastAnalysis) : new Date(0),
          insights: parsed.insights || [],
          patterns: parsed.patterns || {},
          postCount: parsed.postCount || 0,
          version: parsed.version || '1.0'
        };
        console.log(`📖 AI Learning: Loaded memory with ${this.memory.insights.length} insights`);
      } else {
        console.log(`🆕 AI Learning: No existing memory found, starting fresh`);
      }
    } catch (error) {
      console.error('❌ Failed to load learning memory:', error);
      // Keep default empty memory on error
      this.memory = {
        insights: [],
        patterns: {},
        lastAnalysis: new Date(0),
        postCount: 0,
        version: '1.0'
      };
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    totalInsights: number;
    lastAnalysis: Date;
    postsAnalyzed: number;
    topCategories: string[];
    avgConfidence: number;
  } {
    const categoryCount = this.memory.insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgConfidence = this.memory.insights.length > 0 
      ? this.memory.insights.reduce((sum, insight) => sum + insight.confidence, 0) / this.memory.insights.length
      : 0;

    return {
      totalInsights: this.memory.insights.length,
      lastAnalysis: this.memory.lastAnalysis,
      postsAnalyzed: this.memory.postCount,
      topCategories: Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category),
      avgConfidence
    };
  }
}

/**
 * Enhanced AI Autopilot with Learning Capabilities
 */
export class LearningAIAutopilot {
  public learningSystem: AILearningSystem;
  private accountGroup: any;

  constructor(accountGroupId: string, platforms: string[], accountGroup: any) {
    this.learningSystem = new AILearningSystem(accountGroupId, platforms);
    this.accountGroup = accountGroup;
  }

  /**
   * Initialize learning system with historical data
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Learning AI Autopilot...');
    
    try {
      // Load existing memory
      await this.learningSystem.loadMemoryFromAccountGroup(this.accountGroup);
      
      // Check if we need to analyze posts
      const memoryStats = this.learningSystem.getMemoryStats();
      const currentPostCount = this.accountGroup.posts?.length || 0;
      
      // Check if lastAnalysis is a valid Date
      const lastAnalysisTime = memoryStats.lastAnalysis instanceof Date 
        ? memoryStats.lastAnalysis.getTime() 
        : new Date(memoryStats.lastAnalysis).getTime();
      
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      if (currentPostCount > memoryStats.postsAnalyzed || 
          lastAnalysisTime < sevenDaysAgo || 
          isNaN(lastAnalysisTime)) {
        
        console.log('🔄 Running fresh analysis on all posts...');
        await this.learningSystem.analyzeAllPosts(this.accountGroup);
      }
      
      console.log('✅ Learning AI Autopilot initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Learning AI Autopilot:', error);
      throw error;
    }
  }

  /**
   * Make AI decisions based on learned patterns
   */
  async makeLearnedDecisions(context: string): Promise<{
    decision: string;
    confidence: number;
    reasoning: string;
    basedOnInsights: string[];
  }> {
    const personalizedRecs = await this.learningSystem.getPersonalizedRecommendations(context);
    
    const decisionResult = await generateObject({
      model: openai('gpt-4'),
      schema: z.object({
        decision: z.string(),
        confidence: z.number().min(0).max(100),
        reasoning: z.string(),
        basedOnInsights: z.array(z.string())
      }),
      prompt: `Make an AI autopilot decision based on learned patterns and insights.

CONTEXT: ${context}

PERSONALIZED RECOMMENDATIONS:
${JSON.stringify(personalizedRecs, null, 2)}

MEMORY STATS: ${JSON.stringify(this.learningSystem.getMemoryStats(), null, 2)}

Make a decision that leverages the learned patterns for maximum effectiveness.`,
      temperature: 0.3
    });

    return decisionResult.object;
  }

  /**
   * Generate content optimized based on learning
   */
  async generateOptimizedContent(topic: string): Promise<{
    content: string;
    hashtags: string[];
    bestTime: string;
    expectedPerformance: number;
    reasoning: string;
    learningBased: boolean;
  }> {
    const learningBasedContent = await this.learningSystem.generateLearningBasedContent(topic);
    
    return {
      ...learningBasedContent,
      learningBased: true
    };
  }

  /**
   * Learn from new post performance and update strategies
   */
  async learnFromNewPost(post: any): Promise<void> {
    await this.learningSystem.learnFromNewPost(post);
    
    // Save updated memory
    await this.learningSystem.saveMemoryToAccountGroup(this.accountGroup);
  }

  /**
   * Get learning statistics and insights
   */
  getLearningStats(): any {
    return this.learningSystem.getMemoryStats();
  }
}

/**
 * Create learning-enabled autopilot
 */
export async function createLearningAutopilot(
  accountGroupId: string, 
  platforms: string[], 
  accountGroup: any
): Promise<LearningAIAutopilot> {
  const autopilot = new LearningAIAutopilot(accountGroupId, platforms, accountGroup);
  await autopilot.initialize();
  return autopilot;
}
