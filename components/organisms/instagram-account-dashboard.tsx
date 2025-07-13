"use client";

import { useState, useEffect } from "react";
import { Button, Card, Text, Badge, Dialog } from "@radix-ui/themes";
import { 
  Instagram, 
  TrendingUp, 
  Users, 
  Heart, 
  MessageCircle, 
  Eye,
  Calendar,
  RefreshCw,
  Settings,
  BarChart3,
  Grid3X3,
  Loader2,
  AlertCircle
} from "lucide-react";
import Image from "next/image";
import {
  getAccountOverview,
  getPostHistory,
  getSocialAccountAnalytics,
  getProfileInfo,
  PostAnalytics,
  SocialAccountAnalytics,
  ProfileInfo,
  HistoricalPost,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";

interface InstagramAccount {
  id: string;
  name: string;
  platform: "instagram";
  profileKey?: string;
  isLinked: boolean;
}

interface InstagramAccountDashboardProps {
  account: InstagramAccount;
  accountGroupId?: string;
}

export default function InstagramAccountDashboard({ account, accountGroupId }: InstagramAccountDashboardProps) {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  
  // Data state
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [analytics, setAnalytics] = useState<SocialAccountAnalytics | null>(null);
  const [recentPosts, setRecentPosts] = useState<HistoricalPost[]>([]);
  
  // UI state
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7' | '30' | '90'>('30');
  const [showSettings, setShowSettings] = useState(false);

  // Check if analytics features are available
  const analyticsAvailable = isFeatureAvailable('analytics');

  /**
   * Fetch account data including profile info and analytics
   */
  const fetchAccountData = async () => {
    if (!account.isLinked || !account.profileKey) {
      setError('Account not properly linked');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Re-enable analytics fetching when API access is configured
      // For now, just show placeholder data to allow preview functionality
      
      setProfileInfo({
        platform: 'instagram',
        username: account.name,
        displayName: account.name,
        bio: 'Instagram account preview',
        avatar: `https://avatar.vercel.sh/${account.name}`,
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89
      });
      
      setAnalytics({
        platform: 'instagram',
        followersCount: 1234,
        followingCount: 567,
        postsCount: 89,
        engagementRate: 5.2,
        impressions: 12500,
        reach: 8900,
        profileViews: 234,
        websiteClicks: 45
      });
      
      setRecentPosts([]);
      setLastUpdated(new Date().toISOString());
      
      /* 
      // Original analytics fetching - disabled to prevent API errors
      const overview = await getAccountOverview('instagram', account.profileKey);
      
      setProfileInfo(overview.profile);
      setAnalytics(overview.analytics);
      setRecentPosts(overview.recentPosts);
      setLastUpdated(overview.lastUpdated);
      */
      
    } catch (err) {
      console.error('Error fetching Instagram account data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch account data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch additional post history based on timeframe
   */
  const fetchPostHistory = async (days: number) => {
    try {
      // TODO: Re-enable when API access is configured
      // const history = await getPostHistory(
      //   { platform: 'instagram', lastDays: days },
      //   account.profileKey
      // );
      // setRecentPosts(history);
      
      // For now, just show empty posts
      setRecentPosts([]);
    } catch (err) {
      console.error('Error fetching post history:', err);
      setError('Failed to fetch post history');
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAccountData();
  }, [account.id, account.isLinked]);

  // Handle timeframe changes
  useEffect(() => {
    if (account.isLinked && !loading) {
      fetchPostHistory(parseInt(selectedTimeframe));
    }
  }, [selectedTimeframe]);

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
   * Calculate engagement rate
   */
  const calculateEngagementRate = () => {
    if (!analytics?.followersCount || !recentPosts.length) return 0;
    
    const totalEngagement = recentPosts.reduce((sum, post) => {
      return sum + (post.likes || 0) + (post.comments || 0);
    }, 0);
    
    const avgEngagement = totalEngagement / recentPosts.length;
    return ((avgEngagement / analytics.followersCount) * 100);
  };

  /**
   * Render account not linked state
   */
  if (!account.isLinked) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <Text size="4" weight="medium" className="mb-2 block">
            Account Not Linked
          </Text>
          <Text size="2" color="gray" className="mb-4 block">
            Link your Instagram account to Ayrshare to view analytics and manage posts.
          </Text>
          <Button 
            onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')}
          >
            Link Instagram Account
          </Button>
        </div>
      </Card>
    );
  }

  /**
   * Render loading state
   */
  if (loading && !profileInfo) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-lime-500" />
          <Text>Loading Instagram account data...</Text>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <div>
            <Text size="5" weight="bold">{account.name}</Text>
            <Text size="2" color="gray" className="block">
              @{profileInfo?.username || 'Loading...'}
            </Text>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="soft" 
            size="2"
            onClick={fetchAccountData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="2"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <Text size="2" color="red">{error}</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Profile Overview */}
      {profileInfo && (
        <Card className="p-6">
          <div className="flex items-center gap-6 mb-6">
            {profileInfo.avatar && (
              <Image
                src={profileInfo.avatar}
                alt={profileInfo.displayName || account.name}
                width={80}
                height={80}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              <Text size="4" weight="bold" className="mb-1 block">
                {profileInfo.displayName || account.name}
              </Text>
              <Text size="2" color="gray" className="mb-3 block">
                {profileInfo.bio}
              </Text>
              {profileInfo.verified && (
                <Badge color="lime" size="1">✓ Verified</Badge>
              )}
            </div>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <Text size="4" weight="bold" className="block">
                {formatNumber(profileInfo.postsCount)}
              </Text>
              <Text size="1" color="gray">Posts</Text>
            </div>
            <div>
              <Text size="4" weight="bold" className="block">
                {formatNumber(profileInfo.followersCount)}
              </Text>
              <Text size="1" color="gray">Followers</Text>
            </div>
            <div>
              <Text size="4" weight="bold" className="block">
                {formatNumber(profileInfo.followingCount)}
              </Text>
              <Text size="1" color="gray">Following</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Analytics Overview */}
      {analyticsAvailable && analytics && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Text size="4" weight="bold">Analytics Overview</Text>
            <div className="flex items-center gap-2">
              <Text size="1" color="gray">Last {selectedTimeframe} days</Text>
              <select 
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as '7' | '30' | '90')}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-lime-50 rounded-lg">
              <Eye className="w-6 h-6 text-lime-500 mx-auto mb-2" />
              <Text size="3" weight="bold" className="block">
                {formatNumber(analytics.impressions)}
              </Text>
              <Text size="1" color="gray">Impressions</Text>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <Text size="3" weight="bold" className="block">
                {formatNumber(analytics.reach)}
              </Text>
              <Text size="1" color="gray">Reach</Text>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
              <Text size="3" weight="bold" className="block">
                {calculateEngagementRate().toFixed(1)}%
              </Text>
              <Text size="1" color="gray">Engagement Rate</Text>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <Text size="3" weight="bold" className="block">
                {formatNumber(analytics.profileViews)}
              </Text>
              <Text size="1" color="gray">Profile Views</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Posts */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Text size="4" weight="bold">Recent Posts</Text>
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-gray-500" />
            <Text size="2" color="gray">{recentPosts.length} posts</Text>
          </div>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.slice(0, 6).map((post) => (
              <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                {/* Post Image Placeholder */}
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  {post.mediaUrls && post.mediaUrls.length > 0 ? (
                    <Image
                      src={post.mediaUrls[0]}
                      alt="Post"
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Grid3X3 className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                
                {/* Post Info */}
                <div className="p-3">
                  <Text size="1" className="line-clamp-2 mb-2 block">
                    {post.post}
                  </Text>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      {post.likes !== undefined && (
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{formatNumber(post.likes)}</span>
                        </div>
                      )}
                      {post.comments !== undefined && (
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{formatNumber(post.comments)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Grid3X3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <Text size="2">No recent posts found</Text>
            <Text size="1" className="block mt-1">Posts will appear here once they're published</Text>
          </div>
        )}
      </Card>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center">
          <Text size="1" color="gray">
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </Text>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Instagram Account Settings</Dialog.Title>
          <Dialog.Description>
            Manage your Instagram account integration and analytics preferences.
          </Dialog.Description>

          <div className="space-y-4 mt-6">
            <div>
              <Text size="2" weight="medium" className="block mb-2">Account Information</Text>
              <div className="bg-gray-50 p-3 rounded">
                <Text size="1" color="gray">Account Name: {account.name}</Text><br />
                <Text size="1" color="gray">Platform: Instagram</Text><br />
                <Text size="1" color="gray">Status: {account.isLinked ? 'Linked' : 'Not Linked'}</Text>
              </div>
            </div>

            <div>
              <Text size="2" weight="medium" className="block mb-2">Available Features</Text>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <Text size="1">Analytics</Text>
                  <Badge color={analyticsAvailable ? "green" : "gray"}>
                    {analyticsAvailable ? "Available" : "Premium Only"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <Text size="1">Post History</Text>
                  <Badge color="green">Available</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <Text size="1">Profile Information</Text>
                  <Badge color="green">Available</Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="soft" onClick={() => setShowSettings(false)}>
              Close
            </Button>
            <Button onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')} className="bg-green-600 hover:bg-green-700 text-white">
              Manage in Ayrshare
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
} 