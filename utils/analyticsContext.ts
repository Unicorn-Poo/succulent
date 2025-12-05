/**
 * Analytics Context for AI Autopilot
 * 
 * Provides structured analytics data that the AI can understand and use
 * to make informed decisions about content strategy and posting.
 */

import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';

// =============================================================================
// TYPES
// =============================================================================

export interface PlatformPerformance {
  platform: string;
  followers: number;
  following: number;
  postsCount: number;
  avgLikesPerPost: number;
  avgCommentsPerPost: number;
  engagementRate: number;
  growthRate: number; // % follower growth
  bestPostingTimes: string[];
  topHashtags: string[];
  contentTypes: {
    type: string;
    avgEngagement: number;
    count: number;
  }[];
}

export interface TopPost {
  id: string;
  content: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  totalEngagement: number;
  publishedAt: string;
  mediaType?: 'image' | 'video' | 'carousel' | 'text';
  hashtags?: string[];
}

export interface AnalyticsContext {
  profileKey: string;
  fetchedAt: string;
  summary: {
    totalFollowers: number;
    totalEngagement: number;
    avgEngagementRate: number;
    platformsAnalyzed: number;
    topPerformingPlatform: string;
    lowestPerformingPlatform: string;
  };
  platforms: Record<string, PlatformPerformance>;
  topPosts: TopPost[];
  insights: {
    bestDayToPost: string;
    bestTimeToPost: string;
    mostEngagingContentType: string;
    audienceActiveHours: Record<string, number>; // hour -> engagement score
    recommendedHashtags: string[];
    contentGaps: string[];
  };
  trends: {
    followerGrowth: 'increasing' | 'stable' | 'decreasing';
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
    postingFrequency: 'high' | 'moderate' | 'low';
  };
}

// =============================================================================
// FETCH ANALYTICS CONTEXT
// =============================================================================

/**
 * Fetches comprehensive analytics context for AI consumption
 * This data is structured to help AI understand performance patterns
 */
