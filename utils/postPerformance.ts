import { getPostAnalytics, getPostAnalyticsBySocialId, PostAnalytics } from './ayrshareAnalytics';
import { PostPerformance } from '@/app/schema';
import { AYRSHARE_API_KEY, AYRSHARE_API_URL } from './postConstants';

// =============================================================================
// 📊 POST PERFORMANCE DATA MANAGEMENT
// =============================================================================

/**
 * Fetch post performance data from Ayrshare and store it in Jazz
 * @param postVariant - Jazz PostVariant object
 * @param profileKey - Ayrshare profile key
 * @returns Updated performance data
 */
export const fetchAndStorePostPerformance = async (
  postVariant: any,
  profileKey?: string
): Promise<boolean> => {
  try {
    // Skip if post is not published
    if (postVariant.status !== 'published') {
      return false;
    }

    // Try to get analytics using Ayrshare post ID first
    let analyticsData: PostAnalytics[] = [];
    
    if (postVariant.ayrsharePostId) {
      try {
        analyticsData = await getPostAnalytics(postVariant.ayrsharePostId, profileKey);
      } catch (error) {
        console.error('Failed to fetch analytics by Ayrshare ID:', error);
      }
    }
    
    // If no data and we have social post ID, try that
    if (analyticsData.length === 0 && postVariant.performance?.socialPostId) {
      try {
        // Determine platform from post variant - look for platform in the context
        const platform = postVariant.platform || 'instagram'; // Default fallback
        analyticsData = await getPostAnalyticsBySocialId(
          postVariant.performance.socialPostId,
          platform,
          profileKey
        );
      } catch (error) {
        console.error('Failed to fetch analytics by social ID:', error);
      }
    }

    // If we got data, process and store it
    if (analyticsData.length > 0) {
      const latestData = analyticsData[0]; // Ayrshare returns array, take first
      
      // Calculate total engagement
      const totalEngagement = (latestData.likes || 0) + 
                            (latestData.comments || 0) + 
                            (latestData.shares || 0);
      
      // Calculate engagement rate (basic formula)
      const engagementRate = latestData.reach ? 
        (totalEngagement / latestData.reach) * 100 : undefined;

      // Create or update performance data
      const performanceData = {
        ayrsharePostId: latestData.id,
        socialPostId: postVariant.performance?.socialPostId || latestData.id,
        
        // Engagement metrics
        likes: latestData.likes,
        comments: latestData.comments,
        shares: latestData.shares,
        views: latestData.views,
        impressions: latestData.impressions,
        reach: latestData.reach,
        clicks: latestData.clicks,
        
        // Calculated metrics
        engagementRate,
        totalEngagement,
        
        // Platform-specific data
        platformSpecific: JSON.stringify(latestData),
        
        // Metadata
        lastUpdated: new Date(),
        dataSource: 'ayrshare' as const,
        fetchedAt: new Date(),
        
        // Data quality
        isComplete: !!(latestData.likes || latestData.views || latestData.impressions),
        hasError: false,
        errorMessage: undefined,
      };

      // Store in Jazz (create new PostPerformance or update existing)
      if (!postVariant.performance) {
        postVariant.performance = PostPerformance.create(performanceData);
      } else {
        // Update existing performance data
        Object.assign(postVariant.performance, performanceData);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error fetching post performance:', error);
    
    // Store error state
    const errorData = {
      lastUpdated: new Date(),
      dataSource: 'ayrshare' as const,
      fetchedAt: new Date(),
      isComplete: false,
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };

    if (!postVariant.performance) {
      postVariant.performance = PostPerformance.create(errorData);
    } else {
      Object.assign(postVariant.performance, errorData);
    }

    return false;
  }
};

/**
 * Fetch performance data for all published posts in an account group
 * @param accountGroup - Jazz AccountGroup object
 * @returns Number of posts updated
 */
export const updateAccountGroupPostPerformance = async (
  accountGroup: any
): Promise<number> => {
  if (!accountGroup?.posts || !accountGroup.ayrshareProfileKey) {
    return 0;
  }

  let updatedCount = 0;
  const profileKey = accountGroup.ayrshareProfileKey;

  // Iterate through all posts
  for (const post of accountGroup.posts) {
    if (!post.variants) continue;

    // Check all variants of the post
    for (const [variantKey, variant] of Object.entries(post.variants)) {
      try {
        const success = await fetchAndStorePostPerformance(variant, profileKey);
        if (success) {
          updatedCount++;
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error updating performance for post ${post.id}, variant ${variantKey}:`, error);
      }
    }
  }

  return updatedCount;
};

/**
 * Get performance data for display
 * @param postVariant - Jazz PostVariant object
 * @returns Formatted performance data for UI
 */
export const getPostPerformanceForDisplay = (postVariant: any) => {
  const performance = postVariant.performance;
  
  if (!performance || performance.hasError) {
    return {
      hasData: false,
      isLoading: false,
      error: performance?.errorMessage || null,
      metrics: {}
    };
  }

  // Check if data is stale (older than 24 hours)
  const isStale = performance.lastUpdated ? 
    new Date().getTime() - new Date(performance.lastUpdated).getTime() > 24 * 60 * 60 * 1000 :
    true;

  return {
    hasData: performance.isComplete,
    isLoading: false,
    isStale,
    lastUpdated: performance.lastUpdated,
    metrics: {
      likes: performance.likes || 0,
      comments: performance.comments || 0,
      shares: performance.shares || 0,
      views: performance.views || 0,
      impressions: performance.impressions || 0,
      reach: performance.reach || 0,
      clicks: performance.clicks || 0,
      engagementRate: performance.engagementRate || 0,
      totalEngagement: performance.totalEngagement || 0,
    },
    postUrl: postVariant.socialPostUrl,
    error: null
  };
};

/**
 * Format metrics for display in UI
 * @param value - Numeric value
 * @returns Formatted string (e.g., "1.2K", "1.5M")
 */
export const formatMetricValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

/**
 * Get engagement color based on rate
 * @param rate - Engagement rate percentage
 * @returns CSS color class
 */
export const getEngagementColor = (rate: number): string => {
  if (rate >= 3) return 'text-green-600';
  if (rate >= 1) return 'text-yellow-600';
  return 'text-gray-600';
}; 

export interface AyrshareHistoryPost {
  id: string;
  post: string;
  platforms: string[];
  postIds: Array<{
    status: string;
    id: string;
    platform: string;
    postUrl?: string;
    isVideo?: boolean;
  }>;
  status: string;
  created: string;
  scheduleDate?: any;
  type: string;
  mediaUrls?: string[];
  urls?: string[];
  errors?: any[];
  notes?: string;
}

export interface AyrshareHistoryResponse {
  history: AyrshareHistoryPost[];
  refId?: string;
  count: number;
  lastUpdated: string;
  nextUpdate?: string;
}

/**
 * Fetch post history from Ayrshare for a specific profile
 */
export const fetchPostHistory = async (
  profileKey?: string,
  options: {
    limit?: number;
    platforms?: string[];
    lastDays?: number;
    status?: string;
  } = {}
): Promise<AyrshareHistoryResponse | null> => {
  try {
    if (!AYRSHARE_API_KEY) {
      throw new Error('Ayrshare API key not configured');
    }

    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.platforms?.length) {
      // For multiple platforms, use comma-separated values, not JSON
      params.append('platforms', options.platforms.join(','));
    }
    if (options.lastDays !== undefined) params.append('lastDays', options.lastDays.toString());
    if (options.status) params.append('status', options.status);

    const url = `${AYRSHARE_API_URL}/history${params.toString() ? `?${params.toString()}` : ''}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (profileKey) {
      headers['Profile-Key'] = profileKey;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

          // First try to parse as JSON to check for specific error codes
      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { error: responseText };
      }

      if (!response.ok) {
        // Handle specific "no history found" case (this is normal, not an error)
        if (response.status === 400 && data.history?.status === 'error' && data.history?.code === 221) {
          console.log('ℹ️ No posts found in timeframe:', data.history.message);
          return {
            history: [],
            count: 0,
            lastUpdated: data.lastUpdated,
            nextUpdate: data.nextUpdate,
            refId: data.refId
          };
        }
        
        // For other errors, throw
        console.error('Ayrshare History API error:', {
          status: response.status,
          statusText: response.statusText,
          url,
          headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, k === 'Authorization' ? 'Bearer ***' : v])),
          error: data
        });
        throw new Error(`Ayrshare API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
      }

      console.log('✅ Ayrshare API success:', { 
        dataKeys: Object.keys(data), 
        historyCount: data.history?.length || 0 
      });
      return data;
  } catch (error) {
    console.error('❌ Error fetching post history:', {
      error: error instanceof Error ? error.message : error,
      profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
      options
    });
    throw error;
  }
};

/**
 * Fetch platform-specific post history from Ayrshare
 * @param platform - Platform name (e.g., 'instagram', 'twitter', 'facebook')
 * @param profileKey - Ayrshare profile key
 * @param options - Additional options
 * @returns Platform-specific post history
 */
export const fetchPlatformPostHistory = async (
  platform: string,
  profileKey?: string,
  options: {
    limit?: number;
    lastDays?: number;
    status?: string;
  } = {}
): Promise<AyrshareHistoryResponse | null> => {
  try {
    if (!AYRSHARE_API_KEY) {
      throw new Error('Ayrshare API key not configured');
    }

    const params = new URLSearchParams();
    
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.lastDays !== undefined) params.append('lastDays', options.lastDays.toString());
    if (options.status) params.append('status', options.status);

    // Use the platform-specific endpoint as shown in the Ayrshare documentation
    const url = `${AYRSHARE_API_URL}/history/${platform}${params.toString() ? `?${params.toString()}` : ''}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (profileKey) {
      headers['Profile-Key'] = profileKey;
    }



    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    // Handle response with same error handling as the main fetchPostHistory function
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }

    if (!response.ok) {
      // Handle specific "no history found" case (this is normal, not an error)
      if (response.status === 400 && data.history?.status === 'error' && data.history?.code === 221) {
        console.log(`ℹ️ No ${platform} posts found in specified timeframe:`, {
          message: data.history.message,
          count: data.count,
          lastUpdated: data.lastUpdated
        });
        return {
          history: [],
          count: 0,
          lastUpdated: data.lastUpdated,
          nextUpdate: data.nextUpdate,
          refId: data.refId
        };
      }
      
      // For other errors, throw
      console.error(`Ayrshare ${platform} History API error:`, {
        status: response.status,
        statusText: response.statusText,
        url,
        headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, k === 'Authorization' ? 'Bearer ***' : v])),
        error: data
      });
      throw new Error(`Ayrshare API error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
    }

    console.log(`✅ Ayrshare ${platform} API success:`, { 
      dataKeys: Object.keys(data), 
      postsCount: data.posts?.length || 0 
    });
    
    // Transform the response to match our expected structure
    return {
      history: data.posts || [],
      count: data.posts?.length || 0,
      lastUpdated: data.lastUpdated || new Date().toISOString(),
      nextUpdate: data.nextUpdate,
      refId: data.refId
    };
  } catch (error) {
    console.error(`Error fetching ${platform} post history:`, error);
    return null;
  }
};

/**
 * Fetch post history for all connected platforms in an account group
 * @param accountGroup - Jazz AccountGroup object
 * @param profileKey - Ayrshare profile key
 * @param options - Fetch options
 * @returns Combined post history from all platforms
 */
export const fetchAllPlatformsHistory = async (
  accountGroup: any,
  profileKey?: string,
  options: {
    limit?: number;
    lastDays?: number;
    status?: string;
  } = {}
): Promise<{ [platform: string]: AyrshareHistoryResponse | null }> => {
  const results: { [platform: string]: AyrshareHistoryResponse | null } = {};
  
  // Get connected platforms from account group
  const connectedPlatforms = accountGroup.accounts?.map((acc: any) => acc.platform).filter(Boolean) || [];
  
  if (connectedPlatforms.length === 0) {
    console.warn('No connected platforms found in account group');
    return results;
  }



  // Fetch history for each platform in parallel
  const promises = connectedPlatforms.map(async (platform: string) => {
    try {
      const history = await fetchPlatformPostHistory(platform, profileKey, options);
      return { platform, history };
    } catch (error) {
      console.error(`Failed to fetch history for ${platform}:`, error);
      return { platform, history: null };
    }
  });

  const responses = await Promise.all(promises);
  
  responses.forEach(({ platform, history }) => {
    results[platform] = history;
  });

  return results;
};

/**
 * Get post performance summary for an account group
 * @param accountGroup - Jazz AccountGroup object
 * @param profileKey - Ayrshare profile key
 * @returns Performance summary across all platforms
 */
export const getAccountGroupPerformanceSummary = async (
  accountGroup: any,
  profileKey?: string
): Promise<{
  totalPosts: number;
  totalEngagement: number;
  platformBreakdown: { [platform: string]: { posts: number; engagement: number } };
  topPerformingPosts: any[];
  dateRange: { oldest: string | null; newest: string | null };
}> => {
  const allHistory = await fetchAllPlatformsHistory(accountGroup, profileKey, {
    limit: 100,
    status: 'success'
  });

  let totalPosts = 0;
  let totalEngagement = 0;
  const platformBreakdown: { [platform: string]: { posts: number; engagement: number } } = {};
  const allPosts: any[] = [];

  Object.entries(allHistory).forEach(([platform, history]) => {
    if (history?.history) {
      const platformPosts = history.history.length;
      const platformEngagement = history.history.reduce((sum, post) => {
        // Calculate engagement from post IDs if available
        const postEngagement = post.postIds?.reduce((postSum: number, postId: any) => {
          return postSum + (postId.likes || 0) + (postId.comments || 0) + (postId.shares || 0);
        }, 0) || 0;
        
        return sum + postEngagement;
      }, 0);

      totalPosts += platformPosts;
      totalEngagement += platformEngagement;
      platformBreakdown[platform] = {
        posts: platformPosts,
        engagement: platformEngagement
      };

      // Add posts with platform info for top performers analysis
      history.history.forEach(post => {
        allPosts.push({
          ...post,
          platform,
          totalEngagement: post.postIds?.reduce((sum: number, postId: any) => {
            return sum + (postId.likes || 0) + (postId.comments || 0) + (postId.shares || 0);
          }, 0) || 0
        });
      });
    }
  });

  // Find top performing posts
  const topPerformingPosts = allPosts
    .sort((a, b) => b.totalEngagement - a.totalEngagement)
    .slice(0, 10);

  // Calculate date range
  const dates = allPosts.map(post => new Date(post.created).getTime()).filter(d => !isNaN(d));
  const dateRange = {
    oldest: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
    newest: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null
  };

  return {
    totalPosts,
    totalEngagement,
    platformBreakdown,
    topPerformingPosts,
    dateRange
  };
};

/**
 * Convert Ayrshare history post to our Post schema format
 */
export const convertAyrsharePostToJazzPost = (ayrsharePost: AyrshareHistoryPost, accountGroupId: string): any => {
  // Determine the primary platform (first successful one)
  const primaryPlatformData = ayrsharePost.postIds.find(p => p.status === 'success') || ayrsharePost.postIds[0];
  const primaryPlatform = primaryPlatformData?.platform || ayrsharePost.platforms[0] || 'unknown';

  // Create post variants for each platform
  const variants = ayrsharePost.platforms.map(platform => {
    const platformData = ayrsharePost.postIds.find(p => p.platform === platform);
    
    return {
      platform,
      content: ayrsharePost.post,
      mediaUrls: ayrsharePost.mediaUrls || [],
      status: ayrsharePost.status === 'success' ? 'published' : 
              ayrsharePost.status === 'pending' ? 'scheduled' : 'draft',
      publishedAt: ayrsharePost.status === 'success' ? new Date(ayrsharePost.created) : undefined,
      scheduledFor: ayrsharePost.scheduleDate ? new Date(ayrsharePost.scheduleDate.utc || ayrsharePost.scheduleDate) : undefined,
      ayrsharePostId: ayrsharePost.id,
      socialPostUrl: platformData?.postUrl,
      performance: platformData?.status === 'success' ? {
        ayrsharePostId: ayrsharePost.id,
        socialPostId: platformData.id,
        lastUpdated: new Date(),
        dataSource: 'ayrshare' as const,
        fetchedAt: new Date(),
        isComplete: false,
        hasError: false,
      } : undefined,
    };
  });

  return {
    title: ayrsharePost.post.substring(0, 50) + (ayrsharePost.post.length > 50 ? '...' : ''),
    accountGroupId,
    createdAt: new Date(ayrsharePost.created),
    updatedAt: new Date(),
    status: ayrsharePost.status === 'success' ? 'published' : 
            ayrsharePost.status === 'pending' ? 'scheduled' : 'draft',
    primaryPlatform,
    variants,
    notes: ayrsharePost.notes || '',
    tags: [],
    isFromHistory: true, // Flag to identify these as historical posts
  };
};

/**
 * Fetch and import post history for an account group
 */
export const importPostHistoryForAccountGroup = async (
  accountGroup: any,
  profileKey?: string,
  options: {
    limit?: number;
    lastDays?: number;
  } = {}
): Promise<{ imported: number; errors: string[] }> => {
  try {
    const errors: string[] = [];
    let imported = 0;

    // Get connected platforms from account group
    const connectedPlatforms = accountGroup.accounts?.map((acc: any) => acc.platform).filter(Boolean) || [];
    
    if (connectedPlatforms.length === 0) {
      return { imported: 0, errors: ['No connected platforms found in account group'] };
    }

    // Fetch history with platform filter
    const historyResponse = await fetchPostHistory(profileKey, {
      limit: options.limit || 100,
      lastDays: options.lastDays || 0, // 0 = all history
      platforms: connectedPlatforms,
      status: 'success', // Only get successfully posted content
    });

    if (!historyResponse || !historyResponse.history) {
      return { imported: 0, errors: ['Failed to fetch post history from Ayrshare'] };
    }

    // Convert and add posts to Jazz
    for (const ayrsharePost of historyResponse.history) {
      try {
        // Check if we already have this post (by Ayrshare ID)
        const existingPost = accountGroup.posts?.find((post: any) => 
          post.variants?.some((variant: any) => variant.ayrsharePostId === ayrsharePost.id)
        );

        if (existingPost) {
          continue; // Skip if already imported
        }

        // Convert to our format
        const jazzPost = convertAyrsharePostToJazzPost(ayrsharePost, accountGroup.id);
        
        // Add to account group posts
        if (accountGroup.posts) {
          accountGroup.posts.push(jazzPost);
          imported++;
        }
      } catch (error) {
        console.error('Error converting post:', error);
        errors.push(`Failed to import post ${ayrsharePost.id}: ${error}`);
      }
    }

    return { imported, errors };
  } catch (error) {
    console.error('Error importing post history:', error);
    return { imported: 0, errors: [`Failed to import post history: ${error}`] };
  }
};

// Note: Import functionality has been moved to the API route level
// for better integration with Jazz context and proper error handling 