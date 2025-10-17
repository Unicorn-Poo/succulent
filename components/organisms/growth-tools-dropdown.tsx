'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/button';
import { ChevronDown, Zap, TrendingUp, MessageCircle, Mail, Users, Search, Rss, Palette, Clock, BarChart3 } from 'lucide-react';

// Import all growth components
import GrowthAutopilot from './growth-autopilot';
import HashtagResearchDashboard from './hashtag-research-dashboard';
import GrowthAnalyticsDashboard from './growth-analytics-dashboard';
import CommentEngagementManager from './comment-engagement-manager';
import DMAutomationManager from './dm-automation-manager';
import CompetitorAnalysisDashboard from './competitor-analysis-dashboard';
import ContentDiscoveryManager from './content-discovery-manager';
import BrandManagementDashboard from './brand-management-dashboard';
import AutoScheduleManager from './auto-schedule-manager';
import UnifiedAutomationDashboard from './unified-automation-dashboard';
import BrandPersonaSetup from './brand-persona-setup';

interface GrowthTool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'automation' | 'analytics' | 'optimization';
  impact: 'high' | 'medium' | 'low';
  component: React.ComponentType<any>;
}

interface GrowthToolsDropdownProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
  selectedTool?: string | null;
  onToolSelect?: (toolId: string | null) => void;
}

export default function GrowthToolsDropdown({
  platform,
  profileKey,
  accountGroup,
  selectedTool,
  onToolSelect
}: GrowthToolsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const growthTools: GrowthTool[] = [
    {
      id: 'dashboard',
      name: 'Automation Dashboard',
      description: 'Monitor all automated activity in real-time',
      icon: BarChart3,
      category: 'analytics',
      impact: 'high',
      component: UnifiedAutomationDashboard
    },
    {
      id: 'autopilot',
      name: 'AI Growth Autopilot',
      description: 'Complete automation with AI decision making',
      icon: Zap,
      category: 'automation',
      impact: 'high',
      component: GrowthAutopilot
    },
    {
      id: 'analytics',
      name: 'Growth Analytics',
      description: 'Follower tracking and performance insights',
      icon: TrendingUp,
      category: 'analytics',
      impact: 'high',
      component: GrowthAnalyticsDashboard
    },
    {
      id: 'hashtags',
      name: 'Hashtag Research',
      description: 'Trending hashtags and optimization',
      icon: Search,
      category: 'optimization',
      impact: 'high',
      component: HashtagResearchDashboard
    },
    {
      id: 'comments',
      name: 'Comment Automation',
      description: 'Auto-replies and engagement management',
      icon: MessageCircle,
      category: 'automation',
      impact: 'medium',
      component: CommentEngagementManager
    },
    {
      id: 'dms',
      name: 'DM Automation',
      description: 'Direct message campaigns and outreach',
      icon: Mail,
      category: 'automation',
      impact: 'medium',
      component: DMAutomationManager
    },
    {
      id: 'competitors',
      name: 'Competitor Analysis',
      description: 'Intelligence gathering and strategy insights',
      icon: Users,
      category: 'analytics',
      impact: 'medium',
      component: CompetitorAnalysisDashboard
    },
    {
      id: 'content',
      name: 'Content Discovery',
      description: 'RSS feeds and trending topic curation',
      icon: Rss,
      category: 'optimization',
      impact: 'medium',
      component: ContentDiscoveryManager
    },
    {
      id: 'brand',
      name: 'Brand Management',
      description: 'Consistency tracking and templates',
      icon: Palette,
      category: 'optimization',
      impact: 'low',
      component: BrandManagementDashboard
    },
    {
      id: 'schedule',
      name: 'Auto-Scheduling',
      description: 'Intelligent posting with optimal timing',
      icon: Clock,
      category: 'automation',
      impact: 'medium',
      component: AutoScheduleManager
    },
    {
      id: 'persona',
      name: 'Brand Persona Setup',
      description: 'Define your brand voice for AI automation',
      icon: Palette,
      category: 'optimization',
      impact: 'high',
      component: BrandPersonaSetup
    }
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'automation': return '🤖';
      case 'analytics': return '📊';
      case 'optimization': return '🎯';
      default: return '🔧';
    }
  };

  const selectedToolData = growthTools.find(tool => tool.id === selectedTool);
  const SelectedComponent = selectedToolData?.component;

  if (selectedTool && SelectedComponent) {
    return (
      <div className="space-y-4">
        {/* Back Button */}
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => onToolSelect?.(null)}
            variant="outline"
            size="sm"
          >
            ← Back to Growth Tools
          </Button>
          <div>
            <h3 className="font-semibold text-gray-900">{selectedToolData.name}</h3>
            <p className="text-sm text-gray-600">{selectedToolData.description}</p>
          </div>
        </div>

        {/* Selected Tool Component */}
        <SelectedComponent
          platform={platform}
          profileKey={profileKey}
          accountGroup={accountGroup}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Growth Tools Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">🚀 Social Media Growth Engine</h3>
            <p className="text-sm text-gray-600">AI-powered automation tools to accelerate your follower growth</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">+25-50%</p>
            <p className="text-sm text-gray-600">Engagement Increase</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">2-5x</p>
            <p className="text-sm text-gray-600">Faster Growth Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">90%</p>
            <p className="text-sm text-gray-600">Time Saved</p>
          </div>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={() => onToolSelect?.('dashboard')}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              📊 Activity Dashboard
            </Button>
            <Button
              onClick={() => onToolSelect?.('autopilot')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              🤖 AI Autopilot
            </Button>
          </div>
      </div>

      {/* Growth Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {growthTools.map(tool => {
          const IconComponent = tool.icon;
          return (
            <div
              key={tool.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => onToolSelect?.(tool.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium text-gray-900">{tool.name}</h4>
                    <span className="text-xs">{getCategoryIcon(tool.category)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{tool.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs ${getImpactColor(tool.impact)}`}>
                      {tool.impact} impact
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{tool.category}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3">🎯 Quick Start Recommendations</h4>
          <div className="space-y-3">
            <div 
              className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => onToolSelect?.('dashboard')}
            >
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">View Activity Dashboard</p>
                <p className="text-sm text-blue-600">Monitor all automated actions</p>
              </div>
            </div>
            
            <div 
              className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
              onClick={() => onToolSelect?.('hashtags')}
            >
              <Search className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Start with Hashtag Research</p>
                <p className="text-sm text-green-600">Immediate +25% reach boost</p>
              </div>
            </div>
            
            <div 
              className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => onToolSelect?.('comments')}
            >
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">Enable Comment Automation</p>
                <p className="text-sm text-blue-600">24/7 community engagement</p>
              </div>
            </div>
            
            <div 
              className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={() => onToolSelect?.('persona')}
            >
              <Palette className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-800">Set Brand Persona</p>
                <p className="text-sm text-purple-600">Define your voice for AI automation</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3">📈 Growth Categories</h4>
          <div className="space-y-3">
            {['automation', 'analytics', 'optimization'].map(category => {
              const categoryTools = growthTools.filter(tool => tool.category === category);
              return (
                <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCategoryIcon(category)}</span>
                    <span className="font-medium capitalize">{category}</span>
                  </div>
                  <span className="text-sm text-gray-600">{categoryTools.length} tools</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
