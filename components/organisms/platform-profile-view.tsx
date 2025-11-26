"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button, Badge, Tabs, Text } from "@radix-ui/themes";
import { Grid, List, Filter, ArrowLeft, Layout, BarChart3, Users } from "lucide-react";
import InstagramPreview from "./platform-previews/instagram-preview";
import XPreview from "./platform-previews/x-preview";
import YouTubePreview from "./platform-previews/youtube-preview";
import PlatformTimelineView from "./platform-timeline-view";
import InstagramAccountDashboard from "./instagram-account-dashboard";
import InstagramProfileView from "./instagram-profile-view";
import { PlatformPreview } from "@/components/organisms/platform-previews";
import { PlatformAnalyticsDashboard } from "@/components/organisms/platform-analytics-dashboard";
import { PlatformFeedView } from "@/components/organisms/platform-feed-view";
import { getPostStatus } from "@/utils/postValidation";

// Import the working extractMediaUrl function approach
const extractMediaUrl = async (fileStream: any): Promise<string | null> => {
	if (!fileStream) return null;

	try {
		// Try different methods to get the URL
		if (typeof fileStream.createObjectURL === 'function') {
			return fileStream.createObjectURL();
		}
		
		if (typeof fileStream.getBlob === 'function') {
			const blob = await fileStream.getBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.toBlob === 'function') {
			const blob = await fileStream.toBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.asBlob === 'function') {
			const blob = await fileStream.asBlob();
			if (blob) return URL.createObjectURL(blob);
		}
		
		if (typeof fileStream.getBlobURL === 'function') {
			return await fileStream.getBlobURL();
		}
		
		// Try accessing raw data
		if (fileStream._raw && (fileStream._raw.blob || fileStream._raw.data)) {
			const blob = fileStream._raw.blob || fileStream._raw.data;
			if (blob instanceof Blob) {
				return URL.createObjectURL(blob);
			}
		}
		
		// Check if toString returns a valid URL
		if (fileStream.toString && typeof fileStream.toString === 'function') {
			const stringValue = fileStream.toString();
			if (stringValue.startsWith('blob:') || stringValue.startsWith('data:') || stringValue.startsWith('http')) {
				return stringValue;
			}
		}
		
		return null;
	} catch (error) {
		return null;
	}
};

// Component to display media with proper loading states
const GridMediaComponent = ({ mediaItem }: { mediaItem: any }) => {
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!mediaItem) return;

		const loadMediaUrl = async () => {
			setLoading(true);
			setError(false);
			
			try {
				let url = null;
				
				if (mediaItem.type === "image" && mediaItem.image) {
					url = await extractMediaUrl(mediaItem.image);
				} else if (mediaItem.type === "video" && mediaItem.video) {
					url = await extractMediaUrl(mediaItem.video);
				}
				
				if (url) {
					setImageUrl(url);
				} else {
					setError(true);
				}
			} catch (err) {
				console.error('Error loading media:', err);
				setError(true);
			} finally {
				setLoading(false);
			}
		};

		loadMediaUrl();
	}, [mediaItem]);

	if (loading) {
		return (
			<div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
				<div className="text-center text-muted-foreground">
					<span className="text-sm">Loading...</span>
				</div>
			</div>
		);
	}

	if (error || !imageUrl) {
		return (
			<div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
				<div className="text-center text-muted-foreground">
					<span className="text-2xl">📝</span>
				</div>
			</div>
		);
	}

	if (mediaItem?.type === 'image') {
		return (
			<Image
				src={imageUrl}
				alt={mediaItem.alt?.toString() || "Post image"}
				className="object-cover"
				fill
				sizes="(max-width: 768px) 100vw, 300px"
				unoptimized
			/>
		);
	} else if (mediaItem?.type === 'video') {
		return (
			<video
				src={imageUrl}
				className="w-full h-full object-cover"
				muted
			/>
		);
	}

	return (
		<div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
			<div className="text-center text-muted-foreground">
				<span className="text-2xl">📝</span>
			</div>
		</div>
	);
};

interface Account {
  id: string;
  name: string;
  platform: string;
  profileKey?: string;
  isLinked: boolean;
}

interface PlatformProfileViewProps {
  account: Account;
  posts: any[]; // Use any[] to handle both Jazz and legacy posts
  onBack: () => void;
  accountGroupId?: string;
  jazzAccountGroup?: any; // Jazz AccountGroup object
  onCreatePost?: (platform: string) => void;
}

type ViewModeType = 'feed' | 'grid' | 'analytics';

