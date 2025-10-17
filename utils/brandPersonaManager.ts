import { isBusinessPlanMode } from './ayrshareIntegration';

export interface BrandPersona {
  id: string;
  name: string;
  description: string;
  voice: {
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'playful' | 'inspirational' | 'educational';
    personality: string[];
    writingStyle: 'formal' | 'conversational' | 'witty' | 'direct' | 'storytelling' | 'technical';
    emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
    languageLevel: 'simple' | 'intermediate' | 'advanced' | 'expert';
  };
  messaging: {
    keyMessages: string[];
    valueProposition: string;
    targetAudience: string;
    contentPillars: string[];
    avoidTopics: string[];
  };
  engagement: {
    commentStyle: 'brief' | 'detailed' | 'questions' | 'supportive' | 'expert';
    dmApproach: 'professional' | 'friendly' | 'direct' | 'collaborative';
    hashtagStrategy: 'branded' | 'trending' | 'niche' | 'mixed';
    mentionStyle: 'conservative' | 'active' | 'strategic';
  };
  contentGuidelines: {
    postLength: 'short' | 'medium' | 'long' | 'varies';
    contentMix: {
      educational: number;
      entertainment: number;
      promotional: number;
      personal: number;
    };
    callToActionStyle: 'subtle' | 'direct' | 'creative' | 'none';
    questionFrequency: 'rare' | 'occasional' | 'frequent' | 'always';
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
    this.persona = persona;
  }

  /**
   * Generate content that matches the brand persona
   */
  generateBrandedContent(
    topic: string, 
    contentType: 'post' | 'reply' | 'dm',
    platform: string,
    context?: any
  ): string {
    if (!this.persona) {
      return this.generateGenericContent(topic, contentType);
    }

    const platformCustomization = this.persona.platformCustomization[platform] || {};
    const tone = platformCustomization.adaptedTone || this.persona.voice.tone;

    switch (contentType) {
      case 'post':
        return this.generateBrandedPost(topic, platform, tone);
      case 'reply':
        return this.generateBrandedReply(context?.comment || topic, tone);
      case 'dm':
        return this.generateBrandedDM(context?.recipient || 'there', tone);
      default:
        return this.generateGenericContent(topic, contentType);
    }
  }

  /**
   * Get hashtags that match the brand strategy
   */
  getBrandedHashtags(contentTopic: string, platform: string): string[] {
    if (!this.persona) {
      return ['content', 'social', 'community'];
    }

    const strategy = this.persona.engagement.hashtagStrategy;
    const platformCustomization = this.persona.platformCustomization[platform];
    const contentPillars = this.persona.messaging.contentPillars;

    let hashtags: string[] = [];

    // Add platform-specific hashtags
    if (platformCustomization?.specificHashtags) {
      hashtags.push(...platformCustomization.specificHashtags.slice(0, 3));
    }

    // Add content pillar hashtags
    hashtags.push(...contentPillars.slice(0, 2));

    // Add strategy-based hashtags
    if (strategy === 'branded') {
      hashtags.push(this.persona.name.toLowerCase().replace(/\s+/g, ''));
    } else if (strategy === 'trending') {
      hashtags.push(...this.getTrendingHashtagsForTopic(contentTopic));
    } else if (strategy === 'niche') {
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
        bestTimes: ['9:00 AM', '1:00 PM', '5:00 PM'],
        frequency: 5,
        contentMix: { educational: 40, entertainment: 30, promotional: 20, personal: 10 }
      };
    }

    const platformCustomization = this.persona.platformCustomization[platform] || {};
    
