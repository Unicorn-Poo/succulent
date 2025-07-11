"use client";

import { useState } from "react";
import { Button, Badge } from "@radix-ui/themes";
import { Grid, List, Filter, ArrowLeft, Layout } from "lucide-react";
import InstagramPreview from "./platform-previews/instagram-preview";
import XPreview from "./platform-previews/x-preview";
import YouTubePreview from "./platform-previews/youtube-preview";
import PlatformTimelineView from "./platform-timeline-view";

interface Post {
  id: string;
  title: string;
  content: string;
  platforms: string[];
  status: 'published' | 'scheduled' | 'draft';
  publishedAt?: string;
  scheduledFor?: string;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface Account {
  name: string;
  platform: string;
  username?: string;
  isLinked: boolean;
}

interface PlatformProfileViewProps {
  account: Account;
  posts: Post[];
  onBack: () => void;
}

type ViewModeType = 'feed' | 'grid' | 'timeline';

export default function PlatformProfileView({ account, posts, onBack }: PlatformProfileViewProps) {
  const [viewMode, setViewMode] = useState<ViewModeType>('feed');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
  
  // Filter posts for this platform
  const platformPosts = posts.filter(post => 
    post.platforms.includes(account.platform) || 
    (account.platform === 'instagram' && post.platforms.includes('instagram')) ||
    (account.platform === 'x' && post.platforms.includes('x')) ||
    (account.platform === 'youtube' && post.platforms.includes('youtube'))
  );
  
  // Filter by status
  const filteredPosts = platformPosts.filter(post => {
    if (statusFilter === 'all') return true;
    return post.status === statusFilter;
  });
  
  // Sort posts by date (most recent first)
  const sortedPosts = filteredPosts.sort((a, b) => {
    const dateA = new Date(a.publishedAt || a.scheduledFor || '2024-01-01');
    const dateB = new Date(b.publishedAt || b.scheduledFor || '2024-01-01');
    return dateB.getTime() - dateA.getTime();
  });
  
  const getStatusCounts = () => {
    return {
      all: platformPosts.length,
      published: platformPosts.filter(p => p.status === 'published').length,
      scheduled: platformPosts.filter(p => p.status === 'scheduled').length,
      draft: platformPosts.filter(p => p.status === 'draft').length,
    };
  };
  
  const statusCounts = getStatusCounts();
  
  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'from-purple-500 to-pink-500';
      case 'x': return 'from-blue-500 to-purple-500';
      case 'youtube': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };
  
  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case 'instagram': return '📷';
      case 'x': return '🐦';
      case 'youtube': return '📹';
      default: return '📱';
    }
  };
  
  const renderPreview = (post: Post) => {
    const accountData = {
      name: account.name,
      username: account.username,
    };
    
    switch (account.platform) {
      case 'instagram':
        return <InstagramPreview key={post.id} post={post} account={accountData} />;
      case 'x':
        return <XPreview key={post.id} post={post} account={accountData} />;
      case 'youtube':
        return <YouTubePreview key={post.id} post={post} account={accountData} />;
      default:
        return <XPreview key={post.id} post={post} account={accountData} />;
    }
  };

  // Timeline View
  if (viewMode === 'timeline') {
    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="1" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${getPlatformColor(account.platform)} rounded-full flex items-center justify-center`}>
                <span className="text-2xl">{getPlatformEmoji(account.platform)}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  {account.name}
                  {account.isLinked ? (
                    <Badge color="green" size="1">Connected</Badge>
                  ) : (
                    <Badge color="gray" size="1">Pending</Badge>
                  )}
                </h1>
                <p className="text-gray-600 capitalize">
                  {account.platform} • Timeline View • {platformPosts.length} posts
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'feed' ? 'solid' : 'outline'} 
              size="1"
              onClick={() => setViewMode('feed')}
            >
              <List className="w-4 h-4 mr-2" />
              Feed
            </Button>
            <Button 
              variant={viewMode === 'grid' ? 'solid' : 'outline'} 
              size="1"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4 mr-2" />
              Grid
            </Button>
            <Button 
              variant={viewMode === 'timeline' ? 'solid' : 'outline'} 
              size="1"
              onClick={() => setViewMode('timeline')}
            >
              <Layout className="w-4 h-4 mr-2" />
              Timeline
            </Button>
          </div>
        </div>

        {/* Timeline View Component */}
        <PlatformTimelineView account={account} posts={platformPosts} />

        {/* Demo Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">✨</span>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Timeline Preview</h3>
              <p className="text-blue-700 text-sm">
                This shows exactly how your {account.platform} profile will look to visitors. 
                {account.platform === 'instagram' && ' Perfect for planning your grid layout!'}
                {account.platform === 'x' && ' See how your timeline flows for followers.'}
                {account.platform === 'youtube' && ' View your channel as subscribers see it.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 bg-gradient-to-br ${getPlatformColor(account.platform)} rounded-full flex items-center justify-center`}>
              <span className="text-2xl">{getPlatformEmoji(account.platform)}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                {account.name}
                {account.isLinked ? (
                  <Badge color="green" size="1">Connected</Badge>
                ) : (
                  <Badge color="gray" size="1">Pending</Badge>
                )}
              </h1>
              <p className="text-gray-600 capitalize">
                {account.platform} • {platformPosts.length} posts
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'feed' ? 'solid' : 'outline'} 
            size="1"
            onClick={() => setViewMode('feed')}
          >
            <List className="w-4 h-4 mr-2" />
            Feed
          </Button>
          <Button 
            variant={viewMode === 'grid' ? 'solid' : 'outline'} 
            size="1"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button 
            variant={viewMode === 'timeline' ? 'solid' : 'outline'} 
            size="1"
            onClick={() => setViewMode('timeline')}
          >
            <Layout className="w-4 h-4 mr-2" />
            Timeline
          </Button>
        </div>
      </div>
      
      {/* Stats and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statusCounts.published}</p>
              <p className="text-sm text-gray-500">Published</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.scheduled}</p>
              <p className="text-sm text-gray-500">Scheduled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{statusCounts.draft}</p>
              <p className="text-sm text-gray-500">Drafts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Posts ({statusCounts.all})</option>
              <option value="published">Published ({statusCounts.published})</option>
              <option value="scheduled">Scheduled ({statusCounts.scheduled})</option>
              <option value="draft">Drafts ({statusCounts.draft})</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Posts */}
      {sortedPosts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-2xl text-gray-400">{getPlatformEmoji(account.platform)}</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
          <p className="text-gray-600">
            {statusFilter === 'all' 
              ? `No posts have been created for ${account.name} yet.`
              : `No ${statusFilter} posts found for ${account.name}.`
            }
          </p>
        </div>
      ) : (
        <div className={`${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
            : 'space-y-6'
        }`}>
          {sortedPosts.map(post => renderPreview(post))}
        </div>
      )}
      
      {/* Demo Notice */}
      {sortedPosts.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-1">Platform Preview</h3>
              <p className="text-blue-700 text-sm">
                These previews show how your posts would appear on {account.platform}. 
                Actual posts may vary slightly from these previews. Try the Timeline view for a realistic platform layout!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 