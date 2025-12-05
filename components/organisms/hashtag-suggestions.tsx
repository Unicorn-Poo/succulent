"use client";

import { Card, Text, Button, Badge, Tabs } from "@radix-ui/themes";
import { Hash, TrendingUp, Target, Zap, Copy, Check, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import {
  getHashtagSuggestions,
  HashtagSuggestions as HashtagSuggestionsType,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";

interface HashtagSuggestionsProps {
  content: string;
  platform: string;
  profileKey?: string;
  onHashtagsSelected?: (hashtags: string[]) => void;
}

interface HashtagItemProps {
  hashtag: string;
  performance?: {
    usage: number;
    engagement: number;
    reach: number;
  };
  category: 'trending' | 'relevant' | 'competitive';
  selected: boolean;
  onToggle: (hashtag: string) => void;
}

const HashtagItem = ({ hashtag, performance, category, selected, onToggle }: HashtagItemProps) => {
  const getCategoryColor = () => {
    switch (category) {
      case 'trending': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'relevant': return 'bg-brand-mint/10 dark:bg-brand-seafoam/20 text-brand-seafoam dark:text-brand-mint border-brand-mint/40 dark:border-brand-seafoam/40';
      case 'competitive': return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-muted text-foreground border-border';
    }
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'trending': return { icon: <TrendingUp className="w-3 h-3" />, label: 'Trending' };
      case 'relevant': return { icon: <Target className="w-3 h-3" />, label: 'Relevant' };
      case 'competitive': return { icon: <Zap className="w-3 h-3" />, label: 'Competitive' };
      default: return { icon: <Hash className="w-3 h-3" />, label: 'Hashtag' };
    }
  };

  const categoryInfo = getCategoryLabel();

  return (
    <div 
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        selected 
          ? 'bg-brand-mint/10 border-brand-mint ring-2 ring-brand-mint/40' 
          : getCategoryColor()
      }`}
      onClick={() => onToggle(hashtag)}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">#{hashtag}</span>
          {selected && <Check className="w-4 h-4 text-brand-seafoam dark:text-brand-mint" />}
        </div>
        <div className="flex items-center gap-1 text-xs">
          {categoryInfo.icon}
          <span>{categoryInfo.label}</span>
        </div>
      </div>
      
      {performance && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-foreground">{performance.usage.toLocaleString()}</div>
            <div className="text-muted-foreground">Uses</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{performance.engagement.toFixed(1)}%</div>
            <div className="text-muted-foreground">Engagement</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-foreground">{(performance.reach / 1000).toFixed(1)}K</div>
            <div className="text-muted-foreground">Reach</div>
          </div>
        </div>
      )}
    </div>
  );
};

const HashtagCategory = ({ 
  title, 
  hashtags, 
  performance, 
  category, 
  selectedHashtags, 
  onHashtagToggle 
}: {
  title: string;
  hashtags: string[];
  performance: Record<string, any>;
  category: 'trending' | 'relevant' | 'competitive';
  selectedHashtags: string[];
  onHashtagToggle: (hashtag: string) => void;
}) => {
  if (hashtags.length === 0) return null;

  return (
    <div className="space-y-3">
      <Text size="3" weight="medium">{title}</Text>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {hashtags.map(hashtag => (
          <HashtagItem
            key={hashtag}
            hashtag={hashtag}
            performance={performance[hashtag]}
            category={category}
            selected={selectedHashtags.includes(hashtag)}
            onToggle={onHashtagToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default function HashtagSuggestions({ 
  content, 
  platform, 
  profileKey,
  onHashtagsSelected 
}: HashtagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<HashtagSuggestionsType | null>(null);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const businessPlanAvailable = isFeatureAvailable('hashtag-suggestions');

  const fetchSuggestions = async () => {
    if (!content.trim() || !businessPlanAvailable) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getHashtagSuggestions(content, platform, profileKey);
      setSuggestions(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to get hashtag suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (content.length > 10) {
      const debounceTimer = setTimeout(() => {
        fetchSuggestions();
      }, 1000);

      return () => clearTimeout(debounceTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, platform, profileKey]);

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy hashtags:', error);
    }
  };

  const handleSelectAll = (category: 'trending' | 'relevant' | 'competitive') => {
    if (!suggestions) return;

    const categoryHashtags = suggestions[category] || [];
    const newSelected = [...new Set([...selectedHashtags, ...categoryHashtags])];
    setSelectedHashtags(newSelected);
    
    if (onHashtagsSelected) {
      onHashtagsSelected(newSelected);
    }
  };

  if (!businessPlanAvailable) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <Hash className="w-8 h-8 text-muted-foreground mx-auto" />
          <div>
            <Text size="3" weight="medium" className="block">Hashtag Suggestions</Text>
            <Text size="2" color="gray" className="block mt-1">
              AI-powered hashtag suggestions require Business Plan
            </Text>
          </div>
          <Button size="2" onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
            Upgrade Plan
          </Button>
        </div>
      </Card>
    );
  }

  if (!content.trim()) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-2">
          <Hash className="w-8 h-8 text-muted-foreground mx-auto" />
          <Text size="3" color="gray">Start typing your post content to get hashtag suggestions</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <div className="text-red-600 dark:text-red-400">
            <Text size="3" weight="medium">Error Loading Suggestions</Text>
            <Text size="2" className="block mt-1">{error}</Text>
          </div>
          <Button onClick={fetchSuggestions} variant="soft" size="2">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-brand-seafoam dark:text-brand-mint" />
            <Text size="3" weight="medium">Hashtag Suggestions</Text>
            <Badge variant="soft" className="capitalize">{platform}</Badge>
          </div>
          
          <div className="flex gap-2">
            {selectedHashtags.length > 0 && (
              <Button 
                onClick={handleCopyHashtags}
                size="2"
                variant="soft"
                className={copied ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : ''}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : `Copy ${selectedHashtags.length}`}
              </Button>
            )}
            
            <Button onClick={fetchSuggestions} size="2" variant="soft">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Selected Hashtags Summary */}
        {selectedHashtags.length > 0 && (
          <div className="p-3 bg-brand-mint/10 border border-brand-mint/40 rounded-lg">
            <Text size="2" weight="medium" className="block mb-2">
              Selected ({selectedHashtags.length})
            </Text>
            <div className="flex flex-wrap gap-2">
              {selectedHashtags.map(hashtag => (
                <Badge 
                  key={hashtag} 
                  variant="solid" 
                  className="bg-brand-seafoam text-white cursor-pointer"
                  onClick={() => handleHashtagToggle(hashtag)}
                >
                  #{hashtag} ×
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-20 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions && !isLoading && (
          <Tabs.Root defaultValue="trending">
            <Tabs.List>
              <Tabs.Trigger value="trending">
                Trending ({suggestions.trending?.length || 0})
              </Tabs.Trigger>
              <Tabs.Trigger value="relevant">
                Relevant ({suggestions.relevant?.length || 0})
              </Tabs.Trigger>
              <Tabs.Trigger value="competitive">
                Competitive ({suggestions.competitive?.length || 0})
              </Tabs.Trigger>
            </Tabs.List>

            <div className="mt-4">
              <Tabs.Content value="trending">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Text size="2" color="gray">
                      Currently trending hashtags for your content
                    </Text>
                    <Button 
                      size="1" 
                      variant="soft" 
                      onClick={() => handleSelectAll('trending')}
                    >
                      Select All
                    </Button>
                  </div>
                  <HashtagCategory
                    title=""
                    hashtags={suggestions.trending || []}
                    performance={suggestions.performance || {}}
                    category="trending"
                    selectedHashtags={selectedHashtags}
                    onHashtagToggle={handleHashtagToggle}
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content value="relevant">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Text size="2" color="gray">
                      Hashtags relevant to your content and audience
                    </Text>
                    <Button 
                      size="1" 
                      variant="soft" 
                      onClick={() => handleSelectAll('relevant')}
                    >
                      Select All
                    </Button>
                  </div>
                  <HashtagCategory
                    title=""
                    hashtags={suggestions.relevant || []}
                    performance={suggestions.performance || {}}
                    category="relevant"
                    selectedHashtags={selectedHashtags}
                    onHashtagToggle={handleHashtagToggle}
                  />
                </div>
              </Tabs.Content>

              <Tabs.Content value="competitive">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Text size="2" color="gray">
                      Hashtags used by similar accounts in your niche
                    </Text>
                    <Button 
                      size="1" 
                      variant="soft" 
                      onClick={() => handleSelectAll('competitive')}
                    >
                      Select All
                    </Button>
                  </div>
                  <HashtagCategory
                    title=""
                    hashtags={suggestions.competitive || []}
                    performance={suggestions.performance || {}}
                    category="competitive"
                    selectedHashtags={selectedHashtags}
                    onHashtagToggle={handleHashtagToggle}
                  />
                </div>
              </Tabs.Content>
            </div>
          </Tabs.Root>
        )}

        {/* Empty State */}
        {suggestions && !isLoading && 
         !suggestions.trending?.length && 
         !suggestions.relevant?.length && 
         !suggestions.competitive?.length && (
          <div className="text-center py-8">
            <Hash className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <Text size="3" color="gray">No hashtag suggestions found</Text>
            <Text size="2" color="gray" className="block mt-1">
              Try different content or check back later
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
} 