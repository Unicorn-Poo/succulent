'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';

interface RSSFeed {
  id: string;
  url: string;
  title: string;
  description: string;
  platforms: string[];
  autoPost: boolean;
  postTemplate: string;
  createdAt: string;
  lastChecked: string;
  postsCount: number;
  isActive: boolean;
}

interface ContentItem {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt: string;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  engagementPotential: number;
  isScheduled: boolean;
  scheduledDate?: string;
  platforms?: string[];
}

interface TrendingTopic {
  topic: string;
  volume: number;
  trend: 'rising' | 'stable' | 'declining';
  hashtags: string[];
  relatedContent: ContentItem[];
}

interface ContentDiscoveryManagerProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function ContentDiscoveryManager({
  platform,
  profileKey,
  accountGroup
}: ContentDiscoveryManagerProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [discoveredContent, setDiscoveredContent] = useState<ContentItem[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [activeTab, setActiveTab] = useState<'feeds' | 'content' | 'trending' | 'scheduled'>('content');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<string[]>([]);
  const [newFeed, setNewFeed] = useState({
    url: '',
    title: '',
    platforms: [platform],
    autoPost: false,
    postTemplate: 'Check out this interesting article: {title} {url} #content #discovery'
  });

  // Load RSS feeds
  const loadFeeds = useCallback(async () => {
    try {
      const response = await fetch('/api/rss-feeds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFeeds(data.feeds || []);
      }
    } catch (error) {
      console.error('Error loading RSS feeds:', error);
    }
  }, []);

  // Discover content from various sources
  const discoverContent = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate content discovery from multiple sources
      const mockContent: ContentItem[] = [
        {
          id: '1',
          title: 'The Future of Social Media Marketing in 2024',
          content: 'Social media marketing continues to evolve with new platforms, AI integration, and changing user behaviors. Here are the key trends to watch...',
          url: 'https://example.com/social-media-2024',
          source: 'Marketing Blog',
          publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          tags: ['marketing', 'social media', 'trends', '2024'],
          sentiment: 'positive',
          engagementPotential: 85,
          isScheduled: false
        },
        {
          id: '2',
          title: 'How to Increase Engagement on Instagram: 10 Proven Strategies',
          content: 'Discover the most effective ways to boost your Instagram engagement rates with these data-driven strategies that actually work...',
          url: 'https://example.com/instagram-engagement',
          source: 'Growth Hacker',
          publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          tags: ['instagram', 'engagement', 'growth', 'strategy'],
          sentiment: 'positive',
          engagementPotential: 92,
          isScheduled: false
        },
        {
          id: '3',
          title: 'The Rise of Short-Form Video Content',
          content: 'Short-form videos are dominating social media. Learn how to create compelling content that captures attention in seconds...',
          url: 'https://example.com/short-form-video',
          source: 'Content Creator Hub',
          publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          tags: ['video', 'content creation', 'tiktok', 'reels'],
          sentiment: 'positive',
          engagementPotential: 88,
          isScheduled: false
        },
        {
          id: '4',
          title: 'AI Tools That Are Changing Content Creation',
          content: 'Artificial intelligence is revolutionizing how we create, edit, and optimize content across all social media platforms...',
          url: 'https://example.com/ai-content-tools',
          source: 'Tech Today',
          publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          tags: ['ai', 'tools', 'content creation', 'automation'],
          sentiment: 'positive',
          engagementPotential: 79,
          isScheduled: false
        },
        {
          id: '5',
          title: 'Building Authentic Connections in the Digital Age',
          content: 'In a world of algorithms and automation, authentic human connections remain the key to social media success...',
          url: 'https://example.com/authentic-connections',
          source: 'Community Builder',
          publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          tags: ['authenticity', 'community', 'engagement', 'relationships'],
          sentiment: 'positive',
          engagementPotential: 81,
          isScheduled: false
        }
      ];

      setDiscoveredContent(mockContent);

      // Generate trending topics
      const mockTrending: TrendingTopic[] = [
        {
          topic: 'AI Content Creation',
          volume: 15420,
          trend: 'rising',
          hashtags: ['#AI', '#ContentCreation', '#Automation', '#Marketing'],
          relatedContent: mockContent.filter(item => item.tags.includes('ai'))
        },
        {
          topic: 'Instagram Growth',
          volume: 12890,
          trend: 'stable',
          hashtags: ['#InstagramGrowth', '#SocialMediaTips', '#Engagement'],
          relatedContent: mockContent.filter(item => item.tags.includes('instagram'))
        },
        {
          topic: 'Video Marketing',
          volume: 9340,
          trend: 'rising',
          hashtags: ['#VideoMarketing', '#ShortForm', '#TikTok', '#Reels'],
          relatedContent: mockContent.filter(item => item.tags.includes('video'))
        }
      ];

      setTrendingTopics(mockTrending);

    } catch (error) {
      console.error('Error discovering content:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize with sample RSS feeds
  useEffect(() => {
    const sampleFeeds: RSSFeed[] = [
      {
        id: 'feed_1',
        url: 'https://blog.hootsuite.com/feed/',
        title: 'Hootsuite Blog',
        description: 'Social media marketing tips and trends',
        platforms: ['instagram', 'twitter', 'linkedin'],
        autoPost: false,
        postTemplate: 'Great insights from Hootsuite: {title} {url} #socialmedia #marketing',
        createdAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        postsCount: 0,
        isActive: true
      },
      {
        id: 'feed_2',
        url: 'https://sproutsocial.com/insights/feed/',
        title: 'Sprout Social Insights',
        description: 'Social media strategy and analytics',
        platforms: ['linkedin', 'twitter'],
        autoPost: false,
        postTemplate: 'Valuable insights: {title} {url} #strategy #analytics',
        createdAt: new Date().toISOString(),
        lastChecked: new Date().toISOString(),
        postsCount: 0,
        isActive: true
      }
    ];
    setFeeds(sampleFeeds);
    discoverContent();
  }, [discoverContent]);

  const handleContentToggle = (contentId: string) => {
    setSelectedContent(prev => 
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const scheduleSelectedContent = async () => {
    if (selectedContent.length === 0) {
      alert('Please select content to schedule');
      return;
    }

    // Simulate scheduling content
    const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    
    setDiscoveredContent(prev => 
      prev.map(item => 
        selectedContent.includes(item.id)
          ? { ...item, isScheduled: true, scheduledDate: scheduledDate.toISOString(), platforms: [platform] }
          : item
      )
    );

    setSelectedContent([]);
    alert(`${selectedContent.length} content items scheduled for ${scheduledDate.toLocaleDateString()}`);
  };

  const addRSSFeed = async () => {
    if (!newFeed.url || !newFeed.title) {
      alert('Please enter both URL and title');
      return;
    }

    const feed: RSSFeed = {
      id: `feed_${Date.now()}`,
      url: newFeed.url,
      title: newFeed.title,
      description: 'Custom RSS feed',
      platforms: newFeed.platforms,
      autoPost: newFeed.autoPost,
      postTemplate: newFeed.postTemplate,
      createdAt: new Date().toISOString(),
      lastChecked: new Date().toISOString(),
      postsCount: 0,
      isActive: true
    };

    setFeeds(prev => [...prev, feed]);
    setNewFeed({
      url: '',
      title: '',
      platforms: [platform],
      autoPost: false,
      postTemplate: 'Check out this interesting article: {title} {url} #content #discovery'
    });
  };

  const toggleFeedActive = (feedId: string) => {
    setFeeds(prev => 
      prev.map(feed => 
        feed.id === feedId 
          ? { ...feed, isActive: !feed.isActive }
          : feed
      )
    );
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'negative': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getEngagementColor = (potential: number) => {
    if (potential >= 80) return 'text-green-600 dark:text-green-400';
    if (potential >= 60) return 'text-yellow-600';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Content Discovery Manager</h3>
        <Button onClick={discoverContent} disabled={isLoading}>
          {isLoading ? 'Discovering...' : 'Refresh Content'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b">
          {[
            { key: 'content', label: `Discovered (${discoveredContent.length})` },
            { key: 'trending', label: `Trending (${trendingTopics.length})` },
            { key: 'feeds', label: `RSS Feeds (${feeds.length})` },
            { key: 'scheduled', label: `Scheduled (${discoveredContent.filter(c => c.isScheduled).length})` }
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

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div>
          {selectedContent.length > 0 && (
            <div className="mb-4 p-4 bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{selectedContent.length} content items selected</span>
                <Button onClick={scheduleSelectedContent} size="sm">
                  Schedule Selected
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {discoveredContent
              .filter(item => !item.isScheduled)
              .map(item => (
                <div
                  key={item.id}
                  className={`p-4 border rounded-lg ${
                    selectedContent.includes(item.id) ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20' : 'border-border'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedContent.includes(item.id)}
                      onChange={() => handleContentToggle(item.id)}
                      className="mt-1 rounded"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-foreground">{item.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getSentimentColor(item.sentiment)}`}>
                          {item.sentiment}
                        </span>
                        <span className={`text-sm font-medium ${getEngagementColor(item.engagementPotential)}`}>
                          {item.engagementPotential}% potential
                        </span>
                      </div>
                      
                      <p className="text-foreground mb-3">{item.content}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{item.source}</span>
                          <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-lime-600 dark:text-lime-400 hover:text-lime-800 dark:text-lime-300"
                          >
                            View Original
                          </a>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-muted text-foreground rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {discoveredContent.filter(item => !item.isScheduled).length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No new content discovered. Try refreshing or adding more RSS feeds.
            </div>
          )}
        </div>
      )}

      {/* Trending Tab */}
      {activeTab === 'trending' && (
        <div className="space-y-6">
          {trendingTopics.map(topic => (
            <div key={topic.topic} className="p-4 border border-border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-lg">{topic.topic}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {getTrendIcon(topic.trend)} {topic.volume.toLocaleString()} mentions
                  </span>
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex flex-wrap gap-2">
                  {topic.hashtags.map(hashtag => (
                    <span key={hashtag} className="px-2 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 rounded text-sm">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
              
              {topic.relatedContent.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Related Content</h5>
                  <div className="space-y-2">
                    {topic.relatedContent.map(content => (
                      <div key={content.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{content.title}</span>
                        <span className={`text-xs ${getEngagementColor(content.engagementPotential)}`}>
                          {content.engagementPotential}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Feeds Tab */}
      {activeTab === 'feeds' && (
        <div className="space-y-6">
          {/* Add New Feed */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-3">Add RSS Feed</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                placeholder="RSS Feed URL"
                value={newFeed.url}
                onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
              />
              <Input
                placeholder="Feed Title"
                value={newFeed.title}
                onChange={(e) => setNewFeed(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <textarea
              placeholder="Post template (use {title} and {url} for dynamic content)"
              value={newFeed.postTemplate}
              onChange={(e) => setNewFeed(prev => ({ ...prev, postTemplate: e.target.value }))}
              className="w-full p-3 border rounded-lg h-20 resize-none mb-4"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newFeed.autoPost}
                  onChange={(e) => setNewFeed(prev => ({ ...prev, autoPost: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Auto-post new content</span>
              </label>
              <Button onClick={addRSSFeed} size="sm">
                Add Feed
              </Button>
            </div>
          </div>

          {/* Existing Feeds */}
          <div className="space-y-4">
            {feeds.map(feed => (
              <div key={feed.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{feed.title}</h4>
                  <div className="flex items-center space-x-2">
                    {feed.autoPost && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                        Auto-post
                      </span>
                    )}
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={feed.isActive}
                        onChange={() => toggleFeedActive(feed.id)}
                        className="rounded"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{feed.url}</p>
                <p className="text-sm text-foreground mb-3">{feed.description}</p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Platforms: {feed.platforms.join(', ')}</span>
                  <span>Posts: {feed.postsCount}</span>
                  <span>Last checked: {new Date(feed.lastChecked).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="space-y-4">
          {discoveredContent
            .filter(item => item.isScheduled)
            .map(item => (
              <div key={item.id} className="p-4 border rounded-lg bg-lime-50 dark:bg-lime-900/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <span className="text-sm text-lime-600 dark:text-lime-400">
                    Scheduled for {item.scheduledDate ? new Date(item.scheduledDate).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                
                <p className="text-foreground mb-2">{item.content}</p>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Platforms: {item.platforms?.join(', ') || 'None'}
                  </span>
                  <span className={`text-sm ${getEngagementColor(item.engagementPotential)}`}>
                    {item.engagementPotential}% potential
                  </span>
                </div>
              </div>
            ))}

          {discoveredContent.filter(item => item.isScheduled).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No content scheduled yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}
