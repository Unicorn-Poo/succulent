import { NextRequest, NextResponse } from "next/server";
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from "@/utils/postConstants";

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
  const profileKey = request.nextUrl.searchParams.get("profileKey");
  const platform = request.nextUrl.searchParams.get("platform"); // Optional: filter by platform

  if (!profileKey) {
    return NextResponse.json(
      { error: "profileKey is required" },
      { status: 400 }
    );
  }

  if (!AYRSHARE_API_KEY) {
    return NextResponse.json(
      { error: "Ayrshare API key not configured" },
      { status: 500 }
    );
  }

  const errors: string[] = [];
  const platformAnalytics: Record<string, PlatformAnalytics> = {};

  try {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AYRSHARE_API_KEY}`,
    };

    // Step 1: Try /user with Profile-Key header first
    let userData: any = null;
    let userDataSource = "unknown";

    const userHeaders = {
      ...baseHeaders,
      "Profile-Key": profileKey,
    };

    const userResponse = await fetch(`${AYRSHARE_API_URL}/user`, {
      method: "GET",
      headers: userHeaders,
      cache: "no-store",
    });

    const userJson = await userResponse.json();

    if (userResponse.ok) {
      userData = userJson;
      userDataSource = "user-endpoint";
    } else {
      // Fallback: Try to find profile using /profiles endpoint
      // The profileKey might actually be a refId or the profile was created differently
      console.log("📊 /user endpoint failed, trying /profiles fallback...");

      // Try finding by refId (profileKey might be a refId)
      const profilesUrl = new URL(`${AYRSHARE_API_URL}/profiles`);
      profilesUrl.searchParams.set("refId", profileKey);

      const profilesResponse = await fetch(profilesUrl.toString(), {
        method: "GET",
        headers: baseHeaders,
        cache: "no-store",
      });

      const profilesJson = await profilesResponse.json();

      if (profilesResponse.ok && profilesJson?.profiles?.length > 0) {
        // Found profile! Use its displayNames data
        const profile = profilesJson.profiles[0];
        userData = {
          activeSocialAccounts: profile.activeSocialAccounts || [],
          displayNames: profile.displayNames || [],
          refId: profile.refId,
          title: profile.title,
        };
        userDataSource = "profiles-endpoint";
      } else {
        // Last resort: Get all profiles and find by title matching
        const allProfilesUrl = new URL(`${AYRSHARE_API_URL}/profiles`);
        const allProfilesResponse = await fetch(allProfilesUrl.toString(), {
          method: "GET",
          headers: baseHeaders,
          cache: "no-store",
        });

        const allProfilesJson = await allProfilesResponse.json();

        if (allProfilesResponse.ok && allProfilesJson?.profiles) {
          // Try to find a matching profile
          const matchingProfile = allProfilesJson.profiles.find(
            (p: any) => p.refId === profileKey || p.profileKey === profileKey
          );

          if (matchingProfile) {
            userData = {
              activeSocialAccounts: matchingProfile.activeSocialAccounts || [],
              displayNames: matchingProfile.displayNames || [],
              refId: matchingProfile.refId,
              title: matchingProfile.title,
            };
            userDataSource = "profiles-search";
          }
        }
      }
    }

    if (!userData) {
      return NextResponse.json(
        {
          error: "Could not find profile data",
          message: `Profile key "${profileKey}" not found. The profile may not exist or the key format is incorrect.`,
          hint: "Check Settings → Ayrshare Profile Key to verify the correct key is set.",
        },
        { status: 404 }
      );
    }

    console.log(
      `📊 Analytics data source: ${userDataSource}, Profile: ${
        userData.title || "unknown"
      }`
    );
    errors.push(`Data source: ${userDataSource}`);

    // If we only got data from /profiles (no displayNames), try to get real data
    // by calling /user for the profile directly using a different approach
    if (
      userDataSource !== "user-endpoint" &&
      (!userData.displayNames || userData.displayNames.length === 0)
    ) {
      console.log(
        "📊 No displayNames found, attempting to fetch detailed analytics via /analytics/social..."
      );
      errors.push("Attempting analytics/social fallback for follower counts");
    }

    // Extract connected platforms and displayNames (contains real follower data)
    // NOTE: displayNames is an ARRAY of platform objects, not a keyed object!
    const connectedPlatforms = userData.activeSocialAccounts || [];
    const displayNamesArray: any[] = userData.displayNames || [];
    const socialMediaAccounts = userData.user?.socialMediaAccounts || {};

    // Convert displayNames array to a lookup map by platform
    const displayNamesMap: Record<string, any> = {};
    if (Array.isArray(displayNamesArray)) {
      for (const item of displayNamesArray) {
        if (item.platform) {
          displayNamesMap[item.platform.toLowerCase()] = item;
        }
      }
    } else if (typeof displayNamesArray === "object") {
      // Fallback if it's already an object (shouldn't happen but be safe)
      Object.assign(displayNamesMap, displayNamesArray);
    }

    // Filter to specific platform if requested
    const platformsToFetch = platform
      ? connectedPlatforms.filter(
          (p: string) => p.toLowerCase() === platform.toLowerCase()
        )
      : connectedPlatforms;

    // Step 2: For each platform, extract real data from displayNames
    for (const platformName of platformsToFetch) {
      const normalizedPlatform = platformName.toLowerCase();
      const platformData = displayNamesMap[normalizedPlatform] || {};
      const accountData =
        socialMediaAccounts[platformName] ||
        socialMediaAccounts[normalizedPlatform] ||
        {};

      // Parse real follower/following counts from displayNames
      // Ayrshare returns this data in the displayNames array
      const followers =
        platformData.followersCount ||
        platformData.followers_count ||
        platformData.followerCount ||
        0;
      const following =
        platformData.followingCount ||
        platformData.following_count ||
        platformData.friendsCount ||
        0;
      const postsCount =
        platformData.postsCount ||
        platformData.media_count ||
        platformData.mediaCount ||
        platformData.statusesCount ||
        0;

      platformAnalytics[platformName] = {
        platform: platformName,
        username:
          platformData.username ||
          platformData.screenName ||
          accountData.username ||
          `${platformName}_user`,
        displayName:
          platformData.displayName ||
          platformData.name ||
          platformData.pageName ||
          platformName,
        avatar:
          platformData.userImage ||
          platformData.profilePicture ||
          platformData.profile_picture_url ||
          platformData.profileImageUrl ||
          accountData.avatar,
        followers,
        following,
        posts: postsCount,
        engagement: {
          likes: 0,
          comments: 0,
          shares: 0,
          total: 0,
          rate: 0,
        },
        recentPosts: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Step 3: Fetch engagement analytics for connected platforms
    // Use profile key header only if /user endpoint worked, otherwise use base headers
    const analyticsHeaders =
      userDataSource === "user-endpoint" ? userHeaders : baseHeaders;

    if (platformsToFetch.length > 0) {
      try {
        const analyticsResponse = await fetch(
          `${AYRSHARE_API_URL}/analytics/social`,
          {
            method: "POST",
            headers: analyticsHeaders,
            body: JSON.stringify({ platforms: platformsToFetch }),
            cache: "no-store",
          }
        );

        const analyticsData = await analyticsResponse.json();

        if (analyticsResponse.ok) {
          // Process engagement data for each platform
          for (const platformName of platformsToFetch) {
            const platformEngagement = analyticsData[platformName] || {};
            const analytics = platformEngagement.analytics || {};
            const posts = platformEngagement.posts || [];

            // CRITICAL: Extract REAL follower counts from analytics/social response
            // Different platforms use different field names!
            const realFollowers =
              analytics.followersCount || // Twitter, Instagram
              analytics.followers_count ||
              analytics.followerCount || // TikTok
              analytics.subscriberCount || // YouTube
              analytics.followers?.totalFollowerCount || // LinkedIn (nested)
              analytics.totalKarma || // Reddit (karma instead of followers)
              0;
            const realFollowing =
              analytics.followingCount ||
              analytics.followsCount || // Instagram
              analytics.following_count ||
              analytics.friends || // Reddit
              0;
            const realPosts =
              analytics.mediaCount || // Instagram
              analytics.tweetCount || // Twitter
              analytics.statusesCount ||
              analytics.videoCount || // YouTube
              analytics.videoCountTotal || // TikTok
              0;

            // Update platform analytics with REAL data from /analytics/social
            if (platformAnalytics[platformName]) {
              platformAnalytics[platformName].followers = realFollowers;
              platformAnalytics[platformName].following = realFollowing;
              platformAnalytics[platformName].posts = realPosts;

              // Also update username/displayName if available
              if (analytics.username) {
                platformAnalytics[platformName].username = analytics.username;
              }
              if (analytics.displayName || analytics.name) {
                platformAnalytics[platformName].displayName =
                  analytics.displayName || analytics.name;
              }
              if (analytics.profilePictureUrl || analytics.profileImageUrl) {
                platformAnalytics[platformName].avatar =
                  analytics.profilePictureUrl || analytics.profileImageUrl;
              }
            }

            // Calculate total engagement from analytics data or posts
            let totalLikes = analytics.likeCount || 0;
            let totalComments = analytics.commentsCount || 0;
            let totalShares = 0;

            // Also sum from posts if available
            posts.forEach((post: any) => {
              if (!analytics.likeCount)
                totalLikes += post.likes || post.likeCount || 0;
              if (!analytics.commentsCount)
                totalComments += post.comments || post.commentsCount || 0;
              totalShares +=
                post.shares || post.shareCount || post.retweets || 0;
            });

            const totalEngagement = totalLikes + totalComments + totalShares;
            const followerCount = realFollowers || 1;
            const postCount = realPosts || posts.length || 1;

            // Engagement rate = (Average engagement per post / Followers) * 100
            // This is the industry standard formula
            const avgEngagementPerPost = totalEngagement / postCount;
            const engagementRate =
              realFollowers > 0
                ? (avgEngagementPerPost / followerCount) * 100
                : 0;

            if (platformAnalytics[platformName]) {
              platformAnalytics[platformName].engagement = {
                likes: totalLikes,
                comments: totalComments,
                shares: totalShares,
                total: totalEngagement,
                rate: parseFloat(engagementRate.toFixed(2)),
              };

              // Add recent posts
              platformAnalytics[platformName].recentPosts = posts
                .slice(0, 10)
                .map((post: any) => ({
                  id: post.id || post.postId,
                  content: post.post || post.caption || "",
                  platform: platformName,
                  likes: post.likes || post.likeCount || 0,
                  comments: post.comments || post.commentsCount || 0,
                  shares: post.shares || post.shareCount || 0,
                  publishedAt:
                    post.publishedAt || post.created || post.createdAt,
                  postUrl: post.postUrl || post.url,
                  mediaUrls: post.mediaUrls || post.images || [],
                }));
            }
          }
        } else {
          errors.push(
            `Analytics fetch failed: ${
              analyticsData.message || "Unknown error"
            }`
          );
        }
      } catch (analyticsError) {
        errors.push(
          `Analytics error: ${
            analyticsError instanceof Error ? analyticsError.message : "Unknown"
          }`
        );
      }
    }

    // Step 4: Try to fetch post history for additional data
    try {
      const historyResponse = await fetch(`${AYRSHARE_API_URL}/history`, {
        method: "GET",
        headers: analyticsHeaders,
        cache: "no-store",
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();

        // Process history to supplement analytics
        if (Array.isArray(historyData)) {
          for (const post of historyData.slice(0, 50)) {
            const postPlatforms = Array.isArray(post.platforms)
              ? post.platforms
              : [post.platform];

            for (const postPlatform of postPlatforms) {
              if (
                platformAnalytics[postPlatform] &&
                platformAnalytics[postPlatform].recentPosts.length < 10
              ) {
                const existingIds = new Set(
                  platformAnalytics[postPlatform].recentPosts.map((p) => p.id)
                );

                if (!existingIds.has(post.id)) {
                  platformAnalytics[postPlatform].recentPosts.push({
                    id: post.id,
                    content: post.post || "",
                    platform: postPlatform,
                    likes: post.analytics?.[postPlatform]?.likes || 0,
                    comments: post.analytics?.[postPlatform]?.comments || 0,
                    shares: post.analytics?.[postPlatform]?.shares || 0,
                    publishedAt: post.created || post.scheduleDate,
                    postUrl: post.postIds?.[postPlatform]?.postUrl,
                    mediaUrls: post.mediaUrls || [],
                  });
                }
              }
            }
          }
        }
      }
    } catch (historyError) {
      // History is optional, don't fail the whole request
      errors.push(
        `History fetch info: ${
          historyError instanceof Error ? historyError.message : "Not available"
        }`
      );
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
      ...(errors.length > 0 && { errors }),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch live analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
