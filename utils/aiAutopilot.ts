/**
 * AI Autopilot System - Real-time AI decision making for social media automation
 * Integrates with existing AI Growth Engine and uses AI SDK for enhanced capabilities
 *
 * OPTIMIZED: Uses model tiering for cost efficiency
 */

import { generateObject, generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { AIGrowthEngine } from "./aiGrowthEngine";
import { BrandPersonaManager, BrandPersona } from "./brandPersonaManager";
import { getEnhancedOptimalTiming } from "./optimalTimingEngine";
import { getModelForTask, usageTracker } from "./aiOptimizer";

// Structured content suggestion schema - separates content from metadata
export const ContentSuggestionSchema = z.object({
  content: z.string().describe("The actual post content with hashtags - ready to post, no metadata or tips"),
  suggestedPostTime: z.object({
    day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]).describe("Day of week"),
    hour: z.number().min(0).max(23).describe("Hour in 24h format, e.g. 10 for 10 AM, 14 for 2 PM"),
  }),
  contentPillar: z.string().describe("Which content pillar/topic this content is about"),
  engagementPotential: z.number().min(0).max(100).describe("Predicted engagement score"),
});

export type ContentSuggestion = z.infer<typeof ContentSuggestionSchema>;

/**
 * Convert AI suggested day/hour to the next occurrence of that time
 */
export function getNextScheduledDate(day: string, hour: number): Date {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDayIndex = days.indexOf(day);
  
  if (targetDayIndex === -1) {
    // Invalid day, return tomorrow at the specified hour
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(hour, 0, 0, 0);
    return tomorrow;
  }
  
  const now = new Date();
  const currentDayIndex = now.getDay();
  const currentHour = now.getHours();
  
  // Calculate days until target day
  let daysUntil = targetDayIndex - currentDayIndex;
  
  // If it's the same day, check if the hour has passed
  if (daysUntil === 0 && currentHour >= hour) {
    daysUntil = 7; // Next week
  } else if (daysUntil < 0) {
    daysUntil += 7; // Next week
  }
  
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + daysUntil);
  scheduledDate.setHours(hour, 0, 0, 0);
  
  return scheduledDate;
}

