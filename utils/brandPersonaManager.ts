import { isBusinessPlanMode } from "./ayrshareIntegration";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  getModelForTask,
  compressBrandContext,
  contextCache,
  PLATFORM_RULES,
  usageTracker,
} from "./aiOptimizer";

export interface BrandPersona {
  id: string;
  name: string;
  description: string;
  voice: {
    tone:
      | "professional"
      | "casual"
      | "friendly"
      | "authoritative"
      | "playful"
      | "inspirational"
      | "educational";
    personality: string[];
    writingStyle:
      | "formal"
      | "conversational"
      | "witty"
      | "direct"
      | "storytelling"
      | "technical";
    emojiUsage: "none" | "minimal" | "moderate" | "frequent";
    languageLevel: "simple" | "intermediate" | "advanced" | "expert";
  };
  messaging: {
    keyMessages: string[];
    valueProposition: string;
    targetAudience: string;
    contentPillars: string[];
    avoidTopics: string[];
  };
  engagement: {
    commentStyle: "brief" | "detailed" | "questions" | "supportive" | "expert";
    dmApproach: "professional" | "friendly" | "direct" | "collaborative";
    hashtagStrategy: "branded" | "trending" | "niche" | "mixed";
    mentionStyle: "conservative" | "active" | "strategic";
  };
  contentGuidelines: {
    postLength: "short" | "medium" | "long" | "varies";
    contentMix: {
      educational: number;
      entertainment: number;
      promotional: number;
      personal: number;
    };
    callToActionStyle: "subtle" | "direct" | "creative" | "none";
    questionFrequency: "rare" | "occasional" | "frequent" | "always";
  };
  platformCustomization: {
    [platform: string]: {
      adaptedTone?: string;
      specificHashtags?: string[];
      contentFocus?: string;
      engagementStyle?: string;
    };
  };
  examples: {
    samplePosts: string[];
    sampleReplies: string[];
    sampleDMs: string[];
  };
}

export class BrandPersonaManager {
  private persona: BrandPersona | null = null;

  constructor(persona?: BrandPersona) {
    this.persona = persona || null;
  }

  /**
   * Generate content using optimized AI with caching and model tiering
   */
  async generateAIContent(
    topic: string,
    contentType: "post" | "reply" | "dm",
    platform: string,
    context?: { comment?: string; recipient?: string }
  ): Promise<string> {
    if (!this.persona) {
      return this.generateGenericContent(topic, contentType);
    }

    // Determine task complexity for model selection
    // Replies and DMs are simpler, posts need more creativity
    const complexity = contentType === "post" ? "medium" : "simple";

    // Try to get cached brand context first
    const cacheKey = `brand_${this.persona.id}_${platform}`;
    let brandContext = contextCache.get(cacheKey);

    if (!brandContext) {
      // Build and cache the compressed brand context
      brandContext = this.buildOptimizedBrandContext(platform);
      contextCache.set(cacheKey, brandContext, "brandPersona");
    } else {
      usageTracker.trackCall(complexity, true); // Cache hit
    }

    const contentPrompt = this.buildOptimizedPrompt(
      topic,
      contentType,
      platform,
      context
    );

    try {
      const { text } = await generateText({
        model: getModelForTask(complexity),
        system: brandContext,
        prompt: contentPrompt,
        temperature: complexity === "simple" ? 0.5 : 0.7,
      });

      usageTracker.trackCall(complexity);

      // Apply emoji rules based on persona settings
      return this.applyEmojiRules(text.trim());
    } catch (error) {
      console.error("AI content generation failed:", error);
      // Fallback to template-based generation if AI fails
      return this.generateBrandedContent(topic, contentType, platform, context);
    }
  }

  /**
   * Build optimized (compressed) brand context for AI - ~60% fewer tokens
   */
  private buildOptimizedBrandContext(platform: string): string {
    if (!this.persona) return "";

    const platformRules = PLATFORM_RULES[platform.toLowerCase()] || "";
    const compressed = compressBrandContext({
      name: this.persona.name,
      tone: this.persona.voice.tone,
      writingStyle: this.persona.voice.writingStyle,
      emojiUsage: this.persona.voice.emojiUsage,
      contentPillars: this.persona.messaging.contentPillars,
      targetAudience: this.persona.messaging.targetAudience,
      uniqueValue: this.persona.messaging.valueProposition,
      avoidTopics: this.persona.messaging.avoidTopics,
      voice: {
        personality: this.persona.voice.personality.join(","),
        phrases: this.persona.examples.samplePosts.slice(0, 2),
      },
    });

    return `${compressed}\nPlatform:${platform}|Rules:${platformRules}`;
  }

  /**
   * Build optimized prompt - concise and focused
   */
  private buildOptimizedPrompt(
    topic: string,
    contentType: "post" | "reply" | "dm",
    platform: string,
    context?: { comment?: string; recipient?: string }
  ): string {
    const basePrompt = `Write a ${platform} ${contentType} about "${topic}".`;

    if (contentType === "reply" && context?.comment) {
      return `${basePrompt}\nReply to: "${context.comment.slice(0, 150)}"`;
    }

    if (contentType === "dm" && context?.recipient) {
      return `${basePrompt}\nTo: ${context.recipient}`;
    }

    return `${basePrompt}\nMake it engaging, on-brand. Ready to post.`;
  }

