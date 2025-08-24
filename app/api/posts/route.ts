import { NextRequest, NextResponse } from 'next/server';
import { co, z } from 'jazz-tools';
import { 
  Post, 
  PostVariant, 
  MediaItem, 
  ImageMedia, 
  VideoMedia, 
  ReplyTo, 
  MyAppAccount,
  AccountGroup,
  PlatformNames
} from '@/app/schema';
import { handleStandardPost, handleReplyPost, handleMultiPosts, PostData } from '@/utils/apiHandlers';
import { isBusinessPlanMode } from '@/utils/ayrshareIntegration';
import { validateAPIKey, logAPIKeyUsage, checkRateLimit } from '@/utils/apiKeyManager';

// =============================================================================
// 🔐 AUTHENTICATION & VALIDATION
// =============================================================================

interface AuthenticatedUser {
  accountId: string;
  account: any; // MyAppAccount type from Jazz
  keyData: any; // APIKey data
}

async function authenticateAPIKey(request: NextRequest): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return { success: false, error: 'Missing X-API-Key header' };
  }

  // Get client info for logging
  const clientIP = request.headers.get('X-Forwarded-For') || 
                  request.headers.get('X-Real-IP') || 
                  'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  // Validate the API key
  const validation = await validateAPIKey(apiKey, undefined, clientIP, userAgent);
  
  if (!validation.isValid) {
    return { success: false, error: validation.error || 'Invalid API key' };
  }

  // Check rate limits
  const rateLimit = checkRateLimit(validation.keyData);
  if (!rateLimit.allowed) {
    return { 
      success: false, 
      error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.` 
    };
  }

  return {
    success: true,
    user: {
      accountId: validation.account.id,
      account: validation.account,
      keyData: validation.keyData
    }
  };
}

// =============================================================================
// 📝 REQUEST VALIDATION
// =============================================================================

const CreatePostSchema = z.object({
  // Required fields
  accountGroupId: z.string().min(1, 'Account group ID is required'),
  content: z.string().min(1, 'Post content is required'),
  platforms: z.array(z.enum(PlatformNames)).min(1, 'At least one platform is required'),
  
  // Optional fields
  title: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  
  // Media attachments
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    alt: z.string().optional(),
    filename: z.string().optional()
  })).optional(),
  
  // Reply configuration
  replyTo: z.object({
    url: z.string().url(),
    platform: z.enum(PlatformNames).optional(),
  }).optional(),
  
  // Thread/multi-post configuration
  isThread: z.boolean().optional(),
  threadPosts: z.array(z.object({
    content: z.string(),
    media: z.array(z.object({
      type: z.enum(['image', 'video']),
      url: z.string().url(),
      alt: z.string().optional()
    })).optional()
  })).optional(),
  
  // Publishing options
  publishImmediately: z.boolean().default(false),
  saveAsDraft: z.boolean().default(true),
  
  // Business plan options
  profileKey: z.string().optional(), // For Ayrshare Business Plan integration
});

type CreatePostRequest = z.infer<typeof CreatePostSchema>;

// =============================================================================
// 🎯 POST CREATION LOGIC
// =============================================================================

async function createPostInJazz(
  request: CreatePostRequest, 
  user: AuthenticatedUser
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // TODO: In production, you would:
    // 1. Load the actual account group from Jazz
    // 2. Verify user has permission to post to this account group
    // 3. Create proper Jazz collaborative objects
    
    // For demo purposes, create a mock Jazz structure
    const now = new Date();
    
    // Create title
    const titleText = request.title || `API Post ${now.toISOString()}`;
    
    // Create base variant content
    const baseText = request.content;
    
    // Handle media attachments
    const mediaItems = request.media?.map((mediaItem: { type: 'image' | 'video'; url: string; alt?: string; filename?: string }) => {
      if (mediaItem.type === 'image') {
        return {
          type: 'image' as const,
          url: mediaItem.url,
          alt: mediaItem.alt || '',
          filename: mediaItem.filename
        };
      } else {
        return {
          type: 'video' as const,
          url: mediaItem.url,
          alt: mediaItem.alt || '',
          filename: mediaItem.filename
        };
      }
    }) || [];
    
    // Create reply-to object if provided
    const replyTo = request.replyTo ? {
      url: request.replyTo.url,
      platform: request.replyTo.platform,
      author: undefined,
      authorUsername: undefined,
      authorPostContent: undefined,
      authorAvatar: undefined,
      likesCount: undefined,
    } : undefined;
    
    // Create post variant
    const baseVariant = {
      text: baseText,
      postDate: now,
      media: mediaItems,
      replyTo: replyTo || {},
      status: request.publishImmediately ? 'published' as const : 'draft' as const,
      scheduledFor: request.scheduledDate ? new Date(request.scheduledDate) : undefined,
      publishedAt: request.publishImmediately ? now : undefined,
      edited: false,
      lastModified: undefined,
      performance: undefined,
      ayrsharePostId: undefined,
      socialPostUrl: undefined,
    };
    
    // Generate a post ID (in production this would be handled by Jazz)
    const postId = `api_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const postData = {
      id: postId,
      title: titleText,
      variants: {
        base: baseVariant,
        ...Object.fromEntries(request.platforms.map((platform: string) => [
          platform,
          { ...baseVariant, platform }
        ]))
      }
    };
    
    console.log('📝 Created post structure:', {
      postId,
      title: titleText,
      platforms: request.platforms,
      hasMedia: mediaItems.length > 0,
      scheduledDate: request.scheduledDate,
      publishImmediately: request.publishImmediately
    });
    
    return { success: true, postId };
    
  } catch (error) {
    console.error('❌ Error creating post in Jazz:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create post' 
    };
  }
}

