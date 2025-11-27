/**
 * AI Optimizer - Reduces token usage and costs through smart model selection,
 * caching, batching, and prompt compression
 */

import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// =============================================================================
// MODEL TIERING - Use the right model for each task
// =============================================================================

export type TaskComplexity = "simple" | "medium" | "complex";

interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens?: number;
}

const MODEL_TIERS: Record<TaskComplexity, ModelConfig> = {
  simple: {
    model: "gpt-4o-mini", // Fast, cheap - for hashtags, formatting, simple edits
    temperature: 0.5,
    maxTokens: 300,
  },
  medium: {
    model: "gpt-4o-mini", // Still efficient - for content generation, replies
    temperature: 0.7,
    maxTokens: 500,
  },
  complex: {
    model: "gpt-4o", // Full power - for strategic analysis, learning insights
    temperature: 0.7,
    maxTokens: 1000,
  },
};

export function getModelForTask(complexity: TaskComplexity) {
  return openai(MODEL_TIERS[complexity].model);
}

export function getConfigForTask(complexity: TaskComplexity): ModelConfig {
  return MODEL_TIERS[complexity];
}

// Task complexity mapping for common operations
export const TASK_COMPLEXITY_MAP: Record<string, TaskComplexity> = {
  // Simple tasks - use gpt-4o-mini
  hashtags: "simple",
  formatting: "simple",
  caption: "simple",
  emoji: "simple",
  shorten: "simple",
  expand: "simple",

  // Medium tasks - still use gpt-4o-mini but with more tokens
  post: "medium",
  reply: "medium",
  dm: "medium",
  hook: "medium",
  cta: "medium",

  // Complex tasks - use gpt-4o
  strategy: "complex",
  analysis: "complex",
  learning: "complex",
  prediction: "complex",
  recommendations: "complex",
  persona: "complex",
};

// =============================================================================
// CONTEXT CACHING - Don't rebuild context every call
// =============================================================================

interface CachedContext {
  data: string;
  timestamp: number;
  ttl: number; // Time to live in ms
}

class ContextCache {
  private cache: Map<string, CachedContext> = new Map();

  // Default TTLs for different context types
  private static TTL = {
    brandPersona: 1000 * 60 * 60, // 1 hour - rarely changes
    learnedInsights: 1000 * 60 * 30, // 30 minutes - changes slowly
    analytics: 1000 * 60 * 5, // 5 minutes - changes frequently
    platformRules: 1000 * 60 * 60 * 24, // 24 hours - static
  };

  set(key: string, data: string, ttlType: keyof typeof ContextCache.TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ContextCache.TTL[ttlType],
    });
  }

  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export const contextCache = new ContextCache();

// =============================================================================
// PROMPT COMPRESSION - Reduce token usage
// =============================================================================

interface BrandPersona {
  name?: string;
  tone?: string;
  writingStyle?: string;
  emojiUsage?: string;
  hashtagStyle?: string;
  contentPillars?: string[];
  targetAudience?: string;
  uniqueValue?: string;
  avoidTopics?: string[];
  voice?: {
    vocabulary?: string[];
    phrases?: string[];
    personality?: string;
  };
}

/**
 * Compress brand persona into minimal token format
 * Reduces ~500 tokens to ~100 tokens
 */
export function compressBrandContext(persona: BrandPersona): string {
  if (!persona) return "No brand persona configured.";

  const compressed = [
    `Brand:${persona.name || "Unnamed"}`,
    `Tone:${persona.tone || "professional"}`,
    `Style:${persona.writingStyle || "casual"}`,
    `Emoji:${persona.emojiUsage || "moderate"}`,
    `Hashtags:${persona.hashtagStyle || "moderate"}`,
  ];

  if (persona.contentPillars?.length) {
    compressed.push(`Pillars:${persona.contentPillars.slice(0, 5).join(",")}`);
  }

  if (persona.targetAudience) {
    compressed.push(`Audience:${persona.targetAudience.slice(0, 50)}`);
  }

  if (persona.voice?.personality) {
    compressed.push(`Voice:${persona.voice.personality.slice(0, 50)}`);
  }

  if (persona.avoidTopics?.length) {
    compressed.push(`Avoid:${persona.avoidTopics.slice(0, 3).join(",")}`);
  }

  return compressed.join("|");
}

/**
 * Compress learned insights into minimal format
 */
