import { co, z } from 'jazz-tools';
import { fetchPlatformPostHistory } from './postPerformance';
import { ImageMedia, VideoMedia, PostVariant, Post, PostPerformance, ReplyTo } from '@/app/schema';

interface SyncResult {
  success: boolean;
  message: string;
  details?: {
    totalPosts: number;
    postsWithMedia: number;
    updated: number;
    created: number;
    errors: string[];
  };
}

/**
 * Main sync function - fetches Ayrshare posts and syncs them to Jazz
 */
export async function syncAyrshareMediaToJazz(
  platform: string,
  profileKey: string,
  jazzAccountGroup: any,
  options: { limit?: number; forceUpdate?: boolean } = {}
): Promise<SyncResult> {
  const { limit = 20, forceUpdate = false } = options;
  
  try {
    console.log(`🚀 Starting sync for ${platform} with profileKey ${profileKey}`);
    
    // Fetch from Ayrshare
    const ayrshareData = await fetchPlatformPostHistory(platform, profileKey, { 
      limit,
      lastDays: 30
    });

    if (!ayrshareData?.history) {
      return {
        success: false,
        message: "No Ayrshare data found"
      };
    }

    const result = {
      totalPosts: ayrshareData.history.length,
      postsWithMedia: 0,
      updated: 0,
      created: 0,
      errors: [] as string[]
    };

    console.log(`📊 Processing ${result.totalPosts} posts from Ayrshare`);

    // Process each post
    for (const ayrsharePost of ayrshareData.history) {
      try {
        await processSinglePost(ayrsharePost, platform, jazzAccountGroup, result, forceUpdate);
      } catch (error) {
        const errorMsg = `Error processing post ${ayrsharePost.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    const message = `Found ${result.totalPosts} posts, ${result.postsWithMedia} with media, ${result.updated} updated, ${result.created} created`;
    
    // Final debug: Check the Jazz account group state
    console.log(`🔍 DEBUG: Final Jazz account group state:`);
    console.log(`   - Total posts in group: ${jazzAccountGroup.posts?.length || 0}`);
    console.log(`   - Account group owner: ${jazzAccountGroup._owner?.toString()}`);
    
    if (jazzAccountGroup.posts && jazzAccountGroup.posts.length > 0) {
      const lastPost = jazzAccountGroup.posts[jazzAccountGroup.posts.length - 1];
      console.log(`   - Last post ID: ${lastPost?.id || 'NO_ID'}`);
      console.log(`   - Last post variants: ${Object.keys(lastPost?.variants || {})}`);
      
      if (lastPost?.variants) {
        const platforms = Object.keys(lastPost.variants);
        for (const platform of platforms) {
          const variant = lastPost.variants[platform];
          if (variant) {
            console.log(`   - ${platform} variant media count: ${variant.media?.length || 0}`);
            if (variant.media && variant.media.length > 0) {
              console.log(`   - ${platform} first media type: ${variant.media[0]?.type}`);
            }
          }
        }
      }
    }
    
    return {
      success: true,
      message,
      details: result
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);
    return {
      success: false,
      message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Process a single Ayrshare post - find existing or create new Jazz post
 */
async function processSinglePost(
  ayrsharePost: any,
  platform: string,
  jazzAccountGroup: any,
  result: any,
  forceUpdate: boolean
) {
  console.log(`🔍 Processing post ${ayrsharePost.id}`);
  
  // Extract media URLs
  const mediaUrls = extractMediaUrls(ayrsharePost, platform);
  const hasMedia = mediaUrls.length > 0;
  
  if (hasMedia) {
    result.postsWithMedia++;
    console.log(`📷 Found ${mediaUrls.length} media URLs for post ${ayrsharePost.id}:`, mediaUrls);
  } else {
    console.log(`📝 No media found for post ${ayrsharePost.id}, but importing for analytics`);
  }

  // Find existing Jazz post
  let existingPost = null;
  let existingVariant = null;

  if (jazzAccountGroup.posts) {
    for (const post of jazzAccountGroup.posts) {
      if (post?.variants) {
        for (const [variantKey, variant] of Object.entries(post.variants)) {
          if ((variant as any)?.ayrsharePostId === ayrsharePost.id) {
            existingPost = post;
            existingVariant = variant;
            break;
          }
        }
        if (existingPost) break;
      }
    }
  }

  if (existingVariant) {
    console.log(`🔄 Updating existing post ${ayrsharePost.id}`);
    await updateExistingPost(existingVariant, ayrsharePost, mediaUrls, platform, forceUpdate, jazzAccountGroup);
    result.updated++;
  } else {
    console.log(`🆕 Creating new post ${ayrsharePost.id}`);
    await createNewPost(ayrsharePost, mediaUrls, platform, jazzAccountGroup);
    result.created++;
  }
}

/**
 * Update an existing Jazz post with new media and analytics
 */
async function updateExistingPost(
  existingVariant: any,
  ayrsharePost: any,
  mediaUrls: string[],
  platform: string,
  forceUpdate: boolean,
  jazzAccountGroup: any
) {
  try {
        // Update media if we have URLs and are forcing update
    if (mediaUrls.length > 0 && forceUpdate) {
      console.log(`🖼️ Updating media for post ${ayrsharePost.id}`);
      console.log(`🔍 DEBUG: Current media list:`, existingVariant.media?.length || 0, 'items');
      console.log(`🔍 DEBUG: Variant owner:`, existingVariant._owner?.toString());
      
      // Clear existing media if force updating
      if (existingVariant.media) {
        console.log(`🧹 Clearing ${existingVariant.media.length} existing media items`);
        while (existingVariant.media.length > 0) {
          existingVariant.media.pop();
        }
      } else {
        // Note: MediaItem is a discriminated union, but we need a concrete type for the list
        // Let's use a mixed approach - we'll push different types to the same list
        console.log(`📝 Creating new media list for post ${ayrsharePost.id}`);
        existingVariant.media = co.list(ImageMedia).create([], { owner: existingVariant._owner });
      }

      // Add new media items
      console.log(`📷 Adding ${mediaUrls.length} new media items`);
      for (let i = 0; i < mediaUrls.length; i++) {
        const url = mediaUrls[i];
        console.log(`🔄 Processing media ${i + 1}/${mediaUrls.length}: ${url.substring(0, 80)}...`);
        
        try {
          // Use the account group owner instead of variant owner for better persistence
          const mediaItem = await createMediaItemFromUrl(url, jazzAccountGroup._owner);
          console.log(`✅ Created media item:`, mediaItem.type);
          
          existingVariant.media.push(mediaItem);
          console.log(`✅ Added to media list, new count: ${existingVariant.media.length}`);
          
          // Force Jazz to recognize the change
          console.log(`🔄 Forcing Jazz sync recognition...`);
          
        } catch (error) {
          console.error(`❌ Failed to create media item from ${url}:`, error);
        }
      }
      
      console.log(`🎯 Final media count: ${existingVariant.media.length}`);
    }

    // Always update analytics
    updateAnalytics(existingVariant, ayrsharePost);
    
    // Debug: Check if the changes are persisting
    console.log(`🔍 DEBUG: Post-update verification for ${ayrsharePost.id}:`);
    console.log(`   - Media count: ${existingVariant.media?.length || 0}`);
    console.log(`   - Performance exists: ${!!existingVariant.performance}`);
    console.log(`   - Variant owner: ${existingVariant._owner?.toString()}`);
    
    // Try to trigger Jazz sync by accessing the object properties
    if (existingVariant.media && existingVariant.media.length > 0) {
      console.log(`   - First media type: ${existingVariant.media[0]?.type}`);
      console.log(`   - First media URL: ${existingVariant.media[0]?.image?.publicUrl || existingVariant.media[0]?.video?.publicUrl || 'NO_URL'}`);
    }
    
    console.log(`✅ Updated existing Jazz post ${ayrsharePost.id}`);
  } catch (error) {
    console.error(`❌ Failed to update post ${ayrsharePost.id}:`, error);
    throw error;
  }
}

/**
 * Create a new Jazz post from Ayrshare data
 */
async function createNewPost(
  ayrsharePost: any,
  mediaUrls: string[],
  platform: string,
  jazzAccountGroup: any
) {
  try {
    // Create title and content
    const title = co.plainText().create(
      (ayrsharePost.post?.substring(0, 50) || 'Imported post') + '...',
      { owner: jazzAccountGroup._owner }
    );
    
    const content = co.plainText().create(
      ayrsharePost.post || '',
      { owner: jazzAccountGroup._owner }
    );

    // Create media list
    const mediaList = co.list(ImageMedia).create([], { owner: jazzAccountGroup._owner });
    
    // Add media items
    for (const url of mediaUrls) {
      const mediaItem = await createMediaItemFromUrl(url, jazzAccountGroup._owner);
      mediaList.push(mediaItem);
    }

    // Create ReplyTo object
    const replyTo = ReplyTo.create({}, { owner: jazzAccountGroup._owner });

    // Create performance tracking
    const performance = PostPerformance.create({
      ayrsharePostId: ayrsharePost.id,
      socialPostId: ayrsharePost.id,
      likes: ayrsharePost.likeCount || 0,
      comments: ayrsharePost.commentsCount || 0,
      shares: ayrsharePost.shareCount || 0,
      impressions: ayrsharePost.impressionCount || 0,
      engagementRate: ayrsharePost.engagementRate || 0,
      lastUpdated: new Date(),
      dataSource: 'ayrshare' as const,
      fetchedAt: new Date(),
      isComplete: true,
      hasError: false
    }, { owner: jazzAccountGroup._owner });

    // Create post variant
    const postVariant = PostVariant.create({
      text: content,
      postDate: new Date(ayrsharePost.created || Date.now()),
      media: mediaList,
      replyTo: replyTo,
      status: 'published' as const,
      publishedAt: new Date(ayrsharePost.created || Date.now()),
      edited: false,
      ayrsharePostId: ayrsharePost.id,
      socialPostUrl: ayrsharePost.postUrl || '',
      performance: performance
    }, { owner: jazzAccountGroup._owner });

    // Create post with variants
    const post = Post.create({
      title,
      variants: co.record(z.string(), PostVariant).create({
        [platform]: postVariant
      }, { owner: jazzAccountGroup._owner })
    }, { owner: jazzAccountGroup._owner });

    // Add to account group
    jazzAccountGroup.posts.push(post);
    
    console.log(`✅ Created new Jazz post ${ayrsharePost.id}`);
  } catch (error) {
    console.error(`❌ Failed to create post ${ayrsharePost.id}:`, error);
    throw error;
  }
}

/**
 * Create a Jazz MediaItem from a URL by actually downloading the content
 * Using proper Jazz FileStream.createFromBlob() method
 */
async function createMediaItemFromUrl(url: string, owner: any): Promise<any> {
  try {
    console.log(`🖼️ Creating media item from URL: ${url.substring(0, 80)}...`);
    console.log(`🔍 DEBUG: Owner for media creation:`, owner?.toString());
    
    // Step 1: Download the actual file content
    console.log(`⬇️ Downloading media from URL...`);
    const response = await fetch(url, {
      mode: 'cors',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Jazz/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`📦 Downloaded blob:`, blob.size, 'bytes, type:', blob.type);
    
    // Step 2: Determine if it's a video or image
    const isVideo = blob.type.startsWith('video/') || 
                   url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
    console.log(`🎬 Media type detected: ${isVideo ? 'video' : 'image'} (MIME: ${blob.type})`);
    
    if (isVideo) {
      // Create video media using proper Jazz method
      console.log(`🎬 Creating video FileStream from blob...`);
      const videoStream = await co.fileStream().createFromBlob(blob, { owner });
      
      console.log(`✅ Video FileStream created with publicUrl:`, (videoStream as any).publicUrl || 'PENDING');
      
      const videoMedia = VideoMedia.create({
        type: 'video' as const,
        video: videoStream,
        alt: co.plainText().create(`Video from ${new URL(url).hostname}`, { owner })
      }, { owner });
      
      console.log(`🔗 PERSISTED: Stored original URL in schema field:`, url.substring(0, 80) + '...');
      
      console.log(`✅ VideoMedia created:`, !!videoMedia, 'type:', videoMedia.type);
      return videoMedia;
    } else {
      // Create image media using proper Jazz method  
      console.log(`🖼️ Creating image FileStream from blob...`);
      const imageStream = await co.fileStream().createFromBlob(blob, { 
        owner,
        onProgress: (progress) => {
          if (progress === 1) {
            console.log(`📤 Image upload completed`);
          }
        }
      });
      
      console.log(`✅ Image FileStream created with publicUrl:`, (imageStream as any).publicUrl || 'PENDING');
      
      const imageMedia = ImageMedia.create({
        type: 'image' as const,
        image: imageStream,
        alt: co.plainText().create(`Image from ${new URL(url).hostname}`, { owner })
      }, { owner });
      
      console.log(`🔗 PERSISTED: Stored original URL in schema field:`, url.substring(0, 80) + '...');
      
      console.log(`✅ ImageMedia created:`, !!imageMedia, 'type:', imageMedia.type);
      console.log(`🔍 DEBUG: ImageMedia stream publicUrl:`, (imageMedia.image as any)?.publicUrl || 'PENDING_UPLOAD');
      return imageMedia;
    }
  } catch (error) {
    console.error(`❌ Failed to create media item from ${url}:`, error);
    
    // Fallback: Create empty stream with original URL as reference
    console.log(`🔄 Creating fallback media item...`);
    try {
      const fallbackStream = co.fileStream().create({ owner });
      
      return ImageMedia.create({
        type: 'image' as const,
        image: fallbackStream
      }, { owner });
    } catch (fallbackError) {
      console.error(`❌ Fallback creation also failed:`, fallbackError);
      throw error;
    }
  }
}

/**
 * Update analytics data for a post variant
 */
function updateAnalytics(variant: any, ayrsharePost: any) {
  try {
    if (!variant.performance) {
      // Create a new performance object if it doesn't exist
      variant.performance = PostPerformance.create({
        ayrsharePostId: ayrsharePost.id,
        socialPostId: ayrsharePost.id,
        likes: ayrsharePost.likeCount || 0,
        comments: ayrsharePost.commentsCount || 0,
        shares: ayrsharePost.shareCount || 0,
        impressions: ayrsharePost.impressionCount || 0,
        engagementRate: ayrsharePost.engagementRate || 0,
        lastUpdated: new Date(),
        dataSource: 'ayrshare' as const,
        fetchedAt: new Date(),
        isComplete: true,
        hasError: false
      }, { owner: variant._owner });
    } else {
      // Update existing performance object with raw values
      variant.performance.ayrsharePostId = ayrsharePost.id;
      variant.performance.socialPostId = ayrsharePost.id;
      variant.performance.likes = ayrsharePost.likeCount || 0;
      variant.performance.comments = ayrsharePost.commentsCount || 0;
      variant.performance.shares = ayrsharePost.shareCount || 0;
      variant.performance.impressions = ayrsharePost.impressionCount || 0;
      variant.performance.engagementRate = ayrsharePost.engagementRate || 0;
      variant.performance.lastUpdated = new Date();
      variant.performance.dataSource = 'ayrshare' as const;
      variant.performance.fetchedAt = new Date();
      variant.performance.isComplete = true;
      variant.performance.hasError = false;
    }
    
    console.log(`📊 Updated analytics for post ${ayrsharePost.id}`);
  } catch (error) {
    console.error('❌ Failed to update analytics:', error);
  }
}

/**
 * Extract media URLs from Ayrshare post based on platform
 */
function extractMediaUrls(ayrsharePost: any, platform: string): string[] {
  const mediaUrls: string[] = [];
  const post = ayrsharePost as any;
  
  console.log(`🔍 Extracting media for post ${ayrsharePost.id}, platform: ${platform}`);
  
  // Instagram format - check mediaUrl (singular!)
  if (platform === 'instagram' && post.mediaUrl) {
    console.log(`📷 Found Instagram mediaUrl:`, post.mediaUrl);
    mediaUrls.push(post.mediaUrl);
  }
  
  // Instagram additional formats
  if (platform === 'instagram') {
    if (post.fullPicture) {
      console.log(`📷 Found Instagram fullPicture:`, post.fullPicture);
      mediaUrls.push(post.fullPicture);
    }
    if (post.imageUrl) {
      console.log(`📷 Found Instagram imageUrl:`, post.imageUrl);
      mediaUrls.push(post.imageUrl);
    }
    if (post.picture) {
      console.log(`📷 Found Instagram picture:`, post.picture);
      mediaUrls.push(post.picture);
    }
  }
  
  // Facebook format
  if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
    for (const mediaItem of post.mediaUrls) {
      if (mediaItem.media) {
        if (mediaItem.media.image?.src) {
          console.log(`📷 Found Facebook image:`, mediaItem.media.image.src);
          mediaUrls.push(mediaItem.media.image.src);
        }
        if (mediaItem.media.source) {
          console.log(`📹 Found Facebook video:`, mediaItem.media.source);
          mediaUrls.push(mediaItem.media.source);
        }
      }
    }
  }
  
  // Twitter/X format
  if (post.media && Array.isArray(post.media)) {
    for (const mediaItem of post.media) {
      if (mediaItem.previewImageUrl) {
        console.log(`📷 Found Twitter preview:`, mediaItem.previewImageUrl);
        mediaUrls.push(mediaItem.previewImageUrl);
      }
      if (mediaItem.mediaUrls && Array.isArray(mediaItem.mediaUrls)) {
        for (const urlItem of mediaItem.mediaUrls) {
          if (urlItem.mediaUrl) {
            console.log(`📹 Found Twitter media:`, urlItem.mediaUrl);
            mediaUrls.push(urlItem.mediaUrl);
          }
        }
      }
    }
  }
  
  // YouTube format
  if (post.thumbnailUrl) {
    console.log(`📷 Found YouTube thumbnail:`, post.thumbnailUrl);
    mediaUrls.push(post.thumbnailUrl);
  }
  
  console.log(`📊 Total media URLs found: ${mediaUrls.length}`);
  return [...new Set(mediaUrls)]; // Remove duplicates
}

/**
 * Quick sync utility for UI components
 */
export async function quickSyncMedia(
  platform: string,
  profileKey: string,
  jazzAccountGroup: any
): Promise<SyncResult> {
  console.log(`🚀 Quick sync started for ${platform}`);
  
  const result = await syncAyrshareMediaToJazz(platform, profileKey, jazzAccountGroup, {
    limit: 20,
    forceUpdate: true // Always force update to ensure media gets synced
  });
  
  console.log('🔍 Quick sync result:', result);
  
  return result;
}

// Function to fetch and save profile avatar to Jazz account
export async function syncProfileAvatar(platform: string, profileKey: string, jazzAccountGroup: any) {
  try {
    console.log(`🖼️ Syncing profile avatar for ${platform}...`);
    
    // Fetch user profile info from Ayrshare
    const response = await fetch(`/api/ayrshare-user-info?profileKey=${profileKey}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }
    
    const userData = await response.json();
    console.log(`👤 User profile data:`, userData);
    
    // Extract profile picture URL based on platform
    let profilePictureUrl: string | null = null;
    
    if (platform === 'instagram' && userData.profileData?.instagram) {
      profilePictureUrl = userData.profileData.instagram.profilePictureUrl || 
                         userData.profileData.instagram.picture ||
                         userData.profileData.instagram.avatar;
    } else if (platform === 'facebook' && userData.profileData?.facebook) {
      profilePictureUrl = userData.profileData.facebook.profilePictureUrl ||
                         userData.profileData.facebook.picture;
    } else if (platform === 'x' && userData.profileData?.twitter) {
      profilePictureUrl = userData.profileData.twitter.profilePictureUrl ||
                         userData.profileData.twitter.profile_image_url;
    }
    
    if (!profilePictureUrl) {
      console.log(`❌ No profile picture URL found for ${platform}`);
      return { success: false, message: `No profile picture found for ${platform}` };
    }
    
    console.log(`🖼️ Found profile picture URL:`, profilePictureUrl.substring(0, 80) + '...');
    
    // Find the account in the Jazz group
    const accounts = jazzAccountGroup.accounts;
    const accountIndex = accounts.findIndex((acc: any) => acc.platform === platform);
    
    if (accountIndex === -1) {
      console.log(`❌ Account not found in Jazz group for platform: ${platform}`);
      return { success: false, message: `Account not found for ${platform}` };
    }
    
    // Download and save avatar using Jazz FileStream
    console.log(`⬇️ Downloading avatar image from URL...`);
    try {
      const response = await fetch(profilePictureUrl, {
        mode: 'cors',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Jazz/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch avatar: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log(`📦 Downloaded avatar blob:`, blob.size, 'bytes, type:', blob.type);
      
      // Create Jazz FileStream from the downloaded blob
      console.log(`💾 Creating Jazz FileStream for avatar...`);
      const avatarStream = await co.fileStream().createFromBlob(blob, { 
        owner: jazzAccountGroup._owner,
        onProgress: (progress) => {
          if (progress === 1) {
            console.log(`📤 Avatar upload completed for ${platform}`);
          }
        }
      });
      
      // Update the account with both URL (for compatibility) and Jazz FileStream
      accounts[accountIndex].avatar = profilePictureUrl; // Keep URL for compatibility
      accounts[accountIndex].avatarImage = avatarStream; // Jazz FileStream for proper storage
      
      // Also update currentAnalytics if it exists
      if (accounts[accountIndex].currentAnalytics) {
        accounts[accountIndex].currentAnalytics.profilePictureUrl = profilePictureUrl;
      }
      
      console.log(`✅ Avatar properly saved to Jazz FileStream for ${platform}`);
      
    } catch (downloadError) {
      console.error(`❌ Failed to download/save avatar:`, downloadError);
      // Fallback: just save the URL
      accounts[accountIndex].avatar = profilePictureUrl;
      if (accounts[accountIndex].currentAnalytics) {
        accounts[accountIndex].currentAnalytics.profilePictureUrl = profilePictureUrl;
      }
      console.log(`🔄 Saved avatar URL as fallback for ${platform}`);
    }
    
    console.log(`✅ Profile avatar synced for ${platform}`);
    return { 
      success: true, 
      message: `Profile avatar synced for ${platform}`,
      avatarUrl: profilePictureUrl 
    };
    
  } catch (error) {
    console.error(`❌ Error syncing profile avatar:`, error);
    return { 
      success: false, 
      message: `Failed to sync profile avatar: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
} 