  /**
   * Build comprehensive brand context for AI generation
   */
  private buildBrandContext(platform: string): string {
    if (!this.persona) return "";

    const platformCustomization =
      this.persona.platformCustomization[platform] || {};

    return `You are a social media content creator for "${this.persona.name}".

BRAND VOICE:
- Tone: ${this.persona.voice.tone}
- Personality traits: ${this.persona.voice.personality.join(", ")}
- Writing style: ${this.persona.voice.writingStyle}
- Language level: ${this.persona.voice.languageLevel}
- Emoji usage: ${this.persona.voice.emojiUsage}

BRAND MESSAGING:
- Value proposition: ${this.persona.messaging.valueProposition}
- Target audience: ${this.persona.messaging.targetAudience}
- Key messages: ${this.persona.messaging.keyMessages.join("; ")}
- Content pillars: ${this.persona.messaging.contentPillars.join(", ")}
- Topics to AVOID: ${this.persona.messaging.avoidTopics.join(", ")}

CONTENT GUIDELINES:
- Post length preference: ${this.persona.contentGuidelines.postLength}
- Call-to-action style: ${this.persona.contentGuidelines.callToActionStyle}
- Question frequency: ${this.persona.contentGuidelines.questionFrequency}

PLATFORM (${platform.toUpperCase()}):
${
  platformCustomization.adaptedTone
    ? `- Adapted tone: ${platformCustomization.adaptedTone}`
    : ""
}
${
  platformCustomization.contentFocus
    ? `- Content focus: ${platformCustomization.contentFocus}`
    : ""
}
${
  platformCustomization.engagementStyle
    ? `- Engagement style: ${platformCustomization.engagementStyle}`
    : ""
}

${
  this.persona.examples.samplePosts.length > 0
    ? `
EXAMPLE POSTS (match this style):
${this.persona.examples.samplePosts
  .slice(0, 3)
  .map((post, i) => `${i + 1}. "${post}"`)
  .join("\n")}
`
    : ""
}

CRITICAL RULES:
- Write as if you ARE this brand, not about it
- Match the exact tone and personality
- ${
      this.persona.voice.emojiUsage === "none"
        ? "DO NOT use any emojis"
        : this.persona.voice.emojiUsage === "minimal"
        ? "Use emojis sparingly (1-2 max)"
        : this.persona.voice.emojiUsage === "moderate"
        ? "Use emojis naturally (3-5)"
        : "Feel free to use emojis expressively"
    }
- Stay within the content pillars
- Never mention topics in the "avoid" list`;
  }

  /**
   * Build the specific content prompt based on type
   */
  private buildContentPrompt(
    topic: string,
    contentType: "post" | "reply" | "dm",
    platform: string,
    context?: { comment?: string; recipient?: string }
  ): string {
    const platformLimits: Record<string, number> = {
      twitter: 280,
      x: 280,
      instagram: 2200,
      facebook: 500,
      linkedin: 700,
      tiktok: 150,
    };
    const charLimit = platformLimits[platform.toLowerCase()] || 500;

    switch (contentType) {
      case "post":
        return `Write a ${platform} post about "${topic}".

Requirements:
- Create an engaging, authentic post that sounds natural
- Include a compelling hook or opening
- Add value or insight for the reader
- End with a call-to-action matching the brand style
- Keep it under ${charLimit} characters
- Make it feel personal and real, not generic or templated

Write ONLY the post content, no explanations or meta-commentary.`;

      case "reply":
        return `Write a reply to this comment: "${context?.comment || topic}"

Requirements:
- Be authentic and engaging
- Match the brand's comment style (${
          this.persona?.engagement.commentStyle || "friendly"
        })
- Add value to the conversation
- Keep it concise (1-3 sentences)

Write ONLY the reply, no explanations.`;

      case "dm":
        return `Write a direct message to ${
          context?.recipient || "a potential collaborator"
        } about ${topic}.

Requirements:
- Match the brand's DM approach (${
          this.persona?.engagement.dmApproach || "friendly"
        })
- Be personal but professional
- Have a clear purpose or ask
- Keep it conversational

Write ONLY the DM content, no explanations.`;

      default:
        return `Create content about "${topic}" for ${platform}.`;
    }
  }

  /**
   * Apply emoji rules based on persona settings
   */
  private applyEmojiRules(content: string): string {
    if (!this.persona) return content;

    const emojiRegex =
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = content.match(emojiRegex) || [];

    switch (this.persona.voice.emojiUsage) {
      case "none":
        return content.replace(emojiRegex, "").replace(/\s+/g, " ").trim();
      case "minimal":
        if (emojis.length > 2) {
          let count = 0;
          return content
            .replace(emojiRegex, (match) => {
              count++;
              return count <= 2 ? match : "";
            })
            .replace(/\s+/g, " ")
            .trim();
        }
        return content;
      case "moderate":
        if (emojis.length > 5) {
          let count = 0;
          return content
            .replace(emojiRegex, (match) => {
              count++;
              return count <= 5 ? match : "";
            })
            .replace(/\s+/g, " ")
            .trim();
        }
        return content;
      default:
        return content;
    }
  }

  /**
   * Generate content that matches the brand persona (template-based fallback)
   */
  generateBrandedContent(
    topic: string,
    contentType: "post" | "reply" | "dm",
    platform: string,
    context?: any
  ): string {
    if (!this.persona) {
      return this.generateGenericContent(topic, contentType);
    }

    const platformCustomization =
      this.persona.platformCustomization[platform] || {};
    const tone = platformCustomization.adaptedTone || this.persona.voice.tone;

    switch (contentType) {
      case "post":
        return this.generateBrandedPost(topic, platform, tone);
      case "reply":
        return this.generateBrandedReply(context?.comment || topic, tone);
      case "dm":
        return this.generateBrandedDM(context?.recipient || "there", tone);
      default:
        return this.generateGenericContent(topic, contentType);
    }
  }

