import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { isBusinessPlanMode } from './ayrshareIntegration';

// =============================================================================
// 📊 ANALYTICS API INTEGRATION
// =============================================================================

/**
 * Interface for post analytics response
 */
export interface PostAnalytics {
  id: string;
  platform: string;
  likes?: number;
  comments?: number;
  shares?: number;
  views?: number;
  impressions?: number;
  engagement?: number;
  reach?: number;
  clicks?: number;
  date?: string;
  postUrl?: string;
}

/**
 * Interface for social account analytics
 */
export interface SocialAccountAnalytics {
  platform: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  engagementRate?: number;
  impressions?: number;
  reach?: number;
  profileViews?: number;
  websiteClicks?: number;
}

/**
 * Get analytics for a specific post using Ayrshare Post ID
 * @param postId - Ayrshare Post ID
 * @param profileKey - Profile key (Business Plan only)
 * @returns Post analytics data
 */
export const getPostAnalytics = async (postId: string, profileKey?: string): Promise<PostAnalytics[]> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  // Only add Profile-Key header in Business Plan mode
  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/post`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: postId })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get post analytics');
  }

  return result;
};

/**
 * Get analytics for a specific post using Social Media Post ID
 * @param socialPostId - Social media platform's post ID
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Post analytics data
 */
export const getPostAnalyticsBySocialId = async (
  socialPostId: string, 
  platform: string, 
  profileKey?: string
): Promise<PostAnalytics[]> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      id: socialPostId,
      platform: platform 
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get post analytics by social ID');
  }

  return result;
};

/**
 * Get social account level analytics
 * @param platforms - Array of platforms to get analytics for
 * @param profileKey - Profile key (Business Plan only)
 * @returns Social account analytics data
 */
export const getSocialAccountAnalytics = async (
  platforms: string[], 
  profileKey?: string
): Promise<Record<string, SocialAccountAnalytics>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ platforms })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get social account analytics');
  }

  return result;
};

// =============================================================================
// 📜 POST HISTORY API INTEGRATION
// =============================================================================

/**
 * Interface for historical post data
 */
export interface HistoricalPost {
  id: string;
  platform: string;
  post: string;
  postUrl?: string;
  publishedAt: string;
  status: string;
  likes?: number;
  comments?: number;
  shares?: number;
  mediaUrls?: string[];
  hashtags?: string[];
}

/**
 * Get historical posts for analytics
 * @param options - Query options (platform, records, days)
 * @param profileKey - Profile key (Business Plan only)
 * @returns Array of historical posts
 */
export const getPostHistory = async (
  options: {
    platform?: string;
    lastRecords?: number;
    lastDays?: number;
  } = {},
  profileKey?: string
): Promise<HistoricalPost[]> => {
  // Check for Business Plan requirements
  if (isBusinessPlanMode() && !profileKey) {
    throw new Error('Profile key is required for Business Plan analytics. Please ensure your account group has been migrated and has an Ayrshare user profile.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (options.platform) queryParams.append('platform', options.platform);
  if (options.lastRecords) queryParams.append('lastRecords', options.lastRecords.toString());
  if (options.lastDays) queryParams.append('lastDays', options.lastDays.toString());

  const url = `${AYRSHARE_API_URL}/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    // Log the exact error for debugging
    console.error('Ayrshare API Error:', {
      status: response.status,
      statusText: response.statusText,
      message: result.message,
      platform: options.platform,
      url: url
    });

    // Provide more specific error messages
    if (response.status === 400) {
      const errorMessage = result.message?.toLowerCase() || '';
      
      // Check for various "no accounts linked" patterns
      if (errorMessage.includes('no social media accounts') || 
          errorMessage.includes('account not found') ||
          errorMessage.includes('no accounts linked') ||
          errorMessage.includes('no connected accounts') ||
          errorMessage.includes('platform not connected') ||
          errorMessage.includes('no posts found')) {
        throw new Error(`No ${options.platform || 'social media'} accounts are linked to this Ayrshare profile. Please link your accounts in the Settings tab first.`);
      }
      
      // Check for profile-related errors
      if (errorMessage.includes('profile') || errorMessage.includes('invalid profile')) {
        throw new Error('Invalid or missing Ayrshare profile. Please ensure your account group has been properly migrated with an Ayrshare user profile.');
      }
      
      // Check for permission/access errors
      if (errorMessage.includes('access') || errorMessage.includes('permission')) {
        throw new Error(`Access denied for ${options.platform || 'this platform'}. Please check your account permissions and try linking again.`);
      }
    }
    if (response.status === 401) {
      throw new Error('Invalid Ayrshare API key. Please check your environment variables.');
    }
    if (response.status === 403) {
      throw new Error('Access denied. This feature may require a higher Ayrshare plan or additional permissions.');
    }
    
    throw new Error(result.message || `Failed to get post history (${response.status})`);
  }

  return result.posts || [];
};

