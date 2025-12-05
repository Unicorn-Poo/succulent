'use client';

import React, { useState, useEffect } from 'react';
import { Text, Button } from '@radix-ui/themes';
import { RefreshCw, Calendar, ExternalLink, AlertCircle } from 'lucide-react';
import { PlatformPreview } from "@/components/organisms/platform-previews";
import { Post, PostVariant, ReplyTo, MediaItem, ImageMedia, VideoMedia } from '@/app/schema';
import { co, z } from 'jazz-tools';
import { syncProfileAvatar } from '@/utils/ayrshareSync';
import Image from 'next/image';
import { getPlatformIcon, getPlatformLabel } from '@/utils/platformIcons';

// =============================================================================
// 📱 PLATFORM FEED VIEW WITH HISTORICAL DATA
// =============================================================================

interface PlatformFeedViewProps {
  account: {
    id: string;
    name: string;
    platform: string;
    profileKey?: string;
    isLinked: boolean;
  };
  localPosts: any[];
  accountGroupId?: string;
  jazzAccountGroup?: any; // Jazz AccountGroup object
  onCreatePost?: (platform: string) => void;
}

interface HistoricalPost {
  id: string;
  content: string;
  created: string;
  postIds: Array<{
    platform: string;
    postUrl?: string;
    isVideo?: boolean;
  }>;
  mediaUrls: string[];
  isHistorical: true;
}

