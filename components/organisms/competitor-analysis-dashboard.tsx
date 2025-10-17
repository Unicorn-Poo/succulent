'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';

interface CompetitorProfile {
  username: string;
  displayName: string;
  platform: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  bio: string;
  avatar: string;
  url: string;
  lastActive: string;
}

interface CompetitorAnalysis {
  competitor: CompetitorProfile;
  metrics: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    engagementRate: number;
    postFrequency: number;
    followerGrowthRate: number;
    bestPostingTimes: string[];
    topHashtags: { hashtag: string; usage: number; avgEngagement: number }[];
  };
  recentPosts: any[];
  contentStrategy: {
    topContentTypes: Record<string, number>;
    hashtagStrategy: string[];
    postingPattern: Record<string, number>;
    engagementTactics: string[];
  };
  opportunities: {
    underutilizedHashtags: string[];
    contentGaps: string[];
    optimalPostingTimes: string[];
    suggestions: string[];
  };
}

interface CompetitorComparison {
  competitors: CompetitorAnalysis[];
  yourMetrics: {
    engagementRate: number;
    followerCount: number;
    avgLikes: number;
    postFrequency: number;
  };
  insights: {
    topPerformers: string[];
    commonStrategies: string[];
    uniqueOpportunities: string[];
    recommendations: string[];
  };
  lastUpdated: string;
}

