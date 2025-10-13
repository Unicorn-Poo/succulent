import { NextRequest, NextResponse } from 'next/server';
import { z } from 'jazz-tools';
import { PlatformNames } from '@/app/schema';
import { 
  logAyrshareOperation, 
  logPostWorkflow,
  logPlatformPostStatus,
  generateRequestId 
} from '@/utils/ayrshareLogger';
import { handleStandardPost, PostData } from '@/utils/apiHandlers';

// Schema for bulk post creation
const BulkPostSchema = z.object({
  accountGroupId: z.string().min(1, 'Account group ID is required'),
  posts: z.array(z.object({
    title: z.string().min(1, 'Title is required'),
    content: z.string().min(1, 'Content is required'),
    platforms: z.array(z.enum(PlatformNames)).min(1, 'At least one platform is required'),
    scheduledDate: z.string().datetime().optional(),
    mediaUrls: z.array(z.string().url()).optional(),
  })).min(1, 'At least one post is required').max(50, 'Maximum 50 posts per batch')
});

/**
 * POST /api/posts/bulk - Create multiple posts from CSV data
 * Note: This is a UI-only endpoint that doesn't require API key authentication
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const batchId = generateRequestId();
  
  try {
    logPostWorkflow('Bulk Upload Started', { batchSize: 0 }, 'started', undefined, { batchId });
    
    const body = await request.json();
    
    // Validate request data
    const validation = BulkPostSchema.safeParse(body);
    if (!validation.success) {
      logPostWorkflow('Bulk Upload Validation Failed', body, 'error', 'Schema validation failed', { 
        batchId,
        validationErrors: validation.error.issues 
      });
      
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.issues || validation.error
        },
        { status: 400 }
      );
    }

    const { accountGroupId, posts } = validation.data;
    
    logPostWorkflow('Bulk Upload Validated', { batchSize: posts.length }, 'started', undefined, { 
      batchId,
      accountGroupId,
      totalPosts: posts.length 
    });

    // Load the account group once at the beginning
    let accountGroup = null;
    try {
      const { jazzServerWorker } = await import('@/utils/jazzServer');
      const { AccountGroup } = await import('@/app/schema');
      const worker = await jazzServerWorker;
      
      if (worker) {
        accountGroup = await AccountGroup.load(accountGroupId, { 
          loadAs: worker,
          resolve: {
            posts: { $each: true },
            accounts: { $each: true }
          }
        });
        console.log(`🔄 Loaded account group: ${accountGroup?.id}, has ${accountGroup?.posts?.length || 0} existing posts`);
      }
    } catch (error) {
      console.error('❌ Failed to load account group:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load account group' },
        { status: 500 }
      );
    }

    const results = {
      success: true,
      created: 0,
      scheduled: 0,
      failed: 0,
      errors: [] as string[],
      createdPosts: [] as any[]
    };

    // Process each post
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const postId = `bulk-${batchId}-${i}`;
      
      logPostWorkflow(`Bulk Post ${i + 1} Started`, post, 'started', undefined, {
        batchId,
        postIndex: i + 1,
        totalPosts: posts.length,
        postId,
        title: post.title
      });
      
      try {
        // Create individual post using existing API
        const postData = {
          accountGroupId,
          content: post.content,
          title: post.title,
          platforms: post.platforms,
          scheduledDate: post.scheduledDate,
          media: post.mediaUrls?.map((url: string) => ({
            type: 'image' as const,
            url,
            alt: `Image for ${post.title}`
          })),
          publishImmediately: !post.scheduledDate, // Publish immediately if not scheduled
          // IMPORTANT: Scheduled posts should also be published to Ayrshare (with schedule)
          saveAsDraft: false
        };

        logAyrshareOperation({
          timestamp: new Date().toISOString(),
          operation: `Bulk Post ${i + 1} - Data Prepared`,
          status: 'started',
          data: {
            title: post.title,
            platforms: post.platforms,
            mediaCount: postData.media?.length || 0,
            scheduled: !!post.scheduledDate,
            contentLength: post.content.length
          },
          requestId: batchId
        });

        // Option 1: Create Jazz post only (no publishing)
        // Option 2: Create Jazz post AND publish to Ayrshare
        // For bulk uploads, let's do both to match user expectations
        
        let publishResults = null;
        let createdJazzPost = null;
        
        // Step 1: Create Jazz post (using existing CSV upload logic)
        try {
          if (accountGroup) {
            // Use the CSV upload logic that actually works
            const { co, z } = await import('jazz-tools');
            const { Post, PostVariant, MediaItem, URLImageMedia, ReplyTo } = await import('@/app/schema');

            // Create the collaborative objects
            const titleText = co.plainText().create(post.title, { owner: accountGroup._owner });
            const baseText = co.plainText().create(post.content, { owner: accountGroup._owner });
            const mediaList = co.list(MediaItem).create([], { owner: accountGroup._owner });
            
            // Add media if provided
            if (post.mediaUrls && post.mediaUrls.length > 0) {
              for (const mediaUrl of post.mediaUrls) {
                const altText = co.plainText().create(`Image for ${post.title}`, { owner: accountGroup._owner });
                const urlImageMedia = URLImageMedia.create({
                  type: 'url-image',
                  url: mediaUrl,
                  alt: altText,
                  filename: `bulk-upload-${Date.now()}.jpg`
                }, { owner: accountGroup._owner });
                mediaList.push(urlImageMedia);
              }
            }
            
            const replyToObj = ReplyTo.create({}, { owner: accountGroup._owner });
            
            // Create variants for each platform
            const variantsRecord = co.record(z.string(), PostVariant).create({}, { owner: accountGroup._owner });
            
            for (const platform of post.platforms) {
              const platformVariant = PostVariant.create({
                text: baseText,
                postDate: new Date(),
                media: mediaList,
                replyTo: replyToObj,
                status: post.scheduledDate ? "scheduled" : "draft",
                scheduledFor: post.scheduledDate ? new Date(post.scheduledDate) : undefined,
                publishedAt: undefined,
                edited: false,
                lastModified: undefined,
              }, { owner: accountGroup._owner });
              variantsRecord[platform] = platformVariant;
            }

            // Create the post
            const newPost = Post.create({
              title: titleText,
              variants: variantsRecord,
            }, { owner: accountGroup._owner });

            // Add the post to the account group
            accountGroup.posts.push(newPost);
            createdJazzPost = newPost; // Store reference for later update
            
            console.log(`✅ Jazz post created: ${newPost.id}`);
          }
          
        } catch (jazzError) {
          logAyrshareOperation({
            timestamp: new Date().toISOString(),
            operation: `Bulk Post ${i + 1} - Jazz Creation Failed`,
            status: 'error',
            error: jazzError instanceof Error ? jazzError.message : 'Unknown error',
            data: { title: post.title },
            requestId: batchId
          });
          
          results.failed++;
          results.errors.push(`Post "${post.title}": Jazz creation failed - ${jazzError instanceof Error ? jazzError.message : 'Unknown error'}`);
          continue; // Skip to next post
        }
        
        // Step 2: Publish to Ayrshare (both immediate AND scheduled posts)
        console.log(`🔍 Bulk Post ${i + 1} Publishing Check:`, {
          publishImmediately: postData.publishImmediately,
          hasScheduledDate: !!postData.scheduledDate,
          scheduledDate: postData.scheduledDate,
          willPublish: postData.publishImmediately || !!postData.scheduledDate
        });
        
        // CRITICAL: Always publish scheduled posts to Ayrshare
        const shouldPublish = postData.publishImmediately || !!postData.scheduledDate;
        console.log(`🚨 CRITICAL DEBUG - Post ${i + 1}:`, {
          title: post.title,
          hasScheduledDate: !!post.scheduledDate,
          scheduledDate: post.scheduledDate,
          publishImmediately: postData.publishImmediately,
          shouldPublish: shouldPublish,
          willEnterPublishingBlock: shouldPublish
        });
        
        if (shouldPublish) {
          try {
            logAyrshareOperation({
              timestamp: new Date().toISOString(),
              operation: `Bulk Post ${i + 1} - Publishing Started`,
              status: 'started',
              data: { 
                title: post.title,
                platforms: post.platforms,
                immediate: postData.publishImmediately,
                scheduled: !!postData.scheduledDate
              },
              requestId: batchId
            });
            
            const { isBusinessPlanMode } = await import('@/utils/ayrshareIntegration');
            
            // Get the profile key from the loaded account group (only for business plan mode)
            let profileKey = null;
            if (isBusinessPlanMode()) {
              profileKey = accountGroup?.ayrshareProfileKey;
              if (profileKey) {
                console.log(`🔑 Bulk Post ${i + 1}: Using profile key: ${profileKey.substring(0, 8)}...`);
              } else {
                console.warn(`⚠️ Bulk Post ${i + 1}: No Ayrshare profile key found for account group: ${accountGroupId}`);
              }
            } else {
              console.log(`🆓 Bulk Post ${i + 1}: Using free account mode - no profile key needed`);
            }
            
            // Prepare data for Ayrshare (like regular post creation)
            const ayrsharePostData: PostData = {
              post: post.content,
              platforms: post.platforms,
              mediaUrls: post.mediaUrls || [],
              scheduleDate: post.scheduledDate,
              ...(isBusinessPlanMode() && profileKey ? { profileKey } : {})
            };

            console.log(`🔑 Bulk Post ${i + 1} Profile Key Debug:`, {
              accountGroupId,
              profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
              businessPlanMode: isBusinessPlanMode(),
              willUseBusinessPlan: !!(profileKey && isBusinessPlanMode()),
              finalPostData: {
                hasProfileKey: !!ayrsharePostData.profileKey,
                platforms: ayrsharePostData.platforms,
                hasScheduleDate: !!ayrsharePostData.scheduleDate
              }
            });
            
            // Import and use the standard post handler
            const { handleStandardPost } = await import('@/utils/apiHandlers');
            console.log(`🚨 CRITICAL: About to call Ayrshare API for post ${i + 1}:`, {
              title: post.title,
              platforms: ayrsharePostData.platforms,
              hasScheduleDate: !!ayrsharePostData.scheduleDate,
              scheduleDate: ayrsharePostData.scheduleDate,
              hasProfileKey: !!ayrsharePostData.profileKey,
              contentLength: ayrsharePostData.post.length
            });
            
            publishResults = await handleStandardPost(ayrsharePostData);
            
            console.log(`🚨 CRITICAL: Ayrshare API response for post ${i + 1}:`, {
              success: !!publishResults,
              postId: publishResults?.id,
              platformIds: publishResults?.postIds,
              error: publishResults?.error
            });
            
            // Update Jazz post status after successful publishing
            if (publishResults && createdJazzPost) {
              try {
                console.log(`🔄 Updating Jazz post status for: ${post.title}`);
                
                if (createdJazzPost.variants) {
                  // Update all platform variants to reflect published status
                  for (const [platform, variant] of Object.entries(createdJazzPost.variants)) {
                    if (variant && post.platforms.includes(platform as any)) {
                      console.log(`📝 Updating ${platform} variant status to: ${postData.publishImmediately ? 'published' : 'scheduled'}`);
                      
                      (variant as any).status = postData.publishImmediately ? 'published' : 'scheduled';
                      (variant as any).publishedAt = postData.publishImmediately ? new Date() : undefined;
                      (variant as any).ayrsharePostId = publishResults.id;
                      
                      // Add platform-specific post IDs
                      const platformKey = platform === 'x' ? 'twitter' : platform;
                      const platformPostId = publishResults.postIds?.[platformKey];
                      if (platformPostId) {
                        (variant as any).socialPostUrl = `https://${platform}.com/post/${platformPostId}`;
                        console.log(`🔗 Added social URL for ${platform}: ${platformPostId}`);
                      }
                    }
                  }
                  console.log(`✅ Successfully updated Jazz post status for: ${post.title}`);
                }
              } catch (updateError) {
                console.error(`⚠️ Failed to update Jazz post status:`, updateError);
                // Don't fail the whole operation for this
              }
            }
            
            logAyrshareOperation({
              timestamp: new Date().toISOString(),
              operation: `Bulk Post ${i + 1} - Published Successfully`,
              status: 'success',
              data: { 
                title: post.title,
                platforms: post.platforms,
                ayrshareResults: publishResults
              },
              requestId: batchId
            });
            
            // Log per platform
            for (const platform of post.platforms) {
              const platformId = publishResults?.postIds?.[platform === 'x' ? 'twitter' : platform];
              logPlatformPostStatus(
                platform,
                postId,
                publishResults ? 'published' : 'failed',
                platformId,
                publishResults ? undefined : 'Publishing failed'
              );
            }
            
          } catch (publishError) {
            const errorMessage = publishError instanceof Error ? publishError.message : 'Unknown error';
            
            logAyrshareOperation({
              timestamp: new Date().toISOString(),
              operation: `Bulk Post ${i + 1} - Publishing Failed`,
              status: 'error',
              error: errorMessage,
              data: { title: post.title, platforms: post.platforms },
              requestId: batchId
            });
            
            // Handle duplicate errors appropriately - don't try to recover
            if (errorMessage.includes('Duplicate content detected')) {
              results.errors.push(`Post "${post.title}": Duplicate content - cannot post identical content within 48 hours`);
            } else {
              results.errors.push(`Post "${post.title}": Created but publishing failed - ${errorMessage}`);
            }
          }
        } else {
          // Draft only - no publishing attempted
          console.log(`🚨 CRITICAL: Post ${i + 1} NOT PUBLISHED - Saved as draft only`, {
            title: post.title,
            reason: 'shouldPublish was false',
            publishImmediately: postData.publishImmediately,
            scheduledDate: postData.scheduledDate,
            hasScheduledDate: !!postData.scheduledDate
          });
        }
        
        // Count as success only if both Jazz post was created AND publishing succeeded (if attempted)
        if (postData.publishImmediately || postData.scheduledDate) {
          // Publishing was attempted - only count as success if it worked
          if (publishResults) {
            results.created++;
            if (post.scheduledDate) {
              results.scheduled++;
            }
          } else {
            results.failed++;
          }
        } else {
          // Draft post - count as created since no publishing was attempted
          results.created++;
        }
        
        results.createdPosts.push({
          title: post.title,
          postId,
          platforms: post.platforms,
          scheduled: !!post.scheduledDate,
          published: !!publishResults,
          ayrsharePostIds: publishResults?.postIds || null
        });

        console.log(`📊 Bulk Post ${i + 1} Final Status:`, {
          title: post.title,
          jazzCreated: true,
          publishingAttempted: !!(postData.publishImmediately || postData.scheduledDate),
          publishingSucceeded: !!publishResults,
          countedAsCreated: !!(publishResults || (!postData.publishImmediately && !postData.scheduledDate)),
          countedAsScheduled: !!(post.scheduledDate && publishResults)
        });

        
      } catch (postError) {
        results.failed++;
        const errorMessage = postError instanceof Error ? postError.message : 'Unknown error';
        results.errors.push(`Post "${post.title}": ${errorMessage}`);
        
        logPostWorkflow(`Bulk Post ${i + 1} Failed`, post, 'error', errorMessage, {
          batchId,
          postIndex: i + 1,
          totalPosts: posts.length,
          postId,
          title: post.title
        });
      }
    }

    const responseTime = Date.now() - startTime;
    
    logPostWorkflow('Bulk Upload Completed', { batchSize: posts.length }, 'success', undefined, {
      batchId,
      responseTime,
      totalPosts: posts.length,
      created: results.created,
      scheduled: results.scheduled,
      failed: results.failed,
      errorCount: results.errors.length
    });

    return NextResponse.json(results, { 
      status: 200,
      headers: {
        'X-Response-Time': `${responseTime}ms`
      }
    });

  } catch (error) {
    console.error('❌ Bulk post creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Bulk upload failed'
      },
      { status: 500 }
    );
  }
}