async function publishPost(
  postData: any,
  request: CreatePostRequest,
  user: AuthenticatedUser
): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    if (!request.publishImmediately) {
      return { success: true, results: { message: 'Post saved as draft' } };
    }
    
    // Prepare post data for publishing - filter out any invalid platforms
    const validPlatforms = request.platforms.filter((p: string) => PlatformNames.includes(p as any));
    const publishData: PostData = {
      post: request.content,
      platforms: validPlatforms,
      mediaUrls: request.media?.map((m: { url: string }) => m.url).filter(Boolean) as string[],
      scheduleDate: request.scheduledDate,
    };
    
    let results;
    
    if (request.replyTo?.url) {
      // Handle reply post
      results = await handleReplyPost(publishData, request.replyTo.url);
    } else if (request.isThread && request.threadPosts) {
      // Handle thread/multi-post - convert to expected ThreadPost format
      const threadPosts = request.threadPosts.map((tp: { content: string; media?: any[] }, index: number) => ({
        content: tp.content,
        media: tp.media || [],
        characterCount: tp.content.length,
        index,
        total: request.threadPosts!.length
      }));
      results = await handleMultiPosts(publishData, threadPosts);
    } else {
      // Handle standard post
      results = await handleStandardPost(publishData);
    }
    
    console.log('🚀 Post publishing results:', results);
    
    return { success: true, results };
    
  } catch (error) {
    console.error('❌ Error publishing post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to publish post' 
    };
  }
}

// =============================================================================
// 🌐 API ENDPOINTS
// =============================================================================

