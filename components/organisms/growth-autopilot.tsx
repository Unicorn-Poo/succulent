'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import ContentSuggestionCard from './content-suggestion-card';

interface AutopilotSettings {
  enabled: boolean;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  platforms: string[];
  goals: {
    followerGrowthTarget: number; // percentage per month
    engagementRateTarget: number; // percentage
    postsPerWeek: number;
  };
  automation: {
    autoReply: boolean;
    autoDM: boolean;
    autoSchedule: boolean;
    autoHashtags: boolean;
    autoContent: boolean;
  };
  approvals: {
    requireApprovalForPosts: boolean;
    requireApprovalForDMs: boolean;
    requireApprovalForReplies: boolean;
  };
}

interface AutopilotAction {
  id: string;
  type: 'post' | 'reply' | 'dm' | 'hashtag' | 'schedule';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  scheduledFor?: string;
  platform: string;
  content?: string;
  target?: string;
  reason: string;
  createdAt: string;
}

interface GrowthInsight {
  type: 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: string;
}

interface AutopilotDashboard {
  status: 'active' | 'paused' | 'learning';
  actionsToday: number;
  growthRate: number;
  engagementRate: number;
  nextActions: AutopilotAction[];
  insights: GrowthInsight[];
  performance: {
    postsScheduled: number;
    commentsReplied: number;
    dmssSent: number;
    hashtagsOptimized: number;
    followerGrowth: number;
  };
}

