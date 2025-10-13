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
        if (postData.publishImmediately || postData.scheduledDate) {
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
            
            // Get the profile key from the loaded account group
            const profileKey = accountGroup?.ayrshareProfileKey;
            if (profileKey) {
              console.log(`🔑 Bulk Post ${i + 1}: Using profile key: ${profileKey.substring(0, 8)}...`);
            } else {
              console.warn(`⚠️ Bulk Post ${i + 1}: No Ayrshare profile key found for account group: ${accountGroupId}`);
            }
            
            // Prepare data for Ayrshare
            const ayrsharePostData: PostData = {
              post: post.content,
              platforms: post.platforms,
              mediaUrls: post.mediaUrls || [],
              scheduleDate: post.scheduledDate,
              profileKey: profileKey // FIXED: Now using the correct profile key
            };

            const { isBusinessPlanMode } = await import('@/utils/ayrshareIntegration');
            console.log(`🔑 Bulk Post ${i + 1} Profile Key Debug:`, {
              accountGroupId,
              profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
              willUseBusinessPlan: !!(profileKey && isBusinessPlanMode())
            });
            
            // Import and use the standard post handler
            const { handleStandardPost } = await import('@/utils/apiHandlers');
            console.log(`📤 Publishing to Ayrshare:`, ayrsharePostData);
            publishResults = await handleStandardPost(ayrsharePostData);
            console.log(`✅ Ayrshare response:`, publishResults);
            
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
