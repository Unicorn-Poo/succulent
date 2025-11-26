"use client";

import { useState, useEffect } from "react";
import { Button, Text, Badge } from "@radix-ui/themes";
import { 
  Instagram, 
  Grid3X3, 
  PlayCircle, 
  Heart, 
  MessageCircle, 
  Bookmark,
  MoreHorizontal,
  Settings,
  RefreshCw,
  Camera,
  Plus,
  ExternalLink
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { quickSyncMedia } from "@/utils/ayrshareSync";

interface InstagramProfileViewProps {
  account: {
    id: string;
    name: string;
    platform: string;
    profileKey?: string;
    isLinked: boolean;
    avatar?: string;
    displayName?: string;
    username?: string;
  };
  posts: any[];
  accountGroupId?: string;
  jazzAccountGroup?: any;
  onCreatePost?: (platform: string) => void;
  profileInfo?: {
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    biography?: string;
    website?: string;
    isVerified?: boolean;
    isBusinessAccount?: boolean;
  };
}

export default function InstagramProfileView({ 
  account, 
  posts, 
  accountGroupId, 
  jazzAccountGroup,
  onCreatePost,
  profileInfo 
}: InstagramProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tagged'>('posts');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<string>("");

  // Filter and sort posts for this platform
  const platformPosts = posts
    .filter(post => {
      if (post.platforms && Array.isArray(post.platforms)) {
        return post.platforms.includes('instagram');
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.variants?.instagram?.postDate || a.publishedAt || a.scheduledFor || '2024-01-01');
      const dateB = new Date(b.variants?.instagram?.postDate || b.publishedAt || b.scheduledFor || '2024-01-01');
      return dateB.getTime() - dateA.getTime();
    });

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPostUrl = (postId: string) => {
    return accountGroupId ? `/account-group/${accountGroupId}/post/${postId}` : '#';
  };

  const syncRealMedia = async () => {
    if (!account.isLinked || !account.profileKey || !jazzAccountGroup) {
      setSyncResults("Account not properly linked or Jazz group unavailable");
      return;
    }

    setIsSyncing(true);
    setSyncResults("");

    try {
      const result = await quickSyncMedia('instagram', account.profileKey, jazzAccountGroup);
      setSyncResults(result.message);
    } catch (error) {
      setSyncResults(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const extractMediaUrl = (mediaItem: any): string | null => {
    if (!mediaItem) return null;
    
    try {
      if (mediaItem.type === "image" && mediaItem.image) {
        return mediaItem.image.publicUrl || null;
      } else if (mediaItem.type === "video" && mediaItem.video) {
        return mediaItem.video.publicUrl || null;
      }
    } catch (error) {
      console.error('Error extracting media URL:', error);
    }
    
    return null;
  };

  const GridPost = ({ post, index }: { post: any; index: number }) => {
    const postVariant = post.variants?.instagram || post.variants?.base;
    const mediaItems = postVariant?.media || [];
    const firstMediaItem = mediaItems[0];
    const mediaUrl = firstMediaItem ? extractMediaUrl(firstMediaItem) : null;
    const hasMultipleMedia = mediaItems.length > 1;
    const isVideo = firstMediaItem?.type === 'video';

    return (
      <Link href={getPostUrl(post.id)} className="block group">
        <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {mediaUrl ? (
            <>
              {isVideo ? (
                <video
                  src={mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  poster={mediaUrl}
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt="Post"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', mediaUrl);
                  }}
                />
              )}
              
              {/* Overlay indicators */}
              <div className="absolute top-2 right-2 flex gap-1">
                {hasMultipleMedia && (
                  <div className="bg-black bg-opacity-60 rounded-full p-1">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-2 h-2 border border-white rounded-sm"></div>
                      <div className="w-2 h-2 border border-white rounded-sm -ml-1"></div>
                    </div>
                  </div>
                )}
                {isVideo && (
                  <div className="bg-black bg-opacity-60 rounded-full p-1">
                    <PlayCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Hover overlay with engagement */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex items-center gap-6 text-white">
                  {postVariant?.performance && (
                    <>
                      <div className="flex items-center gap-1">
                        <Heart className="w-6 h-6 fill-current" />
                        <span className="font-semibold text-lg">
                          {formatNumber(postVariant.performance.likes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-6 h-6 fill-current" />
                        <span className="font-semibold text-lg">
                          {formatNumber(postVariant.performance.comments)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Camera className="w-8 h-8 mx-auto mb-2" />
                <Text size="1">No media</Text>
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-4xl mx-auto bg-card">
      {/* Profile Header */}
      <div className="p-6 border-b border-border">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Instagram className="w-6 h-6" />
            <Text size="4" weight="bold">
              {account.username || account.name}
            </Text>
            {profileInfo?.isVerified && (
              <Badge color="blue" size="1">✓</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="2"
              onClick={syncRealMedia}
              disabled={isSyncing || !account.isLinked}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Media'}
            </Button>
            <Button variant="outline" size="2">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="2">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex items-start gap-8">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 p-1">
              <div className="w-full h-full rounded-full overflow-hidden bg-card p-1">
                {account.avatar ? (
                  <Image
                    src={account.avatar}
                    alt={account.displayName || account.name}
                    width={120}
                    height={120}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                    <Camera className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Stats and Info */}
          <div className="flex-1">
            {/* Stats */}
            <div className="flex items-center gap-8 mb-4">
              <div className="text-center">
                <Text size="4" weight="bold" className="block">
                  {formatNumber(profileInfo?.postsCount || platformPosts.length)}
                </Text>
                <Text size="2" color="gray">posts</Text>
              </div>
              <div className="text-center">
                <Text size="4" weight="bold" className="block">
                  {formatNumber(profileInfo?.followersCount || 1234)}
                </Text>
                <Text size="2" color="gray">followers</Text>
              </div>
              <div className="text-center">
                <Text size="4" weight="bold" className="block">
                  {formatNumber(profileInfo?.followingCount || 567)}
                </Text>
                <Text size="2" color="gray">following</Text>
              </div>
            </div>

            {/* Bio */}
            <div className="mb-4">
              <Text size="3" weight="bold" className="block mb-1">
                {account.displayName || account.name}
              </Text>
              {profileInfo?.isBusinessAccount && (
                <Text size="2" color="gray" className="block mb-2">
                  Business Account
                </Text>
              )}
              {profileInfo?.biography && (
                <Text size="2" className="block mb-2 whitespace-pre-wrap">
                  {profileInfo.biography}
                </Text>
              )}
              {profileInfo?.website && (
                <Link href={profileInfo.website} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                  <Text size="2" className="flex items-center gap-1">
                    {profileInfo.website}
                    <ExternalLink className="w-3 h-3" />
                  </Text>
                </Link>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {onCreatePost && (
                <Button
                  onClick={() => onCreatePost('instagram')}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              )}
              <Button variant="outline" className="flex-1">
                Edit Profile
              </Button>
              <Button variant="outline" size="2">
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sync Results */}
        {syncResults && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Text size="2" color="blue">{syncResults}</Text>
          </div>
        )}
      </div>

      {/* Highlights Row */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-4 overflow-x-auto">
          {/* New Highlight */}
          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-1">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <Text size="1" color="gray">New</Text>
          </div>
          
          {/* Sample Highlights */}
          {['Travel', 'Food', 'Work'].map((highlight, index) => (
            <div key={highlight} className="flex-shrink-0 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-0.5 mb-1">
                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                  <Text size="2">✨</Text>
                </div>
              </div>
              <Text size="1" color="gray">{highlight}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
              activeTab === 'posts' 
                ? 'border-black text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Grid3X3 className="w-5 h-5 mr-2" />
            <Text size="2" weight="medium">POSTS</Text>
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
              activeTab === 'reels' 
                ? 'border-black text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <PlayCircle className="w-5 h-5 mr-2" />
            <Text size="2" weight="medium">REELS</Text>
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition-colors ${
              activeTab === 'tagged' 
                ? 'border-black text-foreground' 
                : 'border-transparent text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Bookmark className="w-5 h-5 mr-2" />
            <Text size="2" weight="medium">TAGGED</Text>
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="p-4">
        {activeTab === 'posts' && (
          <>
            {platformPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {platformPosts.map((post, index) => (
                  <GridPost key={post.id} post={post} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <Text size="4" weight="medium" className="mb-2 block">
                  No Posts Yet
                </Text>
                <Text size="2" color="gray" className="mb-6 block">
                  When you share photos and videos, they'll appear on your profile.
                </Text>
                {onCreatePost && (
                  <Button
                    onClick={() => onCreatePost('instagram')}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Share your first photo
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'reels' && (
          <div className="text-center py-12">
            <PlayCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <Text size="4" weight="medium" className="mb-2 block">
              No Reels Yet
            </Text>
            <Text size="2" color="gray" className="block">
              Reels you share will appear here.
            </Text>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="text-center py-12">
            <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <Text size="4" weight="medium" className="mb-2 block">
              No Tagged Posts
            </Text>
            <Text size="2" color="gray" className="block">
              When people tag you in photos and videos, they'll appear here.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
} 