"use client";

import { useState, useEffect } from "react";
import { Button, Card, Text, Badge } from "@radix-ui/themes";
import { 
  TrendingUp, 
  Users, 
  BarChart3, 
  RefreshCw,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Twitter
} from "lucide-react";
import Link from "next/link";
import {
  getSocialAccountAnalytics,
  getPostHistory,
  SocialAccountAnalytics,
  HistoricalPost,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";
import { platformIcons, platformLabels } from "@/utils/postConstants";

interface Account {
  id: string;
  name: string;
  platform: string;
  profileKey?: string;
  isLinked: boolean;
  status?: "pending" | "linked" | "error" | "expired";
}

interface AccountAnalyticsOverviewProps {
  accounts: Account[];
  accountGroupId: string;
  title?: string;
  showDetailedView?: boolean;
}

export default function AccountAnalyticsOverview({ 
  accounts, 
  accountGroupId,
  title = "Account Analytics Overview",
  showDetailedView = true
}: AccountAnalyticsOverviewProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<Record<string, SocialAccountAnalytics>>({});
  const [postHistoryData, setPostHistoryData] = useState<Record<string, HistoricalPost[]>>({});
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7' | '30' | '90'>('30');
  const [error, setError] = useState<string>("");

  // Filter linked accounts
  const linkedAccounts = accounts.filter(account => account.isLinked);
  const analyticsAvailable = isFeatureAvailable('analytics');

  // Platform configuration
  const getPlatformIcon = (platform: string) => {
    const iconMap: Record<string, any> = {
      instagram: Instagram,
      facebook: Facebook,
      linkedin: Linkedin,
      youtube: Youtube,
      x: Twitter,
      twitter: Twitter,
    };
    return iconMap[platform] || BarChart3;
  };

  const getPlatformColor = (platform: string) => {
    const colorMap: Record<string, string> = {
      instagram: "purple",
      facebook: "lime",
      linkedin: "lime",
      youtube: "red",
      x: "gray",
      twitter: "gray",
    };
    return colorMap[platform] || "gray";
  };

  /**
   * Fetch analytics data for all linked accounts
   */
  const fetchAnalyticsData = async () => {
    if (linkedAccounts.length === 0 || !analyticsAvailable) return;

    setLoading(true);
    setError("");

    try {
      // Get analytics for all platforms
      const platforms = linkedAccounts.map(account => 
        account.platform === 'x' ? 'twitter' : account.platform
      );
      
      const [analytics, ...postHistories] = await Promise.all([
        getSocialAccountAnalytics(platforms),
        ...linkedAccounts.map(account => 
          getPostHistory(
            { 
              platform: account.platform === 'x' ? 'twitter' : account.platform, 
              lastDays: parseInt(selectedTimeframe) 
            },
            account.profileKey
          ).catch(() => [])
        )
      ]);

      setAnalyticsData(analytics);
      
      // Map post histories to accounts
      const postHistoryMap: Record<string, HistoricalPost[]> = {};
      linkedAccounts.forEach((account, index) => {
        postHistoryMap[account.id] = postHistories[index] || [];
      });
      setPostHistoryData(postHistoryMap);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and timeframe changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe, linkedAccounts.length]);

  /**
   * Format numbers for display
   */
  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  /**
   * Calculate total metrics across all accounts
   */
  const getTotalMetrics = () => {
    const platforms = linkedAccounts.map(account => 
      account.platform === 'x' ? 'twitter' : account.platform
    );
    
    return platforms.reduce((totals, platform) => {
      const analytics = analyticsData[platform];
      if (analytics) {
        totals.followers += analytics.followersCount || 0;
        totals.posts += analytics.postsCount || 0;
        totals.impressions += analytics.impressions || 0;
        totals.reach += analytics.reach || 0;
      }
      return totals;
    }, { followers: 0, posts: 0, impressions: 0, reach: 0 });
  };

  const totalMetrics = getTotalMetrics();

  /**
   * Get recent activity summary
   */
  const getRecentActivity = () => {
    const allPosts = Object.values(postHistoryData).flat();
    const recentPosts = allPosts.filter(post => {
      const postDate = new Date(post.publishedAt);
      const daysAgo = parseInt(selectedTimeframe);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      return postDate >= cutoffDate;
    });

    const totalEngagement = recentPosts.reduce((sum, post) => 
      sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0), 0
    );

    return {
      postsCount: recentPosts.length,
      totalEngagement,
      avgEngagement: recentPosts.length > 0 ? Math.round(totalEngagement / recentPosts.length) : 0
    };
  };

  const recentActivity = getRecentActivity();

  if (linkedAccounts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <Text size="4" weight="medium" className="mb-2 block">
            No Linked Accounts
          </Text>
          <Text size="2" color="gray" className="mb-4 block">
            Link your social media accounts to view analytics and insights.
          </Text>
          <Button onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')} className="bg-green-600 hover:bg-green-700 text-white">
            <ExternalLink className="w-4 h-4 mr-2" />
            Link Accounts
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="5" weight="bold" className="mb-1 block">{title}</Text>
          <Text size="2" color="gray">
            Analytics for {linkedAccounts.length} linked account{linkedAccounts.length !== 1 ? 's' : ''}
          </Text>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as '7' | '30' | '90')}
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          <Button 
            variant="soft" 
            size="2" 
            onClick={fetchAnalyticsData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text size="2" color="red">{error}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Overview Metrics */}
      {analyticsAvailable && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <Users className="w-6 h-6 text-lime-500 mx-auto mb-2" />
              <Text size="4" weight="bold" className="block">
                {formatNumber(totalMetrics.followers)}
              </Text>
              <Text size="1" color="gray">Total Followers</Text>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <BarChart3 className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <Text size="4" weight="bold" className="block">
                {formatNumber(totalMetrics.posts)}
              </Text>
              <Text size="1" color="gray">Total Posts</Text>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <Text size="4" weight="bold" className="block">
                {recentActivity.postsCount}
              </Text>
              <Text size="1" color="gray">Recent Posts</Text>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <Calendar className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <Text size="4" weight="bold" className="block">
                {formatNumber(recentActivity.totalEngagement)}
              </Text>
              <Text size="1" color="gray">Total Engagement</Text>
            </div>
          </Card>
        </div>
      )}

      {/* Account Breakdown */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Text size="4" weight="bold">Account Performance</Text>
          {!analyticsAvailable && (
            <Badge color="gray" size="1">Analytics Premium Only</Badge>
          )}
        </div>

        <div className="space-y-4">
          {linkedAccounts.map((account) => {
            const platformKey = account.platform === 'x' ? 'twitter' : account.platform;
            const analytics = analyticsData[platformKey];
            const posts = postHistoryData[account.id] || [];
            const PlatformIcon = getPlatformIcon(account.platform);
            const platformColor = getPlatformColor(account.platform);

            return (
              <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${platformColor}-100 rounded-lg`}>
                    <PlatformIcon className={`w-5 h-5 text-${platformColor}-500`} />
                  </div>
                  <div>
                    <Text size="3" weight="medium" className="block">
                      {account.name}
                    </Text>
                    <Text size="2" color="gray">
                      {platformLabels[account.platform as keyof typeof platformLabels]}
                    </Text>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {analyticsAvailable && analytics ? (
                    <>
                      <div className="text-center">
                        <Text size="2" weight="bold" className="block">
                          {formatNumber(analytics.followersCount)}
                        </Text>
                        <Text size="1" color="gray">Followers</Text>
                      </div>
                      <div className="text-center">
                        <Text size="2" weight="bold" className="block">
                          {posts.length}
                        </Text>
                        <Text size="1" color="gray">Recent Posts</Text>
                      </div>
                      <div className="text-center">
                        <Text size="2" weight="bold" className="block">
                          {formatNumber(
                            posts.reduce((sum, post) => 
                              sum + (post.likes || 0) + (post.comments || 0), 0
                            )
                          )}
                        </Text>
                        <Text size="1" color="gray">Engagement</Text>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Text size="2" color="gray">
                        {posts.length} recent posts
                      </Text>
                    </div>
                  )}

                  {showDetailedView && (
                    <Link href={`/account-group/${accountGroupId}/analytics/${account.platform}/${account.id}`}>
                      <Button variant="soft" size="1">
                        View Details
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Feature Availability Notice */}
      {!analyticsAvailable && (
        <Card>
          <div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
            <Text size="2" color="lime">
              💡 Upgrade to a premium Ayrshare plan to unlock detailed analytics, engagement metrics, and advanced insights.
            </Text>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Text size="3" weight="medium">Quick Actions</Text>
          <div className="flex items-center gap-2">
            <Link href={`/account`}>
              <Button variant="soft" size="2">
                <BarChart3 className="w-4 h-4 mr-2" />
                Manage Account
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="2"
              onClick={() => window.open('https://app.ayrshare.com/dashboard', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ayrshare Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 