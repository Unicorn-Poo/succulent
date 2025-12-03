'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { getEnhancedOptimalTiming } from '../../utils/optimalTimingEngine';

interface AutoScheduleRule {
  id: string;
  name: string;
  platform: string;
  enabled: boolean;
  schedule: {
    timezone: string;
    days: string[];
    times: string[];
    frequency: 'daily' | 'weekly' | 'custom';
  };
  contentFilters: {
    categories: string[];
    minEngagementPotential: number;
    requiresApproval: boolean;
    excludeKeywords: string[];
  };
  postingLimits: {
    maxPerDay: number;
    maxPerWeek: number;
    minInterval: number; // minutes between posts
  };
  createdAt: string;
  lastTriggered?: string;
  postsScheduled: number;
}

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  scheduledDate: string;
  status: 'pending' | 'posted' | 'failed' | 'cancelled';
  rule: string;
  engagementPotential: number;
  createdAt: string;
  postedAt?: string;
  error?: string;
}

interface AutoScheduleMetrics {
  totalRules: number;
  activeRules: number;
  postsScheduled: number;
  postsPosted: number;
  avgEngagement: number;
  nextScheduledPost?: ScheduledPost;
  upcomingPosts: ScheduledPost[];
}

interface AutoScheduleManagerProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function AutoScheduleManager({
  platform,
  profileKey,
  accountGroup
}: AutoScheduleManagerProps) {
  const [rules, setRules] = useState<AutoScheduleRule[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [metrics, setMetrics] = useState<AutoScheduleMetrics | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'scheduled' | 'metrics' | 'settings'>('rules');
  const [isLoading, setIsLoading] = useState(false);
  const [optimalTimes, setOptimalTimes] = useState<string[]>([]);
  const [newRule, setNewRule] = useState<Partial<AutoScheduleRule>>({
    name: '',
    platform,
    enabled: true,
    schedule: {
      timezone: 'UTC',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      times: ['9:00 AM', '1:00 PM', '5:00 PM'],
      frequency: 'daily'
    },
    contentFilters: {
      categories: ['educational', 'engagement'],
      minEngagementPotential: 70,
      requiresApproval: false,
      excludeKeywords: ['controversial', 'political']
    },
    postingLimits: {
      maxPerDay: 3,
      maxPerWeek: 15,
      minInterval: 120 // 2 hours
    }
  });

  // Load optimal times for the platform
  useEffect(() => {
    const loadOptimalTimes = async () => {
      try {
        const timing = await getEnhancedOptimalTiming(platform, profileKey);
        const times = timing.bestTimes
          .slice(0, 5)
          .map(time => {
            const hour = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
            const ampm = time.hour >= 12 ? 'PM' : 'AM';
            return `${hour}:00 ${ampm}`;
          });
        setOptimalTimes(times);
      } catch (error) {
        console.error('Error loading optimal times:', error);
        // Fallback to default times
        setOptimalTimes(['9:00 AM', '1:00 PM', '5:00 PM']);
      }
    };

    loadOptimalTimes();
  }, [platform, profileKey]);

  // Initialize with sample data
  useEffect(() => {
    const sampleRules: AutoScheduleRule[] = [
      {
        id: 'rule_1',
        name: 'Daily Educational Content',
        platform,
        enabled: true,
        schedule: {
          timezone: 'UTC',
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          times: optimalTimes.slice(0, 2),
          frequency: 'daily'
        },
        contentFilters: {
          categories: ['educational', 'tips'],
          minEngagementPotential: 75,
          requiresApproval: false,
          excludeKeywords: ['controversial']
        },
        postingLimits: {
          maxPerDay: 2,
          maxPerWeek: 10,
          minInterval: 240
        },
        createdAt: new Date().toISOString(),
        postsScheduled: 12
      },
      {
        id: 'rule_2',
        name: 'Weekend Engagement Posts',
        platform,
        enabled: true,
        schedule: {
          timezone: 'UTC',
          days: ['Saturday', 'Sunday'],
          times: ['11:00 AM', '3:00 PM'],
          frequency: 'weekly'
        },
        contentFilters: {
          categories: ['engagement', 'lifestyle'],
          minEngagementPotential: 80,
          requiresApproval: false,
          excludeKeywords: ['work', 'business']
        },
        postingLimits: {
          maxPerDay: 2,
          maxPerWeek: 4,
          minInterval: 180
        },
        createdAt: new Date().toISOString(),
        postsScheduled: 8
      }
    ];

    const sampleScheduledPosts: ScheduledPost[] = [
      {
        id: 'post_1',
        title: '5 Tips for Better Social Media Engagement',
        content: '🚀 Want to boost your social media engagement? Here are 5 proven strategies...',
        platforms: [platform],
        scheduledDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        status: 'pending',
        rule: 'Daily Educational Content',
        engagementPotential: 85,
        createdAt: new Date().toISOString()
      },
      {
        id: 'post_2',
        title: 'What\'s your favorite productivity hack?',
        content: '💡 Question for the community: What\'s one productivity hack that changed your life?',
        platforms: [platform],
        scheduledDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
        status: 'pending',
        rule: 'Daily Educational Content',
        engagementPotential: 78,
        createdAt: new Date().toISOString()
      },
      {
        id: 'post_3',
        title: 'Weekend Motivation',
        content: '✨ Weekend vibes: Remember that every small step counts towards your goals!',
        platforms: [platform],
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        status: 'pending',
        rule: 'Weekend Engagement Posts',
        engagementPotential: 82,
        createdAt: new Date().toISOString()
      }
    ];

    setRules(sampleRules);
    setScheduledPosts(sampleScheduledPosts);
    updateMetrics(sampleRules, sampleScheduledPosts);
  }, [platform, optimalTimes]);

  const updateMetrics = (currentRules: AutoScheduleRule[], currentPosts: ScheduledPost[]) => {
    const activeRules = currentRules.filter(r => r.enabled).length;
    const pendingPosts = currentPosts.filter(p => p.status === 'pending');
    const postedPosts = currentPosts.filter(p => p.status === 'posted');
    const nextPost = pendingPosts.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    )[0];

    const newMetrics: AutoScheduleMetrics = {
      totalRules: currentRules.length,
      activeRules,
      postsScheduled: pendingPosts.length,
      postsPosted: postedPosts.length,
      avgEngagement: postedPosts.length > 0 
        ? postedPosts.reduce((sum, post) => sum + post.engagementPotential, 0) / postedPosts.length 
        : 0,
      nextScheduledPost: nextPost,
      upcomingPosts: pendingPosts.slice(0, 5)
    };

    setMetrics(newMetrics);
  };

  const createRule = () => {
    if (!newRule.name) {
      alert('Please enter a rule name');
      return;
    }

    const rule: AutoScheduleRule = {
      id: `rule_${Date.now()}`,
      name: newRule.name,
      platform: newRule.platform || platform,
      enabled: newRule.enabled !== false,
      schedule: newRule.schedule || {
        timezone: 'UTC',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        times: optimalTimes.slice(0, 2),
        frequency: 'daily'
      },
      contentFilters: newRule.contentFilters || {
        categories: ['educational'],
        minEngagementPotential: 70,
        requiresApproval: false,
        excludeKeywords: []
      },
      postingLimits: newRule.postingLimits || {
        maxPerDay: 2,
        maxPerWeek: 10,
        minInterval: 120
      },
      createdAt: new Date().toISOString(),
      postsScheduled: 0
    };

    const updatedRules = [...rules, rule];
    setRules(updatedRules);
    updateMetrics(updatedRules, scheduledPosts);

    // Reset form
    setNewRule({
      name: '',
      platform,
      enabled: true,
      schedule: {
        timezone: 'UTC',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        times: optimalTimes.slice(0, 2),
        frequency: 'daily'
      },
      contentFilters: {
        categories: ['educational'],
        minEngagementPotential: 70,
        requiresApproval: false,
        excludeKeywords: []
      },
      postingLimits: {
        maxPerDay: 2,
        maxPerWeek: 10,
        minInterval: 120
      }
    });
  };

  const toggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    );
    setRules(updatedRules);
    updateMetrics(updatedRules, scheduledPosts);
  };

  const deleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId);
    setRules(updatedRules);
    updateMetrics(updatedRules, scheduledPosts);
  };

  const cancelScheduledPost = (postId: string) => {
    const updatedPosts = scheduledPosts.map(post => 
      post.id === postId 
        ? { ...post, status: 'cancelled' as const }
        : post
    );
    setScheduledPosts(updatedPosts);
    updateMetrics(rules, updatedPosts);
  };

  const reschedulePost = (postId: string) => {
    const newDate = prompt('Enter new date and time (YYYY-MM-DD HH:MM):');
    if (!newDate) return;

    try {
      const scheduledDate = new Date(newDate).toISOString();
      const updatedPosts = scheduledPosts.map(post => 
        post.id === postId 
          ? { ...post, scheduledDate }
          : post
      );
      setScheduledPosts(updatedPosts);
      updateMetrics(rules, updatedPosts);
    } catch (error) {
      alert('Invalid date format');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'cancelled': return 'bg-muted text-foreground';
      default: return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Auto-Schedule Manager</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm ${
            metrics?.activeRules && metrics.activeRules > 0 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
              : 'bg-muted text-foreground'
          }`}>
            {metrics?.activeRules || 0} Active Rules
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'rules', label: `Rules (${rules.length})` },
            { key: 'scheduled', label: `Scheduled (${scheduledPosts.filter(p => p.status === 'pending').length})` },
            { key: 'metrics', label: 'Metrics' },
            { key: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Create New Rule */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Create Auto-Schedule Rule</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                placeholder="Rule name"
                value={newRule.name || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
              />
              <select
                value={newRule.schedule?.frequency || 'daily'}
                onChange={(e) => setNewRule(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule!, frequency: e.target.value as any }
                }))}
                className="px-3 py-2 border border-border rounded-lg"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Posting Times</label>
                <div className="flex flex-wrap gap-2">
                  {optimalTimes.map(time => (
                    <label key={time} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={newRule.schedule?.times?.includes(time) || false}
                        onChange={(e) => {
                          const times = newRule.schedule?.times || [];
                          const updatedTimes = e.target.checked
                            ? [...times, time]
                            : times.filter(t => t !== time);
                          setNewRule(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule!, times: updatedTimes }
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{time}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Posts Per Day</label>
                <Input
                  type="number"
                  value={newRule.postingLimits?.maxPerDay || 2}
                  onChange={(e) => setNewRule(prev => ({
                    ...prev,
                    postingLimits: { 
                      ...prev.postingLimits!, 
                      maxPerDay: parseInt(e.target.value) 
                    }
                  }))}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={createRule}>Create Rule</Button>
            </div>
          </div>

          {/* Existing Rules */}
          <div className="space-y-4">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-foreground">{rule.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      rule.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-muted text-foreground'
                    }`}>
                      {rule.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => toggleRule(rule.id)}
                      size="sm"
                      variant="outline"
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      onClick={() => deleteRule(rule.id)}
                      size="sm"
                      variant="outline"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Schedule</p>
                    <p>Frequency: {rule.schedule.frequency}</p>
                    <p>Times: {rule.schedule.times.join(', ')}</p>
                    <p>Days: {rule.schedule.days.length} selected</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">Content Filters</p>
                    <p>Min Engagement: {rule.contentFilters.minEngagementPotential}%</p>
                    <p>Categories: {rule.contentFilters.categories.join(', ')}</p>
                    <p>Approval: {rule.contentFilters.requiresApproval ? 'Required' : 'Not required'}</p>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">Limits</p>
                    <p>Max/Day: {rule.postingLimits.maxPerDay}</p>
                    <p>Max/Week: {rule.postingLimits.maxPerWeek}</p>
                    <p>Min Interval: {rule.postingLimits.minInterval}m</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created: {formatDateTime(rule.createdAt)}</span>
                  <span>Posts Scheduled: {rule.postsScheduled}</span>
                  {rule.lastTriggered && (
                    <span>Last Triggered: {formatDateTime(rule.lastTriggered)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          {scheduledPosts
            .filter(post => post.status === 'pending')
            .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
            .map(post => (
              <div key={post.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{post.title}</h4>
                    <p className="text-foreground mt-1">{post.content}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => reschedulePost(post.id)}
                      size="sm"
                      variant="outline"
                    >
                      Reschedule
                    </Button>
                    <Button
                      onClick={() => cancelScheduledPost(post.id)}
                      size="sm"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <span>📅 {formatDateTime(post.scheduledDate)}</span>
                    <span>📊 {post.engagementPotential}% potential</span>
                    <span>📱 {post.platforms.join(', ')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Rule: {post.rule}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(post.status)}`}>
                      {post.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}

          {scheduledPosts.filter(post => post.status === 'pending').length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No posts scheduled
            </div>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-lime-50 dark:bg-lime-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-lime-900 dark:text-lime-300">{metrics.totalRules}</p>
              <p className="text-sm text-lime-700 dark:text-lime-300">Total Rules</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-900 dark:text-green-300">{metrics.activeRules}</p>
              <p className="text-sm text-green-700 dark:text-green-300">Active Rules</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">{metrics.postsScheduled}</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">Posts Scheduled</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">{metrics.postsPosted}</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Posts Posted</p>
            </div>
          </div>

          {/* Next Scheduled Post */}
          {metrics.nextScheduledPost && (
            <div className="p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
              <h4 className="font-medium text-lime-800 dark:text-lime-300 mb-2">Next Scheduled Post</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{metrics.nextScheduledPost.title}</p>
                  <p className="text-sm text-lime-700 dark:text-lime-300">
                    {formatDateTime(metrics.nextScheduledPost.scheduledDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-lime-600 dark:text-lime-400">
                    {metrics.nextScheduledPost.engagementPotential}% potential
                  </p>
                  <p className="text-xs text-lime-500">
                    {metrics.nextScheduledPost.platforms.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Posts */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Upcoming Posts</h4>
            <div className="space-y-2">
              {metrics.upcomingPosts.slice(0, 5).map(post => (
                <div key={post.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">{post.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Global Settings</h4>
            <div className="space-y-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Enable auto-scheduling system</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" defaultChecked className="rounded" />
                <span>Send notifications for scheduled posts</span>
              </label>
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="rounded" />
                <span>Require approval for all auto-scheduled posts</span>
              </label>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Optimal Times for {platform}</h4>
            <div className="flex flex-wrap gap-2">
              {optimalTimes.map(time => (
                <span key={time} className="px-3 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded-full text-sm">
                  {time}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These times are automatically calculated based on your audience engagement patterns.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