export default function PlatformProfileView({ account, posts, onBack, accountGroupId, jazzAccountGroup, onCreatePost }: PlatformProfileViewProps) {
  const [viewMode, setViewMode] = useState<ViewModeType>('feed');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
  
  // Filter and sort posts for this platform
  const platformPosts = posts.filter(post => {
    // Handle both Jazz and legacy post structures
    if (post.platforms && Array.isArray(post.platforms)) {
      return post.platforms.includes(account.platform);
    }
    // For Jazz posts, if no platforms specified, assume it's for all platforms
    return true;
  });

  // Sort posts chronologically - newest first, showing all statuses together
  const sortedPosts = platformPosts
    .filter(post => {
      if (statusFilter === 'all') return true;
      // Extract status from Jazz post structure
      const postStatus = getPostStatus(post);
      return postStatus === statusFilter;
    })
    .sort((a, b) => {
      // Get the most relevant date for each post
      const getPostDate = (post: any) => {
        if (post.variants?.base?.postDate) return new Date(post.variants.base.postDate);
        if (post.variants?.base?.publishedAt) return new Date(post.variants.base.publishedAt);
        if (post.variants?.base?.scheduledFor) return new Date(post.variants.base.scheduledFor);
        if (post.publishedAt) return new Date(post.publishedAt);
        if (post.scheduledFor) return new Date(post.scheduledFor);
        return new Date(); // Default to now for drafts
      };
      
      const dateA = getPostDate(a);
      const dateB = getPostDate(b);
      
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
  
  const getStatusCounts = () => {
    const counts = { all: 0, published: 0, scheduled: 0, draft: 0 };
    
    platformPosts.forEach(post => {
      // Extract status from Jazz post structure or legacy post
      const postStatus = getPostStatus(post);
      
      counts.all++;
      if (postStatus === 'published') counts.published++;
      else if (postStatus === 'scheduled') counts.scheduled++;
      else counts.draft++;
    });
    
    return counts;
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
    // Special Instagram profile view that looks like the Instagram app
    if (account.platform === 'instagram' && viewMode === 'grid') {
      return (
        <div className="mt-6">
          <InstagramProfileView
            account={transformedAccount}
            posts={sortedPosts}
            accountGroupId={accountGroupId}
            jazzAccountGroup={jazzAccountGroup}
            onCreatePost={onCreatePost}
            profileInfo={{
              followersCount: 1234, // These would come from real analytics
              followingCount: 567,
              postsCount: sortedPosts.length,
              biography: "✨ Creating amazing content with Succulent",
              website: "https://succulent.app",
              isVerified: false,
              isBusinessAccount: true
            }}
          />
        </div>
      );
    }

    if (viewMode === 'analytics') {
      // Show analytics view for supported platforms
      if (account.platform === 'instagram') {
        return (
          <div className="mt-6">
            <InstagramAccountDashboard 
              account={transformedAccount}
              accountGroupId={accountGroupId}
              jazzAccountGroup={jazzAccountGroup}
            />
          </div>
        );
      } else {
        // For other platforms, show real analytics from Ayrshare
        return (
          <PlatformAnalyticsDashboard 
            account={transformedAccount}
            accountGroupId={accountGroupId}
            jazzAccountGroup={jazzAccountGroup}
          />
        );
      }
    }

    if (viewMode === 'grid') {
      return (
        <div className="mt-6">
          {/* Instagram-style grid */}
          <div className="grid grid-cols-3 gap-1">
            {/* Create Post Button - always first */}
            <div 
              className="aspect-square relative cursor-pointer group"
              onClick={() => onCreatePost?.(account.platform)}
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-center transition-colors border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 rounded-lg">
                <div className="text-center text-muted-foreground group-hover:text-muted-foreground">
                  <span className="text-3xl font-light">+</span>
                </div>
              </div>
            </div>
            
            {/* Actual Posts */}
            {sortedPosts.length > 0 ? (
              sortedPosts.map((post: any, index) => {
                // Extract content from Jazz post structure
                const postContent = post.variants?.base?.text?.toString() || 
                                 post.variants?.base?.text || 
                                 post.content || 
                                 post.title?.toString() || 
                                 post.title || 
                                 "Post content";
                
                const postStatus = getPostStatus(post);
                const firstMediaItem = post.variants?.base?.media?.[0];
                
                return (
                  <div key={post.id || index} className="aspect-square relative group cursor-pointer">
                    {/* Post Image or Content */}
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center hover:brightness-90 transition-all rounded-lg overflow-hidden">
                      {firstMediaItem ? (
                        <GridMediaComponent mediaItem={firstMediaItem} />
                      ) : (
                        // Text preview when no media
                        <div className="text-center text-muted-foreground p-2 flex flex-col items-center justify-center">
                          <div className="text-2xl mb-2">📝</div>
                          <div className="text-xs leading-tight line-clamp-3 max-w-20">
                            {postContent.substring(0, 50)}...
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                      postStatus === 'published' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                      postStatus === 'scheduled' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                      'bg-gray-100 dark:bg-gray-700 text-foreground'
                    }`}>
                      {postStatus}
                    </div>
                    
                    {/* Hover Overlay with Content Preview */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg">
                      <div className="text-white text-center p-3">
                        <div className="text-sm font-medium mb-1">
                          {post.title?.toString() || post.title || "Untitled"}
                        </div>
                        <div className="text-xs opacity-90 line-clamp-3">
                          {postContent}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              // Sample grid items when no posts exist
              Array.from({ length: 8 }, (_, index) => (
                <div key={`sample-${index}`} className="aspect-square relative">
                  <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <span className="text-lg">📷</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {sortedPosts.length > 0 
              ? `${sortedPosts.length} posts • Click any post to edit it` 
              : "Create your first post to see it in the grid"}
          </div>
        </div>
      );
    }

    // Feed view with historical data integration
    return (
      <PlatformFeedView
        account={transformedAccount}
        localPosts={sortedPosts}
        accountGroupId={accountGroupId}
        jazzAccountGroup={jazzAccountGroup}
        onCreatePost={onCreatePost}
      />
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
              <h1 className="text-lg font-semibold text-foreground">{account.name}</h1>
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
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{statusCounts.published}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-lime-600 dark:text-lime-400">{statusCounts.scheduled}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{statusCounts.draft}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
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
      {renderContent()}
    </div>
  );
} 