  /**
   * Get hashtags that match the brand strategy
   */
  getBrandedHashtags(contentTopic: string, platform: string): string[] {
    if (!this.persona) {
      return ["content", "social", "community"];
    }

    const strategy = this.persona.engagement.hashtagStrategy;
    const platformCustomization = this.persona.platformCustomization[platform];
    const contentPillars = this.persona.messaging.contentPillars;

    const hashtags: string[] = [];

    // Add platform-specific hashtags
    if (platformCustomization?.specificHashtags) {
      hashtags.push(...platformCustomization.specificHashtags.slice(0, 3));
    }

    // Add content pillar hashtags
    hashtags.push(...contentPillars.slice(0, 2));

    // Add strategy-based hashtags
    if (strategy === "branded") {
      hashtags.push(this.persona.name.toLowerCase().replace(/\s+/g, ""));
    } else if (strategy === "trending") {
      hashtags.push(...this.getTrendingHashtagsForTopic(contentTopic));
    } else if (strategy === "niche") {
      hashtags.push(...this.getNicheHashtagsForTopic(contentTopic));
    }

    // Remove duplicates and limit to 8
    return [...new Set(hashtags)].slice(0, 8);
  }

  /**
   * Get optimal posting times based on brand and audience
   */
  getOptimalPostingStrategy(platform: string): {
    bestTimes: string[];
    frequency: number;
    contentMix: Record<string, number>;
  } {
    if (!this.persona) {
      return {
        bestTimes: ["9:00 AM", "1:00 PM", "5:00 PM"],
        frequency: 5,
        contentMix: {
          educational: 40,
          entertainment: 30,
          promotional: 20,
          personal: 10,
        },
      };
    }

    const platformCustomization =
      this.persona.platformCustomization[platform] || {};

    return {
      bestTimes: this.calculateOptimalTimes(platform),
      frequency: this.calculateOptimalFrequency(platform),
      contentMix: this.persona.contentGuidelines.contentMix,
    };
  }

  /**
   * Generate auto-reply that matches brand voice
   */
  generateContextualReply(
    comment: string,
    sentiment: "positive" | "negative" | "neutral",
    platform: string
  ): string {
    if (!this.persona) {
      return this.getGenericReply(sentiment);
    }

    const tone = this.persona.voice.tone;
    const style = this.persona.engagement.commentStyle;
    const emojiUsage = this.persona.voice.emojiUsage;

    let reply = "";

    // Base reply based on sentiment and style
    if (sentiment === "positive") {
      reply = this.generatePositiveReply(style, tone);
    } else if (sentiment === "negative") {
      reply = this.generateNegativeReply(style, tone);
    } else {
      reply = this.generateNeutralReply(style, tone);
    }

    // Add emojis based on usage preference
    if (emojiUsage !== "none") {
      reply = this.addAppropriateEmojis(reply, emojiUsage, sentiment);
    }

    // Customize for platform
    return this.adaptReplyForPlatform(reply, platform);
  }