// =============================================================================
// 👤 PROFILE API INTEGRATION
// =============================================================================

/**
 * Interface for profile information
 */
export interface ProfileInfo {
  platform: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  url?: string;
  verified?: boolean;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

/**
 * Get profile information for connected social accounts
 * @param platforms - Array of platforms to get profile info for
 * @param profileKey - Profile key (Business Plan only)
 * @returns Profile information for each platform
 */
export const getProfileInfo = async (
  platforms: string[], 
  profileKey?: string
): Promise<Record<string, ProfileInfo>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/profiles`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get profile information');
  }

  return result;
};

// =============================================================================
// 💬 COMMENTS API INTEGRATION (ENHANCED)
// =============================================================================

/**
 * Interface for comment data
 */
export interface CommentData {
  id?: string;
  platform: string;
  comment: string;
  author?: string;
  authorUsername?: string;
  authorAvatar?: string;
  createdAt?: string;
  likes?: number;
  replies?: CommentData[];
}

/**
 * Get comments for a specific post
 * @param postId - Ayrshare Post ID or Social Media Post ID
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Array of comments
 */
export const getPostComments = async (
  postId: string, 
  platform?: string, 
  profileKey?: string
): Promise<CommentData[]> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const body: any = { id: postId };
  if (platform) body.platform = platform;

  const response = await fetch(`${AYRSHARE_API_URL}/comments`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get post comments');
  }

  return result.comments || [];
};

/**
 * Reply to a comment
 * @param postId - Original post ID
 * @param commentId - Comment ID to reply to
 * @param reply - Reply text
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Reply result
 */
export const replyToComment = async (
  postId: string,
  commentId: string, 
  reply: string,
  platform: string,
  profileKey?: string
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/comments/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: postId,
      commentId: commentId,
      comment: reply,
      platform: platform
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to reply to comment');
  }

  return result;
};

// =============================================================================
// 📡 RSS FEEDS API INTEGRATION
// =============================================================================

/**
 * Interface for RSS feed data
 */
export interface RSSFeed {
  id?: string;
  url: string;
  title?: string;
  platforms: string[];
  autoPost?: boolean;
  postTemplate?: string;
  createdAt?: string;
  lastChecked?: string;
  postsCount?: number;
}

/**
 * Get all RSS feeds
 * @param profileKey - Profile key (Business Plan only)
 * @returns Array of RSS feeds
 */
export const getRSSFeeds = async (profileKey?: string): Promise<RSSFeed[]> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/feed`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get RSS feeds');
  }

  return result.feeds || [];
};

/**
 * Add a new RSS feed
 * @param feedData - RSS feed configuration
 * @param profileKey - Profile key (Business Plan only)
 * @returns Created feed information
 */
export const addRSSFeed = async (feedData: Omit<RSSFeed, 'id' | 'createdAt' | 'lastChecked' | 'postsCount'>, profileKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/feed`, {
    method: 'POST',
    headers,
    body: JSON.stringify(feedData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to add RSS feed');
  }

  return result;
};

/**
 * Delete an RSS feed
 * @param feedId - RSS feed ID
 * @param profileKey - Profile key (Business Plan only)
 * @returns Deletion result
 */
export const deleteRSSFeed = async (feedId: string, profileKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/feed`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id: feedId })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to delete RSS feed');
  }

  return result;
};

// =============================================================================
// 🏷️ BRAND API INTEGRATION  
// =============================================================================

/**
 * Interface for brand data
 */
export interface BrandData {
  id?: string;
  name: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fonts?: string[];
  templates?: string[];
  hashtags?: string[];
  mentions?: string[];
}

/**
 * Get brand information
 * @param profileKey - Profile key (Business Plan only)
 * @returns Brand data
 */
export const getBrandInfo = async (profileKey?: string): Promise<BrandData> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/brand`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get brand information');
  }

  return result;
};

/**
 * Update brand information
 * @param brandData - Brand data to update
 * @param profileKey - Profile key (Business Plan only)
 * @returns Updated brand data
 */
export const updateBrandInfo = async (brandData: Partial<BrandData>, profileKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/brand`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(brandData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to update brand information');
  }

  return result;
};

// =============================================================================
// 🕒 AUTO SCHEDULE API INTEGRATION
// =============================================================================

