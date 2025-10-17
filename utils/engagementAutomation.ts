import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { isBusinessPlanMode } from './ayrshareIntegration';
import { BrandPersonaManager, loadBrandPersona } from './brandPersonaManager';

interface CommentData {
  id: string;
  platform: string;
  postId: string;
  comment: string;
  author: string;
  authorUsername: string;
  authorAvatar?: string;
  createdAt: string;
  likes?: number;
  replies?: CommentData[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  requiresResponse?: boolean;
  isSpam?: boolean;
}

interface AutoReplyRule {
  id: string;
  name: string;
  platform: string;
  triggers: string[];
  response: string;
  enabled: boolean;
  conditions: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    minFollowers?: number;
    excludeKeywords?: string[];
    onlyVerified?: boolean;
  };
  cooldownMinutes: number;
  maxRepliesPerDay: number;
}

interface EngagementMetrics {
  platform: string;
  totalComments: number;
  repliedComments: number;
  averageResponseTime: number;
  sentimentBreakdown: Record<string, number>;
  engagementRate: number;
  topEngagers: string[];
}

interface DMConversation {
  id: string;
  platform: string;
  participant: string;
  participantUsername: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  isRead: boolean;
  needsResponse: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export class EngagementAutomationEngine {
  private profileKey?: string;
  private brandManager?: BrandPersonaManager;

  constructor(profileKey?: string, accountGroup?: any) {
    this.profileKey = profileKey;
    
    // Initialize brand persona manager
    if (accountGroup) {
      const persona = loadBrandPersona(accountGroup);
      if (persona) {
        this.brandManager = new BrandPersonaManager(persona);
      }
    }
  }

  /**
   * Get comments for monitoring and auto-reply
   */
  async getCommentsForModeration(
    platform: string,
    postId?: string,
    limit: number = 50
  ): Promise<CommentData[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (isBusinessPlanMode() && this.profileKey) {
      headers['Profile-Key'] = this.profileKey;
    }

    try {
      const url = postId 
        ? `${AYRSHARE_API_URL}/comments?id=${postId}&platform=${platform}&limit=${limit}`
        : `${AYRSHARE_API_URL}/comments?platform=${platform}&limit=${limit}`;

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Comments API error: ${response.statusText}`);
      }

      const data = await response.json();
      const comments = data.comments || [];

      // Enhance comments with sentiment analysis and spam detection
      return comments.map((comment: any) => ({
        ...comment,
        sentiment: this.analyzeSentiment(comment.comment),
        requiresResponse: this.shouldRespond(comment),
        isSpam: this.detectSpam(comment)
      }));

    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Auto-reply to comments based on rules
   */
  async autoReplyToComment(
    comment: CommentData,
    rule: AutoReplyRule
  ): Promise<boolean> {
    if (!isBusinessPlanMode()) {
      throw new Error('Auto-reply requires Business Plan');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (this.profileKey) {
      headers['Profile-Key'] = this.profileKey;
    }

    try {
      // Check if rule conditions are met
      if (!this.evaluateRuleConditions(comment, rule)) {
        return false;
      }

      // Personalize the response
      const personalizedResponse = this.personalizeResponse(rule.response, comment);

      const response = await fetch(`${AYRSHARE_API_URL}/comments/reply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: comment.postId,
          commentId: comment.id,
          comment: personalizedResponse,
          platform: comment.platform
        })
      });

      if (!response.ok) {
        throw new Error(`Reply API error: ${response.statusText}`);
      }

      return true;

    } catch (error) {
      console.error('Error auto-replying to comment:', error);
      return false;
    }
  }

  /**
   * Bulk engage with comments
   */
  async bulkEngageWithComments(
    comments: CommentData[],
    rules: AutoReplyRule[]
  ): Promise<{
    replied: number;
    skipped: number;
    errors: string[];
  }> {
    let replied = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const comment of comments) {
      if (comment.isSpam || !comment.requiresResponse) {
        skipped++;
        continue;
      }

      // Find matching rule
      const matchingRule = rules.find(rule => 
        rule.enabled && 
        rule.platform === comment.platform &&
        this.matchesTriggers(comment.comment, rule.triggers)
      );

      if (!matchingRule) {
        skipped++;
        continue;
      }

      try {
        const success = await this.autoReplyToComment(comment, matchingRule);
        if (success) {
          replied++;
          // Add cooldown delay
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push(`Failed to reply to comment ${comment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { replied, skipped, errors };
  }

  /**
   * Get DM conversations for management
   */
  async getDMConversations(platform: string): Promise<DMConversation[]> {
    if (!isBusinessPlanMode()) {
      throw new Error('DM management requires Business Plan');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (this.profileKey) {
      headers['Profile-Key'] = this.profileKey;
    }

    try {
      const response = await fetch(`${AYRSHARE_API_URL}/message/history?platform=${platform}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`DM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const messages = data.messages || [];

      // Group messages into conversations
      const conversations: Record<string, DMConversation> = {};

      messages.forEach((message: any) => {
        const conversationId = `${platform}_${message.recipient || message.sender}`;
        
        if (!conversations[conversationId]) {
          conversations[conversationId] = {
            id: conversationId,
            platform,
            participant: message.recipient || message.sender,
            participantUsername: message.recipientUsername || message.senderUsername,
            lastMessage: message.message,
            lastMessageAt: message.sentAt,
            messageCount: 1,
            isRead: message.status === 'read',
            needsResponse: !message.isFromMe,
            sentiment: this.analyzeSentiment(message.message)
          };
        } else {
          conversations[conversationId].messageCount++;
          if (new Date(message.sentAt) > new Date(conversations[conversationId].lastMessageAt)) {
            conversations[conversationId].lastMessage = message.message;
            conversations[conversationId].lastMessageAt = message.sentAt;
            conversations[conversationId].needsResponse = !message.isFromMe;
          }
        }
      });

      return Object.values(conversations);

    } catch (error) {
      console.error('Error fetching DM conversations:', error);
      return [];
    }
  }

  /**
   * Send automated DM
   */
  async sendAutomatedDM(
    platform: string,
    recipient: string,
    message: string
  ): Promise<boolean> {
    if (!isBusinessPlanMode()) {
      throw new Error('Automated DMs require Business Plan');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (this.profileKey) {
      headers['Profile-Key'] = this.profileKey;
    }

    try {
      const response = await fetch(`${AYRSHARE_API_URL}/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platform,
          recipient,
          message
        })
      });

      return response.ok;

    } catch (error) {
      console.error('Error sending automated DM:', error);
      return false;
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    platform: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<EngagementMetrics> {
    // This would integrate with real analytics data
    // For now, provide simulated metrics
    
    return {
      platform,
      totalComments: Math.floor(Math.random() * 500) + 100,
      repliedComments: Math.floor(Math.random() * 200) + 50,
      averageResponseTime: Math.floor(Math.random() * 120) + 30, // minutes
      sentimentBreakdown: {
        positive: Math.floor(Math.random() * 60) + 30,
        negative: Math.floor(Math.random() * 20) + 5,
        neutral: Math.floor(Math.random() * 40) + 20
      },
      engagementRate: (Math.random() * 5) + 2, // 2-7%
      topEngagers: [
        'user1', 'user2', 'user3', 'user4', 'user5'
      ]
    };
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['great', 'awesome', 'love', 'amazing', 'excellent', 'fantastic', 'wonderful', 'perfect', 'best', 'good'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'poor', 'sucks', 'annoying'];
    
    const lowerText = text.toLowerCase();
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) positiveScore++;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) negativeScore++;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Determine if comment should get a response
   */
  private shouldRespond(comment: any): boolean {
    const text = comment.comment.toLowerCase();
    
    // Questions typically need responses
    if (text.includes('?') || text.includes('how') || text.includes('what') || text.includes('when') || text.includes('where')) {
      return true;
    }
    
    // Mentions need responses
    if (text.includes('@')) {
      return true;
    }
    
    // Negative sentiment might need response
    if (this.analyzeSentiment(text) === 'negative') {
      return true;
    }
    
    // Compliments might deserve acknowledgment
    const compliments = ['great', 'awesome', 'love', 'amazing', 'excellent'];
    if (compliments.some(word => text.includes(word))) {
      return Math.random() > 0.7; // Sometimes respond to compliments
    }
    
    return false;
  }

  /**
   * Detect spam comments
   */
  private detectSpam(comment: any): boolean {
    const text = comment.comment.toLowerCase();
    
    // Common spam indicators
    const spamIndicators = [
      'follow me', 'check out my', 'click link', 'free money', 'make money',
      'dm me', 'message me', 'whatsapp', 'telegram', 'investment', 'crypto'
    ];
    
    // Check for spam patterns
    if (spamIndicators.some(indicator => text.includes(indicator))) {
      return true;
    }
    
    // Check for excessive emojis or caps
    const emojiCount = (text.match(/[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}]/gu) || []).length;
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    
    if (emojiCount > 5 || capsRatio > 0.5) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if rule conditions are met
   */
  private evaluateRuleConditions(comment: CommentData, rule: AutoReplyRule): boolean {
    // Check sentiment condition
    if (rule.conditions.sentiment && comment.sentiment !== rule.conditions.sentiment) {
      return false;
    }
    
    // Check excluded keywords
    if (rule.conditions.excludeKeywords) {
      const lowerComment = comment.comment.toLowerCase();
      if (rule.conditions.excludeKeywords.some(keyword => lowerComment.includes(keyword.toLowerCase()))) {
        return false;
      }
    }
    
    // Additional conditions can be added here
    
    return true;
  }

  /**
   * Check if comment matches rule triggers
   */
  private matchesTriggers(comment: string, triggers: string[]): boolean {
    const lowerComment = comment.toLowerCase();
    return triggers.some(trigger => lowerComment.includes(trigger.toLowerCase()));
  }

  /**
   * Personalize response template using brand persona
   */
  private personalizeResponse(template: string, comment: CommentData): string {
    let response = template
      .replace('{username}', comment.authorUsername)
      .replace('{author}', comment.author)
      .replace('{platform}', comment.platform);

    // Use brand persona if available
    if (this.brandManager && comment.sentiment) {
      response = this.brandManager.generateContextualReply(
        comment.comment,
        comment.sentiment,
        comment.platform
      );
    }

    return response;
  }
}

