import { AnalyticsDataPoint, CurrentAnalytics, PlatformAccount } from '../app/schema';
import { getConnectedAccounts } from './ayrshareIntegration';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';

/**
 * Store analytics data in a PlatformAccount
 */
export const storeAnalyticsData = async (
  platformAccount: any,
  analyticsData: any,
  dataSource: 'ayrshare' | 'manual' | 'api' = 'ayrshare'
) => {
  const now = new Date();
  
  console.log(`📊 Storing analytics data for ${platformAccount.platform}:`, analyticsData);

  try {
    // Extract engagement metrics
    const totalLikes = analyticsData.likeCount || analyticsData.totalLikes || 0;
    const totalComments = analyticsData.commentsCount || analyticsData.totalComments || 0;
    const totalShares = analyticsData.sharesCount || analyticsData.totalShares || 0;
    const totalViews = analyticsData.viewsCount || analyticsData.totalViews || 0;
    const totalEngagement = totalLikes + totalComments + totalShares;
    
    const followerCount = analyticsData.followersCount || analyticsData.followerCount || 0;
    const postsCount = analyticsData.mediaCount || analyticsData.postsCount || 0;
    
    // Calculate engagement rate
    const engagementRate = postsCount > 0 ? (totalEngagement / postsCount) / Math.max(followerCount, 1) * 100 : 0;

    // Create current analytics snapshot
    const currentAnalytics = CurrentAnalytics.create({
      // Profile data  
      followerCount: followerCount > 0 ? followerCount : undefined,
      followingCount: analyticsData.followsCount || analyticsData.followingCount || undefined,
      postsCount: postsCount > 0 ? postsCount : undefined,
      biography: analyticsData.biography || undefined,
      website: analyticsData.website || analyticsData.websiteUrl || undefined,
      profilePictureUrl: analyticsData.profilePictureUrl || analyticsData.avatar || undefined,
      isVerified: analyticsData.isVerified || undefined,
      isBusinessAccount: analyticsData.isBusinessAccount || undefined,
      
      // Engagement metrics
      totalLikes: totalLikes > 0 ? totalLikes : undefined,
      totalComments: totalComments > 0 ? totalComments : undefined,
      totalShares: totalShares > 0 ? totalShares : undefined,
      totalViews: totalViews > 0 ? totalViews : undefined,
      engagementRate: engagementRate > 0 ? parseFloat(engagementRate.toFixed(2)) : undefined,
      avgLikesPerPost: postsCount > 0 ? parseFloat((totalLikes / postsCount).toFixed(2)) : undefined,
      avgCommentsPerPost: postsCount > 0 ? parseFloat((totalComments / postsCount).toFixed(2)) : undefined,
      
      // Platform-specific data as JSON
      platformSpecific: JSON.stringify(analyticsData),
      
      // Metadata
      lastUpdated: now,
      dataSource,
      updateFrequency: 'daily',
      nextUpdateDue: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
      
      // Data quality
      isComplete: !!(followerCount && postsCount && totalEngagement),
      missingFields: getMissingFields(analyticsData),
      confidence: calculateDataConfidence(analyticsData),
    });

    // Create historical data point
    const dataPoint = AnalyticsDataPoint.create({
      timestamp: now,
      followerCount: followerCount > 0 ? followerCount : undefined,
      followingCount: analyticsData.followsCount || analyticsData.followingCount || undefined,
      postsCount: postsCount > 0 ? postsCount : undefined,
      likesCount: totalLikes > 0 ? totalLikes : undefined,
      commentsCount: totalComments > 0 ? totalComments : undefined,
      sharesCount: totalShares > 0 ? totalShares : undefined,
      viewsCount: totalViews > 0 ? totalViews : undefined,
      engagementRate: engagementRate > 0 ? parseFloat(engagementRate.toFixed(2)) : undefined,
      totalEngagement: totalEngagement > 0 ? totalEngagement : undefined,
      
      // Platform-specific metrics
      storiesCount: analyticsData.storiesCount || undefined,
      reelsCount: analyticsData.reelsCount || undefined,
      igtv: analyticsData.igtvCount || undefined,
      
      // Metadata
      dataSource,
      isValidated: true,
    });

    // Update the platform account
    platformAccount.currentAnalytics = currentAnalytics;
    
    // Add to historical data (limit to last 100 points to avoid bloat)
    if (platformAccount.historicalAnalytics) {
      platformAccount.historicalAnalytics.push(dataPoint);
      
      // Keep only last 100 data points
      if (platformAccount.historicalAnalytics.length > 100) {
        platformAccount.historicalAnalytics.splice(0, platformAccount.historicalAnalytics.length - 100);
      }
    }

    console.log(`✅ Analytics data stored successfully for ${platformAccount.platform}`);
    return { currentAnalytics, dataPoint };

  } catch (error) {
    console.error(`❌ Error storing analytics data:`, error);
    throw error;
  }
};

/**
 * Fetch and store analytics for a specific platform account
 */