  /**
   * Validate content against brand guidelines
   */
  validateContentAgainstBrand(
    content: string,
    contentType: "post" | "reply" | "dm"
  ): {
    isValid: boolean;
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    if (!this.persona) {
      return { isValid: true, score: 100, issues: [], suggestions: [] };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for avoided topics
    const lowerContent = content.toLowerCase();
    this.persona.messaging.avoidTopics.forEach((topic) => {
      if (lowerContent.includes(topic.toLowerCase())) {
        issues.push(`Content contains avoided topic: ${topic}`);
        score -= 20;
      }
    });

    // Check tone consistency
    const detectedTone = this.detectTone(content);
    if (detectedTone !== this.persona.voice.tone) {
      issues.push(
        `Tone mismatch: detected ${detectedTone}, expected ${this.persona.voice.tone}`
      );
      score -= 15;
    }

    // Check emoji usage
    const emojiCount = (
      content.match(
        /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu
      ) || []
    ).length;
    const expectedEmojiRange = this.getExpectedEmojiRange();

    if (
      emojiCount < expectedEmojiRange.min ||
      emojiCount > expectedEmojiRange.max
    ) {
      issues.push(
        `Emoji usage outside brand guidelines: ${emojiCount} found, expected ${expectedEmojiRange.min}-${expectedEmojiRange.max}`
      );
      score -= 10;
    }

    // Check length guidelines
    const lengthIssue = this.validateContentLength(content, contentType);
    if (lengthIssue) {
      issues.push(lengthIssue);
      score -= 5;
    }

    // Generate suggestions
    if (score < 90) {
      suggestions.push("Consider revising content to better match brand voice");
    }
    if (issues.some((issue) => issue.includes("tone"))) {
      suggestions.push(`Adjust tone to be more ${this.persona.voice.tone}`);
    }

    return {
      isValid: score >= 70,
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  // Private helper methods

  private generateBrandedPost(
    topic: string,
    platform: string,
    tone: string
  ): string {
    if (!this.persona) return "";

    // Use the specific topic from content pillars, not generic topic
    const actualTopic = this.persona.messaging.contentPillars.includes(topic)
      ? topic
      : this.persona.messaging.contentPillars[0];

    const templates = this.getPostTemplates(tone, platform);
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate dynamic content based on persona
    const content = template
      .replace(/{topic}/g, actualTopic)
      .replace(/{contentPillar}/g, actualTopic)
      .replace(/{valueProposition}/g, this.persona.messaging.valueProposition)
      .replace(/{brand}/g, this.persona.name)
      .replace(/{audience}/g, this.persona.messaging.targetAudience)
      .replace(
        /{cta}/g,
        this.generateCTA(this.persona.contentGuidelines.callToActionStyle)
      );

    // Apply writing style adjustments
    return this.applyWritingStyle(content, this.persona.voice.writingStyle);
  }

  private applyWritingStyle(content: string, style: string): string {
    switch (style) {
      case "formal":
        // More structured, professional language
        return content.replace(/\b(I|me|my)\b/g, (match) => match);

      case "conversational":
        // Add conversational elements but don't hardcode
        return content;

      case "witty":
        // Keep the content but ensure it matches the persona's wit level
        return content;

      case "direct":
        // More straightforward, less fluff
        return content.replace(/\n\n/g, "\n").replace(/\s{2,}/g, " ");

      case "storytelling":
        // Add narrative elements
        return content;

      case "technical":
        // More precise language
        return content;

      default:
        return content;
    }
  }

  private generateBrandedReply(comment: string, tone: string): string {
    if (!this.persona) return "Thanks for your comment!";

    const replyTemplates = {
      professional: [
        "Thank you for your thoughtful comment.",
        "I appreciate your perspective on this.",
        "That's an excellent point you've raised.",
      ],
      friendly: [
        "Thanks so much for sharing your thoughts! 😊",
        "Love your perspective on this!",
        "Really appreciate you taking the time to comment!",
      ],
      casual: [
        "Thanks for chiming in!",
        "Totally agree with you on this!",
        "Great point!",
      ],
      educational: [
        "Great question! Here's what I've found...",
        "That's a common challenge. My experience has been...",
        "I'd love to share more insights on this topic.",
      ],
    };

    const templates =
      replyTemplates[tone as keyof typeof replyTemplates] ||
      replyTemplates.friendly;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateBrandedDM(recipient: string, tone: string): string {
    if (!this.persona) return `Hi ${recipient}! Thanks for connecting.`;

    const dmTemplates = {
      professional: `Hi ${recipient}, I came across your profile and was impressed by your work in {industry}. I'd love to connect and explore potential collaboration opportunities.`,
      friendly: `Hey ${recipient}! 👋 Love your content about {topic}. Would be great to connect with fellow creators in this space!`,
      collaborative: `Hi ${recipient}! I think we have some great synergies in {niche}. Would you be interested in exploring some collaboration ideas?`,
      direct: `Hi ${recipient}! Quick question - are you open to collaboration opportunities in {industry}?`,
    };

    const template =
      dmTemplates[tone as keyof typeof dmTemplates] || dmTemplates.friendly;
    return template
      .replace(
        "{industry}",
        this.persona.messaging.contentPillars[0] || "your industry"
      )
      .replace(
        "{topic}",
        this.persona.messaging.contentPillars[1] || "your topic"
      )
      .replace(
        "{niche}",
        this.persona.messaging.contentPillars[0] || "this niche"
      );
  }

  private getPostTemplates(tone: string, platform: string): string[] {
    if (!this.persona) return ["Sharing thoughts on {topic}. {cta}"];

    // Generate dynamic templates based on persona characteristics
    const templates: string[] = [];

    // Base structure variations
    const structures = [
      "{opener} {topic}:\n\n{valueProposition}\n\n{closer} {cta}",
      "{opener} {topic}\n\n{valueProposition}\n\n{insight}\n\n{cta}",
      "{valueProposition}\n\n{context}\n\n{cta}",
      "{insight} {topic}:\n\n{valueProposition}\n\n{cta}",
    ];

    // Generate openers based on tone (no hardcoded emojis)
    const openers = this.generateOpeners(tone);
    const closers = this.generateClosers(tone);
    const insights = this.generateInsights(tone);
    const contexts = this.generateContexts(tone);

    // Create templates by combining elements
    structures.forEach((structure) => {
      templates.push(
        structure
          .replace(
            "{opener}",
            openers[Math.floor(Math.random() * openers.length)]
          )
          .replace(
            "{closer}",
            closers[Math.floor(Math.random() * closers.length)]
          )
          .replace(
            "{insight}",
            insights[Math.floor(Math.random() * insights.length)]
          )
          .replace(
            "{context}",
            contexts[Math.floor(Math.random() * contexts.length)]
          )
      );
    });

    return templates;
  }

  private generateOpeners(tone: string): string[] {
    if (!this.persona) return ["Sharing thoughts on"];

    // Generate openers based purely on tone, no hardcoded content
    const openers = {
      professional: [
        "Sharing insights on",
        "Professional perspective on",
        "Expert analysis of",
      ],
      casual: [
        "Quick thoughts on",
        "Just wanted to share about",
        "Thinking about",
      ],
      friendly: [
        "Let's talk about",
        "Friendly reminder about",
        "Something I've been exploring:",
      ],
      authoritative: [
        "Important insights on",
        "Critical understanding of",
        "Essential knowledge about",
      ],
      playful: [
        "Fun exploration of",
        "Playful dive into",
        "Let's have some fun with",
      ],
      inspirational: [
        "Today's inspiration:",
        "Gentle reminder about",
        "Beautiful insight about",
      ],
      educational: ["Learning moment:", "Understanding", "Exploring"],
    };

    return (
      openers[tone as keyof typeof openers] ||
      openers[this.persona.voice.tone as keyof typeof openers] ||
      openers.friendly
    );
  }

  private generateClosers(tone: string): string[] {
    if (!this.persona) return ["Key point:"];

    // Generate closers based purely on tone and writing style
    const closers = {
      professional: [
        "Key takeaway:",
        "Important note:",
        "Professional insight:",
      ],
      casual: ["Bottom line:", "Here's the thing:", "Simple truth:"],
      friendly: [
        "Here's what I've learned:",
        "Something to remember:",
        "Important point:",
      ],
      authoritative: [
        "This is crucial:",
        "Essential understanding:",
        "Key principle:",
      ],
      playful: ["Fun fact:", "Here's the interesting part:", "Plot twist:"],
      inspirational: ["Remember this:", "Important truth:", "Key insight:"],
      educational: ["Key insight:", "Important learning:", "Takeaway:"],
    };

    return (
      closers[tone as keyof typeof closers] ||
      closers[this.persona.voice.tone as keyof typeof closers] ||
      closers.friendly
    );
  }

  private generateInsights(tone: string): string[] {
    if (!this.persona) return ["Key insight:"];

    // Generate insights based on tone and personality traits
    const baseInsights = {
      professional: [
        "Key insight from experience:",
        "Professional observation:",
        "Strategic perspective:",
      ],
      casual: [
        "Here's what I've noticed:",
        "Something interesting:",
        "Quick thought:",
      ],
      friendly: [
        "Something I've been thinking about:",
        "Here's what resonates with me:",
        "Insight to share:",
      ],
      authoritative: [
        "Critical understanding:",
        "Essential principle:",
        "Fundamental truth:",
      ],
      playful: ["Fun discovery:", "Interesting realization:", "Cool pattern:"],
      inspirational: [
        "Important insight:",
        "Beautiful realization:",
        "Key understanding:",
      ],
      educational: [
        "Learning insight:",
        "Educational moment:",
        "Knowledge gained:",
      ],
    };

    return (
      baseInsights[tone as keyof typeof baseInsights] ||
      baseInsights[this.persona.voice.tone as keyof typeof baseInsights] ||
      baseInsights.friendly
    );
  }

  private generateContexts(tone: string): string[] {
    if (!this.persona) return ["Based on my experience"];

    // Generate contexts based on tone and target audience
    const contexts = {
      professional: [
        "Based on industry research",
        "From professional experience",
        "According to best practices",
      ],
      casual: ["Just my experience", "From what I've seen", "In my opinion"],
      friendly: [
        "Something I want to share",
        "Based on my journey",
        "From my experience",
      ],
      authoritative: [
        "According to proven methods",
        "Based on extensive research",
        "From authoritative sources",
      ],
      playful: [
        "Just for fun",
        "Playing with ideas",
        "Exploring possibilities",
      ],
      inspirational: [
        "From the heart",
        "Based on my journey",
        "Something meaningful",
      ],
      educational: [
        "From my studies",
        "Based on learning",
        "Educational insight",
      ],
    };

    return (
      contexts[tone as keyof typeof contexts] ||
      contexts[this.persona.voice.tone as keyof typeof contexts] ||
      contexts.friendly
    );
  }

  private generateCTA(style: string): string {
    if (!this.persona) {
      const ctas = ["What are your thoughts?", "Share below!", "Let me know!"];
      return ctas[Math.floor(Math.random() * ctas.length)];
    }

    // Extract CTAs from the persona's own examples if available
    if (this.persona.examples.samplePosts.length > 0) {
      const extractedCTAs = this.extractCTAsFromExamples();
      if (extractedCTAs.length > 0) {
        return extractedCTAs[Math.floor(Math.random() * extractedCTAs.length)];
      }
    }

    // Fallback to generic CTAs based only on style
    const baseStyles = {
      subtle: [
        "What are your thoughts?",
        "I'd love to hear your perspective.",
        "Share your experience.",
      ],
      direct: [
        "Share your thoughts below!",
        "Let me know in the comments!",
        "Comment with your experience!",
      ],
      creative: [
        "Drop your thoughts in the comments!",
        "What's your take on this?",
        "Share below!",
      ],
      none: [""],
    };

    const ctas =
      baseStyles[style as keyof typeof baseStyles] || baseStyles.direct;

    const selectedCTA = ctas[Math.floor(Math.random() * ctas.length)];

    // Add emojis ONLY if persona allows them
    return this.addEmojisBasedOnPersona(selectedCTA);
  }

  private extractCTAsFromExamples(): string[] {
    if (!this.persona || this.persona.examples.samplePosts.length === 0)
      return [];

    const ctas: string[] = [];

    // Look for question patterns in sample posts
    this.persona.examples.samplePosts.forEach((post) => {
      // Find sentences that end with ? (likely CTAs)
      const questions = post.match(/[^.!?]*\?[^.!?]*/g);
      if (questions) {
        questions.forEach((question) => {
          const cleanQuestion = question.trim().replace(/^.*\n/, ""); // Remove everything before last line break
          if (cleanQuestion.length > 5 && cleanQuestion.length < 100) {
            ctas.push(cleanQuestion);
          }
        });
      }

      // Look for imperative statements (commands/requests)
      const imperatives = post.match(
        /(Share|Tell|Let|Comment|Drop|What's)[^.!?]*[.!?]/gi
      );
      if (imperatives) {
        imperatives.forEach((imperative) => {
          const cleanImperative = imperative.trim();
          if (cleanImperative.length > 5 && cleanImperative.length < 100) {
            ctas.push(cleanImperative);
          }
        });
      }
    });

    return [...new Set(ctas)]; // Remove duplicates
  }

  private addEmojisBasedOnPersona(text: string): string {
    if (!this.persona || this.persona.voice.emojiUsage === "none") {
      return text;
    }

    const emojiCount = this.getEmojiCount();
    if (emojiCount === 0) return text;

    // Generate contextual emojis based on content pillars and tone
    const contextualEmojis = this.getContextualEmojis();
    const selectedEmojis = contextualEmojis.slice(0, emojiCount);

    return `${text} ${selectedEmojis.join(" ")}`;
  }

  private getEmojiCount(): number {
    if (!this.persona) return 0;

    switch (this.persona.voice.emojiUsage) {
      case "minimal":
        return Math.random() > 0.5 ? 1 : 0;
      case "moderate":
        return Math.floor(Math.random() * 3) + 1; // 1-3
      case "frequent":
        return Math.floor(Math.random() * 4) + 2; // 2-5
      default:
        return 0;
    }
  }

  private getContextualEmojis(): string[] {
    if (!this.persona) return [];

    // Only use emojis if the persona examples contain them
    const allEmojisFromExamples: string[] = [];

    // Extract emojis from the persona's own examples
    const allExampleText = [
      ...this.persona.examples.samplePosts,
      ...this.persona.examples.sampleReplies,
      ...this.persona.examples.sampleDMs,
    ].join(" ");

    // Find all emojis actually used in the persona examples
    const emojiMatches = allExampleText.match(
      /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu
    );

    if (emojiMatches) {
      allEmojisFromExamples.push(...emojiMatches);
    }

    // If no emojis in examples, return empty array (respect the persona's actual usage)
    if (allEmojisFromExamples.length === 0) {
      return [];
    }

    // Remove duplicates and return the emojis actually used by this brand
    return [...new Set(allEmojisFromExamples)];
  }

  private detectTone(content: string): string {
    const lowerContent = content.toLowerCase();

    if (
      lowerContent.includes("insights") ||
      lowerContent.includes("professional") ||
      lowerContent.includes("industry")
    ) {
      return "professional";
    } else if (
      lowerContent.includes("hey") ||
      lowerContent.includes("awesome") ||
      lowerContent.includes("love")
    ) {
      return "friendly";
    } else if (
      lowerContent.includes("tip") ||
      lowerContent.includes("learn") ||
      lowerContent.includes("how to")
    ) {
      return "educational";
    } else if (
      lowerContent.includes("inspire") ||
      lowerContent.includes("motivat") ||
      lowerContent.includes("believe")
    ) {
      return "inspirational";
    }

    return "casual";
  }

  private getExpectedEmojiRange(): { min: number; max: number } {
    if (!this.persona) return { min: 0, max: 3 };

    const usage = this.persona.voice.emojiUsage;
    switch (usage) {
      case "none":
        return { min: 0, max: 0 };
      case "minimal":
        return { min: 0, max: 2 };
      case "moderate":
        return { min: 1, max: 4 };
      case "frequent":
        return { min: 2, max: 8 };
      default:
        return { min: 0, max: 3 };
    }
  }

  private validateContentLength(
    content: string,
    contentType: string
  ): string | null {
    if (!this.persona) return null;

    const length = content.length;
    const guideline = this.persona.contentGuidelines.postLength;

    const ranges = {
      short: { min: 50, max: 150 },
      medium: { min: 100, max: 300 },
      long: { min: 200, max: 500 },
      varies: { min: 50, max: 500 },
    };

    const range = ranges[guideline];
    if (length < range.min) {
      return `Content too short: ${length} characters, minimum ${range.min} for ${guideline} style`;
    } else if (length > range.max) {
      return `Content too long: ${length} characters, maximum ${range.max} for ${guideline} style`;
    }

    return null;
  }

  private calculateOptimalTimes(platform: string): string[] {
    // This would integrate with your optimal timing engine
    // For now, return platform-specific defaults
    const platformTimes = {
      instagram: ["8:00 AM", "12:00 PM", "7:00 PM"],
      twitter: ["9:00 AM", "1:00 PM", "6:00 PM"],
      linkedin: ["9:00 AM", "12:00 PM", "3:00 PM"],
      facebook: ["12:00 PM", "3:00 PM", "7:00 PM"],
      tiktok: ["6:00 AM", "7:00 PM", "9:00 PM"],
    };

    return (
      platformTimes[platform as keyof typeof platformTimes] ||
      platformTimes.instagram
    );
  }

  private calculateOptimalFrequency(platform: string): number {
    if (!this.persona) return 5;

    const baseFrequency = this.persona.contentGuidelines.contentMix;
    const totalContentTypes = Object.values(baseFrequency).reduce(
      (sum, val) => sum + val,
      0
    );

    // Adjust frequency based on platform and content mix
    const platformMultipliers = {
      instagram: 1.0,
      twitter: 2.0,
      linkedin: 0.6,
      facebook: 0.8,
      tiktok: 1.2,
    };

    const multiplier =
      platformMultipliers[platform as keyof typeof platformMultipliers] || 1.0;
    return Math.round((totalContentTypes / 20) * 7 * multiplier); // Convert to posts per week
  }

  private getTrendingHashtagsForTopic(topic: string): string[] {
    // This would integrate with your hashtag research system
    return ["trending", "viral", "growth"];
  }

  private getNicheHashtagsForTopic(topic: string): string[] {
    // Generate niche-specific hashtags
    return [topic.toLowerCase().replace(/\s+/g, ""), "niche", "community"];
  }

  private generateGenericContent(topic: string, contentType: string): string {
    const genericTemplates = {
      post: `Sharing thoughts on ${topic}. What do you think?`,
      reply: "Thanks for your comment!",
      dm: "Hi there! Thanks for connecting.",
    };

    return (
      genericTemplates[contentType as keyof typeof genericTemplates] ||
      genericTemplates.post
    );
  }

  private getGenericReply(sentiment: string): string {
    const replies = {
      positive: "Thank you so much! Really appreciate your support! 😊",
      negative:
        "Thanks for your feedback. I appreciate you taking the time to share your thoughts.",
      neutral:
        "Thanks for your comment! Always great to hear from the community.",
    };

    return replies[sentiment as keyof typeof replies] || replies.neutral;
  }

  private generatePositiveReply(style: string, tone: string): string {
    const replies = {
      brief: "Thanks! 😊",
      detailed:
        "Thank you so much for the positive feedback! It really means a lot to hear from engaged community members like you.",
      questions:
        "Thanks for the kind words! What aspect resonated most with you?",
      supportive:
        "Your support means the world! Thank you for being part of this amazing community! ✨",
      expert:
        "I appreciate your feedback. It's always rewarding when the content provides value to the community.",
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private generateNegativeReply(style: string, tone: string): string {
    const replies = {
      brief: "Thanks for the feedback.",
      detailed:
        "I appreciate you taking the time to share your perspective. Your feedback helps me create better content.",
      questions:
        "Thanks for the feedback. What would you like to see improved?",
      supportive:
        "I hear you and appreciate your honesty. Always looking to improve and provide more value.",
      expert:
        "Thank you for the constructive feedback. I take all comments seriously and use them to enhance future content.",
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private generateNeutralReply(style: string, tone: string): string {
    const replies = {
      brief: "Thanks for commenting!",
      detailed:
        "Thanks for engaging with the content! I always appreciate when community members take the time to share their thoughts.",
      questions:
        "Thanks for commenting! What's your experience with this topic?",
      supportive:
        "Love having you as part of the community! Thanks for engaging! 💙",
      expert:
        "Thank you for contributing to the discussion. Community engagement like this makes the content so much better.",
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private addAppropriateEmojis(
    content: string,
    usage: string,
    sentiment: string
  ): string {
    if (usage === "none") return content;

    const emojiSets = {
      positive: ["😊", "✨", "🙌", "💙", "🎉"],
      negative: ["🤔", "💭", "🙏"],
      neutral: ["👍", "💬", "🔥", "✨"],
    };

    const emojis =
      emojiSets[sentiment as keyof typeof emojiSets] || emojiSets.neutral;
    const emojiCount = usage === "minimal" ? 1 : usage === "moderate" ? 2 : 3;

    const selectedEmojis = emojis.slice(0, emojiCount).join(" ");
    return `${content} ${selectedEmojis}`;
  }

  private adaptReplyForPlatform(reply: string, platform: string): string {
    // Platform-specific adaptations
    if (platform === "linkedin" && reply.includes("😊")) {
      return reply.replace(/😊/g, ""); // LinkedIn is more professional
    }

    if (platform === "twitter" && reply.length > 280) {
      return reply.substring(0, 270) + "..."; // Twitter character limit
    }

    return reply;
  }
}

/**
 * Default brand personas for different industries/styles
 */
export const getDefaultBrandPersonas = (): BrandPersona[] => [
  {
    id: "tech_professional",
    name: "Tech Professional",
    description: "Professional, authoritative voice for tech industry leaders",
    voice: {
      tone: "professional",
      personality: [
        "knowledgeable",
        "innovative",
        "reliable",
        "forward-thinking",
      ],
      writingStyle: "technical",
      emojiUsage: "minimal",
      languageLevel: "advanced",
    },
    messaging: {
      keyMessages: [
        "Innovation drives progress",
        "Technology solves real problems",
        "Data-driven decisions",
      ],
      valueProposition: "Sharing insights and innovations in technology",
      targetAudience: "Tech professionals, developers, entrepreneurs",
      contentPillars: [
        "technology",
        "innovation",
        "development",
        "industry insights",
      ],
      avoidTopics: [
        "personal drama",
        "controversial politics",
        "unverified claims",
      ],
    },
    engagement: {
      commentStyle: "expert",
      dmApproach: "professional",
      hashtagStrategy: "niche",
      mentionStyle: "strategic",
    },
    contentGuidelines: {
      postLength: "medium",
      contentMix: {
        educational: 50,
        entertainment: 10,
        promotional: 25,
        personal: 15,
      },
      callToActionStyle: "direct",
      questionFrequency: "occasional",
    },
    platformCustomization: {
      linkedin: {
        adaptedTone: "authoritative",
        specificHashtags: ["technology", "innovation", "leadership"],
        contentFocus: "industry insights",
        engagementStyle: "professional networking",
      },
      twitter: {
        adaptedTone: "direct",
        specificHashtags: ["tech", "innovation", "development"],
        contentFocus: "quick insights",
        engagementStyle: "thought leadership",
      },
    },
    examples: {
      samplePosts: [
        "🚀 The future of AI development is here. Key insights from this week's innovations:\n\n1. Edge computing integration\n2. Real-time processing capabilities\n3. Enhanced security protocols\n\nWhat trends are you seeing in your projects? #AI #innovation #technology",
        "💡 Quick tech tip: Always validate your APIs before production deployment.\n\nThis simple step prevents 80% of production issues.\n\nWhat's your go-to validation strategy? #development #bestpractices #tech",
      ],
      sampleReplies: [
        "Excellent point about scalability. That's exactly the challenge we're solving.",
        "Thanks for sharing your experience. Data-driven insights like this are invaluable.",
        "Great question! In my experience, the key is consistent monitoring and optimization.",
      ],
      sampleDMs: [
        "Hi {name}, I noticed your recent work on {project}. Would love to discuss potential collaboration opportunities.",
        "Hello {name}, your insights on {topic} really resonated. I think we could create some valuable content together.",
      ],
    },
  },
  {
    id: "lifestyle_creator",
    name: "Lifestyle Creator",
    description: "Warm, inspiring voice for lifestyle and wellness content",
    voice: {
      tone: "inspirational",
      personality: ["authentic", "positive", "relatable", "encouraging"],
      writingStyle: "conversational",
      emojiUsage: "moderate",
      languageLevel: "simple",
    },
    messaging: {
      keyMessages: [
        "Live your best life",
        "Small changes make big impacts",
        "Authenticity over perfection",
      ],
      valueProposition:
        "Inspiring positive lifestyle changes through authentic sharing",
      targetAudience:
        "People seeking lifestyle improvement, wellness enthusiasts, busy professionals",
      contentPillars: [
        "wellness",
        "lifestyle",
        "motivation",
        "authenticity",
        "self-care",
      ],
      avoidTopics: [
        "negative news",
        "controversial topics",
        "overly promotional content",
      ],
    },
    engagement: {
      commentStyle: "supportive",
      dmApproach: "friendly",
      hashtagStrategy: "mixed",
      mentionStyle: "active",
    },
    contentGuidelines: {
      postLength: "medium",
      contentMix: {
        educational: 30,
        entertainment: 35,
        promotional: 15,
        personal: 20,
      },
      callToActionStyle: "creative",
      questionFrequency: "frequent",
    },
    platformCustomization: {
      instagram: {
        adaptedTone: "inspirational",
        specificHashtags: ["lifestyle", "wellness", "inspiration", "authentic"],
        contentFocus: "visual storytelling",
        engagementStyle: "community building",
      },
      tiktok: {
        adaptedTone: "playful",
        specificHashtags: ["lifestyle", "motivation", "selfcare"],
        contentFocus: "quick tips and inspiration",
        engagementStyle: "trendy and relatable",
      },
    },
    examples: {
      samplePosts: [
        "✨ Sunday reset vibes: Taking time to recharge and plan for an amazing week ahead!\n\nMy favorite reset activities:\n🛁 Long bath with essential oils\n📚 Reading something inspiring\n🌱 Meal prepping healthy options\n\nWhat's your favorite way to reset? Share below! 💭",
        "🌅 Morning reminder: You don't have to be perfect to be amazing.\n\nProgress over perfection, always. 💪\n\nWhat small step are you taking today? I believe in you! ✨",
      ],
      sampleReplies: [
        "Yes! Love this energy! You're absolutely crushing it! 🙌✨",
        "This is such a beautiful perspective! Thank you for sharing! 💙",
        "You're so right! Small steps really do lead to big changes! Keep going! 🌟",
      ],
      sampleDMs: [
        "Hey {name}! 👋 Love your content about {topic}! Would love to connect with fellow creators who inspire positive living! ✨",
        "Hi {name}! Your recent post about {topic} really resonated with me. Would you be interested in collaborating on some wellness content? 🌱",
      ],
    },
  },
];

/**
 * Convert BrandPersona interface to Jazz schema format
 */
export const convertPersonaToJazzFormat = (persona: BrandPersona): any => {
  return {
    name: persona.name,
    description: persona.description,
    tone: persona.voice.tone,
    writingStyle: persona.voice.writingStyle,
    emojiUsage: persona.voice.emojiUsage,
    languageLevel: persona.voice.languageLevel,
    personality: persona.voice.personality,
    contentPillars: persona.messaging.contentPillars,
    targetAudience: persona.messaging.targetAudience,
    keyMessages: persona.messaging.keyMessages,
    valueProposition: persona.messaging.valueProposition,
    avoidTopics: persona.messaging.avoidTopics,
    commentStyle: persona.engagement.commentStyle,
    hashtagStrategy: persona.engagement.hashtagStrategy,
    callToActionStyle: persona.contentGuidelines.callToActionStyle,
    platformCustomization: JSON.stringify(persona.platformCustomization || {}),
    samplePosts: persona.examples.samplePosts || [],
    sampleReplies: persona.examples.sampleReplies || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Convert Jazz schema format back to BrandPersona interface
 */
export const convertJazzToPersonaFormat = (
  jazzPersona: any
): BrandPersona | null => {
  if (!jazzPersona) return null;

  try {
    let platformCustomization = {};
    if (jazzPersona.platformCustomization) {
      try {
        platformCustomization = JSON.parse(jazzPersona.platformCustomization);
      } catch {
        // Invalid JSON, use empty object
      }
    }

    return {
      id: jazzPersona.id || `persona_${Date.now()}`,
      name: jazzPersona.name || "My Brand",
      description: jazzPersona.description || "",
      voice: {
        tone: jazzPersona.tone || "friendly",
        personality: jazzPersona.personality || [],
        writingStyle: jazzPersona.writingStyle || "conversational",
        emojiUsage: jazzPersona.emojiUsage || "moderate",
        languageLevel: jazzPersona.languageLevel || "intermediate",
      },
      messaging: {
        keyMessages: jazzPersona.keyMessages || [],
        valueProposition: jazzPersona.valueProposition || "",
        targetAudience: jazzPersona.targetAudience || "",
        contentPillars: jazzPersona.contentPillars || [],
        avoidTopics: jazzPersona.avoidTopics || [],
      },
      engagement: {
        commentStyle: jazzPersona.commentStyle || "supportive",
        dmApproach: "friendly",
        hashtagStrategy: jazzPersona.hashtagStrategy || "mixed",
        mentionStyle: "active",
      },
      contentGuidelines: {
        postLength: "medium",
        contentMix: {
          educational: 40,
          entertainment: 30,
          promotional: 20,
          personal: 10,
        },
        callToActionStyle: jazzPersona.callToActionStyle || "direct",
        questionFrequency: "frequent",
      },
      platformCustomization,
      examples: {
        samplePosts: jazzPersona.samplePosts || [],
        sampleReplies: jazzPersona.sampleReplies || [],
        sampleDMs: [],
      },
    };
  } catch (error) {
    console.error("Error converting Jazz persona to interface:", error);
    return null;
  }
};

/**
 * Save brand persona to account group using new Jazz schema
 */
export const saveBrandPersona = async (
  accountGroup: any,
  persona: BrandPersona
): Promise<void> => {
  if (!accountGroup) return;

  try {
    // Import BrandPersona schema dynamically to avoid circular deps
    const { BrandPersona: BrandPersonaSchema } = await import("../app/schema");

    const jazzData = convertPersonaToJazzFormat(persona);

    // Check if brandPersona already exists
    if (accountGroup.brandPersona) {
      // Update existing persona
      Object.assign(accountGroup.brandPersona, {
        ...jazzData,
        updatedAt: new Date(),
      });
    } else {
      // Create new persona
      accountGroup.brandPersona = BrandPersonaSchema.create(jazzData);
    }
  } catch (error) {
    console.error("Error saving brand persona:", error);
    throw error;
  }
};

/**
 * Load brand persona from account group using new Jazz schema
 */
export const loadBrandPersona = (accountGroup: any): BrandPersona | null => {
  try {
    if (!accountGroup?.brandPersona) return null;
    return convertJazzToPersonaFormat(accountGroup.brandPersona);
  } catch (error) {
    console.error("Error loading brand persona:", error);
    return null;
  }
};

/**
 * Delete brand persona from account group
 */
export const deleteBrandPersona = async (accountGroup: any): Promise<void> => {
  if (!accountGroup) return;

  try {
    // Set the brandPersona to null/undefined to delete it
    accountGroup.brandPersona = undefined;
  } catch (error) {
    console.error("Error deleting brand persona:", error);
    throw error;
  }
};
