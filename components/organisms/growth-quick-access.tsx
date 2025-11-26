'use client';

import React, { useState } from 'react';
import { Button } from '../atoms/button';
import { Zap, TrendingUp, MessageCircle, Search, Clock, ChevronDown, BarChart3 } from 'lucide-react';

interface GrowthQuickAccessProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
  onToolSelect: (toolId: string) => void;
}

export default function GrowthQuickAccess({
  platform,
  profileKey,
  accountGroup,
  onToolSelect
}: GrowthQuickAccessProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const quickActions = [
    {
      id: 'dashboard',
      name: '📊 Activity Dashboard',
      description: 'Monitor automation',
      icon: BarChart3,
      color: 'from-green-600 to-blue-600'
    },
    {
      id: 'autopilot',
      name: '🤖 AI Autopilot',
      description: 'Full automation',
      icon: Zap,
      color: 'from-blue-600 to-purple-600'
    },
    {
      id: 'hashtags',
      name: '🏷️ Hashtag Research',
      description: 'Boost reach +25%',
      icon: Search,
      color: 'from-green-600 to-blue-600'
    },
    {
      id: 'comments',
      name: '💬 Auto-Replies',
      description: '24/7 engagement',
      icon: MessageCircle,
      color: 'from-purple-600 to-pink-600'
    },
    {
      id: 'schedule',
      name: '⏰ Auto-Schedule',
      description: 'Perfect timing',
      icon: Clock,
      color: 'from-yellow-600 to-orange-600'
    },
    {
      id: 'analytics',
      name: '📊 Growth Analytics',
      description: 'Track progress',
      icon: TrendingUp,
      color: 'from-indigo-600 to-purple-600'
    }
  ];

  return (
    <div className="relative">
      {/* Main Growth Button */}
      <Button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 flex items-center space-x-2"
      >
        <Zap className="w-4 h-4" />
        <span>Growth Tools</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-80 bg-card rounded-lg shadow-xl border border-border z-20">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">🚀 Growth Automation</h3>
              <p className="text-sm text-muted-foreground">AI-powered tools to accelerate your growth</p>
            </div>

            <div className="p-2 max-h-96 overflow-y-auto">
              {quickActions.map(action => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      onToolSelect(action.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{action.name}</p>
                        <p className="text-sm text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t border-border bg-muted rounded-b-lg">
              <button
                onClick={() => {
                  onToolSelect('tools-overview');
                  setIsDropdownOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 font-medium"
              >
                View All Growth Tools →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