export function compressLearnedInsights(insights: {
  preferredTone?: string[];
  avoidTone?: string[];
  lengthPreference?: string;
  emojiPreference?: string;
  topPillars?: string[];
  acceptanceRate?: number;
  patterns?: string[];
}): string {
  if (!insights || Object.keys(insights).length === 0) {
    return "No learned preferences yet.";
  }

  const compressed = [];

  if (insights.preferredTone?.length) {
    compressed.push(`+Tone:${insights.preferredTone.slice(0, 3).join(",")}`);
  }
  if (insights.avoidTone?.length) {
    compressed.push(`-Tone:${insights.avoidTone.slice(0, 3).join(",")}`);
  }
  if (insights.lengthPreference) {
    compressed.push(`Len:${insights.lengthPreference}`);
  }
  if (insights.emojiPreference) {
    compressed.push(`Emoji:${insights.emojiPreference}`);
  }
  if (insights.topPillars?.length) {
    compressed.push(`TopPillars:${insights.topPillars.slice(0, 3).join(",")}`);
  }
  if (insights.acceptanceRate !== undefined) {
    compressed.push(`AccRate:${Math.round(insights.acceptanceRate)}%`);
  }
  if (insights.patterns?.length) {
    compressed.push(`Patterns:${insights.patterns.slice(0, 2).join(";")}`);
  }

  return compressed.join("|");
}

/**
 * Platform-specific character limits and rules (compressed)
 */
export const PLATFORM_RULES: Record<string, string> = {
  twitter: "Max280chars|NoLinks>23chars|2-3hashtags|Threads=multiple",
  x: "Max280chars|NoLinks>23chars|2-3hashtags|Threads=multiple",
  instagram: "Max2200chars|30hashtagsMax|LinkInBio|Carousel=10slides",
  facebook: "Max63206chars|LinksOK|LongerBetter|Groups=engagement",
  linkedin: "Max3000chars|Professional|3-5hashtags|NoEmoji",
  tiktok: "Max2200chars|Trendy|5-10hashtags|Hooks=first3sec",
  youtube: "Title100|Desc5000|Tags500|Thumbnail=key",
  pinterest: "Desc500|5hashtags|Vertical=best|LinkOK",
};

// =============================================================================
// BATCH PROCESSING - Generate multiple items in one call
// =============================================================================

const BatchContentSchema = z.object({
  suggestions: z.array(
    z.object({
      content: z.string(),
      hashtags: z.array(z.string()),
      hook: z.string(),
      cta: z.string(),
      engagementScore: z.number().min(0).max(100),
      bestTimeToPost: z.string(),
      contentPillar: z.string(),
    })
  ),
});

/**
 * Generate multiple content suggestions in a single API call
 * Saves 50-70% on API calls vs individual requests
 */
export async function batchGenerateContent(options: {
  brandContext: string;
  learnedInsights: string;
  platform: string;
  contentPillars: string[];
  count: number;
}): Promise<z.infer<typeof BatchContentSchema>> {
  const { brandContext, learnedInsights, platform, contentPillars, count } =
    options;

  // 🔍 DEBUG: Log what batchGenerateContent received
  console.log('🔍 [AI-OPTIMIZER] batchGenerateContent called:', {
    platform,
    contentPillarsCount: contentPillars.length,
    contentPillars: contentPillars,
    count,
  });

  const platformRules = PLATFORM_RULES[platform.toLowerCase()] || "";

  const result = await generateObject({
    model: getModelForTask("medium"),
    schema: BatchContentSchema,
    system: `You are a social media content creator for a SPECIFIC brand. Generate ${count} REAL, ready-to-post content pieces.

Brand Context: ${brandContext}
Learned Preferences: ${learnedInsights}
Platform: ${platform} | Rules: ${platformRules}

CRITICAL CONTENT PILLARS - YOU MUST ONLY CREATE CONTENT ABOUT THESE TOPICS:
${contentPillars.map((p, i) => `${i + 1}. ${p}`).join("\n")}

STRICT RULES:
1. Each post MUST be about one of the content pillars above - NO exceptions
2. Do NOT generate generic productivity/lifestyle/self-help content unless it's in the pillars
3. Output ONLY the actual post text - copy-paste ready to publish
4. Hashtags go in the separate "hashtags" array field, NOT in content
5. Do NOT include in content: "Best Time to Post", "Engagement Tip", "Suggested Content:" headers, or any metadata
6. Write as the BRAND, in first person
7. Be SPECIFIC to the topic - reference actual details from the content pillar
8. Start with a scroll-stopping hook relevant to the pillar topic
9. Sound human and authentic, not like generic AI content`,
    prompt: `Generate ${count} ${platform} posts. Each post MUST be about a DIFFERENT content pillar:

${contentPillars.slice(0, count).map((p, i) => `Post ${i + 1}: About "${p}"`).join("\n")}

Requirements:
- Each post is SPECIFIC to its assigned content pillar
- Written in the brand's authentic voice
- Ready to copy-paste and post immediately
- Hashtags in "hashtags" array, timing in "bestTimeToPost" - NOT in content
- NO generic advice - be specific to the actual topic`,
    temperature: 0.85,
  });

  return result.object;
}

