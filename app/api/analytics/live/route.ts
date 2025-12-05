import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '@/utils/postConstants';

/**
 * Live Analytics API - Fetches REAL data from Ayrshare every time
 * 
 * This endpoint bypasses any caching and fetches:
 * - /user endpoint for real follower/following counts from displayNames[]
 * - /analytics/social for engagement metrics
 * - /history for recent post performance
 */

interface PlatformAnalytics {
  platform: string;
  username: string;
  displayName: string;
  avatar?: string;
  followers: number;
  following: number;
  posts: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    total: number;
    rate: number;
  };
  recentPosts: Array<{
    id: string;
    content: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    publishedAt: string;
    postUrl?: string;
    mediaUrls?: string[];
  }>;
  lastUpdated: string;
}

interface LiveAnalyticsResponse {
  success: boolean;
  platforms: Record<string, PlatformAnalytics>;
  totalFollowers: number;
  totalEngagement: number;
  connectedPlatforms: string[];
  fetchedAt: string;
  errors?: string[];
}

export async function GET(request: NextRequest) {
  const profileKey = request.nextUrl.searchParams.get('profileKey');
  const platform = request.nextUrl.searchParams.get('platform'); // Optional: filter by platform
  
  if (!profileKey) {
    return NextResponse.json({ error: 'profileKey is required' }, { status: 400 });
  }

  if (!AYRSHARE_API_KEY) {
    return NextResponse.json({ error: 'Ayrshare API key not configured' }, { status: 500 });
  }

  const errors: string[] = [];
  const platformAnalytics: Record<string, PlatformAnalytics> = {};

  try {
    // Step 1: Fetch /user endpoint for REAL follower/following data
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Profile-Key': profileKey
    };

    const userResponse = await fetch(`${AYRSHARE_API_URL}/user`, {
      method: 'GET',
      headers,
      cache: 'no-store' // Force fresh data
    });

    const userData = await userResponse.json();

    if (!userResponse.ok) {
      return NextResponse.json({ 
        error: userData.message || 'Failed to fetch user data',
        details: userData
      }, { status: userResponse.status });
    }

    // Extract connected platforms and displayNames (contains real follower data)
    const connectedPlatforms = userData.activeSocialAccounts || [];
    const displayNames = userData.displayNames || {};
    const socialMediaAccounts = userData.user?.socialMediaAccounts || {};

    // Filter to specific platform if requested
    const platformsToFetch = platform 
      ? connectedPlatforms.filter((p: string) => p.toLowerCase() === platform.toLowerCase())
      : connectedPlatforms;

    // Step 2: For each platform, extract real data from displayNames
    for (const platformName of platformsToFetch) {
      const platformData = displayNames[platformName] || {};
      const accountData = socialMediaAccounts[platformName] || {};
      
      // Parse real follower/following counts from displayNames
      // Ayrshare returns this data in the displayNames object
      const followers = platformData.followersCount || platformData.followers_count || 0;
      const following = platformData.followingCount || platformData.following_count || 0;
      const postsCount = platformData.postsCount || platformData.media_count || 0;
      
      platformAnalytics[platformName] = {
        platform: platformName,
        username: platformData.username || accountData.username || `${platformName}_user`,
        displayName: platformData.displayName || platformData.name || platformName,
        avatar: platformData.profilePicture || platformData.profile_picture_url || accountData.avatar,
        followers,
        following,
        posts: postsCount,
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          total: 0,
          rate: 0
        },
        recentPosts: [],
        lastUpdated: new Date().toISOString()
      };
    }

    // Step 3: Fetch engagement analytics for connected platforms
    if (platformsToFetch.length > 0) {
      try {
        const analyticsResponse = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ platforms: platformsToFetch }),
          cache: 'no-store'
        });

        const analyticsData = await analyticsResponse.json();

        if (analyticsResponse.ok) {
          // Process engagement data for each platform
          for (const platformName of platformsToFetch) {
            const platformEngagement = analyticsData[platformName] || {};
            const posts = platformEngagement.posts || [];
            
            // Calculate total engagement from posts
            let totalLikes = 0;
            let totalComments = 0;
            let totalShares = 0;

            posts.forEach((post: any) => {
              totalLikes += post.likes || post.likeCount || 0;
              totalComments += post.comments || post.commentsCount || 0;
              totalShares += post.shares || post.shareCount || post.retweets || 0;
            });

            const totalEngagement = totalLikes + totalComments + totalShares;
            const followerCount = platformAnalytics[platformName]?.followers || 1;
            const engagementRate = posts.length > 0 
              ? ((totalEngagement / posts.length) / followerCount) * 100 
              : 0;

            if (platformAnalytics[platformName]) {
              platformAnalytics[platformName].engagement = {
                likes: totalLikes,
                comments: totalComments,
                shares: totalShares,
                total: totalEngagement,
                rate: parseFloat(engagementRate.toFixed(2))
              };

              // Add recent posts
              platformAnalytics[platformName].recentPosts = posts.slice(0, 10).map((post: any) => ({
                id: post.id || post.postId,
                content: post.post || post.caption || '',
                platform: platformName,
                likes: post.likes || post.likeCount || 0,
                comments: post.comments || post.commentsCount || 0,
                shares: post.shares || post.shareCount || 0,
                publishedAt: post.publishedAt || post.created || post.createdAt,
                postUrl: post.postUrl || post.url,
                mediaUrls: post.mediaUrls || post.images || []
              }));
            }
          }
        } else {
          errors.push(`Analytics fetch failed: ${analyticsData.message || 'Unknown error'}`);
        }
      } catch (analyticsError) {
        errors.push(`Analytics error: ${analyticsError instanceof Error ? analyticsError.message : 'Unknown'}`);
      }
    }

    // Step 4: Try to fetch post history for additional data
    try {
      const historyResponse = await fetch(`${AYRSHARE_API_URL}/history`, {
        method: 'GET',
        headers,
        cache: 'no-store'
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        
        // Process history to supplement analytics
        if (Array.isArray(historyData)) {
          for (const post of historyData.slice(0, 50)) {
            const postPlatforms = Array.isArray(post.platforms) ? post.platforms : [post.platform];
            
            for (const postPlatform of postPlatforms) {
              if (platformAnalytics[postPlatform] && platformAnalytics[postPlatform].recentPosts.length < 10) {
                const existingIds = new Set(platformAnalytics[postPlatform].recentPosts.map(p => p.id));
                
                if (!existingIds.has(post.id)) {
                  platformAnalytics[postPlatform].recentPosts.push({
                    id: post.id,
                    content: post.post || '',
                    platform: postPlatform,
                    likes: post.analytics?.[postPlatform]?.likes || 0,
                    comments: post.analytics?.[postPlatform]?.comments || 0,
                    shares: post.analytics?.[postPlatform]?.shares || 0,
                    publishedAt: post.created || post.scheduleDate,
                    postUrl: post.postIds?.[postPlatform]?.postUrl,
                    mediaUrls: post.mediaUrls || []
                  });
                }
              }
            }
          }
        }
      }
    } catch (historyError) {
      // History is optional, don't fail the whole request
      errors.push(`History fetch info: ${historyError instanceof Error ? historyError.message : 'Not available'}`);
    }

    // Calculate totals
    let totalFollowers = 0;
    let totalEngagement = 0;

    for (const [_, data] of Object.entries(platformAnalytics)) {
      totalFollowers += data.followers;
      totalEngagement += data.engagement.total;
    }

    const response: LiveAnalyticsResponse = {
      success: true,
      platforms: platformAnalytics,
      totalFollowers,
      totalEngagement,
      connectedPlatforms: platformsToFetch,
      fetchedAt: new Date().toISOString(),
      ...(errors.length > 0 && { errors })
    };

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch live analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

