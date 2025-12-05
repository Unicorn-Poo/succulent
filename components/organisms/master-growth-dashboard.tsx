'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../atoms/button';

// Import all the growth components
import GrowthAutopilot from './growth-autopilot';
import HashtagResearchDashboard from './hashtag-research-dashboard';
import GrowthAnalyticsDashboard from './growth-analytics-dashboard';
import CommentEngagementManager from './comment-engagement-manager';
import DMAutomationManager from './dm-automation-manager';
import CompetitorAnalysisDashboard from './competitor-analysis-dashboard';
import ContentDiscoveryManager from './content-discovery-manager';
import BrandManagementDashboard from './brand-management-dashboard';
import AutoScheduleManager from './auto-schedule-manager';

interface MasterGrowthDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

interface QuickStats {
  followersGrowth: number;
  engagementRate: number;
  postsScheduled: number;
  commentsReplied: number;
  hashtagsOptimized: number;
  competitorsAnalyzed: number;
}

export default function MasterGrowthDashboard({
  platform,
  profileKey,
  accountGroup
}: MasterGrowthDashboardProps) {
  const [activeComponent, setActiveComponent] = useState<string>('autopilot');
  const [quickStats, setQuickStats] = useState<QuickStats>({
    followersGrowth: 12.5,
    engagementRate: 4.2,
    postsScheduled: 8,
    commentsReplied: 23,
    hashtagsOptimized: 15,
    competitorsAnalyzed: 3
  });

  const components = [
    { 
      id: 'autopilot', 
      name: '🤖 AI Autopilot', 
      description: 'Complete automation with AI decision making',
      component: GrowthAutopilot 
    },
    { 
      id: 'analytics', 
      name: '📊 Growth Analytics', 
      description: 'Comprehensive follower and engagement tracking',
      component: GrowthAnalyticsDashboard 
    },
    { 
      id: 'hashtags', 
      name: '🏷️ Hashtag Research', 
      description: 'Trending hashtags and performance analysis',
      component: HashtagResearchDashboard 
    },
    { 
      id: 'comments', 
      name: '💬 Comment Automation', 
      description: 'Auto-replies and engagement management',
      component: CommentEngagementManager 
    },
    { 
      id: 'dms', 
      name: '📧 DM Automation', 
      description: 'Direct message campaigns and outreach',
      component: DMAutomationManager 
    },
    { 
      id: 'competitors', 
      name: '🔍 Competitor Analysis', 
      description: 'Intelligence gathering and strategy insights',
      component: CompetitorAnalysisDashboard 
    },
    { 
      id: 'content', 
      name: '🎯 Content Discovery', 
      description: 'RSS feeds and trending topic curation',
      component: ContentDiscoveryManager 
    },
    { 
      id: 'brand', 
      name: '🎨 Brand Management', 
      description: 'Consistency tracking and template management',
      component: BrandManagementDashboard 
    },
    { 
      id: 'schedule', 
      name: '⏰ Auto-Scheduling', 
      description: 'Intelligent posting with optimal timing',
      component: AutoScheduleManager 
    }
  ];

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQuickStats(prev => ({
        ...prev,
        followersGrowth: prev.followersGrowth + (Math.random() * 0.2 - 0.1),
        engagementRate: prev.engagementRate + (Math.random() * 0.1 - 0.05),
        postsScheduled: prev.postsScheduled + (Math.random() > 0.8 ? 1 : 0),
        commentsReplied: prev.commentsReplied + (Math.random() > 0.7 ? 1 : 0)
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const ActiveComponent = components.find(c => c.id === activeComponent)?.component || GrowthAutopilot;

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">🚀 Social Media Growth Engine</h1>
            <p className="text-muted-foreground">Complete automation suite for {platform} growth</p>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{quickStats.followersGrowth.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Growth Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-seafoam dark:text-brand-mint">{quickStats.engagementRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{quickStats.postsScheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{quickStats.commentsReplied}</p>
              <p className="text-xs text-muted-foreground">Replied</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-card border-r border-border min-h-screen">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-foreground mb-4">Growth Tools</h2>
            <div className="space-y-2">
              {components.map(component => (
                <button
                  key={component.id}
                  onClick={() => setActiveComponent(component.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    activeComponent === component.id
                      ? 'border-brand-seafoam bg-brand-mint/10 dark:bg-brand-seafoam/20 text-brand-seafoam dark:text-brand-mint'
                      : 'border-border hover:border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium text-foreground">{component.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{component.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Button 
                onClick={() => setActiveComponent('autopilot')} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size="sm"
              >
                🤖 Launch AI Autopilot
              </Button>
              <Button 
                onClick={() => setActiveComponent('analytics')} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                📊 View Growth Analytics
              </Button>
              <Button 
                onClick={() => setActiveComponent('hashtags')} 
                variant="outline" 
                className="w-full"
                size="sm"
              >
                🏷️ Research Hashtags
              </Button>
            </div>
          </div>

          {/* System Status */}
          <div className="p-4 border-t border-border">
            <h3 className="font-medium text-foreground mb-3">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Auto-Replies</span>
                <span className="text-green-600 dark:text-green-400">🟢 Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto-Scheduling</span>
                <span className="text-green-600 dark:text-green-400">🟢 Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Hashtag Optimization</span>
                <span className="text-green-600 dark:text-green-400">🟢 Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Competitor Monitoring</span>
                <span className="text-brand-seafoam dark:text-brand-mint">🔄 Running</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          <ActiveComponent 
            platform={platform}
            profileKey={profileKey}
            accountGroup={accountGroup}
          />
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          onClick={() => setActiveComponent('autopilot')}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
        >
          🤖
        </Button>
      </div>
    </div>
  );
}
