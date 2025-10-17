'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { EngagementAutomationEngine, getDefaultAutoReplyRules } from '../../utils/engagementAutomation';

interface CommentData {
  id: string;
  platform: string;
  postId: string;
  comment: string;
  author: string;
  authorUsername: string;
  authorAvatar?: string;
  createdAt: string;
  likes?: number;
  replies?: CommentData[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  requiresResponse?: boolean;
  isSpam?: boolean;
}

interface AutoReplyRule {
  id: string;
  name: string;
  platform: string;
  triggers: string[];
  response: string;
  enabled: boolean;
  conditions: {
    sentiment?: 'positive' | 'negative' | 'neutral';
    minFollowers?: number;
    excludeKeywords?: string[];
    onlyVerified?: boolean;
  };
  cooldownMinutes: number;
  maxRepliesPerDay: number;
}

interface EngagementMetrics {
  platform: string;
  totalComments: number;
  repliedComments: number;
  averageResponseTime: number;
  sentimentBreakdown: Record<string, number>;
  engagementRate: number;
  topEngagers: string[];
}

interface CommentEngagementManagerProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function CommentEngagementManager({
  platform,
  profileKey,
  accountGroup
}: CommentEngagementManagerProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>([]);
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'rules' | 'metrics'>('comments');
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [isAutoReplyEnabled, setIsAutoReplyEnabled] = useState(false);
  const [bulkEngaging, setBulkEngaging] = useState(false);

  const engine = new EngagementAutomationEngine(profileKey);

  // Load comments
  const loadComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await engine.getCommentsForModeration(platform, undefined, 50);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, profileKey]);

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const fetchedMetrics = await engine.getEngagementMetrics(platform);
      setMetrics(fetchedMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }, [platform, profileKey]);

  // Initialize rules
  useEffect(() => {
    const defaultRules = getDefaultAutoReplyRules(platform);
    setAutoReplyRules(defaultRules);
  }, [platform]);

  // Load data on mount
  useEffect(() => {
    loadComments();
    loadMetrics();
  }, [loadComments, loadMetrics]);

  // Auto-refresh comments every 5 minutes
  useEffect(() => {
    if (isAutoReplyEnabled) {
      const interval = setInterval(loadComments, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAutoReplyEnabled, loadComments]);

  const handleBulkEngage = async () => {
    setBulkEngaging(true);
    try {
      const commentsToEngage = comments.filter(c => selectedComments.includes(c.id));
      const result = await engine.bulkEngageWithComments(commentsToEngage, autoReplyRules);
      
      alert(`Engagement complete: ${result.replied} replied, ${result.skipped} skipped, ${result.errors.length} errors`);
      
      // Refresh comments
      await loadComments();
      setSelectedComments([]);
    } catch (error) {
      console.error('Error with bulk engagement:', error);
      alert('Error during bulk engagement');
    } finally {
      setBulkEngaging(false);
    }
  };

  const handleCommentToggle = (commentId: string) => {
    setSelectedComments(prev => 
      prev.includes(commentId)
        ? prev.filter(id => id !== commentId)
        : [...prev, commentId]
    );
  };

  const handleRuleToggle = (ruleId: string) => {
    setAutoReplyRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, enabled: !rule.enabled }
          : rule
      )
    );
  };

  const addNewRule = () => {
    const newRule: AutoReplyRule = {
      id: `${platform}_custom_${Date.now()}`,
      name: 'New Rule',
      platform,
      triggers: [''],
      response: '',
      enabled: false,
      conditions: {},
      cooldownMinutes: 60,
      maxRepliesPerDay: 10
    };
    setAutoReplyRules(prev => [...prev, newRule]);
  };

  const updateRule = (ruleId: string, updates: Partial<AutoReplyRule>) => {
    setAutoReplyRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, ...updates }
          : rule
      )
    );
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Comment Engagement Manager</h3>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isAutoReplyEnabled}
              onChange={(e) => setIsAutoReplyEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-Reply Enabled</span>
          </label>
          <Button onClick={loadComments} disabled={isLoading} size="sm">
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'comments', label: `Comments (${comments.length})` },
            { key: 'rules', label: `Auto-Reply Rules (${autoReplyRules.filter(r => r.enabled).length})` },
            { key: 'metrics', label: 'Metrics' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div>
          {selectedComments.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">{selectedComments.length} comments selected</span>
                <Button 
                  onClick={handleBulkEngage} 
                  disabled={bulkEngaging}
                  size="sm"
                >
                  {bulkEngaging ? 'Engaging...' : 'Bulk Engage'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {comments.map(comment => (
              <div
                key={comment.id}
                className={`p-4 border rounded-lg ${
                  selectedComments.includes(comment.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                } ${comment.isSpam ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedComments.includes(comment.id)}
                    onChange={() => handleCommentToggle(comment.id)}
                    className="mt-1 rounded"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium">{comment.authorUsername}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(comment.sentiment)}`}>
                        {getSentimentIcon(comment.sentiment)} {comment.sentiment}
                      </span>
                      {comment.requiresResponse && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          Needs Response
                        </span>
                      )}
                      {comment.isSpam && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                          Spam
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-800 mb-2">{comment.comment}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                      <span>{comment.platform}</span>
                      {comment.likes && <span>❤️ {comment.likes}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {comments.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              No comments to moderate
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">Configure automatic reply rules for comments</p>
            <Button onClick={addNewRule} size="sm">Add Rule</Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {autoReplyRules.map(rule => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Input
                    value={rule.name}
                    onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                    className="font-medium"
                    placeholder="Rule name"
                  />
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleRuleToggle(rule.id)}
                      className="rounded"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Triggers (comma-separated)</label>
                    <Input
                      value={rule.triggers.join(', ')}
                      onChange={(e) => updateRule(rule.id, { triggers: e.target.value.split(',').map(t => t.trim()) })}
                      placeholder="thank you, thanks, appreciate"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Response Template</label>
                    <Input
                      value={rule.response}
                      onChange={(e) => updateRule(rule.id, { response: e.target.value })}
                      placeholder="Thank you, {username}!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Cooldown (minutes)</label>
                    <Input
                      type="number"
                      value={rule.cooldownMinutes}
                      onChange={(e) => updateRule(rule.id, { cooldownMinutes: parseInt(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Max Replies/Day</label>
                    <Input
                      type="number"
                      value={rule.maxRepliesPerDay}
                      onChange={(e) => updateRule(rule.id, { maxRepliesPerDay: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800">Total Comments</h4>
              <p className="text-2xl font-bold text-blue-900">{metrics.totalComments}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-800">Replied Comments</h4>
              <p className="text-2xl font-bold text-green-900">{metrics.repliedComments}</p>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800">Response Time</h4>
              <p className="text-2xl font-bold text-yellow-900">{metrics.averageResponseTime}m</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-800">Engagement Rate</h4>
              <p className="text-2xl font-bold text-purple-900">{metrics.engagementRate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Sentiment Breakdown</h4>
              <div className="space-y-2">
                {Object.entries(metrics.sentimentBreakdown).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex items-center justify-between">
                    <span className="capitalize">{sentiment}</span>
                    <span className="font-medium">{count}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Top Engagers</h4>
              <div className="space-y-2">
                {metrics.topEngagers.map((engager, index) => (
                  <div key={engager} className="flex items-center justify-between">
                    <span>#{index + 1} {engager}</span>
                    <span className="text-sm text-gray-500">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
