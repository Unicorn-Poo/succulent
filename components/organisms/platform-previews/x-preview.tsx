"use client";

import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal } from "lucide-react";

interface XPreviewProps {
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

export default function XPreview({ post, account }: XPreviewProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
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

  const formatEngagement = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Status Badge */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
          {post.status.toUpperCase()}
        </span>
      </div>
      
      {/* Main Content */}
      <div className="p-4">
        <div className="flex space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-lime-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg font-semibold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{account.name}</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                @{account.username || account.name.toLowerCase().replace(/\s+/g, '')}
              </span>
              <span className="text-gray-500 dark:text-gray-400">·</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{getStatusDisplay()}</span>
              <div className="flex-1"></div>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
            
            {/* Tweet Text */}
            <div className="mt-1">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{post.content}</p>
            </div>
            
            {/* Media Placeholder */}
            {post.content.includes('http') && (
              <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🖼️</span>
                    </div>
                    <p className="text-sm">Media Preview</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between mt-3 max-w-md">
              <div className="flex items-center space-x-1 group cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-lime-50 transition-colors">
                  <MessageCircle className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-lime-500" />
                </div>
                {post.engagement && post.engagement.comments > 0 && post.status === 'published' && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-lime-500">
                    {formatEngagement(post.engagement.comments)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 group cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-green-50 dark:bg-green-900/20 transition-colors">
                  <Repeat2 className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-green-500" />
                </div>
                {post.engagement && post.engagement.shares > 0 && post.status === 'published' && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-green-500">
                    {formatEngagement(post.engagement.shares)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 group cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-red-50 dark:bg-red-900/20 transition-colors">
                  <Heart className={`w-4 h-4 ${
                    post.status === 'published' && post.engagement?.likes 
                      ? 'text-red-500 fill-current' 
                      : 'text-gray-500 dark:text-gray-400 group-hover:text-red-500'
                  }`} />
                </div>
                {post.engagement && post.engagement.likes > 0 && post.status === 'published' && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-red-500">
                    {formatEngagement(post.engagement.likes)}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1 group cursor-pointer">
                <div className="p-2 rounded-full group-hover:bg-lime-50 transition-colors">
                  <Share className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-lime-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 