export async function getAnalyticsContextForAI(profileKey: string): Promise<AnalyticsContext | null> {
  if (!profileKey || !AYRSHARE_API_KEY) {
    return null;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
    'Profile-Key': profileKey
  };

  try {
    // Step 1: Get user info for connected platforms
    const userResponse = await fetch(`${AYRSHARE_API_URL}/user`, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    const userData = await userResponse.json();
    if (!userResponse.ok) {
      throw new Error(userData.message || 'Failed to fetch user data');
    }

    const connectedPlatforms = userData.activeSocialAccounts || [];
    const displayNames = userData.displayNames || {};
    
    if (connectedPlatforms.length === 0) {
      return null;
    }

    // Step 2: Fetch analytics for all platforms
    const analyticsResponse = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ platforms: connectedPlatforms }),
      cache: 'no-store'
    });

    const analyticsData = await analyticsResponse.json();

    // Step 3: Fetch post history
    let postHistory: any[] = [];
    try {
      const historyResponse = await fetch(`${AYRSHARE_API_URL}/history`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        postHistory = Array.isArray(historyData) ? historyData : [];
      }
    } catch {
      // History is optional
    }

    // Step 4: Build structured context
    const platformPerformance: Record<string, PlatformPerformance> = {};
    let totalFollowers = 0;
    let totalEngagement = 0;
    let bestPlatform = { name: '', engagement: 0 };
    let worstPlatform = { name: '', engagement: Infinity };

    for (const platform of connectedPlatforms) {
      const platformInfo = displayNames[platform] || {};
      const platformAnalytics = analyticsData[platform] || {};
      const posts = platformAnalytics.posts || [];

      // Calculate metrics
      const followers = platformInfo.followersCount || platformInfo.followers_count || 0;
      const following = platformInfo.followingCount || platformInfo.following_count || 0;
      const postsCount = platformInfo.postsCount || platformInfo.media_count || posts.length;

      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;

      posts.forEach((post: any) => {
        totalLikes += post.likes || post.likeCount || 0;
        totalComments += post.comments || post.commentsCount || 0;
        totalShares += post.shares || post.shareCount || 0;
      });

      const platformEngagement = totalLikes + totalComments + totalShares;
      const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
      const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
      const engagementRate = followers > 0 && posts.length > 0
        ? ((platformEngagement / posts.length) / followers) * 100
        : 0;

      // Track best/worst platforms
      if (platformEngagement > bestPlatform.engagement) {
        bestPlatform = { name: platform, engagement: platformEngagement };
      }
      if (platformEngagement < worstPlatform.engagement) {
        worstPlatform = { name: platform, engagement: platformEngagement };
      }

      // Analyze posting patterns
      const hourlyEngagement: Record<number, { total: number; count: number }> = {};
      posts.forEach((post: any) => {
        if (post.publishedAt || post.created) {
          const hour = new Date(post.publishedAt || post.created).getHours();
          const eng = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
          if (!hourlyEngagement[hour]) {
            hourlyEngagement[hour] = { total: 0, count: 0 };
          }
          hourlyEngagement[hour].total += eng;
          hourlyEngagement[hour].count += 1;
        }
      });

      // Find best posting times
      const bestTimes = Object.entries(hourlyEngagement)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          avgEngagement: data.count > 0 ? data.total / data.count : 0
        }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3)
        .map(item => {
          const h = item.hour;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
          return `${display}:00 ${ampm}`;
        });

      // Extract hashtags from posts
      const hashtagCounts: Record<string, number> = {};
      posts.forEach((post: any) => {
        const content = post.post || post.caption || '';
        const hashtags = content.match(/#[\w]+/g) || [];
        hashtags.forEach((tag: string) => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      });
      const topHashtags = Object.entries(hashtagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      platformPerformance[platform] = {
        platform,
        followers,
        following,
        postsCount,
        avgLikesPerPost: Math.round(avgLikes),
        avgCommentsPerPost: Math.round(avgComments),
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        growthRate: 0, // Would need historical data
        bestPostingTimes: bestTimes.length > 0 ? bestTimes : ['9:00 AM', '12:00 PM', '6:00 PM'],
        topHashtags,
        contentTypes: []
      };

      totalFollowers += followers;
      totalEngagement += platformEngagement;
    }

    // Step 5: Find top performing posts across all platforms
    const allPosts: TopPost[] = [];
    for (const platform of connectedPlatforms) {
      const platformAnalytics = analyticsData[platform] || {};
      const posts = platformAnalytics.posts || [];
      
      posts.forEach((post: any) => {
        const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
        allPosts.push({
          id: post.id || post.postId,
          content: post.post || post.caption || '',
          platform,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.shares || 0,
          totalEngagement: engagement,
          publishedAt: post.publishedAt || post.created || '',
          mediaType: post.mediaUrls?.length > 1 ? 'carousel' : post.mediaUrls?.length === 1 ? 'image' : 'text'
        });
      });
    }

    // Sort and get top posts
    const topPosts = allPosts
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 10);

    // Step 6: Generate insights
    const avgEngagementRate = connectedPlatforms.length > 0
      ? Object.values(platformPerformance).reduce((sum, p) => sum + p.engagementRate, 0) / connectedPlatforms.length
      : 0;

    // Aggregate audience active hours
    const audienceActiveHours: Record<string, number> = {};
    Object.values(platformPerformance).forEach(p => {
      p.bestPostingTimes.forEach(time => {
        const match = time.match(/(\d+):00 (AM|PM)/);
        if (match) {
          let hour = parseInt(match[1]);
          if (match[2] === 'PM' && hour !== 12) hour += 12;
          if (match[2] === 'AM' && hour === 12) hour = 0;
          audienceActiveHours[hour.toString()] = (audienceActiveHours[hour.toString()] || 0) + 1;
        }
      });
    });

    // Aggregate all hashtags
    const allHashtags = Object.values(platformPerformance)
      .flatMap(p => p.topHashtags)
      .reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const recommendedHashtags = Object.entries(allHashtags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);

    // Determine trends
    const postsPerWeek = postHistory.length / 4; // Assume 4 weeks of history
    const postingFrequency: 'high' | 'moderate' | 'low' = 
      postsPerWeek > 7 ? 'high' : postsPerWeek > 3 ? 'moderate' : 'low';

    const context: AnalyticsContext = {
      profileKey,
      fetchedAt: new Date().toISOString(),
      summary: {
        totalFollowers,
        totalEngagement,
        avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
        platformsAnalyzed: connectedPlatforms.length,
        topPerformingPlatform: bestPlatform.name || connectedPlatforms[0],
        lowestPerformingPlatform: worstPlatform.name !== Infinity.toString() ? worstPlatform.name : connectedPlatforms[connectedPlatforms.length - 1]
      },
      platforms: platformPerformance,
      topPosts,
      insights: {
        bestDayToPost: 'Wednesday', // Would need more analysis
        bestTimeToPost: Object.entries(audienceActiveHours)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '12',
        mostEngagingContentType: 'image', // Would need more analysis
        audienceActiveHours,
        recommendedHashtags,
        contentGaps: [] // Could analyze missing content types
      },
      trends: {
        followerGrowth: 'stable', // Would need historical comparison
        engagementTrend: 'stable', // Would need historical comparison
        postingFrequency
      }
    };

    return context;

  } catch (error) {
    return null;
  }
}