/**
 * POST /api/posts - Create a new post
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let authResult: { success: boolean; user?: AuthenticatedUser; error?: string } | undefined;
  
  try {
    // 🔐 Authenticate API key
    authResult = await authenticateAPIKey(request);
    if (!authResult.success) {
      // Log failed authentication attempt
      await logAPIKeyUsage(
        null, // No account for failed auth
        'unknown',
        '/api/posts',
        'POST',
        401,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          errorMessage: authResult.error
        }
      );
      
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error,
          code: 'AUTHENTICATION_FAILED'
        },
        { 
          status: 401,
          headers: {
            'X-RateLimit-Limit': '1000',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Math.ceil(Date.now() / 1000) + 3600).toString()
          }
        }
      );
    }

    const user = authResult.user!;

    // Check permissions
    if (!user.keyData.permissions.includes('posts:create')) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        '/api/posts',
        'POST',
        403,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          errorMessage: 'Insufficient permissions'
        }
      );

      return NextResponse.json(
        { 
          success: false, 
          error: 'API key does not have posts:create permission',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      );
    }

    // 📝 Parse and validate request
    let requestData: CreatePostRequest;
    try {
      const body = await request.json();
      requestData = CreatePostSchema.parse(body);
    } catch (error) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        '/api/posts',
        'POST',
        400,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          errorMessage: 'Invalid request data'
        }
      );

      if (error && typeof error === 'object' && 'errors' in error) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid request data',
            code: 'VALIDATION_ERROR',
            details: (error as any).errors
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // 🎯 Check account group permissions
    if (user.keyData.accountGroupIds && user.keyData.accountGroupIds.length > 0) {
      if (!user.keyData.accountGroupIds.includes(requestData.accountGroupId)) {
        await logAPIKeyUsage(
          user.account,
          user.keyData.keyId,
          '/api/posts',
          'POST',
          403,
          {
            responseTime: Date.now() - startTime,
            ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
            userAgent: request.headers.get('User-Agent') || 'unknown',
            errorMessage: 'Account group access denied'
          }
        );

        return NextResponse.json(
          { 
            success: false, 
            error: 'API key does not have access to this account group',
            code: 'ACCOUNT_GROUP_ACCESS_DENIED'
          },
          { status: 403 }
        );
      }
    }

    // 🚀 Create the post
    const result = await createPostInJazz(requestData, user);
    
    // Get rate limit info for headers
    const rateLimit = checkRateLimit(user.keyData);
    
    // ✅ Log successful usage
    const responseTime = Date.now() - startTime;
    await logAPIKeyUsage(
      user.account,
      user.keyData.keyId,
      '/api/posts',
      'POST',
      result.success ? 201 : 400,
      {
        responseTime,
        ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
        userAgent: request.headers.get('User-Agent') || 'unknown',
        requestSize: JSON.stringify(requestData).length,
        responseSize: JSON.stringify(result).length,
        errorMessage: result.success ? undefined : result.error
      }
    );

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'Post created successfully',
          data: {
            postId: result.postId,
            accountGroupId: requestData.accountGroupId,
            platforms: requestData.platforms,
            scheduledDate: requestData.scheduledDate,
            publishedImmediately: requestData.publishImmediately
          }
        },
        { 
          status: 201,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Post creation failed',
          code: 'POST_CREATION_FAILED'
        },
        { 
          status: 400,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(rateLimit.resetTime / 1000).toString(),
            'X-Response-Time': `${responseTime}ms`
          }
        }
      );
    }

  } catch (error) {
    console.error('❌ Unexpected error in posts API:', error);
    
    // Log error if we have user context
    if (authResult?.user) {
      await logAPIKeyUsage(
        authResult.user.account,
        authResult.user.keyData.keyId,
        '/api/posts',
        'POST',
        500,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get('X-Forwarded-For') || 'unknown',
          userAgent: request.headers.get('User-Agent') || 'unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        code: 'INTERNAL_SERVER_ERROR' 
      },
      { 
        status: 500,
        headers: {
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      }
    );
  }
}

// =============================================================================
// 📖 GET POSTS (OPTIONAL - for retrieving posts)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateAPIKey(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: 'AUTHENTICATION_FAILED'
        },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const accountGroupId = searchParams.get('accountGroupId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!accountGroupId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'accountGroupId parameter is required',
          code: 'MISSING_PARAMETER'
        },
        { status: 400 }
      );
    }
    
    // TODO: In production, implement actual post retrieval from Jazz
    // This would query the collaborative account group and return posts
    
    return NextResponse.json({
      success: true,
      data: {
        posts: [], // Would contain actual posts from database
        pagination: {
          limit,
          offset,
          total: 0,
          hasMore: false
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error retrieving posts:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
} 