"use client";

import { Card, Text, Button, Badge, Tabs } from "@radix-ui/themes";
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2, 
  Clock, 
  Users, 
  BarChart3,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  getAccountOverview,
  getEngagementInsights,
  getPostHistory,
  getOptimalPostTimes,
  PostAnalytics,
  EngagementInsights,
  HistoricalPost,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";

interface AnalyticsDashboardProps {
  accountGroup: any;
  selectedPlatforms?: string[];
  timeframe?: '7d' | '30d' | '90d';
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

const MetricCard = ({ title, value, change, icon, trend = 'neutral', loading }: MetricCardProps) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingDown className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-lime-50 rounded-lg">
          {icon}
        </div>
        {!loading && change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Text size="1" color="gray" className="uppercase tracking-wide">{title}</Text>
        <Text size="5" weight="bold">
          {loading ? (
            <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
          ) : (
            typeof value === 'number' ? value.toLocaleString() : value
          )}
        </Text>
      </div>
    </Card>
  );
};

const PostPerformanceChart = ({ posts, loading }: { posts: HistoricalPost[], loading: boolean }) => {
  const chartData = useMemo(() => {
    return posts.slice(0, 10).map(post => ({
      title: post.post.substring(0, 30) + '...',
      engagement: (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
      likes: post.likes || 0,
      comments: post.comments || 0,
      shares: post.shares || 0,
      date: new Date(post.publishedAt).toLocaleDateString()
    }));
  }, [posts]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-full h-8 bg-gray-200 animate-pulse rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const maxEngagement = Math.max(...chartData.map(item => item.engagement), 1);

  return (
    <div className="space-y-3">
      {chartData.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium truncate flex-1 mr-2">{item.title}</span>
            <span className="text-gray-500 text-xs">{item.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-lime-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(item.engagement / maxEngagement) * 100}%` }}
              ></div>
            </div>
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {item.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {item.comments}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="w-3 h-3" />
                {item.shares}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const OptimalTimesDisplay = ({ optimalTimes, loading }: { optimalTimes: any, loading: boolean }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const times = optimalTimes?.times || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => (
          <div key={day} className="text-center">
            <div className="text-xs font-medium text-gray-600 mb-2">{day}</div>
            <div className="space-y-1">
              {times.slice(index * 2, (index + 1) * 2).map((time: string, timeIndex: number) => (
                <div 
                  key={timeIndex}
                  className="bg-lime-100 text-lime-800 text-xs py-1 px-2 rounded text-center"
                >
                  {time}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 text-center">
        Times shown in your local timezone
      </div>
    </div>
  );
};

export default function AnalyticsDashboard({ 
  accountGroup, 
  selectedPlatforms = ['instagram'], 
  timeframe = '30d' 
}: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{
    overview: Record<string, any>;
    insights: Record<string, EngagementInsights>;
    posts: Record<string, HistoricalPost[]>;
    optimalTimes: Record<string, any>;
  }>({
    overview: {},
    insights: {},
    posts: {},
    optimalTimes: {}
  });
  const [error, setError] = useState<string | null>(null);

  const profileKey = accountGroup?.ayrshareProfileKey;
  const businessPlanAvailable = isFeatureAvailable('analytics');

  const fetchAnalyticsData = async () => {
    if (!businessPlanAvailable) {
      setError('Analytics features require Business Plan');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        selectedPlatforms.map(async (platform) => {
          const [overview, insights, posts, optimalTimes] = await Promise.allSettled([
            getAccountOverview(platform, profileKey),
            getEngagementInsights(platform, timeframe, profileKey),
            getPostHistory({ platform, lastRecords: 20 }, profileKey),
            getOptimalPostTimes(platform, profileKey)
          ]);

          return {
            platform,
            overview: overview.status === 'fulfilled' ? overview.value : null,
            insights: insights.status === 'fulfilled' ? insights.value : null,
            posts: posts.status === 'fulfilled' ? posts.value : [],
            optimalTimes: optimalTimes.status === 'fulfilled' ? optimalTimes.value : null
          };
        })
      );

      const successfulResults = results
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      const newData = successfulResults.reduce((acc, result) => {
        acc.overview[result.platform] = result.overview;
        acc.insights[result.platform] = result.insights;
        acc.posts[result.platform] = result.posts;
        acc.optimalTimes[result.platform] = result.optimalTimes;
        return acc;
      }, {
        overview: {},
        insights: {},
        posts: {},
        optimalTimes: {}
      });

      setData(newData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPlatforms.length > 0) {
      fetchAnalyticsData();
    }
  }, [selectedPlatforms, timeframe, profileKey]);

  const aggregatedMetrics = useMemo(() => {
    const totals = selectedPlatforms.reduce((acc, platform) => {
      const overview = data.overview[platform];
      const insights = data.insights[platform];
      
      if (overview) {
        acc.followers += overview.profile?.followersCount || 0;
        acc.following += overview.profile?.followingCount || 0;
        acc.posts += overview.profile?.postsCount || 0;
      }
      
      if (insights) {
        acc.engagement += insights.totalEngagement || 0;
        acc.engagementRate += insights.engagementRate || 0;
      }
      
      return acc;
    }, {
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      engagementRate: 0
    });

    // Average engagement rate across platforms
    totals.engagementRate = selectedPlatforms.length > 0 ? 
      totals.engagementRate / selectedPlatforms.length : 0;

    return totals;
  }, [data, selectedPlatforms]);

  if (!businessPlanAvailable) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <Text size="4" weight="bold" className="block mb-2">Analytics Dashboard</Text>
            <Text size="2" color="gray" className="block mb-4">
              Advanced analytics features require Ayrshare Business Plan
            </Text>
            <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
              Upgrade to Business Plan
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-600">
            <Text size="3" weight="medium">Analytics Error</Text>
            <Text size="2" className="block mt-2">{error}</Text>
          </div>
          <Button onClick={fetchAnalyticsData} variant="soft">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
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
          <Text size="5" weight="bold">Analytics Dashboard</Text>
          <Text size="2" color="gray" className="mt-1">
            {selectedPlatforms.join(', ')} • Last {timeframe === '7d' ? '7 days' : timeframe === '30d' ? '30 days' : '90 days'}
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="soft" size="2">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="soft" size="2">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={fetchAnalyticsData} size="2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Followers"
          value={aggregatedMetrics.followers}
          icon={<Users className="w-5 h-5 text-lime-600" />}
          trend="up"
          change={12}
          loading={isLoading}
        />
        <MetricCard
          title="Total Engagement"
          value={aggregatedMetrics.engagement}
          icon={<Heart className="w-5 h-5 text-lime-600" />}
          trend="up"
          change={8}
          loading={isLoading}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${aggregatedMetrics.engagementRate.toFixed(1)}%`}
          icon={<TrendingUp className="w-5 h-5 text-lime-600" />}
          trend="up"
          change={3}
          loading={isLoading}
        />
        <MetricCard
          title="Total Posts"
          value={aggregatedMetrics.posts}
          icon={<BarChart3 className="w-5 h-5 text-lime-600" />}
          trend="neutral"
          loading={isLoading}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
          <Tabs.Trigger value="posts">Post Performance</Tabs.Trigger>
          <Tabs.Trigger value="timing">Optimal Timing</Tabs.Trigger>
          <Tabs.Trigger value="insights">Audience Insights</Tabs.Trigger>
        </Tabs.List>

        <div className="mt-6">
          <Tabs.Content value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedPlatforms.map(platform => (
                <Card key={platform} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <Text size="3" weight="medium" className="capitalize">{platform} Overview</Text>
                    <Badge variant="soft">{data.overview[platform]?.profile?.followersCount || 0} followers</Badge>
                  </div>
                  
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Engagement Rate:</span>
                        <span className="font-medium">
                          {data.insights[platform]?.engagementRate?.toFixed(1) || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Posts:</span>
                        <span className="font-medium">
                          {data.overview[platform]?.profile?.postsCount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Following:</span>
                        <span className="font-medium">
                          {data.overview[platform]?.profile?.followingCount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Recent Posts:</span>
                        <span className="font-medium">
                          {data.posts[platform]?.length || 0}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="posts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedPlatforms.map(platform => (
                <Card key={platform} className="p-4">
                  <Text size="3" weight="medium" className="mb-4 block capitalize">
                    {platform} Post Performance
                  </Text>
                  <PostPerformanceChart 
                    posts={data.posts[platform] || []} 
                    loading={isLoading}
                  />
                </Card>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="timing">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedPlatforms.map(platform => (
                <Card key={platform} className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-lime-600" />
                    <Text size="3" weight="medium" className="capitalize">
                      {platform} Optimal Times
                    </Text>
                  </div>
                  <OptimalTimesDisplay 
                    optimalTimes={data.optimalTimes[platform]} 
                    loading={isLoading}
                  />
                </Card>
              ))}
            </div>
          </Tabs.Content>

          <Tabs.Content value="insights">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {selectedPlatforms.map(platform => (
                <Card key={platform} className="p-4">
                  <Text size="3" weight="medium" className="mb-4 block capitalize">
                    {platform} Audience Insights
                  </Text>
                  
                  {isLoading ? (
                    <div className="space-y-4">
                      <div className="h-32 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-24 bg-gray-200 animate-pulse rounded"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Best Performing Posts */}
                      <div>
                        <Text size="2" weight="medium" className="mb-3 block">Best Performing Posts</Text>
                        <div className="space-y-2">
                          {data.insights[platform]?.bestPerformingPosts?.slice(0, 3).map((post, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <Text size="1" className="block text-gray-900 mb-1">
                                {post.post.substring(0, 100)}...
                              </Text>
                              <div className="flex gap-3 text-xs text-gray-600">
                                <span>{post.likes || 0} likes</span>
                                <span>{post.comments || 0} comments</span>
                                <span>{post.shares || 0} shares</span>
                              </div>
                            </div>
                          )) || (
                            <Text size="2" color="gray">No performance data available</Text>
                          )}
                        </div>
                      </div>

                      {/* Audience Demographics */}
                      {data.insights[platform]?.audienceInsights && (
                        <div>
                          <Text size="2" weight="medium" className="mb-3 block">Audience Demographics</Text>
                          <div className="space-y-2">
                            {Object.entries(data.insights[platform].audienceInsights.demographics || {}).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-gray-600 capitalize">{key.replace('_', ' ')}:</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
} 