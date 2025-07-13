"use client";

import { useState } from "react";
import { Button, Badge, Tabs, Text } from "@radix-ui/themes";
import { Grid, List, Filter, ArrowLeft, Layout, BarChart3, Users } from "lucide-react";
import InstagramPreview from "./platform-previews/instagram-preview";
import XPreview from "./platform-previews/x-preview";
import YouTubePreview from "./platform-previews/youtube-preview";
import PlatformTimelineView from "./platform-timeline-view";
import InstagramAccountDashboard from "./instagram-account-dashboard";

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
  id: string;
  name: string;
  platform: string;
  profileKey?: string;
  isLinked: boolean;
}

interface PlatformProfileViewProps {
  account: Account;
  posts: Post[];
  onBack: () => void;
  accountGroupId?: string;
}

type ViewModeType = 'feed' | 'grid' | 'analytics';

export default function PlatformProfileView({ account, posts, onBack, accountGroupId }: PlatformProfileViewProps) {
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
      case 'x': return 'from-lime-500 to-purple-500';
      case 'youtube': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // Transform account to match InstagramAccountDashboard interface
  const transformedAccount = {
    id: account.id,
    name: account.name,
    platform: account.platform as "instagram",
    profileKey: account.profileKey,
    isLinked: account.isLinked
  };

  const renderContent = () => {
    if (viewMode === 'analytics') {
      // Show analytics view for supported platforms
      if (account.platform === 'instagram') {
        return (
          <div className="mt-6">
            <InstagramAccountDashboard 
              account={transformedAccount}
              accountGroupId={accountGroupId}
            />
          </div>
        );
      } else {
        // For other platforms, show a placeholder for now
        return (
          <div className="mt-6 text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <Text size="4" weight="medium" className="mb-2 block">
              Analytics Coming Soon
            </Text>
            <Text size="2" color="gray" className="mb-6 block">
              Detailed analytics for {account.platform} accounts will be available soon.
            </Text>
            <Button 
              onClick={() => window.open('https://app.ayrshare.com/dashboard', '_blank')}
              variant="soft"
            >
              View in Ayrshare Dashboard
            </Button>
          </div>
        );
      }
    }

    if (viewMode === 'grid') {
      return (
        <PlatformTimelineView 
          account={account} 
          posts={sortedPosts}
          accountGroupId={accountGroupId}
        />
      );
    }

    // Feed view - platform previews
    return (
      <div className="space-y-4 mt-6">
        {sortedPosts.map((post) => {
          // Create compatible post format for preview components
          const previewPost = {
            id: post.id,
            title: post.title,
            content: post.content || "",
            publishedAt: post.publishedAt,
            scheduledFor: post.scheduledFor,
            status: post.status,
            engagement: post.engagement
          };

          const accountData = {
            name: account.name,
            username: account.name // Fallback to name if username not available
          };

          switch (account.platform) {
            case 'instagram':
              return (
                <InstagramPreview 
                  key={post.id}
                  post={previewPost}
                  account={accountData}
                />
              );
            case 'x':
              return (
                <XPreview 
                  key={post.id}
                  post={previewPost}
                  account={accountData}
                />
              );
            case 'youtube':
              return (
                <YouTubePreview 
                  key={post.id}
                  post={previewPost}
                  account={accountData}
                />
              );
            default:
              return (
                <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Text size="3" weight="medium">{post.title}</Text>
                    <Badge color={post.status === 'published' ? 'green' : post.status === 'scheduled' ? 'lime' : 'gray'}>
                      {post.status}
                    </Badge>
                  </div>
                  <Text size="2" color="gray" className="mb-3 block">
                    {post.content}
                  </Text>
                  <Text size="1" color="gray">
                    {post.status === 'published' ? 
                      `Published ${new Date(post.publishedAt!).toLocaleDateString()}` :
                      post.status === 'scheduled' ?
                      `Scheduled for ${new Date(post.scheduledFor!).toLocaleDateString()}` :
                      'Draft'
                    }
                  </Text>
                </div>
              );
          }
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gradient-to-r ${getPlatformColor(account.platform)} text-white`}>
            <Users className="w-5 h-5" />
            <div>
              <h1 className="text-lg font-semibold">{account.name}</h1>
              <p className="text-sm opacity-90 capitalize">{account.platform} Account</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${account.isLinked ? 'bg-green-500' : 'bg-gray-400'}`} />
          <Text size="2" color={account.isLinked ? "green" : "gray"}>
            {account.isLinked ? 'Connected' : 'Not Connected'}
          </Text>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <Tabs.Root value={viewMode} onValueChange={(value) => setViewMode(value as ViewModeType)}>
          <Tabs.List>
            <Tabs.Trigger value="feed">
              <List className="w-4 h-4 mr-2" />
              Feed View
            </Tabs.Trigger>
            <Tabs.Trigger value="grid">
              <Grid className="w-4 h-4 mr-2" />
              Grid View
            </Tabs.Trigger>
            <Tabs.Trigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>

      {/* Stats Overview */}
      {viewMode !== 'analytics' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{statusCounts.published}</p>
                <p className="text-sm text-gray-500">Published</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-lime-600">{statusCounts.scheduled}</p>
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
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
              >
                <option value="all">All Posts ({statusCounts.all})</option>
                <option value="published">Published ({statusCounts.published})</option>
                <option value="scheduled">Scheduled ({statusCounts.scheduled})</option>
                <option value="draft">Drafts ({statusCounts.draft})</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {sortedPosts.length === 0 && viewMode !== 'analytics' ? (
        <div className="text-center py-12">
          <Layout className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <Text size="4" weight="medium" className="mb-2 block">
            No Posts Found
          </Text>
          <Text size="2" color="gray" className="mb-6 block">
            {statusFilter === 'all' 
              ? `No posts have been created for this ${account.platform} account yet.`
              : `No ${statusFilter} posts found for this account.`
            }
          </Text>
          <Button onClick={() => setStatusFilter('all')} variant="soft">
            View All Posts
          </Button>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
} 