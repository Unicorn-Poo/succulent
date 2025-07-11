"use client";

import { Heart, MessageCircle, Play, Eye } from "lucide-react";

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

interface PlatformTimelineViewProps {
  account: Account;
  posts: Post[];
}

export default function PlatformTimelineView({ account, posts }: PlatformTimelineViewProps) {
  // Filter and sort posts for this platform
  const platformPosts = posts
    .filter(post => post.platforms.includes(account.platform))
    .sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.scheduledFor || '2024-01-01');
      const dateB = new Date(b.publishedAt || b.scheduledFor || '2024-01-01');
      return dateB.getTime() - dateA.getTime();
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusOverlay = (post: Post) => {
    if (post.status === 'draft') {
      return (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center">
          <span className="text-white text-xs font-medium px-2 py-1 bg-gray-700 rounded">
            DRAFT
          </span>
        </div>
      );
    }
    if (post.status === 'scheduled') {
      return (
        <div className="absolute inset-0 bg-blue-900 bg-opacity-60 flex items-center justify-center">
          <span className="text-white text-xs font-medium px-2 py-1 bg-blue-700 rounded">
            SCHEDULED
          </span>
        </div>
      );
    }
    return null;
  };

  // Instagram Grid View
  if (account.platform === 'instagram') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-semibold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{account.username || account.name.toLowerCase().replace(/\s+/g, '')}</h2>
              <p className="text-gray-600">{account.name}</p>
              <p className="text-sm text-gray-500 mt-1">{platformPosts.length} posts</p>
            </div>
          </div>
        </div>
        
        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-1">
          {platformPosts.map((post, index) => (
            <div key={post.id} className="aspect-square relative group cursor-pointer">
              {/* Post Image Placeholder */}
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <span className="text-2xl">📷</span>
                </div>
              </div>
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-4 text-white">
                  {post.engagement && post.status === 'published' && (
                    <>
                      <div className="flex items-center gap-1">
                        <Heart className="w-5 h-5 fill-current" />
                        <span className="font-semibold">{formatNumber(post.engagement.likes)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-5 h-5 fill-current" />
                        <span className="font-semibold">{formatNumber(post.engagement.comments)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Status Overlay */}
              {getStatusOverlay(post)}
              
              {/* Post Type Indicator */}
              {index % 4 === 0 && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-white bg-opacity-80 rounded flex items-center justify-center">
                    <span className="text-xs">📹</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Empty slots to show grid structure */}
          {platformPosts.length % 3 !== 0 && Array.from({ length: 3 - (platformPosts.length % 3) }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Future post</span>
            </div>
          ))}
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your Instagram grid will look. Posts are arranged chronologically from newest to oldest.
        </div>
      </div>
    );
  }

  // X/Twitter Timeline View
  if (account.platform === 'x') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Profile Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-semibold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{account.name}</h2>
              <p className="text-gray-500">@{account.username || account.name.toLowerCase().replace(/\s+/g, '')}</p>
              <p className="text-sm text-gray-500 mt-1">{platformPosts.length} posts</p>
            </div>
          </div>
        </div>
        
        {/* Timeline */}
        <div className="space-y-0">
          {platformPosts.map((post, index) => (
            <div key={post.id} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors relative">
              <div className="flex space-x-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-semibold">
                    {account.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-bold text-gray-900">{account.name}</span>
                    <span className="text-gray-500">@{account.username || account.name.toLowerCase().replace(/\s+/g, '')}</span>
                    <span className="text-gray-500">·</span>
                    <span className="text-sm text-gray-500">
                      {post.status === 'published' ? 'published' : 
                       post.status === 'scheduled' ? 'scheduled' : 'draft'}
                    </span>
                  </div>
                  
                  <div className="text-gray-900 mb-3">
                    {post.content}
                  </div>
                  
                  {/* Engagement */}
                  {post.engagement && post.status === 'published' && (
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{formatNumber(post.engagement.comments)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="rotate-90">↩</span>
                        <span>{formatNumber(post.engagement.shares)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="w-4 h-4" />
                        <span>{formatNumber(post.engagement.likes)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Status Overlay */}
              {(post.status === 'draft' || post.status === 'scheduled') && (
                <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                  post.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {post.status.toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your X timeline will look to visitors.
        </div>
      </div>
    );
  }

  // YouTube Channel View
  if (account.platform === 'youtube') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Channel Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-semibold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{account.name}</h2>
              <p className="text-gray-600">{platformPosts.length} videos</p>
            </div>
          </div>
        </div>
        
        {/* Videos Grid */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Videos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformPosts.map((post) => (
              <div key={post.id} className="group cursor-pointer">
                <div className="relative mb-2">
                  {/* Video Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                    <div className="text-center text-red-600">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-current ml-1" />
                      </div>
                    </div>
                    
                    {/* Duration */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                      5:23
                    </div>
                  </div>
                  
                  {/* Status Overlay */}
                  {getStatusOverlay(post)}
                </div>
                
                {/* Video Info */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-semibold">
                      {account.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                      {post.title}
                    </h4>
                    <p className="text-sm text-gray-500">{account.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {post.engagement && post.status === 'published' && (
                        <>
                          <span>{formatNumber(post.engagement.likes * 20)} views</span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {post.status === 'published' ? 'published' : 
                         post.status === 'scheduled' ? 'scheduled' : 'draft'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your YouTube channel will look to visitors.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center text-gray-500">
        Timeline view not available for this platform.
      </div>
    </div>
  );
} 