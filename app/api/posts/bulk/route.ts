import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PlatformNames } from '@/app/schema';

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
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting bulk post creation...');
    
    const body = await request.json();
    
    // Validate request data
    const validation = BulkPostSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ Bulk post validation failed:', validation.error.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { accountGroupId, posts } = validation.data;
    
    console.log(`📊 Processing ${posts.length} posts for account group: ${accountGroupId}`);

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
      console.log(`📝 Processing post ${i + 1}/${posts.length}: "${post.title}"`);
      
      try {
        // Create individual post using existing API
        const postData = {
          accountGroupId,
          content: post.content,
          title: post.title,
          platforms: post.platforms,
          scheduledDate: post.scheduledDate,
          media: post.mediaUrls?.map(url => ({
            type: 'image' as const,
            url,
            alt: `Image for ${post.title}`
          })),
          publishImmediately: !post.scheduledDate, // Publish immediately if not scheduled
          saveAsDraft: false
        };

        // Call the main posts API internally
        const createResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': request.headers.get('X-API-Key') || '', // Forward the API key
            'X-Forwarded-For': request.headers.get('X-Forwarded-For') || '',
            'User-Agent': request.headers.get('User-Agent') || ''
          },
          body: JSON.stringify(postData)
        });

        if (createResponse.ok) {
          const createResult = await createResponse.json();
          if (createResult.success) {
            results.created++;
            if (post.scheduledDate) {
              results.scheduled++;
            }
            results.createdPosts.push({
              title: post.title,
              postId: createResult.data.postId,
              platforms: post.platforms,
              scheduled: !!post.scheduledDate
            });
            console.log(`✅ Post ${i + 1} created successfully: ${createResult.data.postId}`);
          } else {
            results.failed++;
            results.errors.push(`Post "${post.title}": ${createResult.error || 'Creation failed'}`);
            console.error(`❌ Post ${i + 1} creation failed:`, createResult.error);
          }
        } else {
          const errorData = await createResponse.json().catch(() => ({}));
          results.failed++;
          results.errors.push(`Post "${post.title}": HTTP ${createResponse.status} - ${errorData.error || 'Unknown error'}`);
          console.error(`❌ Post ${i + 1} API call failed:`, createResponse.status, errorData);
        }
        
      } catch (postError) {
        results.failed++;
        const errorMessage = postError instanceof Error ? postError.message : 'Unknown error';
        results.errors.push(`Post "${post.title}": ${errorMessage}`);
        console.error(`❌ Post ${i + 1} processing error:`, postError);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`✅ Bulk upload completed in ${responseTime}ms:`, {
      total: posts.length,
      created: results.created,
      scheduled: results.scheduled,
      failed: results.failed
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