interface CompetitorAnalysisDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function CompetitorAnalysisDashboard({
  platform,
  profileKey,
  accountGroup
}: CompetitorAnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<CompetitorComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [competitorInput, setCompetitorInput] = useState('');
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'competitors' | 'opportunities' | 'content'>('overview');
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);

  const addCompetitor = () => {
    if (competitorInput.trim() && !competitors.includes(competitorInput.trim())) {
      setCompetitors(prev => [...prev, competitorInput.trim()]);
      setCompetitorInput('');
    }
  };

  const removeCompetitor = (username: string) => {
    setCompetitors(prev => prev.filter(c => c !== username));
  };

  const analyzeCompetitors = useCallback(async () => {
    if (competitors.length === 0) {
      alert('Please add at least one competitor to analyze');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/competitor-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          competitors,
          platform,
          profileKey,
          includeContent: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Error analyzing competitors:', error);
      alert('Failed to analyze competitors. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [competitors, platform, profileKey]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getSelectedCompetitorAnalysis = () => {
    if (!selectedCompetitor || !analysis) return null;
    return analysis.competitors.find(c => c.competitor.username === selectedCompetitor);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Competitor Analysis Dashboard</h3>
        <Button onClick={analyzeCompetitors} disabled={isLoading || competitors.length === 0}>
          {isLoading ? 'Analyzing...' : 'Analyze Competitors'}
        </Button>
      </div>

      {/* Add Competitors Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Add Competitors to Analyze</h4>
        <div className="flex items-center space-x-2 mb-3">
          <Input
            placeholder="Enter competitor username"
            value={competitorInput}
            onChange={(e) => setCompetitorInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
            className="flex-1"
          />
          <Button onClick={addCompetitor} size="sm">
            Add
          </Button>
        </div>

        {competitors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {competitors.map(competitor => (
              <span
                key={competitor}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center space-x-1"
              >
                <span>@{competitor}</span>
                <button
                  onClick={() => removeCompetitor(competitor)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Analyzing competitors...</span>
        </div>
      )}

      {analysis && !isLoading && (
        <>
          {/* Tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 border-b">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'competitors', label: `Competitors (${analysis.competitors.length})` },
                { key: 'opportunities', label: 'Opportunities' },
                { key: 'content', label: 'Content Strategy' }
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

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Your Performance vs Competitors */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Your Engagement Rate</h4>
                  <p className="text-2xl font-bold text-blue-900">
                    {analysis.yourMetrics.engagementRate}%
                  </p>
                  <p className="text-sm text-blue-700">
                    vs {(analysis.competitors.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / analysis.competitors.length).toFixed(1)}% avg
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Your Followers</h4>
                  <p className="text-2xl font-bold text-green-900">
                    {formatNumber(analysis.yourMetrics.followerCount)}
                  </p>
                  <p className="text-sm text-green-700">
                    vs {formatNumber(analysis.competitors.reduce((sum, c) => sum + c.competitor.followersCount, 0) / analysis.competitors.length)} avg
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">Your Avg Likes</h4>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatNumber(analysis.yourMetrics.avgLikes)}
                  </p>
                  <p className="text-sm text-purple-700">
                    vs {formatNumber(analysis.competitors.reduce((sum, c) => sum + c.metrics.avgLikes, 0) / analysis.competitors.length)} avg
                  </p>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Your Post Frequency</h4>
                  <p className="text-2xl font-bold text-yellow-900">
                    {analysis.yourMetrics.postFrequency}/week
                  </p>
                  <p className="text-sm text-yellow-700">
                    vs {(analysis.competitors.reduce((sum, c) => sum + c.metrics.postFrequency, 0) / analysis.competitors.length).toFixed(1)}/week avg
                  </p>
                </div>
              </div>

              {/* Top Performers */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-3">Top Performers</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.insights.topPerformers.map(performer => (
                    <span key={performer} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      🏆 @{performer}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Common Strategies</h4>
                  <ul className="space-y-2">
                    {analysis.insights.commonStrategies.map((strategy, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <span className="text-blue-500 mt-1">•</span>
                        <span>{strategy}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Recommendations</h4>
                  <ul className="space-y-2">
                    {analysis.insights.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <span className="text-green-500 mt-1">💡</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Competitors Tab */}
          {activeTab === 'competitors' && (
            <div className="space-y-6">
              {/* Competitor Selection */}
              <div className="flex flex-wrap gap-2 mb-4">
                {analysis.competitors.map(comp => (
                  <button
                    key={comp.competitor.username}
                    onClick={() => setSelectedCompetitor(
                      selectedCompetitor === comp.competitor.username ? null : comp.competitor.username
                    )}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      selectedCompetitor === comp.competitor.username
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    @{comp.competitor.username}
                    {comp.competitor.verified && <span className="ml-1 text-blue-500">✓</span>}
                  </button>
                ))}
              </div>

              {/* Competitor Details */}
              {selectedCompetitor ? (
                <div className="space-y-6">
                  {(() => {
                    const comp = getSelectedCompetitorAnalysis();
                    if (!comp) return null;

                    return (
                      <>
                        {/* Profile Info */}
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center space-x-4 mb-4">
                            <img
                              src={comp.competitor.avatar}
                              alt={comp.competitor.username}
                              className="w-16 h-16 rounded-full"
                            />
                            <div>
                              <h4 className="font-bold text-lg">
                                {comp.competitor.displayName}
                                {comp.competitor.verified && <span className="ml-2 text-blue-500">✓</span>}
                              </h4>
                              <p className="text-gray-600">@{comp.competitor.username}</p>
                              <p className="text-sm text-gray-500 mt-1">{comp.competitor.bio}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-2xl font-bold text-blue-600">
                                {formatNumber(comp.competitor.followersCount)}
                              </p>
                              <p className="text-sm text-gray-600">Followers</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">
                                {formatNumber(comp.competitor.followingCount)}
                              </p>
                              <p className="text-sm text-gray-600">Following</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-purple-600">
                                {formatNumber(comp.competitor.postsCount)}
                              </p>
                              <p className="text-sm text-gray-600">Posts</p>
                            </div>
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-blue-900">{comp.metrics.engagementRate}%</p>
                            <p className="text-sm text-blue-700">Engagement Rate</p>
                          </div>
                          <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-900">{formatNumber(comp.metrics.avgLikes)}</p>
                            <p className="text-sm text-green-700">Avg Likes</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-purple-900">{formatNumber(comp.metrics.avgComments)}</p>
                            <p className="text-sm text-purple-700">Avg Comments</p>
                          </div>
                          <div className="p-4 bg-yellow-50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-yellow-900">{comp.metrics.postFrequency}</p>
                            <p className="text-sm text-yellow-700">Posts/Week</p>
                          </div>
                        </div>

                        {/* Top Hashtags */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3">Top Performing Hashtags</h4>
                          <div className="flex flex-wrap gap-2">
                            {comp.metrics.topHashtags.slice(0, 10).map(hashtag => (
                              <span
                                key={hashtag.hashtag}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                #{hashtag.hashtag} ({formatNumber(hashtag.avgEngagement)} avg)
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Select a competitor above to view detailed analysis
                </div>
              )}
            </div>
          )}

          {/* Opportunities Tab */}
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-3">Unique Opportunities</h4>
                  <ul className="space-y-2">
                    {analysis.insights.uniqueOpportunities.map((opportunity, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm text-yellow-700">
                        <span className="text-yellow-500 mt-1">💡</span>
                        <span>{opportunity}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-3">Content Gaps to Exploit</h4>
                  <ul className="space-y-2">
                    {analysis.competitors.flatMap(c => c.opportunities.contentGaps)
                      .filter((gap, index, arr) => arr.indexOf(gap) === index)
                      .slice(0, 5)
                      .map((gap, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-green-700">
                          <span className="text-green-500 mt-1">🎯</span>
                          <span>{gap}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Underutilized Hashtags */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">Underutilized Hashtags with High Potential</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.competitors
                    .flatMap(c => c.opportunities.underutilizedHashtags)
                    .filter((hashtag, index, arr) => arr.indexOf(hashtag) === index)
                    .slice(0, 15)
                    .map(hashtag => (
                      <span
                        key={hashtag}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        #{hashtag}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Content Strategy Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {analysis.competitors.map(comp => (
                <div key={comp.competitor.username} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">@{comp.competitor.username} Content Strategy</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h5 className="font-medium mb-2">Content Types</h5>
                      <div className="space-y-1">
                        {Object.entries(comp.contentStrategy.topContentTypes).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-sm">
                            <span className="capitalize">{type}</span>
                            <span>{count} posts</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Posting Pattern</h5>
                      <div className="space-y-1">
                        {Object.entries(comp.contentStrategy.postingPattern)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .map(([day, count]) => (
                            <div key={day} className="flex justify-between text-sm">
                              <span>{day}</span>
                              <span>{count} posts</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Engagement Tactics</h5>
                      <div className="space-y-1">
                        {comp.contentStrategy.engagementTactics.map((tactic, index) => (
                          <div key={index} className="text-sm text-gray-700">
                            • {tactic}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h5 className="font-medium mb-2">Best Posting Times</h5>
                    <div className="flex flex-wrap gap-2">
                      {comp.metrics.bestPostingTimes.map(time => (
                        <span key={time} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-xs text-gray-500 text-center">
            Last updated: {new Date(analysis.lastUpdated).toLocaleString()}
          </div>
        </>
      )}

      {!analysis && !isLoading && competitors.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Add competitors above to start analyzing their strategies and find growth opportunities
        </div>
      )}
    </div>
  );
}
