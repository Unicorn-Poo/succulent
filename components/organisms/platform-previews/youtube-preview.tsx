"use client";

import { ThumbsUp, ThumbsDown, Share, Download, MoreHorizontal, Eye } from "lucide-react";

interface YouTubePreviewProps {
  post: {
    id: string;
    title: string;
    content: string;
    status: 'published' | 'scheduled' | 'draft';
    publishedAt?: string;
    scheduledFor?: string;
    engagement?: {
      likes: number;
      comments: number;
      shares: number;
    };
  };
  account: {
    name: string;
    username?: string;
    avatar?: string;
  };
}

export default function YouTubePreview({ post, account }: YouTubePreviewProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getStatusDisplay = () => {
    switch (post.status) {
      case 'published':
        return formatTimeAgo(post.publishedAt!);
      case 'scheduled':
        return `Scheduled for ${new Date(post.scheduledFor!).toLocaleDateString()}`;
      case 'draft':
        return 'Draft';
      default:
        return 'Draft';
    }
  };

  const getStatusBadgeColor = () => {
    switch (post.status) {
      case 'published': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'scheduled': return 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300';
      case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const generateViews = () => {
    // Generate realistic view count based on engagement
    if (post.engagement && post.status === 'published') {
      const baseViews = post.engagement.likes * 20; // Rough ratio
      return formatNumber(baseViews);
    }
    return '0';
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Status Badge */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
          {post.status.toUpperCase()}
        </span>
      </div>
      
      {/* Video Thumbnail */}
      <div className="relative">
        <div className="aspect-video bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
          <div className="text-center text-red-600 dark:text-red-400">
            <div className="w-16 h-16 mx-auto mb-2 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Video Thumbnail</p>
          </div>
        </div>
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
          5:23
        </div>
      </div>
      
      {/* Video Info */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight mb-2">
          {post.title}
        </h3>
        
        {/* Channel Info */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {account.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{account.name}</p>
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              {post.status === 'published' && (
                <>
                  <span>{generateViews()} views</span>
                  <span>•</span>
                </>
              )}
              <span>{getStatusDisplay()}</span>
            </div>
          </div>
        </div>
        
        {/* Description */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          <p className="line-clamp-3">{post.content}</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                <ThumbsUp className="w-4 h-4" />
                {post.engagement && post.engagement.likes > 0 && post.status === 'published' && (
                  <span className="text-sm">{formatNumber(post.engagement.likes)}</span>
                )}
              </button>
              <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-full transition-colors">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
            
            <button className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
              <Share className="w-4 h-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-full transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-full transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Comments */}
        {post.engagement && post.engagement.comments > 0 && post.status === 'published' && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {formatNumber(post.engagement.comments)} comments
            </p>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Comments would appear here...
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 