// =============================================================================
// OPTIMIZED GENERATION FUNCTIONS
// =============================================================================

/**
 * Generate hashtags efficiently (simple task)
 */
export async function generateHashtags(
  content: string,
  platform: string,
  count: number = 5
): Promise<string[]> {
  const config = getConfigForTask("simple");

  const result = await generateObject({
    model: getModelForTask("simple"),
    schema: z.object({
      hashtags: z.array(z.string()).max(count),
    }),
    prompt: `Generate ${count} relevant hashtags for this ${platform} post: "${content.slice(0, 200)}"
Rules: ${PLATFORM_RULES[platform.toLowerCase()] || "standard"}
Return only hashtags without # symbol.`,
    temperature: config.temperature,
  });

  return result.object.hashtags;
}

/**
 * Generate a single post efficiently (medium task)
 */
export async function generatePost(options: {
  topic: string;
  platform: string;
  brandContext: string;
  learnedInsights?: string;
  contentPillar?: string;
}): Promise<{
  content: string;
  hashtags: string[];
  hook: string;
  engagementScore: number;
}> {
  const { topic, platform, brandContext, learnedInsights, contentPillar } =
    options;

  const config = getConfigForTask("medium");
  const platformRules = PLATFORM_RULES[platform.toLowerCase()] || "";

  const result = await generateObject({
    model: getModelForTask("medium"),
    schema: z.object({
      content: z.string(),
      hashtags: z.array(z.string()),
      hook: z.string(),
      engagementScore: z.number().min(0).max(100),
    }),
    system: `Brand:${brandContext}|Learned:${learnedInsights || "none"}|Platform:${platformRules}`,
    prompt: `Write a ${platform} post about "${topic}"${contentPillar ? ` for the "${contentPillar}" content pillar` : ""}.
Make it engaging, on-brand, and ready to publish.`,
    temperature: config.temperature,
  });

  return result.object;
}

/**
 * Generate strategic recommendations (complex task)
 */
export async function generateStrategicRecommendations(options: {
  brandContext: string;
  learnedInsights: string;
  analytics: {
    followers: number;
    engagement: number;
    growth: number;
    topPosts: string[];
  };
  platforms: string[];
}): Promise<{
  recommendations: Array<{
    type: string;
    action: string;
    reasoning: string;
    impact: string;
    priority: "high" | "medium" | "low";
  }>;
  overallStrategy: string;
}> {
  const { brandContext, learnedInsights, analytics, platforms } = options;

  const result = await generateObject({
    model: getModelForTask("complex"),
    schema: z.object({
      recommendations: z.array(
        z.object({
          type: z.string(),
          action: z.string(),
          reasoning: z.string(),
          impact: z.string(),
          priority: z.enum(["high", "medium", "low"]),
        })
      ),
      overallStrategy: z.string(),
    }),
    system: `You are a social media strategist analyzing performance data.`,
    prompt: `Analyze and provide strategic recommendations.
Brand: ${brandContext}
Learned: ${learnedInsights}
Analytics: Followers=${analytics.followers}, Engagement=${analytics.engagement}%, Growth=${analytics.growth}%
Top Posts: ${analytics.topPosts.slice(0, 3).join(" | ")}
Platforms: ${platforms.join(", ")}

Provide 3-5 high-impact, actionable recommendations with clear reasoning.`,
    temperature: 0.6,
  });

  return result.object;
}

/**
 * Quick reply generation (simple task)
 */
export async function generateQuickReply(
  comment: string,
  brandContext: string,
  platform: string
): Promise<string> {
  const config = getConfigForTask("simple");

  const result = await generateText({
    model: getModelForTask("simple"),
    system: `Brand:${brandContext}|Tone:friendly,helpful|Platform:${platform}`,
    prompt: `Write a brief, engaging reply to: "${comment.slice(0, 200)}"
Keep it under 100 characters. Be authentic.`,
    temperature: config.temperature,
  });

  return result.text.trim();
}

// =============================================================================
// CONTEXT FILE SYSTEM - Persistent compressed context
// =============================================================================