export const fetchAndStoreAnalytics = async (
  platformAccount: any,
  profileKey?: string
) => {
  try {
    console.log(`🔄 Fetching analytics for ${platformAccount.platform}...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (profileKey) {
      headers['Profile-Key'] = profileKey;
    }

    // Get social analytics from Ayrshare
    const analyticsResponse = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        platforms: [platformAccount.platform]
      })
    });

    if (!analyticsResponse.ok) {
      const errorData = await analyticsResponse.json();
      console.warn(`📊 Analytics API failed for ${platformAccount.platform}:`, errorData.message);
      return null;
    }

    const analyticsData = await analyticsResponse.json();
    console.log(`📊 Received analytics data:`, analyticsData);

    // Extract platform-specific data
    const platformData = analyticsData[platformAccount.platform] || 
                        analyticsData.posts?.[platformAccount.platform] || 
                        analyticsData;

    if (!platformData || Object.keys(platformData).length === 0) {
      console.warn(`📊 No analytics data available for ${platformAccount.platform}`);
      return null;
    }

    // Store the analytics data in Jazz
    return await storeAnalyticsData(platformAccount, platformData, 'ayrshare');

  } catch (error) {
    console.error(`❌ Error fetching analytics for ${platformAccount.platform}:`, error);
    return null;
  }
};

/**
 * Get stored analytics data from a platform account
 */
export const getStoredAnalytics = (platformAccount: any) => {
  return {
    current: platformAccount.currentAnalytics,
    historical: platformAccount.historicalAnalytics || [],
    lastUpdated: platformAccount.currentAnalytics?.lastUpdated,
    isStale: platformAccount.currentAnalytics ? 
      new Date().getTime() - new Date(platformAccount.currentAnalytics.lastUpdated).getTime() > 24 * 60 * 60 * 1000 :
      true
  };
};

/**
 * Update analytics for all linked accounts in an account group
 */
export const updateAccountGroupAnalytics = async (
  accountGroup: any,
  forceUpdate: boolean = false
) => {
  console.log(`🔄 Updating analytics for account group: ${accountGroup.name}`);
  
  const results = [];
  const linkedAccounts = accountGroup.accounts?.filter((account: any) => account.isLinked) || [];
  
  for (const account of linkedAccounts) {
    const stored = getStoredAnalytics(account);
    
    // Skip if data is fresh and not forcing update
    if (!forceUpdate && !stored.isStale) {
      console.log(`⏭️ Skipping ${account.platform} - data is fresh`);
      continue;
    }

    const result = await fetchAndStoreAnalytics(account, accountGroup.ayrshareProfileKey);
    results.push({
      platform: account.platform,
      success: !!result,
      data: result
    });
  }

  console.log(`✅ Analytics update completed for ${results.length} accounts`);
  return results;
};

/**
 * Utility functions
 */
function getMissingFields(data: any): string[] {
  const required = ['followerCount', 'postsCount', 'engagementData'];
  const missing = [];
  
  if (!data.followersCount && !data.followerCount) missing.push('followerCount');
  if (!data.mediaCount && !data.postsCount) missing.push('postsCount');
  if (!data.likeCount && !data.totalLikes) missing.push('engagementData');
  
  return missing;
}

function calculateDataConfidence(data: any): number {
  let confidence = 1.0;
  
  // Reduce confidence for missing key fields
  if (!data.followersCount && !data.followerCount) confidence -= 0.2;
  if (!data.mediaCount && !data.postsCount) confidence -= 0.2;
  if (!data.likeCount && !data.totalLikes) confidence -= 0.3;
  if (!data.username) confidence -= 0.1;
  if (!data.biography) confidence -= 0.1;
  
  return Math.max(0, confidence);
}

/**
 * Get analytics trends from historical data
 */
export const getAnalyticsTrends = (historicalData: any[]) => {
  if (!historicalData || historicalData.length < 2) {
    return {
      followerGrowth: 0,
      engagementTrend: 'stable',
      postsGrowth: 0,
      timeframe: '7d'
    };
  }

  const recent = historicalData.slice(-7); // Last 7 data points
  const first = recent[0];
  const last = recent[recent.length - 1];

  const followerGrowth = first.followerCount && last.followerCount ? 
    ((last.followerCount - first.followerCount) / first.followerCount * 100) : 0;

  const postsGrowth = first.postsCount && last.postsCount ? 
    (last.postsCount - first.postsCount) : 0;

  // Calculate engagement trend
  const avgEngagementFirst = recent.slice(0, 3).reduce((sum, point) => 
    sum + (point.totalEngagement || 0), 0) / 3;
  const avgEngagementLast = recent.slice(-3).reduce((sum, point) => 
    sum + (point.totalEngagement || 0), 0) / 3;

  let engagementTrend = 'stable';
  if (avgEngagementLast > avgEngagementFirst * 1.05) engagementTrend = 'up';
  else if (avgEngagementLast < avgEngagementFirst * 0.95) engagementTrend = 'down';

  return {
    followerGrowth: parseFloat(followerGrowth.toFixed(2)),
    engagementTrend,
    postsGrowth,
    timeframe: '7d'
  };
}; 