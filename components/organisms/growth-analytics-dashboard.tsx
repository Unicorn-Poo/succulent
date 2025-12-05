'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';

interface GrowthMetrics {
  platform: string;
  timeframe: string;
  followerGrowth: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
  engagementGrowth: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
  contentPerformance: {
    totalPosts: number;
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    bestPerformingPost: any;
    worstPerformingPost: any;
  };
  audienceInsights: {
    demographics: Record<string, number>;
    activeHours: Record<string, number>;
    topInterests: string[];
    engagementPatterns: Record<string, number>;
  };
  competitorComparison?: {
    yourEngagementRate: number;
    averageEngagementRate: number;
    yourFollowerGrowth: number;
    averageFollowerGrowth: number;
    ranking: number;
    totalCompetitors: number;
  };
  followerAnalytics?: {
    totalFollowers: number;
    newFollowers: number;
    unfollowers: number;
    netGrowth: number;
    growthRate: number;
    projectedGrowth: number;
    dailyGrowth: { date: string; followers: number; growth: number }[];
    followerSources: Record<string, number>;
    followerQuality: {
      realAccounts: number;
      suspiciousAccounts: number;
      qualityScore: number;
    };
  };
  recommendations: string[];
  lastUpdated: string;
}

interface GrowthAnalyticsDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function GrowthAnalyticsDashboard({
  platform,
  profileKey,
  accountGroup
}: GrowthAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'followers' | 'engagement' | 'content' | 'audience'>('overview');
  const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState(false);

  const loadGrowthMetrics = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        platform,
        timeframe,
        includeCompetitorAnalysis: includeCompetitorAnalysis.toString()
      });

      if (profileKey) {
        params.append('profileKey', profileKey);
      }

      const response = await fetch(`/api/growth-analytics?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading growth metrics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, profileKey, timeframe, includeCompetitorAnalysis]);

  useEffect(() => {
    loadGrowthMetrics();
  }, [loadGrowthMetrics]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  if (isLoading && !metrics) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-seafoam"></div>
          <span className="ml-2 text-muted-foreground">Loading growth analytics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load growth analytics</p>
          <Button onClick={loadGrowthMetrics} className="mt-4" size="sm">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Growth Analytics Dashboard</h3>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={includeCompetitorAnalysis}
              onChange={(e) => setIncludeCompetitorAnalysis(e.target.checked)}
              className="rounded"
            />
            <span>Include Competitors</span>
          </label>

          <Button onClick={loadGrowthMetrics} disabled={isLoading} size="sm">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-brand-mint/10 dark:bg-brand-seafoam/20 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-brand-seafoam dark:text-brand-mint">Followers</h4>
            <span className={`text-sm ${getTrendColor(metrics.followerGrowth.trend)}`}>
              {getTrendIcon(metrics.followerGrowth.trend)}
            </span>
          </div>
          <p className="text-2xl font-bold text-brand-seafoam dark:text-brand-mint">
            {formatNumber(metrics.followerGrowth.current)}
          </p>
          <p className={`text-sm ${getTrendColor(metrics.followerGrowth.trend)}`}>
            {formatPercent(metrics.followerGrowth.changePercent)} vs previous period
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-green-800 dark:text-green-300">Engagement</h4>
            <span className={`text-sm ${getTrendColor(metrics.engagementGrowth.trend)}`}>
              {getTrendIcon(metrics.engagementGrowth.trend)}
            </span>
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-300">
            {formatNumber(metrics.engagementGrowth.current)}
          </p>
          <p className={`text-sm ${getTrendColor(metrics.engagementGrowth.trend)}`}>
            {formatPercent(metrics.engagementGrowth.changePercent)} vs previous period
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Posts</h4>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
            {metrics.contentPerformance.totalPosts}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {Math.round(metrics.contentPerformance.avgLikes)} avg likes
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Growth Rate</h4>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
            {metrics.followerAnalytics ? 
              formatPercent(metrics.followerAnalytics.growthRate) : 
              formatPercent(metrics.followerGrowth.changePercent)}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {timeframe} growth rate
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'followers', label: 'Followers' },
            { key: 'engagement', label: 'Engagement' },
            { key: 'content', label: 'Content' },
            { key: 'audience', label: 'Audience' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-seafoam text-brand-seafoam dark:text-brand-mint'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="bg-brand-mint/10 dark:bg-brand-seafoam/20 p-4 rounded-lg">
            <h4 className="font-medium text-brand-seafoam dark:text-brand-mint mb-3">Growth Recommendations</h4>
            <ul className="space-y-2">
              {metrics.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2 text-brand-seafoam dark:text-brand-mint">
                  <span className="text-brand-seafoam mt-1">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Competitor Comparison */}
          {metrics.competitorComparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3">Engagement Rate Comparison</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Your Rate</span>
                    <span className="font-bold text-brand-seafoam dark:text-brand-mint">
                      {metrics.competitorComparison.yourEngagementRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Industry Average</span>
                    <span className="font-bold text-muted-foreground">
                      {metrics.competitorComparison.averageEngagementRate}%
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className={`text-sm ${
                      metrics.competitorComparison.yourEngagementRate > metrics.competitorComparison.averageEngagementRate
                        ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {metrics.competitorComparison.yourEngagementRate > metrics.competitorComparison.averageEngagementRate
                        ? '📈 Above average' : '📉 Below average'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-border rounded-lg">
                <h4 className="font-medium mb-3">Growth Rate Comparison</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Your Growth</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {metrics.competitorComparison.yourFollowerGrowth}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Industry Average</span>
                    <span className="font-bold text-muted-foreground">
                      {metrics.competitorComparison.averageFollowerGrowth}%
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-sm text-brand-seafoam dark:text-brand-mint">
                      Ranking: #{metrics.competitorComparison.ranking} of {metrics.competitorComparison.totalCompetitors}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'followers' && metrics.followerAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300">New Followers</h4>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                +{formatNumber(metrics.followerAnalytics.newFollowers)}
              </p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h4 className="font-medium text-red-800 dark:text-red-300">Unfollowers</h4>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                -{formatNumber(metrics.followerAnalytics.unfollowers)}
              </p>
            </div>
            
            <div className="p-4 bg-brand-mint/10 dark:bg-brand-seafoam/20 rounded-lg">
              <h4 className="font-medium text-brand-seafoam dark:text-brand-mint">Net Growth</h4>
              <p className="text-2xl font-bold text-brand-seafoam dark:text-brand-mint">
                {metrics.followerAnalytics.netGrowth > 0 ? '+' : ''}{formatNumber(metrics.followerAnalytics.netGrowth)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3">Follower Sources</h4>
              <div className="space-y-2">
                {Object.entries(metrics.followerAnalytics.followerSources).map(([source, percent]) => (
                  <div key={source} className="flex items-center justify-between">
                    <span className="capitalize">{source}</span>
                    <span className="font-medium text-foreground">{percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3">Follower Quality</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Real Accounts</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatNumber(metrics.followerAnalytics.followerQuality.realAccounts)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Suspicious</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatNumber(metrics.followerAnalytics.followerQuality.suspiciousAccounts)}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span>Quality Score</span>
                    <span className={`font-bold ${
                      metrics.followerAnalytics.followerQuality.qualityScore >= 80 
                        ? 'text-green-600 dark:text-green-400' 
                        : metrics.followerAnalytics.followerQuality.qualityScore >= 60 
                          ? 'text-yellow-600' 
                          : 'text-red-600 dark:text-red-400'
                    }`}>
                      {metrics.followerAnalytics.followerQuality.qualityScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-pink-50 rounded-lg">
              <h4 className="font-medium text-pink-800">Average Likes</h4>
              <p className="text-2xl font-bold text-pink-900">
                {formatNumber(metrics.contentPerformance.avgLikes)}
              </p>
            </div>
            
            <div className="p-4 bg-brand-mint/10 dark:bg-brand-seafoam/20 rounded-lg">
              <h4 className="font-medium text-brand-seafoam dark:text-brand-mint">Average Comments</h4>
              <p className="text-2xl font-bold text-brand-seafoam dark:text-brand-mint">
                {formatNumber(metrics.contentPerformance.avgComments)}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300">Average Shares</h4>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {formatNumber(metrics.contentPerformance.avgShares)}
              </p>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Engagement Patterns</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.audienceInsights.engagementPatterns).map(([type, percent]) => (
                <div key={type} className="text-center">
                  <p className="text-2xl font-bold text-foreground">{percent}%</p>
                  <p className="text-sm text-muted-foreground capitalize">{type}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="space-y-6">
          {metrics.contentPerformance.bestPerformingPost && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Best Performing Post</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-300">
                    {metrics.contentPerformance.bestPerformingPost.likes || 0}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Likes</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-300">
                    {metrics.contentPerformance.bestPerformingPost.comments || 0}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Comments</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-900 dark:text-green-300">
                    {metrics.contentPerformance.bestPerformingPost.shares || 0}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">Shares</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Content Performance Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-brand-seafoam dark:text-brand-mint">
                  {metrics.contentPerformance.totalPosts}
                </p>
                <p className="text-sm text-muted-foreground">Total Posts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-600">
                  {formatNumber(metrics.contentPerformance.avgLikes)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Likes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatNumber(metrics.contentPerformance.avgComments)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Comments</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(metrics.contentPerformance.avgShares)}
                </p>
                <p className="text-sm text-muted-foreground">Avg Shares</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audience' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3">Age Demographics</h4>
              <div className="space-y-2">
                {Object.entries(metrics.audienceInsights.demographics).map(([age, percent]) => (
                  <div key={age} className="flex items-center justify-between">
                    <span>{age}</span>
                    <span className="font-medium text-foreground">{percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3">Active Hours</h4>
              <div className="space-y-2">
                {Object.entries(metrics.audienceInsights.activeHours)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([hour, activity]) => (
                    <div key={hour} className="flex items-center justify-between">
                      <span>{hour}:00</span>
                      <span className="font-medium text-foreground">{activity}% active</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Top Interests</h4>
            <div className="flex flex-wrap gap-2">
              {metrics.audienceInsights.topInterests.map(interest => (
                <span 
                  key={interest}
                  className="px-3 py-1 bg-brand-mint/20 dark:bg-brand-seafoam/20 text-brand-seafoam dark:text-brand-mint rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-xs text-muted-foreground text-center">
        Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
