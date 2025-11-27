"use client";

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";

interface InstagramPreviewProps {
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

export default function InstagramPreview({ post, account }: InstagramPreviewProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
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
      case 'draft': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-card border border-border rounded-lg overflow-hidden">
      {/* Status Badge */}
      <div className="px-4 py-2 bg-muted border-b">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor()}`}>
          {post.status.toUpperCase()}
        </span>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {account.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{account.username || account.name.toLowerCase().replace(/\s+/g, '')}</p>
            <p className="text-xs text-muted-foreground">{getStatusDisplay()}</p>
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>
      
      {/* Image Placeholder */}
      <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-12 h-12 mx-auto mb-2 bg-muted-foreground/30 rounded-lg flex items-center justify-center">
            <span className="text-lg">📷</span>
          </div>
          <p className="text-sm">Photo/Video</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <Heart className={`w-6 h-6 ${post.status === 'published' ? 'text-red-500 fill-current' : 'text-foreground'}`} />
            <MessageCircle className="w-6 h-6 text-foreground" />
            <Send className="w-6 h-6 text-foreground" />
          </div>
          <Bookmark className="w-6 h-6 text-foreground" />
        </div>
        
        {/* Engagement */}
        {post.engagement && post.status === 'published' && (
          <div className="mb-2">
            <p className="text-sm font-semibold text-foreground">
              {post.engagement.likes.toLocaleString()} likes
            </p>
          </div>
        )}
        
        {/* Caption */}
        <div className="text-sm">
          <span className="font-semibold text-foreground">{account.username || account.name.toLowerCase().replace(/\s+/g, '')} </span>
          <span className="text-foreground">{post.content}</span>
        </div>
        
        {/* Comments */}
        {post.engagement && post.engagement.comments > 0 && post.status === 'published' && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              View all {post.engagement.comments} comments
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 