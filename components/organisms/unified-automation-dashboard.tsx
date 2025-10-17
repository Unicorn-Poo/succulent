'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { RefreshCw, Activity, TrendingUp, MessageCircle, Mail, Search, Clock, CheckCircle, AlertCircle, Pause, Play } from 'lucide-react';

interface AutomationActivity {
  id: string;
  type: 'post_scheduled' | 'comment_replied' | 'dm_sent' | 'hashtag_optimized' | 'content_discovered' | 'competitor_analyzed';
  title: string;
  description: string;
  platform: string;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  details?: any;
  impact?: string;
}

interface AutomationMetrics {
  today: {
    postsScheduled: number;
    commentsReplied: number;
    dmsSent: number;
    hashtagsOptimized: number;
    contentDiscovered: number;
    totalActions: number;
  };
  thisWeek: {
    followerGrowth: number;
    engagementIncrease: number;
    timesSaved: number; // in hours
    automationSuccessRate: number;
  };
  systemStatus: {
    autopilotEnabled: boolean;
    autoRepliesEnabled: boolean;
    autoSchedulingEnabled: boolean;
    dmAutomationEnabled: boolean;
    hashtagOptimizationEnabled: boolean;
  };
}

interface UnifiedAutomationDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function UnifiedAutomationDashboard({
  platform,
  profileKey,
  accountGroup
}: UnifiedAutomationDashboardProps) {
  const [activities, setActivities] = useState<AutomationActivity[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'success' | 'pending' | 'failed'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load automation metrics and activities
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    
    // Simulate loading real automation data
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate realistic automation metrics
    const todayMetrics = {
      postsScheduled: Math.floor(Math.random() * 8) + 2,
      commentsReplied: Math.floor(Math.random() * 25) + 10,
      dmsSent: Math.floor(Math.random() * 12) + 3,
      hashtagsOptimized: Math.floor(Math.random() * 15) + 5,
      contentDiscovered: Math.floor(Math.random() * 10) + 3,
      totalActions: 0
    };
    todayMetrics.totalActions = Object.values(todayMetrics).reduce((sum, val) => sum + val, 0) - todayMetrics.totalActions;

    const mockMetrics: AutomationMetrics = {
      today: todayMetrics,
      thisWeek: {
        followerGrowth: (Math.random() * 15) + 5, // 5-20%
        engagementIncrease: (Math.random() * 30) + 15, // 15-45%
        timesSaved: (Math.random() * 20) + 10, // 10-30 hours
        automationSuccessRate: (Math.random() * 15) + 85 // 85-100%
      },
      systemStatus: {
        autopilotEnabled: true,
        autoRepliesEnabled: true,
        autoSchedulingEnabled: true,
        dmAutomationEnabled: Math.random() > 0.5,
        hashtagOptimizationEnabled: true
      }
    };

    // Generate recent activities
    const mockActivities: AutomationActivity[] = [];
    const activityTypes = [
      {
        type: 'post_scheduled' as const,
        titles: ['Post scheduled for optimal engagement', 'Educational content scheduled', 'Trending topic post scheduled'],
        platforms: [platform]
      },
      {
        type: 'comment_replied' as const,
        titles: ['Auto-replied to positive comment', 'Responded to question', 'Acknowledged compliment'],
        platforms: [platform]
      },
      {
        type: 'dm_sent' as const,
        titles: ['Outreach DM sent to potential collaborator', 'Welcome message sent to new follower', 'Follow-up message sent'],
        platforms: [platform]
      },
      {
        type: 'hashtag_optimized' as const,
        titles: ['Hashtags optimized for trending topics', 'Underperforming hashtags replaced', 'New hashtag strategy implemented'],
        platforms: [platform]
      },
      {
        type: 'content_discovered' as const,
        titles: ['Trending content discovered from RSS feeds', 'Viral topic identified', 'Competitor content analyzed'],
        platforms: [platform]
      }
    ];

    // Generate 20 recent activities
    for (let i = 0; i < 20; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const title = activityType.titles[Math.floor(Math.random() * activityType.titles.length)];
      const timestamp = new Date(Date.now() - i * 30 * 60 * 1000).toISOString(); // Every 30 minutes
      
      mockActivities.push({
        id: `activity_${i}`,
        type: activityType.type,
        title,
        description: `Automated action executed successfully on ${platform}`,
        platform: activityType.platforms[0],
        timestamp,
        status: Math.random() > 0.1 ? 'success' : Math.random() > 0.5 ? 'pending' : 'failed',
        impact: `+${Math.floor(Math.random() * 50) + 10} engagement potential`
      });
    }

    setMetrics(mockMetrics);
    setActivities(mockActivities);
    setIsLoading(false);
  }, [platform]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, autoRefresh]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'post_scheduled': return <Clock className="w-4 h-4" />;
      case 'comment_replied': return <MessageCircle className="w-4 h-4" />;
      case 'dm_sent': return <Mail className="w-4 h-4" />;
      case 'hashtag_optimized': return <Search className="w-4 h-4" />;
      case 'content_discovered': return <TrendingUp className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'post_scheduled': return 'bg-blue-100 text-blue-600';
      case 'comment_replied': return 'bg-green-100 text-green-600';
      case 'dm_sent': return 'bg-purple-100 text-purple-600';
      case 'hashtag_optimized': return 'bg-yellow-100 text-yellow-600';
      case 'content_discovered': return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'today') {
      const today = new Date().toDateString();
      return new Date(activity.timestamp).toDateString() === today;
    }
    return activity.status === activeFilter;
  });

  const toggleAutomation = (type: keyof AutomationMetrics['systemStatus']) => {
    if (!metrics) return;
    
    setMetrics(prev => ({
      ...prev!,
      systemStatus: {
        ...prev!.systemStatus,
        [type]: !prev!.systemStatus[type]
      }
    }));
  };

  if (isLoading && !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading automation dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🤖 Automation Dashboard</h3>
            <p className="text-sm text-gray-600">Monitor all automated growth activities in real-time</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
          <Button onClick={loadDashboardData} disabled={isLoading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Today's Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{metrics.today.postsScheduled}</p>
              <p className="text-sm text-blue-700">Posts Scheduled</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{metrics.today.commentsReplied}</p>
              <p className="text-sm text-green-700">Comments Replied</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{metrics.today.dmsSent}</p>
              <p className="text-sm text-purple-700">DMs Sent</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Search className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-900">{metrics.today.hashtagsOptimized}</p>
              <p className="text-sm text-yellow-700">Hashtags Optimized</p>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold text-indigo-900">{metrics.today.contentDiscovered}</p>
              <p className="text-sm text-indigo-700">Content Discovered</p>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg text-center border border-blue-200">
              <div className="flex items-center justify-center mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{metrics.today.totalActions}</p>
              <p className="text-sm text-blue-700">Total Actions</p>
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-green-200 p-4 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Follower Growth</h4>
              <p className="text-3xl font-bold text-green-900">{metrics.thisWeek.followerGrowth.toFixed(1)}%</p>
              <p className="text-sm text-green-600">This week</p>
            </div>
            
            <div className="bg-white border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Engagement Boost</h4>
              <p className="text-3xl font-bold text-blue-900">{metrics.thisWeek.engagementIncrease.toFixed(1)}%</p>
              <p className="text-sm text-blue-600">vs last week</p>
            </div>
            
            <div className="bg-white border border-purple-200 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Time Saved</h4>
              <p className="text-3xl font-bold text-purple-900">{metrics.thisWeek.timesSaved.toFixed(1)}h</p>
              <p className="text-sm text-purple-600">This week</p>
            </div>
            
            <div className="bg-white border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Success Rate</h4>
              <p className="text-3xl font-bold text-yellow-900">{metrics.thisWeek.automationSuccessRate.toFixed(1)}%</p>
              <p className="text-sm text-yellow-600">Automation accuracy</p>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h4 className="font-medium text-gray-900 mb-4">🔧 Automation System Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(metrics.systemStatus).map(([key, enabled]) => {
                const labels = {
                  autopilotEnabled: 'AI Autopilot',
                  autoRepliesEnabled: 'Auto-Replies',
                  autoSchedulingEnabled: 'Auto-Scheduling',
                  dmAutomationEnabled: 'DM Automation',
                  hashtagOptimizationEnabled: 'Hashtag Optimization'
                };

                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-sm font-medium">{labels[key as keyof typeof labels]}</span>
                    </div>
                    <button
                      onClick={() => toggleAutomation(key as keyof AutomationMetrics['systemStatus'])}
                      className={`p-1 rounded ${enabled ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                      {enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">📋 Recent Automation Activity</h4>
          
          {/* Activity Filters */}
          <div className="flex items-center space-x-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'today', label: 'Today' },
              { key: 'success', label: 'Success' },
              { key: 'pending', label: 'Pending' },
              { key: 'failed', label: 'Failed' }
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key as any)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  activeFilter === filter.key
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter.label} ({activities.filter(a => {
                  if (filter.key === 'all') return true;
                  if (filter.key === 'today') {
                    const today = new Date().toDateString();
                    return new Date(a.timestamp).toDateString() === today;
                  }
                  return a.status === filter.key;
                }).length})
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.map(activity => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-gray-900">{activity.title}</h5>
                  <div className="flex items-center space-x-2">
                    {activity.impact && (
                      <span className="text-xs text-green-600 font-medium">{activity.impact}</span>
                    )}
                    {getStatusIcon(activity.status)}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>{activity.platform}</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded-full ${
                    activity.status === 'success' ? 'bg-green-100 text-green-800' :
                    activity.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No activities found for the selected filter
          </div>
        )}
      </div>

      {/* Real-time Status */}
      <div className="mt-6 flex items-center justify-between text-xs text-gray-500 border-t pt-4">
        <span>
          Last updated: {new Date().toLocaleString()}
          {autoRefresh && <span className="ml-2">• Auto-refresh enabled</span>}
        </span>
        <span className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>System active</span>
        </span>
      </div>
    </div>
  );
}