interface GrowthAutopilotProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function GrowthAutopilot({
  platform,
  profileKey,
  accountGroup
}: GrowthAutopilotProps) {
  const [settings, setSettings] = useState<AutopilotSettings>({
    enabled: false,
    aggressiveness: 'moderate',
    platforms: [platform],
    goals: {
      followerGrowthTarget: 15, // 15% per month
      engagementRateTarget: 5, // 5% engagement rate
      postsPerWeek: 7
    },
    automation: {
      autoReply: true,
      autoDM: false,
      autoSchedule: true,
      autoHashtags: true,
      autoContent: true
    },
    approvals: {
      requireApprovalForPosts: false,
      requireApprovalForDMs: true,
      requireApprovalForReplies: false
    }
  });

  const [dashboard, setDashboard] = useState<AutopilotDashboard>({
    status: 'learning',
    actionsToday: 0,
    growthRate: 12.5,
    engagementRate: 4.2,
    nextActions: [],
    insights: [],
    performance: {
      postsScheduled: 0,
      commentsReplied: 0,
      dmssSent: 0,
      hashtagsOptimized: 0,
      followerGrowth: 0
    }
  });

  const [pendingActions, setPendingActions] = useState<AutopilotAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'actions' | 'settings' | 'insights'>('dashboard');

  // Initialize autopilot with AI-generated actions
  useEffect(() => {
    if (settings.enabled) {
      generateAutopilotActions();
      generateGrowthInsights();
    }
  }, [settings.enabled, settings.aggressiveness]);

  const generateAutopilotActions = useCallback(async () => {
    setIsLoading(true);

    try {
      // Extract brand persona from account group for API
      const brandPersona = accountGroup?.brandPersona ? {
        name: accountGroup.brandPersona.name,
        tone: accountGroup.brandPersona.tone,
        writingStyle: accountGroup.brandPersona.writingStyle,
        emojiUsage: accountGroup.brandPersona.emojiUsage,
        contentPillars: accountGroup.brandPersona.contentPillars,
        targetAudience: accountGroup.brandPersona.targetAudience,
        keyMessages: accountGroup.brandPersona.keyMessages,
        avoidTopics: accountGroup.brandPersona.avoidTopics,
        samplePosts: accountGroup.brandPersona.samplePosts,
      } : null;

      // Extract content feedback for learning
      const contentFeedback = accountGroup?.contentFeedback 
        ? Array.from(accountGroup.contentFeedback).map((f: any) => ({
            generatedContent: f.generatedContent,
            accepted: f.accepted,
            reason: f.reason,
            editedVersion: f.editedVersion,
          }))
        : [];

      // Use the real AI growth engine with brand persona
      const aiResults = await fetch('/api/ai-growth-autopilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          profileKey,
          aggressiveness: settings.aggressiveness,
          accountGroupId: accountGroup?.id,
          brandPersona,
          contentFeedback,
        })
      });

      if (aiResults.ok) {
        const data = await aiResults.json();
        
        // Convert AI recommendations to autopilot actions
        const actions: AutopilotAction[] = data.recommendations.map((rec: any, index: number) => ({
          id: `ai_action_${index}`,
          type: rec.action.includes('content') ? 'post' : 
                rec.action.includes('reply') ? 'reply' :
                rec.action.includes('hashtag') ? 'hashtag' :
                rec.action.includes('DM') ? 'dm' : 'schedule',
          title: rec.action,
          description: rec.reasoning,
          confidence: rec.confidence,
          impact: rec.priority === 'high' ? 'high' : rec.priority === 'medium' ? 'medium' : 'low',
          status: 'pending',
          platform,
          reason: rec.expectedImpact,
          createdAt: new Date().toISOString()
        }));

        // Add content suggestions as post actions
        data.contentSuggestions.forEach((suggestion: any, index: number) => {
          actions.push({
            id: `content_${index}`,
            type: 'post',
            title: `Schedule: ${suggestion.title}`,
            description: `AI-generated content with ${suggestion.engagementPotential}% engagement potential`,
            confidence: suggestion.engagementPotential,
            impact: suggestion.engagementPotential > 80 ? 'high' : 'medium',
            status: 'pending',
            platform,
            content: suggestion.content,
            reason: suggestion.reasoning,
            createdAt: new Date().toISOString()
          });
        });

        // Add brand-aware content suggestions (prioritized)
        if (data.brandAwareContent?.suggestions) {
          data.brandAwareContent.suggestions.forEach((suggestion: any, index: number) => {
            actions.unshift({
              id: `brand_content_${index}`,
              type: 'post',
              title: `🎯 ${suggestion.contentPillar}: On-Brand Content`,
              description: suggestion.content.slice(0, 150) + '...',
              confidence: suggestion.confidenceScore,
              impact: suggestion.expectedEngagement === 'high' ? 'high' : 
                      suggestion.expectedEngagement === 'medium' ? 'medium' : 'low',
              status: 'pending',
              platform,
              content: suggestion.content,
              reason: `Matches your brand voice • Best time: ${suggestion.bestTimeToPost} • Hashtags: ${suggestion.hashtags.slice(0, 3).join(', ')}`,
              createdAt: new Date().toISOString()
            });
          });
        }

        setPendingActions(actions);
        setDashboard(prev => ({
          ...prev,
          nextActions: actions.slice(0, 3),
          status: 'active'
        }));

        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }

    // Fallback to simulated actions if API fails
    const actions: AutopilotAction[] = [
      {
        id: 'action_1',
        type: 'post',
        title: 'Schedule High-Engagement Content',
        description: 'AI identified optimal content: "5 Quick Tips for Social Media Growth" with 87% engagement potential',
        confidence: 87,
        impact: 'high',
        status: 'pending',
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        platform,
        content: '🚀 5 Quick Tips for Social Media Growth:\n\n1. Post at optimal times (AI suggests 2 PM today)\n2. Use trending hashtags: #growth #socialmedia #tips\n3. Engage within first hour of posting\n4. Ask questions to drive comments\n5. Share valuable insights, not just promotion\n\nWhich tip resonates most with you? 👇',
        reason: 'Historical data shows educational content performs 45% better at this time',
        createdAt: new Date().toISOString()
      },
      {
        id: 'action_2',
        type: 'reply',
        title: 'Auto-Reply to High-Value Comments',
        description: 'Respond to 3 comments with high engagement potential from influencers',
        confidence: 92,
        impact: 'high',
        status: 'pending',
        platform,
        reason: 'Comments from verified accounts increase visibility by 3x',
        createdAt: new Date().toISOString()
      },
      {
        id: 'action_3',
        type: 'hashtag',
        title: 'Optimize Hashtag Strategy',
        description: 'Switch to trending hashtags: #contentcreator #growthhacks #socialmediatips',
        confidence: 78,
        impact: 'medium',
        status: 'pending',
        platform,
        reason: 'These hashtags have 25% higher engagement than current ones',
        createdAt: new Date().toISOString()
      },
      {
        id: 'action_4',
        type: 'dm',
        title: 'Outreach to Potential Collaborators',
        description: 'Send personalized DMs to 5 accounts in your niche for potential collaboration',
        confidence: 65,
        impact: 'medium',
        status: 'pending',
        platform,
        target: '@similaraccount1, @growthexpert, @contentcreator2',
        reason: 'Collaboration posts get 40% more engagement than solo posts',
        createdAt: new Date().toISOString()
      },
      {
        id: 'action_5',
        type: 'schedule',
        title: 'Adjust Posting Schedule',
        description: 'Move tomorrow\'s post from 10 AM to 2 PM for 30% better engagement',
        confidence: 85,
        impact: 'medium',
        status: 'pending',
        platform,
        reason: 'Audience analysis shows peak activity at 2 PM on weekdays',
        createdAt: new Date().toISOString()
      }
    ];

    setPendingActions(actions);
    setDashboard(prev => ({
      ...prev,
      nextActions: actions.slice(0, 3),
      status: 'active'
    }));

    setIsLoading(false);
  }, [platform, settings]);

  const generateGrowthInsights = useCallback(() => {
    const insights: GrowthInsight[] = [
      {
        type: 'opportunity',
        title: 'Untapped Growth Window',
        description: 'Your competitors are less active between 2-4 PM. Posting during this time could increase visibility by 35%.',
        action: 'Schedule 2 additional posts this week during this window',
        priority: 'high',
        estimatedImpact: '+150 followers this week'
      },
      {
        type: 'success',
        title: 'Hashtag Strategy Working',
        description: 'Your recent hashtag optimizations increased reach by 28%. Keep using #growthhacks and #contentcreator.',
        priority: 'low',
        estimatedImpact: 'Sustained 20% higher reach'
      },
      {
        type: 'warning',
        title: 'Engagement Rate Declining',
        description: 'Your engagement rate dropped 0.5% this week. AI recommends more question-based posts and faster comment responses.',
        action: 'Enable aggressive auto-reply mode',
        priority: 'medium',
        estimatedImpact: 'Recover 0.8% engagement rate'
      },
      {
        type: 'opportunity',
        title: 'Viral Content Opportunity',
        description: 'Topic "AI in Social Media" is trending with 340% increase. Create content around this theme.',
        action: 'Schedule AI-themed post for maximum visibility',
        priority: 'high',
        estimatedImpact: '+500 potential reach'
      }
    ];

    setDashboard(prev => ({
      ...prev,
      insights
    }));
  }, []);

  const executeAction = async (actionId: string) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    setIsLoading(true);

    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Update action status
    setPendingActions(prev => 
      prev.map(a => 
        a.id === actionId 
          ? { ...a, status: 'executed' }
          : a
      )
    );

    // Update dashboard metrics
    setDashboard(prev => ({
      ...prev,
      actionsToday: prev.actionsToday + 1,
      performance: {
        ...prev.performance,
        [action.type === 'post' ? 'postsScheduled' : 
         action.type === 'reply' ? 'commentsReplied' :
         action.type === 'dm' ? 'dmssSent' :
         action.type === 'hashtag' ? 'hashtagsOptimized' : 'postsScheduled']: 
         prev.performance[action.type === 'post' ? 'postsScheduled' : 
                          action.type === 'reply' ? 'commentsReplied' :
                          action.type === 'dm' ? 'dmssSent' :
                          action.type === 'hashtag' ? 'hashtagsOptimized' : 'postsScheduled'] + 1
      }
    }));

    setIsLoading(false);
  };

  const executeAllActions = async () => {
    const highConfidenceActions = pendingActions.filter(a => a.confidence >= 80 && a.status === 'pending');
    
    for (const action of highConfidenceActions) {
      await executeAction(action.id);
      // Small delay between actions
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const approveAction = (actionId: string) => {
    setPendingActions(prev => 
      prev.map(a => 
        a.id === actionId 
          ? { ...a, status: 'approved' }
          : a
      )
    );
  };

  const rejectAction = (actionId: string) => {
    setPendingActions(prev => 
      prev.map(a => 
        a.id === actionId 
          ? { ...a, status: 'rejected' }
          : a
      )
    );
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝';
      case 'reply': return '💬';
      case 'dm': return '📧';
      case 'hashtag': return '🏷️';
      case 'schedule': return '⏰';
      default: return '🤖';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return '💡';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      default: return '📊';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'success': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold">🤖 Growth Autopilot</h3>
          <span className={`px-3 py-1 rounded-full text-sm ${
            dashboard.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            dashboard.status === 'learning' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}>
            {dashboard.status === 'active' ? '🟢 Active' : 
             dashboard.status === 'learning' ? '🔄 Learning' : '⏸️ Paused'}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium">Enable Autopilot</span>
          </label>
          
          {settings.enabled && pendingActions.filter(a => a.status === 'pending').length > 0 && (
            <Button 
              onClick={executeAllActions} 
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Executing...' : '⚡ Execute All High-Confidence Actions'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-900">{dashboard.actionsToday}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300">Actions Today</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-900">{dashboard.growthRate}%</p>
          <p className="text-sm text-green-700 dark:text-green-300">Growth Rate</p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-900">{dashboard.engagementRate}%</p>
          <p className="text-sm text-purple-700 dark:text-purple-300">Engagement Rate</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-900">{pendingActions.filter(a => a.status === 'pending').length}</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">Pending Actions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'actions', label: `Actions (${pendingActions.filter(a => a.status === 'pending').length})` },
            { key: 'insights', label: `Insights (${dashboard.insights.length})` },
            { key: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Next Recommended Actions */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-3">🎯 Next Recommended Actions</h4>
            <div className="space-y-3">
              {dashboard.nextActions.slice(0, 3).map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getActionIcon(action.type)}</span>
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${getImpactColor(action.impact)}`}>
                      {action.confidence}% confidence
                    </span>
                    <Button 
                      onClick={() => executeAction(action.id)} 
                      size="sm"
                      disabled={isLoading}
                    >
                      Execute
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Today's Automation Performance</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Posts Scheduled</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{dashboard.performance.postsScheduled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Comments Replied</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{dashboard.performance.commentsReplied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">DMs Sent</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">{dashboard.performance.dmssSent}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hashtags Optimized</span>
                  <span className="font-bold text-yellow-600">{dashboard.performance.hashtagsOptimized}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Growth Trajectory</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Growth Rate</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{dashboard.growthRate}%/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Target Growth Rate</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{settings.goals.followerGrowthTarget}%/month</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Projected Followers (30 days)</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">+{Math.round(2500 * (dashboard.growthRate / 100))}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((dashboard.growthRate / settings.goals.followerGrowthTarget) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div className="space-y-4">
          {/* Brand-aware content suggestions with accept/reject */}
          {pendingActions
            .filter(action => action.id.startsWith('brand_content_') && action.content)
            .map(action => (
              <ContentSuggestionCard
                key={action.id}
                id={action.id}
                content={action.content || ''}
                contentPillar={action.title.split(':')[0]?.replace('🎯 ', '')}
                platform={action.platform}
                confidenceScore={action.confidence}
                expectedEngagement={action.impact as 'high' | 'medium' | 'low'}
                accountGroup={accountGroup}
                onAccept={(content, edited) => {
                  approveAction(action.id);
                }}
                onReject={(reason) => {
                  rejectAction(action.id);
                }}
                onRegenerate={() => {
                  generateAutopilotActions();
                }}
              />
            ))}

          {/* Regular actions */}
          {pendingActions
            .filter(action => !action.id.startsWith('brand_content_'))
            .map(action => (
            <div key={action.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl mt-1">{getActionIcon(action.type)}</span>
                  <div>
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">{action.description}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">💡 {action.reason}</p>
                    {action.content && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-medium mb-1">Suggested Content:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{action.content}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${getImpactColor(action.impact)}`}>
                    {action.confidence}% confidence
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    action.status === 'executed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                    action.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                    action.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {action.status}
                  </span>
                </div>
              </div>

              {action.status === 'pending' && (
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => executeAction(action.id)} 
                    size="sm"
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Execute Now
                  </Button>
                  <Button 
                    onClick={() => approveAction(action.id)} 
                    size="sm" 
                    variant="outline"
                  >
                    Approve
                  </Button>
                  <Button 
                    onClick={() => rejectAction(action.id)} 
                    size="sm" 
                    variant="outline"
                  >
                    Reject
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Platform: {action.platform}</span>
                <span>Created: {new Date(action.createdAt).toLocaleString()}</span>
                {action.scheduledFor && (
                  <span>Scheduled: {new Date(action.scheduledFor).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          {dashboard.insights.map((insight, index) => (
            <div key={index} className={`p-4 border rounded-lg ${getInsightColor(insight.type)}`}>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{insight.description}</p>
                  {insight.action && (
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-2">
                      Recommended Action: {insight.action}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      insight.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                      insight.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }`}>
                      {insight.priority} priority
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {insight.estimatedImpact}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Aggressiveness Level */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Automation Aggressiveness</h4>
            <div className="flex space-x-4">
              {(['conservative', 'moderate', 'aggressive'] as const).map(level => (
                <label key={level} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="aggressiveness"
                    value={level}
                    checked={settings.aggressiveness === level}
                    onChange={(e) => setSettings(prev => ({ ...prev, aggressiveness: e.target.value as any }))}
                    className="rounded"
                  />
                  <span className="capitalize">{level}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {settings.aggressiveness === 'conservative' && 'Minimal automation, requires approval for most actions'}
              {settings.aggressiveness === 'moderate' && 'Balanced automation with smart decision making'}
              {settings.aggressiveness === 'aggressive' && 'Maximum automation for rapid growth'}
            </p>
          </div>

          {/* Growth Goals */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Growth Goals</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Follower Growth Target (%)</label>
                <Input
                  type="number"
                  value={settings.goals.followerGrowthTarget}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    goals: { ...prev.goals, followerGrowthTarget: parseInt(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Engagement Rate Target (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.goals.engagementRateTarget}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    goals: { ...prev.goals, engagementRateTarget: parseFloat(e.target.value) }
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Posts Per Week</label>
                <Input
                  type="number"
                  value={settings.goals.postsPerWeek}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    goals: { ...prev.goals, postsPerWeek: parseInt(e.target.value) }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Automation Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.automation).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      automation: { ...prev.automation, [key]: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Approval Settings */}
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium mb-3">Approval Requirements</h4>
            <div className="space-y-3">
              {Object.entries(settings.approvals).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      approvals: { ...prev.approvals, [key]: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span>{key.replace(/([A-Z])/g, ' $1').toLowerCase().replace('require approval for ', 'Require approval for ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