export interface AIContextFile {
  version: string;
  lastUpdated: string;
  brandContext: string;
  learnedInsights: string;
  platformPreferences: Record<string, string>;
  performancePatterns: string[];
  contentHistory: {
    accepted: number;
    rejected: number;
    topPillars: string[];
  };
}

/**
 * Build a compressed context file from all available data
 */
export function buildContextFile(data: {
  brandPersona?: BrandPersona;
  learnedInsights?: {
    preferredTone?: string[];
    avoidTone?: string[];
    lengthPreference?: string;
    emojiPreference?: string;
    topPillars?: string[];
    acceptanceRate?: number;
    patterns?: string[];
  };
  platformPreferences?: Record<string, any>;
  contentFeedback?: Array<{ accepted: boolean; contentPillar?: string }>;
}): AIContextFile {
  const { brandPersona, learnedInsights, platformPreferences, contentFeedback } =
    data;

  // Calculate content history stats
  const accepted = contentFeedback?.filter((f) => f.accepted).length || 0;
  const rejected = contentFeedback?.filter((f) => !f.accepted).length || 0;

  // Get top pillars from feedback
  const pillarCounts: Record<string, number> = {};
  contentFeedback
    ?.filter((f) => f.accepted && f.contentPillar)
    .forEach((f) => {
      pillarCounts[f.contentPillar!] = (pillarCounts[f.contentPillar!] || 0) + 1;
    });
  const topPillars = Object.entries(pillarCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pillar]) => pillar);

  // Compress platform preferences
  const compressedPlatformPrefs: Record<string, string> = {};
  if (platformPreferences) {
    for (const [platform, prefs] of Object.entries(platformPreferences)) {
      if (typeof prefs === "object") {
        compressedPlatformPrefs[platform] = Object.entries(prefs)
          .map(([k, v]) => `${k}:${v}`)
          .join(",");
      }
    }
  }

  return {
    version: "1.0",
    lastUpdated: new Date().toISOString(),
    brandContext: compressBrandContext(brandPersona || {}),
    learnedInsights: compressLearnedInsights(learnedInsights || {}),
    platformPreferences: compressedPlatformPrefs,
    performancePatterns: learnedInsights?.patterns?.slice(0, 5) || [],
    contentHistory: {
      accepted,
      rejected,
      topPillars,
    },
  };
}

/**
 * Convert context file to a single compressed string for prompts
 * Target: ~150 tokens max
 */
export function contextFileToPrompt(contextFile: AIContextFile): string {
  const parts = [
    contextFile.brandContext,
    contextFile.learnedInsights,
    `History:${contextFile.contentHistory.accepted}acc/${contextFile.contentHistory.rejected}rej`,
  ];

  if (contextFile.contentHistory.topPillars.length) {
    parts.push(`TopPillars:${contextFile.contentHistory.topPillars.join(",")}`);
  }

  if (contextFile.performancePatterns.length) {
    parts.push(`Patterns:${contextFile.performancePatterns.slice(0, 2).join(";")}`);
  }

  return parts.join("\n");
}

// =============================================================================
// USAGE TRACKING - Monitor token savings
// =============================================================================

interface UsageStats {
  callsMade: number;
  estimatedTokensSaved: number;
  cacheHits: number;
  batchedCalls: number;
}

class UsageTracker {
  private stats: UsageStats = {
    callsMade: 0,
    estimatedTokensSaved: 0,
    cacheHits: 0,
    batchedCalls: 0,
  };

  trackCall(complexity: TaskComplexity, cached: boolean = false): void {
    this.stats.callsMade++;
    if (cached) {
      this.stats.cacheHits++;
      // Estimate ~500 tokens saved per cache hit
      this.stats.estimatedTokensSaved += 500;
    }

    // Track savings from model tiering
    if (complexity === "simple") {
      // GPT-4o-mini is ~10x cheaper, estimate savings
      this.stats.estimatedTokensSaved += 450; // vs GPT-4o
    } else if (complexity === "medium") {
      this.stats.estimatedTokensSaved += 300;
    }
  }

  trackBatch(itemCount: number): void {
    this.stats.batchedCalls++;
    // Estimate ~200 tokens saved per batched item (vs individual calls)
    this.stats.estimatedTokensSaved += itemCount * 200;
  }

  getStats(): UsageStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      callsMade: 0,
      estimatedTokensSaved: 0,
      cacheHits: 0,
      batchedCalls: 0,
    };
  }
}

export const usageTracker = new UsageTracker();

// =============================================================================
// EXPORTS
// =============================================================================

export {
  MODEL_TIERS,
  ContextCache,
  UsageTracker,
};

