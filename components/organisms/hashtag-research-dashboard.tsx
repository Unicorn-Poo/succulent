'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';

interface HashtagAnalysis {
  hashtag: string;
  usage: number;
  engagement: number;
  reach: number;
  trend: 'rising' | 'stable' | 'declining';
  difficulty: 'low' | 'medium' | 'high';
  relevanceScore: number;
}

interface HashtagResearchData {
  trending: HashtagAnalysis[];
  relevant: HashtagAnalysis[];
  competitive: HashtagAnalysis[];
  recommendations: string[];
  insights: {
    bestPerformingTags: string[];
    underutilizedTags: string[];
    competitorTags: string[];
  };
}

interface HashtagResearchDashboardProps {
  content: string;
  platform?: string;
  profileKey?: string;
  onHashtagsSelected?: (hashtags: string[]) => void;
}

export default function HashtagResearchDashboard({
  content,
  platform = 'instagram',
  profileKey,
  onHashtagsSelected
}: HashtagResearchDashboardProps) {
  const [researchData, setResearchData] = useState<HashtagResearchData | null>(null);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'relevant' | 'competitive' | 'recommendations'>('trending');
  const [includeCompetitorAnalysis, setIncludeCompetitorAnalysis] = useState(false);

  const fetchHashtagResearch = useCallback(async () => {
    if (!content || content.trim().length < 10) {
      setError('Content must be at least 10 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/hashtag-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platform,
          profileKey,
          includeCompetitorAnalysis
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to research hashtags');
      }

      const data = await response.json();
      setResearchData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to research hashtags');
    } finally {
      setIsLoading(false);
    }
  }, [content, platform, profileKey, includeCompetitorAnalysis]);

  useEffect(() => {
    if (content.length > 10) {
      const debounceTimer = setTimeout(() => {
        fetchHashtagResearch();
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  }, [fetchHashtagResearch]);

  const handleHashtagToggle = (hashtag: string) => {
    setSelectedHashtags(prev => {
      const newSelection = prev.includes(hashtag)
        ? prev.filter(h => h !== hashtag)
        : [...prev, hashtag];
      
      if (onHashtagsSelected) {
        onHashtagsSelected(newSelection);
      }
      
      return newSelection;
    });
  };

  const handleCopyHashtags = async () => {
    if (selectedHashtags.length === 0) return;

    const hashtagsText = selectedHashtags.map(tag => `#${tag}`).join(' ');
    
    try {
      await navigator.clipboard.writeText(hashtagsText);
    } catch (error) {
      console.error('Failed to copy hashtags:', error);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-yellow-600';
    }
  };

  const renderHashtagList = (hashtags: HashtagAnalysis[], showMetrics = true) => (
    <div className="grid gap-2 max-h-96 overflow-y-auto">
      {hashtags.map((hashtag, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedHashtags.includes(hashtag.hashtag)
              ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
              : 'border-border hover:border-border'
          }`}
          onClick={() => handleHashtagToggle(hashtag.hashtag)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-foreground">#{hashtag.hashtag}</span>
              {showMetrics && (
                <>
                  <span className="text-sm">{getTrendIcon(hashtag.trend)}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(hashtag.difficulty)} bg-muted`}>
                    {hashtag.difficulty}
                  </span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(hashtag.relevanceScore * 100)}% relevance
            </div>
          </div>
          
          {showMetrics && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Usage:</span> {hashtag.usage.toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-foreground">Engagement:</span> {hashtag.engagement.toLocaleString()}
              </div>
              <div>
                <span className="font-medium text-foreground">Reach:</span> {hashtag.reach.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderRecommendationsList = (hashtags: string[]) => (
    <div className="grid gap-2 max-h-96 overflow-y-auto">
      {hashtags.map((hashtag, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            selectedHashtags.includes(hashtag)
              ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20'
              : 'border-border hover:border-border'
          }`}
          onClick={() => handleHashtagToggle(hashtag)}
        >
          <span className="font-medium text-foreground">#{hashtag}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Hashtag Research & Analysis</h3>
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={includeCompetitorAnalysis}
              onChange={(e) => setIncludeCompetitorAnalysis(e.target.checked)}
              className="rounded"
            />
            <span>Include Competitor Analysis</span>
          </label>
          <Button
            onClick={fetchHashtagResearch}
            disabled={isLoading || content.length < 10}
            size="sm"
          >
            {isLoading ? 'Researching...' : 'Research Hashtags'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {selectedHashtags.length > 0 && (
        <div className="mb-6 p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">Selected Hashtags ({selectedHashtags.length})</span>
            <Button onClick={handleCopyHashtags} size="sm" variant="outline">
              Copy All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map(hashtag => (
              <span
                key={hashtag}
                className="px-2 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded text-sm cursor-pointer"
                onClick={() => handleHashtagToggle(hashtag)}
              >
                #{hashtag} ✕
              </span>
            ))}
          </div>
        </div>
      )}

      {researchData && (
        <>
          {/* Insights Panel */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Best Performing</h4>
              <div className="space-y-1">
                {researchData.insights.bestPerformingTags.map(tag => (
                  <span key={tag} className="block text-sm text-green-700 dark:text-green-300">#{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">Underutilized</h4>
              <div className="space-y-1">
                {researchData.insights.underutilizedTags.map(tag => (
                  <span key={tag} className="block text-sm text-yellow-700 dark:text-yellow-300">#{tag}</span>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">Competitor Tags</h4>
              <div className="space-y-1">
                {researchData.insights.competitorTags.map(tag => (
                  <span key={tag} className="block text-sm text-purple-700 dark:text-purple-300">#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4">
            <div className="flex space-x-1 border-b">
              {[
                { key: 'trending', label: `Trending (${researchData.trending.length})` },
                { key: 'relevant', label: `Relevant (${researchData.relevant.length})` },
                { key: 'competitive', label: `Competitive (${researchData.competitive.length})` },
                { key: 'recommendations', label: `Recommendations (${researchData.recommendations.length})` }
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

          {/* Tab Content */}
          <div>
            {activeTab === 'trending' && renderHashtagList(researchData.trending)}
            {activeTab === 'relevant' && renderHashtagList(researchData.relevant)}
            {activeTab === 'competitive' && renderHashtagList(researchData.competitive)}
            {activeTab === 'recommendations' && renderRecommendationsList(researchData.recommendations)}
          </div>
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600"></div>
          <span className="ml-2 text-muted-foreground">Researching hashtags...</span>
        </div>
      )}

      {!researchData && !isLoading && !error && (
        <div className="text-center py-8 text-muted-foreground">
          Enter at least 10 characters of content to research hashtags
        </div>
      )}
    </div>
  );
}
