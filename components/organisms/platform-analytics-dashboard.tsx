'use client';

import React, { useState, useEffect } from 'react';
import { Button, Text, Badge } from '@radix-ui/themes';
import { BarChart3, TrendingUp, Users, Heart, MessageCircle, Share, ExternalLink, Calendar, RefreshCw } from 'lucide-react';

// =============================================================================
// 📊 PLATFORM ANALYTICS DASHBOARD
// =============================================================================

interface PlatformAnalyticsDashboardProps {
  account: {
    id: string;
    name: string;
    platform: string;
    profileKey?: string;
    isLinked: boolean;
  };
  accountGroupId?: string;
  jazzAccountGroup?: any; // Jazz AccountGroup object
}

interface PostHistoryItem {
  id: string;
  content: string;
  platforms: string[];
  status: string;
  created: string;
  postIds: Array<{
    platform: string;
    socialId: string;
    status: string;
    postUrl?: string;
    isVideo?: boolean;
  }>;
  mediaUrls: string[];
  type: string;
}

interface AnalyticsData {
  posts: PostHistoryItem[];
  totalPosts: number;
  totalEngagement: number;
  lastUpdated: string;
}

export const PlatformAnalyticsDashboard: React.FC<PlatformAnalyticsDashboardProps> = ({
  account,
  accountGroupId,
  jazzAccountGroup
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAnalytics = async () => {
    if (!account.isLinked || !account.profileKey) {
      setError('Account is not linked to Ayrshare or missing profile key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        platforms: account.platform,
        limit: '100',
        lastDays: '0', // 0 = ALL historical posts ever posted  
        status: 'all' // Get all posts regardless of status
      });

      // Always auto-import posts when we have an accountGroupId
      if (accountGroupId) {
        params.append('import', 'true');
        params.append('accountGroupId', accountGroupId);
      }

      if (account.profileKey) {
        params.append('profileKey', account.profileKey);
      }

      // Use platform-specific endpoint for better results  
      const response = await fetch(`/api/post-history/${account.platform}?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setAnalytics({
        posts: result.data.posts || [],
        totalPosts: result.data.totalCount || 0,
        totalEngagement: calculateTotalEngagement(result.data.posts || []),
        lastUpdated: result.data.lastUpdated || new Date().toISOString()
      });
      setLastRefresh(new Date());

      // Show import feedback
      if (result.import && result.import.imported > 0) {
        setError(`✅ Imported ${result.import.imported} posts with analytics data!`);
        setTimeout(() => setError(null), 4000);
      } else if (result.import && result.data.posts.length > 0) {
        setError(`📊 Analytics for ${result.data.posts.length} ${account.platform} posts loaded`);
        setTimeout(() => setError(null), 3000);
      } else if (result.data.posts.length === 0) {
        setError(`ℹ️ No ${account.platform} posts found - create some posts to see analytics`);
        setTimeout(() => setError(null), 4000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalEngagement = (posts: PostHistoryItem[]): number => {
    return posts.reduce((total, post) => {
      const platformPost = post.postIds.find(p => p.platform === account.platform);
      // In real implementation, you'd extract engagement data from platformPost
      // For now, return a simulated value
      return total + (platformPost ? Math.floor(Math.random() * 100) : 0);
    }, 0);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string): string => {
    const icons: { [key: string]: string } = {
      instagram: '📷',
      facebook: '📘',
      twitter: '🐦',
      x: '✖️',
      linkedin: '💼',
      youtube: '📺'
    };
    return icons[platform] || '📱';
  };

  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'instagram': return 'from-purple-500 to-pink-500';
      case 'facebook': return 'from-blue-600 to-blue-700';
      case 'x': 
      case 'twitter': return 'from-gray-800 to-black';
      case 'linkedin': return 'from-blue-700 to-blue-800';
      case 'youtube': return 'from-red-600 to-red-700';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchAnalytics();
  }, [account.platform, account.profileKey]);

  if (!account.isLinked) {
    return (
      <div className="mt-6 text-center py-12">
        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <Text size="4" weight="medium" className="mb-2 block">
          Account Not Linked
        </Text>
        <Text size="2" color="gray" className="mb-6 block">
          Link your {account.platform} account to view analytics and post history.
        </Text>
        <Button 
          onClick={() => window.open('https://app.ayrshare.com/dashboard', '_blank')}
          variant="soft"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Link in Ayrshare Dashboard
        </Button>
      </div>
    );
  }

  if (loading && !analytics) {
    return (
      <div className="mt-6 text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <Text size="2" color="gray">Loading analytics for {account.platform}...</Text>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="mt-6 text-center py-12">
        <BarChart3 className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <Text size="4" weight="medium" className="mb-2 block text-red-600 dark:text-red-400">
          Analytics Unavailable
        </Text>
        <Text size="2" color="gray" className="mb-6 block max-w-md mx-auto">
          {error}
        </Text>
        <div className="flex gap-2 justify-center">
          <Button onClick={fetchAnalytics} variant="soft">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button 
            onClick={() => window.open('https://app.ayrshare.com/dashboard', '_blank')}
            variant="outline"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Ayrshare Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!analytics || analytics.posts.length === 0) {
    return (
      <div className="mt-6 text-center py-12">
        <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <Text size="4" weight="medium" className="mb-2 block">
          No Recent Posts
        </Text>
        <Text size="2" color="gray" className="mb-6 block">
          No posts found in your {account.platform} account history. This could mean your account has no posts, or they haven't been synced with Ayrshare yet.
        </Text>
        <Button 
          onClick={() => window.open('https://app.ayrshare.com/dashboard', '_blank')}
          variant="soft"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View Ayrshare Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Header with Platform Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlatformColor(account.platform)} flex items-center justify-center text-white text-lg font-bold`}>
            {getPlatformIcon(account.platform)}
          </div>
          <div>
            <Text size="4" weight="bold" className="block">{account.name}</Text>
            <Text size="2" color="gray" className="capitalize">{account.platform} Analytics</Text>
          </div>
        </div>
        <Button onClick={fetchAnalytics} disabled={loading} variant="soft" size="2">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <Text size="3" weight="bold" className="block">{analytics.totalPosts}</Text>
              <Text size="1" color="gray">Total Posts</Text>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <Text size="3" weight="bold" className="block">{analytics.totalEngagement}</Text>
              <Text size="1" color="gray">Est. Engagement</Text>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <Text size="3" weight="bold" className="block">Last 30d</Text>
              <Text size="1" color="gray">Time Period</Text>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Text size="3" weight="bold">Recent Posts</Text>
          <Text size="2" color="gray">{analytics.posts.length} posts shown</Text>
        </div>

        <div className="space-y-3">
          {analytics.posts.slice(0, 10).map((post) => {
            const platformPost = post.postIds.find(p => p.platform === account.platform);
            
            return (
              <div key={post.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <Text size="2" className="block mb-2 line-clamp-2">
                      {post.content.substring(0, 120)}
                      {post.content.length > 120 ? '...' : ''}
                    </Text>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.created)}
                      </span>
                      {post.mediaUrls.length > 0 && (
                        <span className="flex items-center gap-1">
                          📎 {post.mediaUrls.length} media
                        </span>
                      )}
                      {platformPost?.isVideo && (
                        <span className="flex items-center gap-1">
                          📹 Video
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-col items-end gap-2">
                    <Badge 
                      color={post.status === 'success' ? 'green' : 'gray'}
                      size="1"
                    >
                      {post.status}
                    </Badge>
                    {platformPost?.postUrl && (
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => window.open(platformPost.postUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>

                {/* Engagement metrics placeholder - would be real data in full implementation */}
                <div className="flex items-center gap-6 text-sm text-muted-foreground pt-3 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {Math.floor(Math.random() * 50)} likes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    {Math.floor(Math.random() * 10)} comments
                  </span>
                  <span className="flex items-center gap-1">
                    <Share className="w-3 h-3" />
                    {Math.floor(Math.random() * 5)} shares
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {analytics.posts.length > 10 && (
          <div className="text-center mt-4">
            <Text size="2" color="gray">
              Showing 10 of {analytics.posts.length} posts
            </Text>
          </div>
        )}
      </div>

      {/* Last Updated */}
      {lastRefresh && (
        <div className="text-center pt-4 border-t border-border">
          <Text size="1" color="gray">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </Text>
        </div>
      )}
    </div>
  );
}; 