    return {
      bestTimes: this.calculateOptimalTimes(platform),
      frequency: this.calculateOptimalFrequency(platform),
      contentMix: this.persona.contentGuidelines.contentMix
    };
  }

  /**
   * Generate auto-reply that matches brand voice
   */
  generateContextualReply(
    comment: string,
    sentiment: 'positive' | 'negative' | 'neutral',
    platform: string
  ): string {
    if (!this.persona) {
      return this.getGenericReply(sentiment);
    }

    const tone = this.persona.voice.tone;
    const style = this.persona.engagement.commentStyle;
    const emojiUsage = this.persona.voice.emojiUsage;

    let reply = '';

    // Base reply based on sentiment and style
    if (sentiment === 'positive') {
      reply = this.generatePositiveReply(style, tone);
    } else if (sentiment === 'negative') {
      reply = this.generateNegativeReply(style, tone);
    } else {
      reply = this.generateNeutralReply(style, tone);
    }

    // Add emojis based on usage preference
    if (emojiUsage !== 'none') {
      reply = this.addAppropriateEmojis(reply, emojiUsage, sentiment);
    }

    // Customize for platform
    return this.adaptReplyForPlatform(reply, platform);
  }

  /**
   * Validate content against brand guidelines
   */
  validateContentAgainstBrand(content: string, contentType: 'post' | 'reply' | 'dm'): {
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
    this.persona.messaging.avoidTopics.forEach(topic => {
      if (lowerContent.includes(topic.toLowerCase())) {
        issues.push(`Content contains avoided topic: ${topic}`);
        score -= 20;
      }
    });

    // Check tone consistency
    const detectedTone = this.detectTone(content);
    if (detectedTone !== this.persona.voice.tone) {
      issues.push(`Tone mismatch: detected ${detectedTone}, expected ${this.persona.voice.tone}`);
      score -= 15;
    }

    // Check emoji usage
    const emojiCount = (content.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu) || []).length;
    const expectedEmojiRange = this.getExpectedEmojiRange();
    
    if (emojiCount < expectedEmojiRange.min || emojiCount > expectedEmojiRange.max) {
      issues.push(`Emoji usage outside brand guidelines: ${emojiCount} found, expected ${expectedEmojiRange.min}-${expectedEmojiRange.max}`);
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
      suggestions.push('Consider revising content to better match brand voice');
    }
    if (issues.some(issue => issue.includes('tone'))) {
      suggestions.push(`Adjust tone to be more ${this.persona.voice.tone}`);
    }

    return {
      isValid: score >= 70,
      score: Math.max(0, score),
      issues,
      suggestions
    };
  }

  // Private helper methods

  private generateBrandedPost(topic: string, platform: string, tone: string): string {
    if (!this.persona) return '';

    const templates = this.getPostTemplates(tone, platform);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const contentPillar = this.persona.messaging.contentPillars[0] || topic;
    const valueProps = this.persona.messaging.valueProposition;

    return template
      .replace('{topic}', topic)
      .replace('{contentPillar}', contentPillar)
      .replace('{valueProposition}', valueProps)
      .replace('{cta}', this.generateCTA(this.persona.contentGuidelines.callToActionStyle));
  }

  private generateBrandedReply(comment: string, tone: string): string {
    if (!this.persona) return 'Thanks for your comment!';

    const replyTemplates = {
      professional: [
        'Thank you for your thoughtful comment.',
        'I appreciate your perspective on this.',
        'That\'s an excellent point you\'ve raised.'
      ],
      friendly: [
        'Thanks so much for sharing your thoughts! 😊',
        'Love your perspective on this!',
        'Really appreciate you taking the time to comment!'
      ],
      casual: [
        'Thanks for chiming in!',
        'Totally agree with you on this!',
        'Great point!'
      ],
      educational: [
        'Great question! Here\'s what I\'ve found...',
        'That\'s a common challenge. My experience has been...',
        'I\'d love to share more insights on this topic.'
      ]
    };

    const templates = replyTemplates[tone as keyof typeof replyTemplates] || replyTemplates.friendly;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateBrandedDM(recipient: string, tone: string): string {
    if (!this.persona) return `Hi ${recipient}! Thanks for connecting.`;

    const dmTemplates = {
      professional: `Hi ${recipient}, I came across your profile and was impressed by your work in {industry}. I'd love to connect and explore potential collaboration opportunities.`,
      friendly: `Hey ${recipient}! 👋 Love your content about {topic}. Would be great to connect with fellow creators in this space!`,
      collaborative: `Hi ${recipient}! I think we have some great synergies in {niche}. Would you be interested in exploring some collaboration ideas?`,
      direct: `Hi ${recipient}! Quick question - are you open to collaboration opportunities in {industry}?`
    };

    const template = dmTemplates[tone as keyof typeof dmTemplates] || dmTemplates.friendly;
    return template
      .replace('{industry}', this.persona.messaging.contentPillars[0] || 'your industry')
      .replace('{topic}', this.persona.messaging.contentPillars[1] || 'your topic')
      .replace('{niche}', this.persona.messaging.contentPillars[0] || 'this niche');
  }

  private getPostTemplates(tone: string, platform: string): string[] {
    const templates = {
      professional: [
        'Sharing insights on {topic}: {valueProposition}\n\nKey takeaway: {contentPillar}\n\n{cta}',
        'Professional perspective on {topic}:\n\n{valueProposition}\n\nWhat\'s your experience with this? {cta}'
      ],
      friendly: [
        'Hey everyone! 👋 Let\'s talk about {topic}!\n\n{valueProposition}\n\nWhat do you think? {cta}',
        'Quick friendly reminder about {topic}: {valueProposition} ✨\n\n{cta}'
      ],
      educational: [
        '📚 Today\'s lesson: {topic}\n\n{valueProposition}\n\nKey insight: {contentPillar}\n\n{cta}',
        '💡 Quick tip about {topic}:\n\n{valueProposition}\n\nTry this and let me know how it goes! {cta}'
      ],
      inspirational: [
        '✨ Remember: {topic} is about {valueProposition}\n\n{contentPillar}\n\nYou\'ve got this! {cta}',
        '🌟 Motivation Monday: {topic}\n\n{valueProposition}\n\nWhat\'s inspiring you today? {cta}'
      ]
    };

    return templates[tone as keyof typeof templates] || templates.friendly;
  }

  private generateCTA(style: string): string {
    const ctas = {
      subtle: ['What are your thoughts?', 'I\'d love to hear your perspective.', 'Share your experience below.'],
      direct: ['Comment below!', 'Let me know in the comments!', 'Share your thoughts! 👇'],
      creative: ['Drop your thoughts in the comments! 💭', 'What\'s your take? Spill the tea! ☕', 'Your turn - what do you think? 🤔'],
      none: ['']
    };

    const ctaOptions = ctas[style as keyof typeof ctas] || ctas.direct;
    return ctaOptions[Math.floor(Math.random() * ctaOptions.length)];
  }

  private detectTone(content: string): string {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('insights') || lowerContent.includes('professional') || lowerContent.includes('industry')) {
      return 'professional';
    } else if (lowerContent.includes('hey') || lowerContent.includes('awesome') || lowerContent.includes('love')) {
      return 'friendly';
    } else if (lowerContent.includes('tip') || lowerContent.includes('learn') || lowerContent.includes('how to')) {
      return 'educational';
    } else if (lowerContent.includes('inspire') || lowerContent.includes('motivat') || lowerContent.includes('believe')) {
      return 'inspirational';
    }
    
    return 'casual';
  }

  private getExpectedEmojiRange(): { min: number; max: number } {
    if (!this.persona) return { min: 0, max: 3 };

    const usage = this.persona.voice.emojiUsage;
    switch (usage) {
      case 'none': return { min: 0, max: 0 };
      case 'minimal': return { min: 0, max: 2 };
      case 'moderate': return { min: 1, max: 4 };
      case 'frequent': return { min: 2, max: 8 };
      default: return { min: 0, max: 3 };
    }
  }

  private validateContentLength(content: string, contentType: string): string | null {
    if (!this.persona) return null;

    const length = content.length;
    const guideline = this.persona.contentGuidelines.postLength;

    const ranges = {
      short: { min: 50, max: 150 },
      medium: { min: 100, max: 300 },
      long: { min: 200, max: 500 },
      varies: { min: 50, max: 500 }
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
      instagram: ['8:00 AM', '12:00 PM', '7:00 PM'],
      twitter: ['9:00 AM', '1:00 PM', '6:00 PM'],
      linkedin: ['9:00 AM', '12:00 PM', '3:00 PM'],
      facebook: ['12:00 PM', '3:00 PM', '7:00 PM'],
      tiktok: ['6:00 AM', '7:00 PM', '9:00 PM']
    };

    return platformTimes[platform as keyof typeof platformTimes] || platformTimes.instagram;
  }

  private calculateOptimalFrequency(platform: string): number {
    if (!this.persona) return 5;

    const baseFrequency = this.persona.contentGuidelines.contentMix;
    const totalContentTypes = Object.values(baseFrequency).reduce((sum, val) => sum + val, 0);
    
    // Adjust frequency based on platform and content mix
    const platformMultipliers = {
      instagram: 1.0,
      twitter: 2.0,
      linkedin: 0.6,
      facebook: 0.8,
      tiktok: 1.2
    };

    const multiplier = platformMultipliers[platform as keyof typeof platformMultipliers] || 1.0;
    return Math.round((totalContentTypes / 20) * 7 * multiplier); // Convert to posts per week
  }

  private getTrendingHashtagsForTopic(topic: string): string[] {
    // This would integrate with your hashtag research system
    return ['trending', 'viral', 'growth'];
  }

  private getNicheHashtagsForTopic(topic: string): string[] {
    // Generate niche-specific hashtags
    return [topic.toLowerCase().replace(/\s+/g, ''), 'niche', 'community'];
  }

  private generateGenericContent(topic: string, contentType: string): string {
    const genericTemplates = {
      post: `Sharing thoughts on ${topic}. What do you think?`,
      reply: 'Thanks for your comment!',
      dm: 'Hi there! Thanks for connecting.'
    };

    return genericTemplates[contentType as keyof typeof genericTemplates] || genericTemplates.post;
  }

  private getGenericReply(sentiment: string): string {
    const replies = {
      positive: 'Thank you so much! Really appreciate your support! 😊',
      negative: 'Thanks for your feedback. I appreciate you taking the time to share your thoughts.',
      neutral: 'Thanks for your comment! Always great to hear from the community.'
    };

    return replies[sentiment as keyof typeof replies] || replies.neutral;
  }

  private generatePositiveReply(style: string, tone: string): string {
    const replies = {
      brief: 'Thanks! 😊',
      detailed: 'Thank you so much for the positive feedback! It really means a lot to hear from engaged community members like you.',
      questions: 'Thanks for the kind words! What aspect resonated most with you?',
      supportive: 'Your support means the world! Thank you for being part of this amazing community! ✨',
      expert: 'I appreciate your feedback. It\'s always rewarding when the content provides value to the community.'
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private generateNegativeReply(style: string, tone: string): string {
    const replies = {
      brief: 'Thanks for the feedback.',
      detailed: 'I appreciate you taking the time to share your perspective. Your feedback helps me create better content.',
      questions: 'Thanks for the feedback. What would you like to see improved?',
      supportive: 'I hear you and appreciate your honesty. Always looking to improve and provide more value.',
      expert: 'Thank you for the constructive feedback. I take all comments seriously and use them to enhance future content.'
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private generateNeutralReply(style: string, tone: string): string {
    const replies = {
      brief: 'Thanks for commenting!',
      detailed: 'Thanks for engaging with the content! I always appreciate when community members take the time to share their thoughts.',
      questions: 'Thanks for commenting! What\'s your experience with this topic?',
      supportive: 'Love having you as part of the community! Thanks for engaging! 💙',
      expert: 'Thank you for contributing to the discussion. Community engagement like this makes the content so much better.'
    };

    return replies[style as keyof typeof replies] || replies.supportive;
  }

  private addAppropriateEmojis(content: string, usage: string, sentiment: string): string {
    if (usage === 'none') return content;

    const emojiSets = {
      positive: ['😊', '✨', '🙌', '💙', '🎉'],
      negative: ['🤔', '💭', '🙏'],
      neutral: ['👍', '💬', '🔥', '✨']
    };

    const emojis = emojiSets[sentiment as keyof typeof emojiSets] || emojiSets.neutral;
    const emojiCount = usage === 'minimal' ? 1 : usage === 'moderate' ? 2 : 3;
    
    const selectedEmojis = emojis.slice(0, emojiCount).join(' ');
    return `${content} ${selectedEmojis}`;
  }

  private adaptReplyForPlatform(reply: string, platform: string): string {
    // Platform-specific adaptations
    if (platform === 'linkedin' && reply.includes('😊')) {
      return reply.replace(/😊/g, ''); // LinkedIn is more professional
    }
    
    if (platform === 'twitter' && reply.length > 280) {
      return reply.substring(0, 270) + '...'; // Twitter character limit
    }
    
    return reply;
  }
}

/**
 * Default brand personas for different industries/styles
 */
export const getDefaultBrandPersonas = (): BrandPersona[] => [
  {
    id: 'tech_professional',
    name: 'Tech Professional',
    description: 'Professional, authoritative voice for tech industry leaders',
    voice: {
      tone: 'professional',
      personality: ['knowledgeable', 'innovative', 'reliable', 'forward-thinking'],
      writingStyle: 'technical',
      emojiUsage: 'minimal',
      languageLevel: 'advanced'
    },
    messaging: {
      keyMessages: ['Innovation drives progress', 'Technology solves real problems', 'Data-driven decisions'],
      valueProposition: 'Sharing insights and innovations in technology',
      targetAudience: 'Tech professionals, developers, entrepreneurs',
      contentPillars: ['technology', 'innovation', 'development', 'industry insights'],
      avoidTopics: ['personal drama', 'controversial politics', 'unverified claims']
    },
    engagement: {
      commentStyle: 'expert',
      dmApproach: 'professional',
      hashtagStrategy: 'niche',
      mentionStyle: 'strategic'
    },
    contentGuidelines: {
      postLength: 'medium',
      contentMix: { educational: 50, entertainment: 10, promotional: 25, personal: 15 },
      callToActionStyle: 'direct',
      questionFrequency: 'occasional'
    },
    platformCustomization: {
      linkedin: {
        adaptedTone: 'authoritative',
        specificHashtags: ['technology', 'innovation', 'leadership'],
        contentFocus: 'industry insights',
        engagementStyle: 'professional networking'
      },
      twitter: {
        adaptedTone: 'direct',
        specificHashtags: ['tech', 'innovation', 'development'],
        contentFocus: 'quick insights',
        engagementStyle: 'thought leadership'
      }
    },
    examples: {
      samplePosts: [
        '🚀 The future of AI development is here. Key insights from this week\'s innovations:\n\n1. Edge computing integration\n2. Real-time processing capabilities\n3. Enhanced security protocols\n\nWhat trends are you seeing in your projects? #AI #innovation #technology',
        '💡 Quick tech tip: Always validate your APIs before production deployment.\n\nThis simple step prevents 80% of production issues.\n\nWhat\'s your go-to validation strategy? #development #bestpractices #tech'
      ],
      sampleReplies: [
        'Excellent point about scalability. That\'s exactly the challenge we\'re solving.',
        'Thanks for sharing your experience. Data-driven insights like this are invaluable.',
        'Great question! In my experience, the key is consistent monitoring and optimization.'
      ],
      sampleDMs: [
        'Hi {name}, I noticed your recent work on {project}. Would love to discuss potential collaboration opportunities.',
        'Hello {name}, your insights on {topic} really resonated. I think we could create some valuable content together.'
      ]
    }
  },
  {
    id: 'lifestyle_creator',
    name: 'Lifestyle Creator',
    description: 'Warm, inspiring voice for lifestyle and wellness content',
    voice: {
      tone: 'inspirational',
      personality: ['authentic', 'positive', 'relatable', 'encouraging'],
      writingStyle: 'conversational',
      emojiUsage: 'moderate',
      languageLevel: 'simple'
    },
    messaging: {
      keyMessages: ['Live your best life', 'Small changes make big impacts', 'Authenticity over perfection'],
      valueProposition: 'Inspiring positive lifestyle changes through authentic sharing',
      targetAudience: 'People seeking lifestyle improvement, wellness enthusiasts, busy professionals',
      contentPillars: ['wellness', 'lifestyle', 'motivation', 'authenticity', 'self-care'],
      avoidTopics: ['negative news', 'controversial topics', 'overly promotional content']
    },
    engagement: {
      commentStyle: 'supportive',
      dmApproach: 'friendly',
      hashtagStrategy: 'mixed',
      mentionStyle: 'active'
    },
    contentGuidelines: {
      postLength: 'medium',
      contentMix: { educational: 30, entertainment: 35, promotional: 15, personal: 20 },
      callToActionStyle: 'creative',
      questionFrequency: 'frequent'
    },
    platformCustomization: {
      instagram: {
        adaptedTone: 'inspirational',
        specificHashtags: ['lifestyle', 'wellness', 'inspiration', 'authentic'],
        contentFocus: 'visual storytelling',
        engagementStyle: 'community building'
      },
      tiktok: {
        adaptedTone: 'playful',
        specificHashtags: ['lifestyle', 'motivation', 'selfcare'],
        contentFocus: 'quick tips and inspiration',
        engagementStyle: 'trendy and relatable'
      }
    },
    examples: {
      samplePosts: [
        '✨ Sunday reset vibes: Taking time to recharge and plan for an amazing week ahead!\n\nMy favorite reset activities:\n🛁 Long bath with essential oils\n📚 Reading something inspiring\n🌱 Meal prepping healthy options\n\nWhat\'s your favorite way to reset? Share below! 💭',
        '🌅 Morning reminder: You don\'t have to be perfect to be amazing.\n\nProgress over perfection, always. 💪\n\nWhat small step are you taking today? I believe in you! ✨'
      ],
      sampleReplies: [
        'Yes! Love this energy! You\'re absolutely crushing it! 🙌✨',
        'This is such a beautiful perspective! Thank you for sharing! 💙',
        'You\'re so right! Small steps really do lead to big changes! Keep going! 🌟'
      ],
      sampleDMs: [
        'Hey {name}! 👋 Love your content about {topic}! Would love to connect with fellow creators who inspire positive living! ✨',
        'Hi {name}! Your recent post about {topic} really resonated with me. Would you be interested in collaborating on some wellness content? 🌱'
      ]
    }
  }
];

/**
 * Save brand persona to account group
 */
export const saveBrandPersona = async (accountGroup: any, persona: BrandPersona): Promise<void> => {
  if (!accountGroup) return;

  try {
    // Save to Jazz collaborative database
    if (accountGroup.settings) {
      accountGroup.settings.brandPersona = persona;
    } else {
      // Initialize settings if they don't exist
      accountGroup.settings = { brandPersona: persona };
    }
  } catch (error) {
    console.error('Error saving brand persona:', error);
  }
};

/**
 * Load brand persona from account group
 */
export const loadBrandPersona = (accountGroup: any): BrandPersona | null => {
  try {
    return accountGroup?.settings?.brandPersona || null;
  } catch (error) {
    console.error('Error loading brand persona:', error);
    return null;
  }
};