/**
 * Interface for auto schedule settings
 */
export interface AutoScheduleSettings {
  platform: string;
  enabled: boolean;
  schedule: {
    timezone?: string;
    days?: string[]; // ['monday', 'tuesday', etc.]
    times?: string[]; // ['09:00', '13:00', etc.]
  };
  contentTypes?: string[];
  postFrequency?: 'daily' | 'weekly' | 'custom';
}

/**
 * Get auto schedule settings
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Auto schedule settings
 */
export const getAutoScheduleSettings = async (platform: string, profileKey?: string): Promise<AutoScheduleSettings> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/auto-schedule?platform=${platform}`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get auto schedule settings');
  }

  return result;
};

/**
 * Update auto schedule settings
 * @param settings - Auto schedule settings
 * @param profileKey - Profile key (Business Plan only)
 * @returns Updated settings
 */
export const updateAutoScheduleSettings = async (settings: AutoScheduleSettings, profileKey?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (isBusinessPlanMode() && profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/auto-schedule`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(settings)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to update auto schedule settings');
  }

  return result;
};

// =============================================================================
// 📧 DIRECT MESSAGES API INTEGRATION (BUSINESS PLAN)
// =============================================================================

/**
 * Interface for direct message data
 */
export interface DirectMessage {
  id?: string;
  platform: string;
  recipient: string;
  message: string;
  mediaUrls?: string[];
  sentAt?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

/**
 * Send a direct message
 * @param messageData - Direct message data
 * @param profileKey - Profile key (Business Plan only)
 * @returns Message send result
 */
export const sendDirectMessage = async (messageData: DirectMessage, profileKey?: string) => {
  if (!isBusinessPlanMode()) {
    throw new Error('Direct messages require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify(messageData)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to send direct message');
  }

  return result;
};

/**
 * Get direct message history
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Array of direct messages
 */
export const getDirectMessageHistory = async (platform: string, profileKey?: string): Promise<DirectMessage[]> => {
  if (!isBusinessPlanMode()) {
    throw new Error('Direct message history requires Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/message/history?platform=${platform}`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get direct message history');
  }

  return result.messages || [];
};

// =============================================================================
// 📈 ADVANCED ANALYTICS & INSIGHTS (BUSINESS PLAN)
// =============================================================================

/**
 * Interface for engagement insights
 */
export interface EngagementInsights {
  platform: string;
  timeframe: string;
  totalEngagement: number;
  engagementRate: number;
  bestPerformingPosts: HistoricalPost[];
  optimalPostTimes: string[];
  audienceInsights: {
    demographics?: Record<string, any>;
    interests?: string[];
    activeHours?: Record<string, number>;
  };
}

/**
 * Get engagement insights for a platform
 * @param platform - Platform name
 * @param timeframe - Time period ('7d', '30d', '90d')
 * @param profileKey - Profile key (Business Plan only)
 * @returns Engagement insights
 */
export const getEngagementInsights = async (
  platform: string, 
  timeframe: string = '30d', 
  profileKey?: string
): Promise<EngagementInsights> => {
  if (!isBusinessPlanMode()) {
    throw new Error('Engagement insights require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/insights`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      platform, 
      timeframe,
      includeAudience: true,
      includeOptimalTimes: true
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get engagement insights');
  }

  return result;
};

/**
 * Interface for competitor analysis
 */
export interface CompetitorAnalysis {
  competitor: string;
  platform: string;
  metrics: {
    followers?: number;
    engagement?: number;
    postFrequency?: number;
    averageLikes?: number;
    averageComments?: number;
  };
  topContent: {
    posts: any[];
    hashtags: string[];
    contentTypes: string[];
  };
}

/**
 * Get competitor analysis
 * @param competitors - Array of competitor usernames
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Competitor analysis data
 */
export const getCompetitorAnalysis = async (
  competitors: string[], 
  platform: string, 
  profileKey?: string
): Promise<CompetitorAnalysis[]> => {
  if (!isBusinessPlanMode()) {
    throw new Error('Competitor analysis requires Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/competitors`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      competitors, 
      platform,
      includeContent: true
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get competitor analysis');
  }

  return result.analysis || [];
};

// =============================================================================
// 🎯 HASHTAG & CONTENT OPTIMIZATION (BUSINESS PLAN)
// =============================================================================

/**
 * Interface for hashtag suggestions
 */
export interface HashtagSuggestions {
  trending: string[];
  relevant: string[];
  competitive: string[];
  performance: Record<string, {
    usage: number;
    engagement: number;
    reach: number;
  }>;
}

/**
 * Get hashtag suggestions for content
 * @param content - Post content
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Hashtag suggestions
 */
export const getHashtagSuggestions = async (
  content: string, 
  platform: string, 
  profileKey?: string
): Promise<HashtagSuggestions> => {
  if (!isBusinessPlanMode()) {
    throw new Error('Hashtag suggestions require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/hashtags/suggest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      content, 
      platform,
      includePerformance: true
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get hashtag suggestions');
  }

  return result;
};

/**
 * Get optimal posting times for a platform
 * @param platform - Platform name
 * @param profileKey - Profile key (Business Plan only)
 * @returns Optimal posting times
 */
export const getOptimalPostTimes = async (platform: string, profileKey?: string) => {
  if (!isBusinessPlanMode()) {
    throw new Error('Optimal posting times require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/analytics/optimal-times`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ platform })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get optimal posting times');
  }

  return result;
};

// =============================================================================
// 🔔 WEBHOOK MANAGEMENT (BUSINESS PLAN)
// =============================================================================

/**
 * Interface for webhook configuration
 */
export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  active?: boolean;
}

/**
 * Set up webhook for real-time notifications
 * @param config - Webhook configuration
 * @param profileKey - Profile key (Business Plan only)
 * @returns Webhook setup result
 */
export const setupWebhook = async (config: WebhookConfig, profileKey?: string) => {
  if (!isBusinessPlanMode()) {
    throw new Error('Webhooks require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/webhook`, {
    method: 'POST',
    headers,
    body: JSON.stringify(config)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to setup webhook');
  }

  return result;
};

/**
 * Get webhook configuration
 * @param profileKey - Profile key (Business Plan only)
 * @returns Current webhook configuration
 */
export const getWebhookConfig = async (profileKey?: string) => {
  if (!isBusinessPlanMode()) {
    throw new Error('Webhooks require Business Plan');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`
  };

  if (profileKey) {
    headers['Profile-Key'] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/webhook`, {
    method: 'GET',
    headers
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.message || 'Failed to get webhook configuration');
  }

  return result;
};

// =============================================================================
// 🔄 HELPER FUNCTIONS
// =============================================================================

/**
 * Get comprehensive account overview for a platform
 * @param platform - Platform name (e.g., 'instagram')
 * @param profileKey - Profile key (Business Plan only)
 * @returns Comprehensive account data including analytics, profile, and recent posts
 */
export const getAccountOverview = async (platform: string, profileKey?: string) => {
  try {
    const [profileInfo, analytics, history] = await Promise.all([
      getProfileInfo([platform], profileKey).catch(() => ({} as Record<string, ProfileInfo>)),
      getSocialAccountAnalytics([platform], profileKey).catch(() => ({} as Record<string, SocialAccountAnalytics>)),
      getPostHistory({ platform, lastRecords: 10 }, profileKey).catch(() => [] as HistoricalPost[])
    ]);

    return {
      platform,
      profile: profileInfo[platform] || {},
      analytics: analytics[platform] || {},
      recentPosts: history,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get account overview for ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Validate if a feature is available on the current plan
 * @param feature - Feature name
 * @returns Boolean indicating availability
 */
export const isFeatureAvailable = (feature: string): boolean => {
  // Features available in FREE tier (Basic Plan)
  const freeFeatures = [
    'basic-posting',        // 20 posts/month
    'post-history',         // GET /history
    'profile-info',         // GET /profiles  
    'basic-comments',       // GET /comments (view only)
    'delete-posts',         // DELETE /post
    'single-images'         // Single image uploads
  ];
  
  // Features requiring PREMIUM ($149/month)
  const premiumFeatures = [
    'analytics',            // POST /analytics/* endpoints
    'scheduled-posting',    // scheduleDate parameter
    'multiple-media',       // Multiple images/videos
    'rss-feeds',           // POST /feed endpoints
    'auto-hashtags',       // Automatic hashtag generation
    'mentions-tagging'     // @ mentions and tagging
  ];
  
  // Features requiring BUSINESS ($499+/month)
  const businessFeatures = [
    'brand-management',     // /brand endpoints
    'auto-schedule',        // /auto-schedule endpoints  
    'advanced-comments',    // POST /comments/reply
    'webhooks',            // Webhook subscriptions
    'multi-user-management', // Profile keys
    'messaging'            // Direct messages API
  ];
  
  // For Business Plan mode, all features available
  if (isBusinessPlanMode()) {
    return true;
  }
  
  // For free accounts, only free features available
  return freeFeatures.includes(feature);
}; 