export const PlatformFeedView: React.FC<PlatformFeedViewProps> = ({
  account,
  localPosts,
  accountGroupId,
  jazzAccountGroup,
  onCreatePost
}) => {
  const [historicalPosts, setHistoricalPosts] = useState<HistoricalPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Function to get avatar from Jazz account or sync from Ayrshare
  const getAccountAvatar = async () => {
    if (!jazzAccountGroup || !account.isLinked || !account.profileKey) {
      return;
    }

    try {
      // Find the account in Jazz group
      const accounts = jazzAccountGroup.accounts;
      const jazzAccount = accounts.find((acc: any) => acc.platform === account.platform);
      
      if (jazzAccount) {
        // Check if we have a Jazz FileStream avatar
        if (jazzAccount.avatarImage) {
          // Convert Jazz FileStream to URL for display
          try {
            if (typeof jazzAccount.avatarImage.getBlob === 'function') {
              const blob = await jazzAccount.avatarImage.getBlob();
              if (blob) {
                const dataUrl = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string);
                  reader.readAsDataURL(blob);
                });
                setAvatarUrl(dataUrl);
                return;
              }
            }
          } catch (streamError) {
            console.log('Could not load Jazz FileStream avatar, trying URL fallback...');
          }
        }
        
        // Fallback to URL avatar
        if (jazzAccount.avatar) {
          setAvatarUrl(jazzAccount.avatar);
          return;
        }
      }
      
      // No avatar found, try to sync from Ayrshare
      console.log(`🔄 No avatar found for ${account.platform}, syncing from Ayrshare...`);
      const result = await syncProfileAvatar(account.platform, account.profileKey, jazzAccountGroup);
      
      if (result.success && result.avatarUrl) {
        setAvatarUrl(result.avatarUrl);
      }
      
    } catch (error) {
      console.error('Error getting account avatar:', error);
    }
  };

  // Load avatar when component mounts or account changes
  useEffect(() => {
    getAccountAvatar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.id, jazzAccountGroup]);

  // Jazz import function - creates real Jazz Post objects
  const importPostsToJazz = async (ayrshareHistoryPosts: any[]) => {
    if (!jazzAccountGroup || !ayrshareHistoryPosts.length) {
      console.log('❌ No Jazz AccountGroup or posts to import');
      return { imported: 0, errors: ['No Jazz AccountGroup available'], skipped: 0 };
    }

    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    console.log(`📥 Starting real Jazz import of ${ayrshareHistoryPosts.length} ${account.platform} posts...`);

    // Helper function to update profile avatar
    const updateProfileAvatar = async () => {
      try {
        console.log(`🖼️ Fetching profile info for ${account.platform}...`);
        console.log(`🔑 Using profileKey: ${account.profileKey}`);
        console.log(`🏢 AccountGroup:`, jazzAccountGroup?.id);
        console.log(`👥 Existing accounts:`, jazzAccountGroup.accounts?.map((acc: any) => ({ platform: acc.platform, name: acc.name, avatar: acc.avatar })));
        
        // Call Ayrshare user endpoint to get profile data
        const params = new URLSearchParams();
        if (account.profileKey && account.profileKey !== 'undefined') {
          params.append('profileKey', account.profileKey);
        }
        
        const userResponse = await fetch(`/api/ayrshare-user-info?${params.toString()}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log(`📊 Ayrshare user data:`, userData);
          
          const displayNames = userData.data?.displayNames || [];
          console.log(`👤 Display names from Ayrshare:`, displayNames);
          
          // Find the matching platform account
          const platformData = displayNames.find((acc: any) => acc.platform === account.platform);
          console.log(`🎯 Matching platform data:`, platformData);
          
          if (platformData?.userImage) {
            console.log(`🖼️ Found avatar for ${account.platform}: ${platformData.userImage}`);
            
            // Update the Jazz PlatformAccount avatar
            const existingAccount = jazzAccountGroup.accounts?.find((acc: any) => 
              acc.platform === account.platform || acc.name === account.name
            );
            
            console.log(`🔍 Found existing account:`, existingAccount);
            
            if (existingAccount) {
              const oldAvatar = existingAccount.avatar;
              existingAccount.avatar = platformData.userImage;
              existingAccount.displayName = platformData.displayName || platformData.pageName;
              existingAccount.username = platformData.username;
              
              console.log(`✅ Updated ${account.platform} avatar in Jazz:`);
              console.log(`   Old: ${oldAvatar}`);
              console.log(`   New: ${platformData.userImage}`);
              console.log(`   DisplayName: ${platformData.displayName || platformData.pageName}`);
              console.log(`   Username: ${platformData.username}`);
            } else {
              console.log(`❌ No existing account found for platform ${account.platform}`);
            }
          } else {
            console.log(`❌ No userImage found for ${account.platform} in:`, platformData);
          }
        } else {
          console.log(`❌ Failed to fetch user data: ${userResponse.status} ${userResponse.statusText}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to update avatar for ${account.platform}:`, error);
      }
    };

        // Helper function to download media and create Jazz FileStream
    const createMediaFromUrl = async (mediaUrl: string, mediaType: 'image' | 'video'): Promise<any> => {
      try {
        console.log(`🖼️ Downloading ${mediaType} from: ${mediaUrl}`);
        
        // Fetch the media file
        const response = await fetch(mediaUrl, {
          mode: 'cors', // Handle CORS for external media
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Succulent/1.0)'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log(`📦 Downloaded ${mediaType} blob:`, blob.size, 'bytes');
        
        // Create Jazz FileStream from blob
        const fileStream = await co.fileStream().createFromBlob(blob, { owner: jazzAccountGroup._owner });
        console.log(`💾 Created Jazz FileStream for ${mediaType}`);
        
        if (mediaType === 'image') {
          const imageMedia = ImageMedia.create({
            type: 'image' as const,
            image: fileStream,
            alt: co.plainText().create(`Imported ${mediaType} from ${account.platform}`, { owner: jazzAccountGroup._owner })
          }, { owner: jazzAccountGroup._owner });
          
          console.log(`✅ Created ImageMedia object for ${mediaUrl}`);
          return imageMedia;
        } else {
          const videoMedia = VideoMedia.create({
            type: 'video' as const,
            video: fileStream,
            alt: co.plainText().create(`Imported ${mediaType} from ${account.platform}`, { owner: jazzAccountGroup._owner })
          }, { owner: jazzAccountGroup._owner });
          
          console.log(`✅ Created VideoMedia object for ${mediaUrl}`);
          return videoMedia;
        }
      } catch (error) {
        console.error(`❌ Failed to download/process ${mediaType} from ${mediaUrl}:`, error);
        return null;
      }
    };

    // First, update the profile avatar if we can get user data
    await updateProfileAvatar();

    for (const ayrsharePost of ayrshareHistoryPosts) {
      try {
        // Check if post already exists by Ayrshare ID
        const existingPost = jazzAccountGroup.posts?.find((post: any) => 
          post.variants && post.variants[account.platform]?.ayrsharePostId === ayrsharePost.id
        );

        if (existingPost) {
          console.log(`⏭️ Post ${ayrsharePost.id} already exists, skipping`);
          skipped++;
          continue;
        }

        console.log(`📝 Creating Jazz post for ${account.platform}: ${ayrsharePost.id}`);

        // Create Jazz collaborative objects
        const titleText = co.plainText().create(
          ayrsharePost.content.substring(0, 50) + '...', 
          { owner: jazzAccountGroup._owner }
        );
        
        const contentText = co.plainText().create(
          ayrsharePost.content, 
          { owner: jazzAccountGroup._owner }
        );
        
        // Process media from Ayrshare post
        const mediaList = co.list(MediaItem).create([], { owner: jazzAccountGroup._owner });
        
        // Process media from Ayrshare post (handle both mediaUrls array and mediaUrl single)
        const mediaUrls = ayrsharePost.mediaUrls || (ayrsharePost.mediaUrl ? [ayrsharePost.mediaUrl] : []);
        
        if (mediaUrls && mediaUrls.length > 0) {
          console.log(`🖼️ Processing ${mediaUrls.length} media items for post ${ayrsharePost.id}`);
          console.log(`📷 Media URLs:`, mediaUrls);
          
          for (const mediaUrl of mediaUrls) {
            // Determine media type based on URL extension or MIME type hints
            const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(mediaUrl) || 
                           mediaUrl.includes('image') || 
                           mediaUrl.includes('photo');
            const isVideo = /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i.test(mediaUrl) || 
                           mediaUrl.includes('video');
            
            if (isImage) {
              const imageMedia = await createMediaFromUrl(mediaUrl, 'image');
              if (imageMedia) {
                mediaList.push(imageMedia);
                console.log(`✅ Added image to post ${ayrsharePost.id}`);
              }
            } else if (isVideo) {
              const videoMedia = await createMediaFromUrl(mediaUrl, 'video');
              if (videoMedia) {
                mediaList.push(videoMedia);
                console.log(`✅ Added video to post ${ayrsharePost.id}`);
              }
            } else {
              console.log(`⚠️ Unknown media type for URL: ${mediaUrl}, treating as image`);
              // Default to image if we can't determine the type
              const imageMedia = await createMediaFromUrl(mediaUrl, 'image');
              if (imageMedia) {
                mediaList.push(imageMedia);
                console.log(`✅ Added media (as image) to post ${ayrsharePost.id}`);
              }
            }
          }
        }
        
        const replyToObj = ReplyTo.create({}, { owner: jazzAccountGroup._owner });

        // Create the platform variant
        const platformVariant = PostVariant.create({
          text: contentText,
          postDate: new Date(ayrsharePost.created),
          media: mediaList,
          replyTo: replyToObj,
          status: 'published',
          scheduledFor: undefined,
          publishedAt: new Date(ayrsharePost.created),
          edited: false,
          lastModified: undefined,
          // Ayrshare integration fields
          ayrsharePostId: ayrsharePost.id,
          socialPostUrl: ayrsharePost.postIds[0]?.postUrl || null,
        }, { owner: jazzAccountGroup._owner });

        // Create the variants record
        const variantsRecord = co.record(z.string(), PostVariant).create({
          [account.platform]: platformVariant
        }, { owner: jazzAccountGroup._owner });

        // Create the Jazz Post
        const newPost = Post.create({
          title: titleText,
          variants: variantsRecord,
        }, { owner: jazzAccountGroup._owner });

        // Add to Jazz AccountGroup
        jazzAccountGroup.posts.push(newPost);
        imported++;

        console.log(`✅ Successfully imported Jazz post: ${ayrsharePost.id}`);

      } catch (error) {
        console.error(`❌ Error importing ${account.platform} post ${ayrsharePost.id}:`, error);
        errors.push(`Failed to import post ${ayrsharePost.id}: ${error}`);
      }
    }

    const message = `Successfully imported ${imported} ${account.platform} posts to Jazz! ${skipped > 0 ? `(${skipped} already existed)` : ''}`;
    console.log(`🎉 Jazz import complete: ${message}`);

    return { imported, errors, skipped, message };
  };



  // Check Jazz posts first, then supplement with Ayrshare if needed
  const syncPostsWithAyrshare = async () => {
    if (!account.isLinked || !account.profileKey) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First check if we have Jazz posts for this platform
      const platformPosts = localPosts.filter(post => 
        post.variants && post.variants[account.platform]
      );

      console.log(`📊 Found ${platformPosts.length} Jazz posts for ${account.platform}`);

      // Only fetch from Ayrshare if we have an accountGroupId (to import) 
      // or if we have very few local posts
      const shouldFetchAyrshare = accountGroupId && (platformPosts.length < 5);

      if (shouldFetchAyrshare) {
        console.log(`🔍 Fetching fresh ${account.platform} posts from Ayrshare...`);
        
        const params = new URLSearchParams({
          platforms: account.platform,
          limit: '20', // Reasonable limit for supplemental data
          lastDays: '0', // 0 = ALL historical posts ever posted
          status: 'all' // Get all posts regardless of status
        });

        // Add profileKey if available for proper Ayrshare API access
        if (account.profileKey && account.profileKey !== 'undefined') {
          params.append('profileKey', account.profileKey);
          console.log(`🔑 Using profileKey: ${account.profileKey}`);
        } else {
          console.log(`⚠️ No profileKey available for ${account.platform} account: ${account.profileKey}`);
        }

        // Always auto-import when we have an accountGroupId
        params.append('import', 'true');
        params.append('accountGroupId', accountGroupId);

        // Use platform-specific endpoint for better results
        const response = await fetch(`/api/post-history/${account.platform}?${params.toString()}`);
        const result = await response.json();

        if (response.ok && result.data.posts) {
          const transformedPosts: HistoricalPost[] = result.data.posts.map((post: any) => ({
            ayrshareId: post.id, // Original Ayrshare post ID
            content: post.content,
            created: post.created,
            postIds: post.postIds,
            mediaUrls: post.mediaUrls || [],
            isHistorical: true
          }));
          setHistoricalPosts(transformedPosts);

          // Handle client-side Jazz import
          if (result.import && result.import.shouldImport && transformedPosts.length > 0) {
            console.log('🔄 Starting client-side Jazz import...');
            try {
              const importResult = await importPostsToJazz(result.data.posts);
              if (importResult.imported > 0) {
                setError(`✅ Imported ${importResult.imported} new posts from ${account.platform} to Jazz!`);
                setTimeout(() => setError(null), 4000);
              } else if (importResult.skipped > 0) {
                setError(`ℹ️ ${transformedPosts.length} posts from ${account.platform} (${importResult.skipped} already in Jazz)`);
                setTimeout(() => setError(null), 3000);
              }
            } catch (importError) {
              console.error('❌ Jazz import failed:', importError);
              setError(`⚠️ Fetched ${transformedPosts.length} posts but Jazz import failed`);
              setTimeout(() => setError(null), 4000);
            }
          } else if (transformedPosts.length > 0) {
            setError(`ℹ️ ${transformedPosts.length} posts from ${account.platform} (up to date)`);
            setTimeout(() => setError(null), 3000);
          }
        }
      } else {
        console.log(`📱 Using ${platformPosts.length} Jazz posts for ${account.platform}`);
        setHistoricalPosts([]); // Clear Ayrshare posts since we're using Jazz
        if (platformPosts.length > 0) {
          setError(`📱 Showing ${platformPosts.length} posts from Jazz database`);
          setTimeout(() => setError(null), 2000);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync posts');
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync on mount and when local posts change
  useEffect(() => {
    if (account.isLinked) {
      syncPostsWithAyrshare();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.platform, account.profileKey, account.isLinked, localPosts.length]);

  // Transform local posts to match the expected format, filtering for this platform
  const transformedLocalPosts = localPosts
    .filter(post => post.variants && post.variants[account.platform])
    .map(post => {
      const platformVariant = post.variants[account.platform];
      return {
        id: post.id,
        content: platformVariant?.text?.toString() || 'No content',
        created: platformVariant?.postDate || new Date().toISOString(),
        isHistorical: false,
        platform: account.platform,
        status: platformVariant?.status,
        ayrsharePostId: platformVariant?.ayrsharePostId,
        post: post // Keep original for platform preview
      };
    });

  // Combine and sort all posts by date
  const allPosts = [
    ...transformedLocalPosts,
    ...historicalPosts
  ].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4 mt-6">
      {/* Feed Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
          <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center p-1.5">
            <Image
              src={getPlatformIcon(account.platform || "")}
              alt={account.platform || "Platform"}
              width={20}
              height={20}
              className="dark:invert"
            />
          </div>
          <div>
            <Text size="3" weight="medium">{account.name}</Text>
            <Text size="2" color="gray">{getPlatformLabel(account.platform || "")} Feed</Text>
          </div>
        </div>
      </div>

            {/* Feed Controls */}
      {account.isLinked && (
        <div className="text-center mb-4">
          <Button 
            onClick={syncPostsWithAyrshare} 
            disabled={loading}
            variant="soft"
            size="2"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Syncing Posts...' : 'Sync Posts'}
          </Button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-center py-4">
          <Text size="2" color="red">{error}</Text>
        </div>
      )}

      {/* Posts Feed */}
      <div className="max-w-md mx-auto space-y-4">
        {allPosts.length > 0 ? (
          allPosts.map((post: any) => {
            // For historical posts, create a simulated post object for PlatformPreview
            if (post.isHistorical) {
              const platformPost = post.postIds.find((p: any) => p.platform === account.platform);
              
              return (
                <div key={post.ayrshareId || post.id} className="relative">
                  {/* Historical post indicator */}
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(post.created)}
                    </div>
                  </div>
                  
                                     <PlatformPreview
                     platform={account.platform}
                     content={post.content}
                     media={post.mediaUrls.map((url: string) => ({ type: 'image', url }))}
                     timestamp={new Date(post.created)}
                     replyTo={undefined}
                     engagement={{
                       likes: 0, // Historical posts don't have engagement data yet
                       comments: 0,
                       shares: 0,
                       views: 0
                     }}
                   />
                  
                  {/* View original post link */}
                  {platformPost?.postUrl && (
                    <div className="mt-2 text-center">
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => window.open(platformPost.postUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View Original Post
                      </Button>
                    </div>
                  )}
                </div>
              );
            } else {
              // For local posts, extract media URLs from Jazz objects
              const postVariant = post.post?.variants?.[account.platform] || post.post?.variants?.base;
              const mediaItems = postVariant?.media || [];
              
              // IMMEDIATE DEBUG: Check what we're getting
              console.log(`🔍 IMMEDIATE DEBUG for post ${post.ayrshareId || post.id}:`, {
                hasPostVariant: !!postVariant,
                mediaItemsCount: mediaItems.length,
                firstItemExists: !!mediaItems[0],
                firstItemType: mediaItems[0]?.type,
                variantKeys: postVariant ? Object.keys(postVariant) : []
              });
              
              // Convert Jazz media items to URL format for PlatformPreview
              const mediaForPreview = mediaItems.map((item: any, index: number) => {
                if (!item) return null;
                
                console.log(`🔍 DEBUG: Media item ${index}:`, {
                  type: item.type,
                  hasImage: !!item.image,
                  hasVideo: !!item.video,
                  hasOriginalUrl: !!item.originalUrl,
                  originalUrl: item.originalUrl ? item.originalUrl.substring(0, 80) + '...' : 'NONE',
                  imageKeys: item.image ? Object.keys(item.image) : [],
                  videoKeys: item.video ? Object.keys(item.video) : []
                });
                
                                try {
                  // Pass Jazz media items directly to MediaItemRenderer
                  // MediaItemRenderer will handle Jazz FileStreams properly with FileStreamImage component
                  return {
                    type: item.type,
                    image: item.type === 'image' ? item.image : undefined,
                    video: item.type === 'video' ? item.video : undefined,
                    alt: item.alt || ""
                  };
                } catch (error) {
                  console.error('Error extracting media URL:', error, item);
                }
                
                return null;
              }).filter(Boolean);
              
              return (
                <div key={post.ayrshareId || post.id} className="relative">
                  <PlatformPreview
                    platform={account.platform}
                    content={post.content}
                    media={mediaForPreview}
                    timestamp={new Date(post.created)}
                    replyTo={postVariant?.replyTo}
                    engagement={{
                      likes: postVariant?.performance?.likes,
                      comments: postVariant?.performance?.comments,
                      shares: postVariant?.performance?.shares,
                      views: postVariant?.performance?.views
                    }}
                    account={{
                      id: account.id,
                      platform: account.platform,
                      name: account.name,
                      apiUrl: '', // Placeholder for interface compliance
                      avatar: avatarUrl || `https://avatar.vercel.sh/${account.name}`, // Use Jazz avatar or fallback
                      username: account.name,
                      displayName: account.name,
                      url: '' // Placeholder for interface compliance
                    }}
                  />
                  

                </div>
              );
            }
          })
        ) : (
          <div className="text-center py-12">
            <Text size="4" weight="medium" className="mb-2 block">
              No Posts Yet
            </Text>
            <Text size="2" color="gray" className="mb-6 block">
              {account.isLinked 
                ? "Start creating posts to see them in your feed!" 
                : "Link your account to see your recent posts here."}
            </Text>
            {onCreatePost && (
              <Button onClick={() => onCreatePost(account.platform)}>
                Create Your First Post
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Feed Info */}
      {/* {allPosts.length > 0 && (
        <div className="text-center py-4 border-t border-border">
                     <Text size="1" color="gray">
             Showing {transformedLocalPosts.length} Jazz posts
             {historicalPosts.length > 0 && ` and ${historicalPosts.length} from Ayrshare`} for {account.platform}
           </Text>
        </div>
      )} */}
    </div>
  );
}; 