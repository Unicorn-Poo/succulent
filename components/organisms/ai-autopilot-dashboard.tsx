"use client";

import { useState, useEffect } from 'react';
import { Card, Text, Heading, Button, Switch, Badge } from '@radix-ui/themes';
import { Bot, Play, Pause, Settings, TrendingUp, Zap, Brain, AlertCircle, BookOpen, BarChart3 } from 'lucide-react';
import type { AccountGroupType } from '../../app/schema';

interface AIAutopilotDashboardProps {
  accountGroup: AccountGroupType;
}

interface AutopilotStatus {
  isActive: boolean;
  lastDecision: string;
  totalActions: number;
  successRate: number;
  currentStrategy: string;
}

interface AIDecision {
  action: string;
  confidence: number;
  reasoning: string;
  expectedImpact: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  shouldExecute: boolean;
}

export default function AIAutopilotDashboard({ accountGroup }: AIAutopilotDashboardProps) {
  const [autopilotStatus, setAutopilotStatus] = useState<AutopilotStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentDecisions, setRecentDecisions] = useState<AIDecision[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Autopilot configuration
  const [config, setConfig] = useState({
    aggressiveness: 'moderate' as 'conservative' | 'moderate' | 'aggressive',
    maxPostsPerDay: 3,
    enableAutoPosting: false,
    enableAutoEngagement: true,
    enableContentOptimization: true,
    platforms: ['instagram', 'x'],
    accountGroupId: accountGroup.id
  });

  // Start/Stop autopilot
  const handleToggleAutopilot = async () => {
    setIsLoading(true);
    
    try {
      const action = autopilotStatus?.isActive ? 'stop' : 'start';
      
      const response = await fetch('/api/ai-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, config })
      });

      const result = await response.json();
      
      if (result.success) {
        if (action === 'start') {
          setAutopilotStatus(result.status);
          setRecentDecisions(result.initialAnalysis?.recommendations || []);
        } else {
          setAutopilotStatus(null);
          setRecentDecisions([]);
        }
      }
    } catch (error) {
      console.error('Autopilot toggle failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get AI analysis
  const handleGetAnalysis = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', config })
      });

      const result = await response.json();
      
      if (result.success) {
        setRecentDecisions(result.analysis?.recommendations || []);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate content with AI
  const handleGenerateContent = async () => {
    setIsGenerating(true);
    setStreamingContent('');
    
    try {
      const response = await fetch('/api/ai-autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'quick-content', 
          context: 'Generate engaging content for my brand' 
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStreamingContent(result.content);
      }
    } catch (error) {
      console.error('Content generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Analyze all posts for learning
  const handleAnalyzePosts = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/ai-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'analyze', 
          accountGroupId: accountGroup.id,
          platforms: config.platforms
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Learning analysis complete:', result.report);
        // Refresh learning stats
        await handleGetLearningStats();
      }
    } catch (error) {
      console.error('Learning analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Get learning statistics
  const handleGetLearningStats = async () => {
    try {
      const response = await fetch('/api/ai-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'stats', 
          accountGroupId: accountGroup.id,
          platforms: config.platforms
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setLearningStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to get learning stats:', error);
    }
  };

  // Load learning stats on component mount
  useEffect(() => {
    handleGetLearningStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountGroup.id]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <Heading size="5">AI Autopilot</Heading>
            <Text size="2" color="gray">
              Intelligent automation for social media growth
            </Text>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge color={autopilotStatus?.isActive ? 'green' : 'gray'}>
            {autopilotStatus?.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <Button 
            onClick={handleToggleAutopilot}
            disabled={isLoading}
            color={autopilotStatus?.isActive ? 'red' : 'green'}
          >
            {autopilotStatus?.isActive ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Stop Autopilot
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Autopilot
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {autopilotStatus && (
        <Card>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Text size="3" weight="bold" className="block">
                  {autopilotStatus.totalActions}
                </Text>
                <Text size="2" color="gray">Total Actions</Text>
              </div>
              <div className="text-center">
                <Text size="3" weight="bold" className="block">
                  {autopilotStatus.successRate}%
                </Text>
                <Text size="2" color="gray">Success Rate</Text>
              </div>
              <div className="text-center">
                <Text size="3" weight="bold" className="block">
                  {autopilotStatus.currentStrategy}
                </Text>
                <Text size="2" color="gray">Current Strategy</Text>
              </div>
              <div className="text-center">
                <Text size="3" weight="bold" className="block">
                  {new Date(autopilotStatus.lastDecision).toLocaleTimeString()}
                </Text>
                <Text size="2" color="gray">Last Decision</Text>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <Heading size="4">Autopilot Configuration</Heading>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text size="2" weight="medium" className="block mb-2">
                  Aggressiveness
                </Text>
                <select
                  value={config.aggressiveness}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    aggressiveness: e.target.value as any 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
              
              <div>
                <Text size="2" weight="medium" className="block mb-2">
                  Max Posts/Day
                </Text>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.maxPostsPerDay}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    maxPostsPerDay: parseInt(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Text size="2" weight="medium">Auto Posting</Text>
                  <Text size="1" color="gray">Automatically create and schedule posts</Text>
                </div>
                <Switch
                  checked={config.enableAutoPosting}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    enableAutoPosting: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Text size="2" weight="medium">Auto Engagement</Text>
                  <Text size="1" color="gray">Automatically like and reply to comments</Text>
                </div>
                <Switch
                  checked={config.enableAutoEngagement}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    enableAutoEngagement: checked 
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Text size="2" weight="medium">Content Optimization</Text>
                  <Text size="1" color="gray">AI-powered content suggestions and improvements</Text>
                </div>
                <Switch
                  checked={config.enableContentOptimization}
                  onCheckedChange={(checked) => setConfig(prev => ({ 
                    ...prev, 
                    enableContentOptimization: checked 
                  }))}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* AI Decisions */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <Heading size="4">AI Recommendations</Heading>
            </div>
            <Button variant="soft" onClick={handleGetAnalysis} disabled={isLoading}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Get Analysis
            </Button>
          </div>

          {recentDecisions.length > 0 ? (
            <div className="space-y-3">
              {recentDecisions.slice(0, 5).map((decision, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <Text size="2" weight="medium">{decision.action}</Text>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(decision.priority)}>
                        {decision.priority}
                      </Badge>
                      <Badge variant="soft">
                        {decision.confidence}% confidence
                      </Badge>
                    </div>
                  </div>
                  <Text size="2" color="gray" className="mb-2">
                    {decision.reasoning}
                  </Text>
                  <Text size="1" color="green">
                    Expected impact: {decision.expectedImpact}
                  </Text>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <Text size="2" color="gray">
                No AI recommendations yet. Click "Get Analysis" to start.
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* AI Learning System */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <Heading size="4">AI Learning System</Heading>
            </div>
            <Button 
              variant="soft" 
              onClick={handleAnalyzePosts} 
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze All Posts'}
            </Button>
          </div>

          {learningStats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Text size="3" weight="bold" className="block">
                  {learningStats.totalInsights}
                </Text>
                <Text size="2" color="gray">Learning Insights</Text>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Text size="3" weight="bold" className="block">
                  {learningStats.postsAnalyzed}
                </Text>
                <Text size="2" color="gray">Posts Analyzed</Text>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Text size="3" weight="bold" className="block">
                  {Math.round(learningStats.avgConfidence)}%
                </Text>
                <Text size="2" color="gray">Avg Confidence</Text>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Text size="3" weight="bold" className="block">
                  {learningStats.topCategories?.[0] || 'None'}
                </Text>
                <Text size="2" color="gray">Top Category</Text>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <Text size="2" color="gray">
                No learning data yet. Click "Analyze All Posts" to start learning from your content.
              </Text>
            </div>
          )}
        </div>
      </Card>

      {/* AI Content Generator */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <Heading size="4">AI Content Generator</Heading>
              {learningStats && learningStats.totalInsights > 0 && (
                <Badge color="green" variant="soft">Learning-Enhanced</Badge>
              )}
            </div>
            <Button 
              variant="soft" 
              onClick={handleGenerateContent} 
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </Button>
          </div>

          {streamingContent && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Text size="2" className="whitespace-pre-wrap">
                {streamingContent}
              </Text>
            </div>
          )}

          {!streamingContent && !isGenerating && (
            <div className="text-center py-8">
              <Text size="2" color="gray">
                {learningStats?.totalInsights > 0 
                  ? 'Generate AI content optimized based on your past performance'
                  : 'Click "Generate Content" to create AI-powered social media content'
                }
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