// AI Decision Schema
const AIDecisionSchema = z.object({
  action: z.string(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  expectedImpact: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  shouldExecute: z.boolean(),
  executionTime: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
});

const AutopilotAnalysisSchema = z.object({
  currentStatus: z.object({
    engagementTrend: z.enum(["rising", "stable", "declining"]),
    contentPerformance: z.number().min(0).max(100),
    audienceActivity: z.enum(["peak", "moderate", "low"]),
    competitorActivity: z.enum(["high", "normal", "low"]),
  }),
  recommendations: z.array(AIDecisionSchema),
  autopilotActions: z.array(AIDecisionSchema),
  riskAssessment: z.object({
    overpostingRisk: z.number().min(0).max(100),
    brandConsistencyRisk: z.number().min(0).max(100),
    engagementDropRisk: z.number().min(0).max(100),
  }),
});

interface AutopilotConfig {
  aggressiveness: "conservative" | "moderate" | "aggressive";
  maxPostsPerDay: number;
  enableAutoPosting: boolean;
  enableAutoEngagement: boolean;
  enableContentOptimization: boolean;
  platforms: string[];
  brandPersonaId?: string;
  accountGroupId: string;
}

interface AutopilotState {
  isActive: boolean;
  lastDecision: Date;
  totalActions: number;
  successRate: number;
  currentStrategy: string;
}

export class AIAutopilot {
  private config: AutopilotConfig;
  private state: AutopilotState;
  private growthEngine: AIGrowthEngine;
  private brandManager?: BrandPersonaManager;
  private brandPersona?: BrandPersona;

  constructor(config: AutopilotConfig) {
    this.config = config;
    this.state = {
      isActive: false,
      lastDecision: new Date(),
      totalActions: 0,
      successRate: 0,
      currentStrategy: "initialization",
    };

    // Initialize growth engine for each platform
    this.growthEngine = new AIGrowthEngine(
      config.platforms[0], // Primary platform
      undefined, // Profile key will be loaded
      config.aggressiveness
    );
  }

  /**
   * Set brand persona for content generation
   */
  setBrandPersona(persona: BrandPersona): void {
    this.brandPersona = persona;
    this.brandManager = new BrandPersonaManager(persona);
  }

  /**
   * Start the autopilot system
   */
  async start(): Promise<void> {
    this.state.isActive = true;
    this.state.currentStrategy = "active_monitoring";

    // Initialize brand manager if persona is configured
    // Note: BrandPersonaManager needs persona data passed in constructor
    // For now, we'll initialize it without persona if ID is provided
    if (this.config.brandPersonaId) {
      // TODO: Load persona data and pass to constructor
      // this.brandManager = new BrandPersonaManager(personaData);
    }
  }

  /**
   * Stop the autopilot system
   */
  stop(): void {
    this.state.isActive = false;
    this.state.currentStrategy = "paused";
  }

  /**
   * Main autopilot decision loop - analyzes current state and makes AI-powered decisions
   */
  async makeAutopilotDecisions(): Promise<{
    analysis: z.infer<typeof AutopilotAnalysisSchema>;
    executedActions: number;
    scheduledActions: number;
  }> {
    if (!this.state.isActive) {
      throw new Error("Autopilot is not active");
    }

    // Gather current performance data
    const performanceData = await this.gatherPerformanceData();

    // Create context for AI analysis
    const analysisContext = this.buildAnalysisContext(performanceData);

    // Generate AI-powered analysis and recommendations with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Autopilot analysis timeout after 60 seconds")),
        60000
      )
    );

    const analysisResult = await Promise.race([
      generateObject({
        model: getModelForTask("complex"),
        schema: AutopilotAnalysisSchema,
        prompt: `You are an AI social media autopilot system. Analyze the current state and provide actionable recommendations.

CURRENT CONTEXT:
${analysisContext}

BRAND PERSONA: ${this.brandManager ? "Configured" : "None configured"}

AUTOPILOT CONFIG:
- Aggressiveness: ${this.config.aggressiveness}
- Max posts/day: ${this.config.maxPostsPerDay}
- Auto posting: ${this.config.enableAutoPosting}
- Auto engagement: ${this.config.enableAutoEngagement}
- Platforms: ${this.config.platforms.join(", ")}

Provide specific, actionable recommendations with high confidence scores. Focus on:
1. Content optimization opportunities
2. Timing optimization
3. Engagement automation actions
4. Risk mitigation strategies

Be decisive and provide clear reasoning for each recommendation.`,
        temperature: 0.7,
      }),
      timeoutPromise,
    ]).catch((error) => {
      console.error("❌ Autopilot analysis failed:", error);
      throw new Error(
        `Autopilot analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    });

    const analysis = analysisResult.object;

    // Execute high-confidence autopilot actions
    let executedActions = 0;
    let scheduledActions = 0;

    for (const action of analysis.autopilotActions) {
      if (action.shouldExecute && action.confidence >= 80) {
        try {
          await this.executeAutopilotAction(action);
          executedActions++;
        } catch (error) {
          console.error(`❌ Autopilot action failed:`, error);
        }
      } else if (action.shouldExecute && action.executionTime) {
        // Schedule action for later
        await this.scheduleAutopilotAction(action);
        scheduledActions++;
      }
    }

    // Update state
    this.state.lastDecision = new Date();
    this.state.totalActions += executedActions;

    return {
      analysis,
      executedActions,
      scheduledActions,
    };
  }

  /**
   * Generate AI-powered content with structured output (content, timing, pillar)
   * Returns structured data that separates post content from metadata
   */
  async generateStructuredContent(
    prompt: string
  ): Promise<ContentSuggestion> {
    // Build brand context with actual content pillars
    let brandContext = "";
    let contentPillars: string[] = [];
    let samplePosts: string[] = [];
    
    if (this.brandPersona) {
      contentPillars = this.brandPersona.messaging.contentPillars || [];
      samplePosts = this.brandPersona.examples.samplePosts || [];
      
      // Get emoji guidance
      const emojiGuidance = {
        none: "DO NOT use any emojis.",
        minimal: "Use 1-2 emojis maximum, placed strategically.",
        moderate: "Use 3-5 emojis naturally throughout.",
        frequent: "Use emojis expressively throughout the content.",
      }[this.brandPersona.voice.emojiUsage] || "Use emojis moderately.";

      brandContext = `
=== YOUR BRAND IDENTITY ===
Brand: ${this.brandPersona.name}
Voice: ${this.brandPersona.voice.tone}, ${this.brandPersona.voice.writingStyle}
Target Audience: ${this.brandPersona.messaging.targetAudience}
Value Proposition: ${this.brandPersona.messaging.valueProposition}
Emoji Style: ${emojiGuidance}

=== CONTENT TOPICS (pick ONE randomly) ===
${contentPillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}

${samplePosts.length > 0 ? `=== EXAMPLE POSTS (match this style) ===
${samplePosts.slice(0, 2).map((p, i) => `Example ${i + 1}: "${p}"`).join("\n\n")}` : ""}
`;
    }

    // Platform-specific guidance
    const platform = this.config.platforms[0]?.toLowerCase() || 'instagram';
    const platformGuidance: Record<string, string> = {
      instagram: `Instagram best practices:
- Use line breaks for readability
- Start with a hook that stops the scroll
- End with a clear call-to-action question
- Use 5-10 relevant hashtags at the end
- Keep it conversational and authentic
- Character limit: 2200 (aim for 150-300 for feed posts)`,
      x: `X/Twitter best practices:
- Keep it under 280 characters
- Be punchy and direct
- Use 1-3 hashtags max
- Make it shareable/quotable
- Strong opinions perform well`,
      twitter: `Twitter best practices:
- Keep it under 280 characters
- Be punchy and direct
- Use 1-3 hashtags max
- Make it shareable/quotable`,
      linkedin: `LinkedIn best practices:
- Professional but personable tone
- Start with a hook line
- Use line breaks and formatting
- Share insights and lessons learned
- 3-5 hashtags at end
- Aim for 150-300 words`,
      tiktok: `TikTok CAPTION (NOT VIDEO SCRIPT) best practices:
- CRITICAL: Write a SHORT CAPTION (under 150 chars) - NOT a video script!
- NO "[Scene:]", "**Hook**:", "**Script**:", "[Outro]" or any script formatting
- Just write a catchy one-liner or question to accompany a video
- Examples: "this changes everything 👀" or "POV: when the code finally works"
- Be casual, fun, and relatable
- Use trending hashtags (3-5 max)
- NO markdown formatting, NO em-dashes`,
      facebook: `Facebook best practices:
- Conversational tone
- Ask questions to drive comments
- 1-3 hashtags max
- 100-250 characters ideal`,
    };

    const systemPrompt = `You are ${this.brandPersona?.name || 'a social media expert'}. Generate a REAL, ready-to-post piece of content.

${brandContext}

=== PLATFORM: ${platform.toUpperCase()} ===
${platformGuidance[platform] || platformGuidance.instagram}

=== ABSOLUTE REQUIREMENTS ===
1. The "content" field must be the EXACT text that gets posted - copy-paste ready
2. NO metadata in the content (no "Best Time to Post", no "Engagement Tip", no headers)
3. NO placeholder text like [topic] or {insert here}
4. Write as the BRAND, not about the brand
5. Be specific and authentic - no generic fluff
6. Include hashtags at the END of the content
7. Make it sound human, not AI-generated
8. NO video script formatting - no "[Scene:]", "**Hook**:", "[Outro]" etc.
9. NO markdown formatting (**bold**, *italic*) - platforms don't render it
10. NO em-dashes (—) - they scream AI-generated

=== WHAT MAKES CONTENT USABLE ===
- Specific insights, not vague platitudes
- Personal voice and perspective
- A clear hook at the start
- Actionable or thought-provoking
- Natural language a human would actually say`;

    // Pick a random pillar to ensure variety
    const randomPillar = contentPillars.length > 0 
      ? contentPillars[Math.floor(Math.random() * contentPillars.length)]
      : null;

    const result = await generateObject({
      model: getModelForTask("complex"),
      schema: ContentSuggestionSchema,
      system: systemPrompt,
      prompt: `Create a ${platform} post${randomPillar ? ` about: ${randomPillar}` : ''}.

The content must be:
- Ready to copy-paste and post immediately
- In the brand's authentic voice
- Specific and valuable (not generic)
- Engaging with a clear hook

${prompt !== 'Generate engaging content for my brand' ? `Additional context: ${prompt}` : ''}

Remember: Output ONLY the post content in the content field. No tips, no metadata, no explanations.`,
      temperature: 0.85,
    });

    return result.object;
  }

  /**
   * Generate AI-powered content suggestions with streaming (legacy method)
   * @deprecated Use generateStructuredContent instead for structured output
   */
  async generateContentWithStreaming(
    prompt: string
  ): Promise<AsyncIterable<string>> {
    // Build brand context with actual content pillars
    let brandContext = "";
    
    if (this.brandPersona) {
      const contentPillars = this.brandPersona.messaging.contentPillars || [];
      const randomPillar = contentPillars[Math.floor(Math.random() * contentPillars.length)];
      
      brandContext = `You are ${this.brandPersona.name}.

BRAND VOICE: ${this.brandPersona.voice.tone}, ${this.brandPersona.voice.writingStyle}
TARGET AUDIENCE: ${this.brandPersona.messaging.targetAudience}
TODAY'S TOPIC: ${randomPillar || 'general brand content'}

Write as the brand, not about the brand. Be authentic and specific.
`;
    }

    const platform = this.config.platforms[0] || 'instagram';
    
    const enhancedPrompt = `${brandContext}
Create a ${platform} post that is READY TO POST.

REQUIREMENTS:
- Output ONLY the post content (what gets posted)
- Include hashtags at the end
- NO metadata (no "Best Time to Post", no tips, no headers)
- Be specific and authentic
- Use natural language
- Start with a scroll-stopping hook

${prompt !== 'Generate engaging content for my brand' ? `Topic guidance: ${prompt}` : ''}`;

    const result = await streamText({
      model: getModelForTask("complex"),
      prompt: enhancedPrompt,
      temperature: 0.85,
    });

    return result.textStream;
  }

  /**
   * Analyze image content and generate AI-powered captions
   */
  async analyzeImageAndGenerateContent(imageUrl: string): Promise<{
    description: string;
    suggestedCaption: string;
    hashtags: string[];
    engagementPotential: number;
  }> {
    const analysisResult = await generateObject({
      model: openai("gpt-4-vision-preview"),
      schema: z.object({
        description: z.string(),
        suggestedCaption: z.string(),
        hashtags: z.array(z.string()),
        engagementPotential: z.number().min(0).max(100),
      }),
      prompt: `Analyze this image and generate optimized social media content.

Image URL: ${imageUrl}

Provide:
1. Detailed description of what you see
2. Engaging caption that would drive engagement
3. Relevant hashtags (mix of popular and niche)
4. Engagement potential score (0-100)

${
  this.brandManager
    ? `Brand Context: Brand persona is configured for this account`
    : ""
}`,
      temperature: 0.7,
    });

    return analysisResult.object;
  }

  /**
   * Real-time performance monitoring with AI insights
   */
  async monitorPerformanceWithAI(): Promise<{
    insights: string[];
    urgentActions: z.infer<typeof AIDecisionSchema>[];
    performanceScore: number;
  }> {
    const performanceData = await this.gatherPerformanceData();

    const analysisResult = await generateObject({
      model: getModelForTask("complex"),
      schema: z.object({
        insights: z.array(z.string()),
        urgentActions: z.array(AIDecisionSchema),
        performanceScore: z.number().min(0).max(100),
      }),
      prompt: `Analyze current social media performance and provide AI insights.

PERFORMANCE DATA:
${JSON.stringify(performanceData, null, 2)}

Provide:
1. Key insights about performance trends
2. Urgent actions needed (high confidence only)
3. Overall performance score

Focus on actionable insights that can be automated.`,
    });

    return analysisResult.object;
  }

  /**
   * Execute an autopilot action with error handling
   */
  private async executeAutopilotAction(
    action: z.infer<typeof AIDecisionSchema>
  ): Promise<void> {
    console.log(`🤖 Executing autopilot action: ${action.action}`);

    try {
      switch (action.action.toLowerCase()) {
        case "optimize_posting_time":
          await this.optimizePostingTime(action.parameters);
          break;

        case "generate_content":
          await this.generateAndScheduleContent(action.parameters);
          break;

        case "engage_with_audience":
          await this.automateEngagement(action.parameters);
          break;

        case "adjust_hashtag_strategy":
          await this.optimizeHashtagStrategy(action.parameters);
          break;

        default:
          console.warn(`⚠️ Unknown autopilot action: ${action.action}`);
      }
    } catch (error) {
      console.error(
        `❌ Failed to execute autopilot action ${action.action}:`,
        error
      );
      throw error; // Re-throw to allow caller to handle
    }
  }

  /**
   * Schedule an autopilot action for later execution
   */
  private async scheduleAutopilotAction(
    action: z.infer<typeof AIDecisionSchema>
  ): Promise<void> {
    // This would integrate with your existing scheduling system
    console.log(
      `📅 Scheduling autopilot action: ${action.action} for ${action.executionTime}`
    );
  }

  /**
   * Gather current performance data for AI analysis
   */
  private async gatherPerformanceData(): Promise<any> {
    // Integrate with your existing analytics
    return {
      timestamp: new Date().toISOString(),
      platforms: this.config.platforms,
      recentPosts: [], // Would fetch from your post history
      engagementMetrics: {}, // Would fetch from analytics
      audienceInsights: {}, // Would fetch from audience data
      competitorData: {}, // Would fetch from competitor analysis
    };
  }

  /**
   * Build context string for AI analysis
   */
  private buildAnalysisContext(performanceData: any): string {
    return `
PERFORMANCE SUMMARY:
- Platforms: ${this.config.platforms.join(", ")}
- Recent activity: ${performanceData.recentPosts?.length || 0} posts
- Autopilot mode: ${this.config.aggressiveness}
- Auto posting: ${this.config.enableAutoPosting ? "enabled" : "disabled"}
- Auto engagement: ${this.config.enableAutoEngagement ? "enabled" : "disabled"}

CURRENT STRATEGY: ${this.state.currentStrategy}
TOTAL ACTIONS TAKEN: ${this.state.totalActions}
SUCCESS RATE: ${this.state.successRate}%

TIMESTAMP: ${new Date().toISOString()}
`;
  }

  // Action execution methods
  private async optimizePostingTime(parameters: any): Promise<void> {
    const optimalTimes = await getEnhancedOptimalTiming(
      this.config.platforms[0]
    );
    console.log(`🕒 Optimized posting times:`, optimalTimes);
  }

  private async generateAndScheduleContent(parameters: any): Promise<void> {
    const contentSuggestions =
      await this.growthEngine.generateContentSuggestions(1);
    console.log(`📝 Generated content:`, contentSuggestions[0]);
  }

  private async automateEngagement(parameters: any): Promise<void> {
    console.log(`💬 Automating engagement with parameters:`, parameters);
  }

  private async optimizeHashtagStrategy(parameters: any): Promise<void> {
    console.log(`#️⃣ Optimizing hashtag strategy:`, parameters);
  }

  /**
   * Get current autopilot status
   */
  getStatus(): AutopilotState & { config: AutopilotConfig } {
    return {
      ...this.state,
      config: this.config,
    };
  }
}

/**
 * Create and configure an AI autopilot instance
 */
export async function createAIAutopilot(
  config: AutopilotConfig
): Promise<AIAutopilot> {
  const autopilot = new AIAutopilot(config);
  await autopilot.start();
  return autopilot;
}

/**
 * Quick autopilot decision for immediate use
 */
export async function getQuickAutopilotDecision(
  context: string,
  options: string[]
): Promise<{ decision: string; confidence: number; reasoning: string }> {
  const result = await generateObject({
    model: getModelForTask("complex"),
    schema: z.object({
      decision: z.string(),
      confidence: z.number().min(0).max(100),
      reasoning: z.string(),
    }),
    prompt: `You are an AI autopilot for social media. Make a quick decision.

CONTEXT: ${context}

OPTIONS: ${options.join(", ")}

Choose the best option and provide confidence level and reasoning.`,
    temperature: 0.3, // Lower temperature for more focused decisions
  });

  return result.object;
}