/**
 * Default auto-reply rules for different platforms
 */
export const getDefaultAutoReplyRules = (platform: string): AutoReplyRule[] => {
  const baseRules: AutoReplyRule[] = [
    {
      id: `${platform}_thanks`,
      name: 'Thank You Response',
      platform,
      triggers: ['thank you', 'thanks', 'appreciate'],
      response: "You're welcome, {username}! Glad you found it helpful! 😊",
      enabled: true,
      conditions: { sentiment: 'positive' },
      cooldownMinutes: 60,
      maxRepliesPerDay: 20
    },
    {
      id: `${platform}_question`,
      name: 'Question Response',
      platform,
      triggers: ['how', 'what', 'when', 'where', 'why', '?'],
      response: "Great question, {username}! I'll get back to you with more details soon! 🤔",
      enabled: true,
      conditions: {},
      cooldownMinutes: 30,
      maxRepliesPerDay: 15
    },
    {
      id: `${platform}_compliment`,
      name: 'Compliment Response',
      platform,
      triggers: ['amazing', 'awesome', 'great', 'love this', 'fantastic'],
      response: "Thank you so much, {username}! Your support means the world! ❤️",
      enabled: true,
      conditions: { sentiment: 'positive' },
      cooldownMinutes: 120,
      maxRepliesPerDay: 10
    }
  ];

  // Platform-specific rules
  if (platform === 'instagram') {
    baseRules.push({
      id: 'instagram_story',
      name: 'Story Request',
      platform,
      triggers: ['story', 'stories', 'behind the scenes'],
      response: "Love that you're interested in behind-the-scenes content! Check out my stories for more! 📸",
      enabled: true,
      conditions: {},
      cooldownMinutes: 180,
      maxRepliesPerDay: 5
    });
  }

  if (platform === 'linkedin') {
    baseRules.push({
      id: 'linkedin_professional',
      name: 'Professional Inquiry',
      platform,
      triggers: ['connect', 'network', 'collaborate', 'partnership'],
      response: "Thanks for reaching out, {username}! I'd be happy to connect. Feel free to send me a message!",
      enabled: true,
      conditions: {},
      cooldownMinutes: 240,
      maxRepliesPerDay: 8
    });
  }

  return baseRules;
};
