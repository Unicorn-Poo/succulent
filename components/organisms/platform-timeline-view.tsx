"use client";

import { Heart, MessageCircle, Play, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { getPostStatus } from "@/utils/postValidation";

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
  variants?: {
    base?: {
      postDate: string;
      text?: string; // Added for Jazz posts
    };
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
  accountGroupId?: string;
  onCreatePost?: (platform: string) => void;
}

export default function PlatformTimelineView({ account, posts, accountGroupId, onCreatePost }: PlatformTimelineViewProps) {
  // Filter and sort posts for this platform - handle undefined platforms
  const platformPosts = posts
    .filter(post => {
      // Handle both Jazz and legacy post structures
      if (post.platforms && Array.isArray(post.platforms)) {
        return post.platforms.includes(account.platform);
      }
      // For Jazz posts, if no platforms specified, assume it's for all platforms
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.variants?.base?.postDate || a.publishedAt || a.scheduledFor || '2024-01-01');
      const dateB = new Date(b.variants?.base?.postDate || b.publishedAt || b.scheduledFor || '2024-01-01');
      return dateB.getTime() - dateA.getTime();
    });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusOverlay = (post: Post) => {
    const postStatus = getPostStatus(post);
    if (postStatus === 'draft') {
      return (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center">
          <span className="text-white text-xs font-medium px-2 py-1 bg-gray-700 rounded">
            DRAFT
          </span>
        </div>
      );
    }
    if (postStatus === 'scheduled') {
      return (
        <div className="absolute inset-0 bg-lime-900 bg-opacity-60 flex items-center justify-center">
          <span className="text-white text-xs font-medium px-2 py-1 bg-lime-700 rounded">
            SCHEDULED
          </span>
        </div>
      );
    }
    return null;
  };

  const getPostUrl = (postId: string) => {
    return accountGroupId ? `/account-group/${accountGroupId}/post/${postId}` : `/account-group/demo/post/${postId}`;
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
          {/* Create Post Button - always first */}
          <div 
            className="aspect-square relative cursor-pointer group"
            onClick={() => onCreatePost?.(account.platform)}
          >
            <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-center transition-colors border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg">
              <div className="text-center text-gray-400 group-hover:text-gray-600">
                <span className="text-3xl font-light">+</span>
              </div>
            </div>
          </div>
          
          {platformPosts.length > 0 ? (
            platformPosts.map((post, index) => {
              // Extract content from Jazz post structure
              const postContent = post.variants?.base?.text?.toString() || 
                               post.variants?.base?.text || 
                               post.content || 
                               post.title?.toString() || 
                               post.title || 
                               "Sample post content";
              
              return (
                <Link key={post.id} href={getPostUrl(post.id)} className="block">
                  <div className="aspect-square relative group cursor-pointer">
                    {/* Post Image Placeholder */}
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                      <div className="text-center text-gray-500">
                        <span className="text-2xl">📷</span>
                      </div>
                    </div>
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-4 text-white">
                        {post.engagement && getPostStatus(post) === 'published' && (
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
                </Link>
              );
            })
          ) : (
            // Show sample grid when no posts exist (excluding the create button)
            Array.from({ length: 8 }, (_, index) => (
              <div key={`sample-${index}`} className="aspect-square relative">
                <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <span className="text-lg">📷</span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Empty slots to show grid structure */}
          {platformPosts.length % 3 !== 0 && Array.from({ length: 3 - (platformPosts.length % 3) }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">Future post</span>
            </div>
          ))}
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your Instagram grid will look. Click any post to edit it. Posts are arranged chronologically from newest to oldest.
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
            <div className="w-16 h-16 bg-gradient-to-br from-lime-500 to-purple-500 rounded-full flex items-center justify-center">
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
          {platformPosts.length > 0 ? (
            platformPosts.map((post, index) => {
              // Extract content from Jazz post structure
              const postContent = post.variants?.base?.text?.toString() || 
                               post.variants?.base?.text || 
                               post.content || 
                               post.title?.toString() || 
                               post.title || 
                               "Sample post content";
              
              return (
                <Link key={post.id} href={getPostUrl(post.id)} className="block">
                  <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors relative cursor-pointer">
                    <div className="flex space-x-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
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
                            {getPostStatus(post)}
                          </span>
                        </div>
                        
                        <div className="text-gray-900 mb-3">
                          {postContent}
                        </div>
                        
                        {/* Engagement */}
                        {post.engagement && getPostStatus(post) === 'published' && (
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
                    {(() => {
                      const postStatus = getPostStatus(post);
                      return (postStatus === 'draft' || postStatus === 'scheduled') && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                          postStatus === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-lime-100 text-lime-700'
                        }`}>
                          {postStatus.toUpperCase()}
                        </div>
                      );
                    })()}
                  </div>
                </Link>
              );
            })
          ) : (
            // Show sample posts when no posts exist
            Array.from({ length: 3 }, (_, index) => (
              <div key={`sample-${index}`} className="p-4 border-b border-gray-100">
                <div className="flex space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-lime-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">
                      {account.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-bold text-gray-900">{account.name}</span>
                      <span className="text-gray-500">@{account.username || account.name.toLowerCase().replace(/\s+/g, '')}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-sm text-gray-500">draft</span>
                    </div>
                    <div className="text-gray-400 italic">
                      {index === 0 ? "🌱 Create your first post to see it here!" : 
                       index === 1 ? "This is how your posts will appear on X" : 
                       "Your content will look great on this platform"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your X timeline will look to visitors. Click any post to edit it.
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
            {platformPosts.length > 0 ? (
              platformPosts.map((post) => {
                // Extract content from Jazz post structure
                const postTitle = post.title?.toString() || post.title || post.variants?.base?.text?.toString() || post.variants?.base?.text || "Untitled Video";
                
                return (
                  <Link key={post.id} href={getPostUrl(post.id)} className="block">
                    <div className="group cursor-pointer">
                      <div className="relative mb-2">
                        {/* Video Thumbnail */}
                        <div className="aspect-video bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center relative overflow-hidden hover:from-red-200 hover:to-red-300 transition-colors">
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
                            {postTitle}
                          </h4>
                          <p className="text-sm text-gray-500">{account.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            {post.engagement && getPostStatus(post) === 'published' && (
                              <>
                                <span>{formatNumber(post.engagement.likes * 20)} views</span>
                                <span>•</span>
                              </>
                            )}
                            <span>
                              {getPostStatus(post)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              // Show sample videos when no posts exist
              Array.from({ length: 3 }, (_, index) => (
                <div key={`sample-${index}`} className="group">
                  <div className="relative mb-2">
                    <div className="aspect-video bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <div className="text-center text-red-300">
                        <div className="w-12 h-12 bg-red-300 rounded-full flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-current ml-1" />
                        </div>
                      </div>
                      {index === 1 && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <div className="text-center text-white">
                            <span className="text-sm">Upload your first video</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-semibold">
                        {account.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-400 line-clamp-2">
                        {index === 0 ? "🎬 Your first video will appear here" : 
                         index === 1 ? "Create engaging content for your audience" : 
                         "Share your story with the world"}
                      </h4>
                      <p className="text-sm text-gray-500">{account.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>draft</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-4 text-center text-sm text-gray-500">
          This preview shows how your YouTube channel will look to visitors. Click any video to edit it.
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