/**
 * Generates a natural language summary of analytics for AI prompts
 */
export function generateAnalyticsSummaryForAI(context: AnalyticsContext): string {
  const { summary, platforms, topPosts, insights, trends } = context;

  let summaryText = `ANALYTICS SUMMARY (as of ${new Date(context.fetchedAt).toLocaleString()}):\n\n`;

  // Overall performance
  summaryText += `OVERALL PERFORMANCE:\n`;
  summaryText += `- Total followers across platforms: ${summary.totalFollowers.toLocaleString()}\n`;
  summaryText += `- Total engagement: ${summary.totalEngagement.toLocaleString()}\n`;
  summaryText += `- Average engagement rate: ${summary.avgEngagementRate}%\n`;
  summaryText += `- Best performing platform: ${summary.topPerformingPlatform}\n`;
  summaryText += `- Needs improvement: ${summary.lowestPerformingPlatform}\n\n`;

  // Platform breakdown
  summaryText += `PLATFORM BREAKDOWN:\n`;
  for (const [platform, data] of Object.entries(platforms)) {
    summaryText += `\n${platform.toUpperCase()}:\n`;
    summaryText += `  - Followers: ${data.followers.toLocaleString()}\n`;
    summaryText += `  - Avg likes per post: ${data.avgLikesPerPost}\n`;
    summaryText += `  - Avg comments per post: ${data.avgCommentsPerPost}\n`;
    summaryText += `  - Engagement rate: ${data.engagementRate}%\n`;
    summaryText += `  - Best posting times: ${data.bestPostingTimes.join(', ')}\n`;
    if (data.topHashtags.length > 0) {
      summaryText += `  - Top hashtags: ${data.topHashtags.slice(0, 5).join(', ')}\n`;
    }
  }

  // Top posts
  if (topPosts.length > 0) {
    summaryText += `\nTOP PERFORMING CONTENT:\n`;
    topPosts.slice(0, 3).forEach((post, i) => {
      summaryText += `${i + 1}. [${post.platform}] ${post.content.substring(0, 100)}... `;
      summaryText += `(${post.likes} likes, ${post.comments} comments)\n`;
    });
  }

  // Insights
  summaryText += `\nKEY INSIGHTS:\n`;
  summaryText += `- Best time to post: ${insights.bestTimeToPost}:00\n`;
  summaryText += `- Best day to post: ${insights.bestDayToPost}\n`;
  summaryText += `- Posting frequency: ${trends.postingFrequency}\n`;
  summaryText += `- Follower trend: ${trends.followerGrowth}\n`;
  summaryText += `- Engagement trend: ${trends.engagementTrend}\n`;

  if (insights.recommendedHashtags.length > 0) {
    summaryText += `- Recommended hashtags: ${insights.recommendedHashtags.slice(0, 10).join(', ')}\n`;
  }

  return summaryText;
}

/**
 * Gets specific insights for content generation
 */
export function getContentInsightsForAI(context: AnalyticsContext): {
  whatWorksWell: string[];
  areasToImprove: string[];
  recommendations: string[];
} {
  const insights = {
    whatWorksWell: [] as string[],
    areasToImprove: [] as string[],
    recommendations: [] as string[]
  };

  // Analyze what works
  if (context.summary.avgEngagementRate > 3) {
    insights.whatWorksWell.push('High engagement rate indicates content resonates with audience');
  }
  
  if (context.topPosts.length > 0) {
    const topPost = context.topPosts[0];
    if (topPost.mediaType === 'carousel') {
      insights.whatWorksWell.push('Carousel posts perform exceptionally well');
    } else if (topPost.mediaType === 'image') {
      insights.whatWorksWell.push('Visual content drives strong engagement');
    }
  }

  // Areas to improve
  if (context.trends.postingFrequency === 'low') {
    insights.areasToImprove.push('Posting frequency is low - consider posting more often');
  }

  Object.entries(context.platforms).forEach(([platform, data]) => {
    if (data.engagementRate < 1) {
      insights.areasToImprove.push(`${platform} has low engagement - experiment with different content`);
    }
  });

  // Recommendations
  insights.recommendations.push(`Post at optimal times: ${Object.values(context.platforms)[0]?.bestPostingTimes.slice(0, 2).join(' or ')}`);
  
  if (context.insights.recommendedHashtags.length > 0) {
    insights.recommendations.push(`Use proven hashtags: ${context.insights.recommendedHashtags.slice(0, 5).join(', ')}`);
  }

  insights.recommendations.push(`Focus on ${context.summary.topPerformingPlatform} where you have the best engagement`);

  return insights;
}

