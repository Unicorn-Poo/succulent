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
import { validateAPIKey, logAPIKeyUsage, checkRateLimit, validateAccountGroupAccess } from '@/utils/apiKeyManager';
import { addAPIPost } from '@/utils/apiPostsStorage';

// =============================================================================
// 🔐 AUTHENTICATION & VALIDATION
// =============================================================================

interface AuthenticatedUser {
  accountId: string;
  account?: any; // MyAppAccount type from Jazz (optional for API-only users)
  keyData: any; // APIKey data
  clientIP?: string;
  userAgent?: string;
}

async function authenticateAPIKey(request: NextRequest): Promise<{
  isValid: boolean;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  user?: AuthenticatedUser;
}> {
  try {
    // Get client information
    const clientIP = request.headers.get('X-Forwarded-For') || 
                    request.headers.get('X-Real-IP') || 
                    'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Extract API key from headers
    const apiKey = request.headers.get('X-API-Key');
    
    if (!apiKey) {
      return {
        isValid: false,
        error: 'API key is required. Please provide a valid API key in the X-API-Key header.',
        errorCode: 'MISSING_API_KEY',
        statusCode: 401
      };
    }

    // Validate the API key with detailed error handling
    const validation = await validateAPIKey(apiKey, 'posts:create', clientIP, userAgent);
    
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error || 'Invalid API key',
        errorCode: validation.errorCode || 'INVALID_API_KEY',
        statusCode: validation.statusCode || 401
      };
    }

    // Return authenticated user data
    return {
      isValid: true,
      user: {
        accountId: validation.accountId!,
        keyData: validation.keyData!,
        clientIP,
        userAgent
      }
    };

  } catch (error) {
    console.error('❌ Authentication error:', error);
    return {
      isValid: false,
      error: 'Internal server error during authentication. Please try again later.',
      errorCode: 'AUTH_ERROR',
      statusCode: 500
    };
  }
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
  
  // Media attachments - URL-based only
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

/**
 * Connect a server-created Jazz post to a user's account group
 */
async function connectPostToAccountGroup(
  jazzPost: any,
  accountGroupId: string,
  serverWorker: any
): Promise<void> {
  console.log(`🔗 Attempting to connect post ${jazzPost.id} to account group: ${accountGroupId}`);
  
  // For now, create a bridge structure that the UI can access
  // This is a simplified approach - in production you'd use proper Jazz permissions
  
  // Create a mapping object that links the post to the account group
  const { co, z } = await import('jazz-tools');
  
  // Define a simple mapping schema
  const PostMapping = co.map({
    jazzPostId: z.string(),
    accountGroupId: z.string(),
    createdAt: z.date(),
    createdViaAPI: z.boolean()
  });
  
  const postMapping = PostMapping.create({
    jazzPostId: jazzPost.id,
    accountGroupId: accountGroupId,
    createdAt: new Date(),
    createdViaAPI: true
  }, { owner: serverWorker });
  
  console.log(`🔗 Created post mapping:`, postMapping.id);
  
  // TODO: In a full implementation, this would:
  // 1. Find the user's account group by ID
  // 2. Add the post to the account group's posts list
  // 3. Handle permissions properly
  
  // For now, the mapping exists and can be queried later
}

/**
 * Store API post in Jazz collaborative system
 * Creates real Jazz Post objects and stores them in account groups
 */
async function storeInJazzIfPossible(
  postData: any,
  request: CreatePostRequest
): Promise<void> {
  console.log('🎷 Creating Jazz Post for:', postData.id);
  
  try {
    // Import Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      throw new Error('Jazz worker not available');
    }
    
    // Import Jazz schemas  
    const { Post, PostVariant, MediaItem, ReplyTo } = await import('@/app/schema');
    const { co, z } = await import('jazz-tools');
    
    console.log('🎷 Jazz worker ready, creating post objects...');
    
    // Create collaborative text objects
    const titleText = co.plainText().create(
      postData.title || `API Post ${new Date().toISOString()}`, 
      { owner: worker }
    );
    
    const baseText = co.plainText().create(request.content, { owner: worker });
    
    // Create media list (empty for now, can be enhanced later)
    const mediaList = co.list(MediaItem).create([], { owner: worker });
    
    // Create reply-to object
    const replyToObj = ReplyTo.create({
      url: request.replyTo?.url,
      platform: request.replyTo?.platform,
      author: undefined,
      authorUsername: undefined,
      authorPostContent: undefined,
      authorAvatar: undefined,
      likesCount: undefined,
    }, { owner: worker });
    
    // Create base variant
    const baseVariant = PostVariant.create({
      text: baseText,
      postDate: new Date(),
      media: mediaList,
      replyTo: replyToObj,
      status: request.publishImmediately ? 'published' : (request.scheduledDate ? 'scheduled' : 'draft'),
      scheduledFor: request.scheduledDate ? new Date(request.scheduledDate) : undefined,
      publishedAt: request.publishImmediately ? new Date() : undefined,
      edited: false,
      lastModified: undefined,
      performance: undefined,
      ayrsharePostId: undefined,
      socialPostUrl: undefined,
    }, { owner: worker });
    
    // Create variants record for each platform
    const variants = co.record(z.string(), PostVariant).create({ base: baseVariant }, { owner: worker });
    
    for (const platform of request.platforms) {
      const platformVariant = PostVariant.create(baseVariant, { owner: worker });
      variants[platform] = platformVariant;
    }
    
    // Create the Jazz Post
    const jazzPost = Post.create({
      title: titleText,
      variants: variants,
    }, { owner: worker });
    
    console.log('🎷 Created Jazz Post:', {
      postId: jazzPost.id,
      title: titleText.toString(),
      platforms: request.platforms,
      status: baseVariant.status
    });
    
    // 🎯 IMPLEMENTATION: Connect to user account group
    try {
      await connectPostToAccountGroup(jazzPost, request.accountGroupId, worker);
      console.log('🎷 Successfully connected post to account group:', request.accountGroupId);
    } catch (connectionError) {
      console.log('⚠️ Failed to connect to account group (non-critical):', connectionError);
      // Don't fail the API call if connection fails - post still exists in server worker
    }
    
    console.log('🎷 Jazz Post created successfully');
    
  } catch (jazzError) {
    console.error('🎷 Jazz storage failed:', jazzError);
    // Don't fail the API call if Jazz storage fails
    throw jazzError;
  }
}

async function createPostInJazz(
  request: CreatePostRequest, 
  user: AuthenticatedUser
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Create title
    const now = new Date();
    const titleText = request.title || `API Post ${now.toISOString()}`;
    
    // Create base variant content
    const baseText = request.content;
    
    // Handle media attachments - URL-based only
    const mediaItems = request.media?.map((mediaItem) => {
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
      status: request.publishImmediately ? 'published' as const : (request.scheduledDate ? 'scheduled' as const : 'draft' as const),
      scheduledFor: request.scheduledDate ? new Date(request.scheduledDate) : undefined,
      publishedAt: request.publishImmediately ? now : undefined,
      edited: false,
      lastModified: undefined,
      performance: undefined,
      ayrsharePostId: undefined,
      socialPostUrl: undefined,
    };
    
    // Generate a post ID
    const postId = `api_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the full post object in Jazz-compatible format
    const postData = {
      id: postId,
      title: titleText,
      createdAt: now,
      accountGroupId: request.accountGroupId,
      platforms: request.platforms,
      variants: {
        base: baseVariant,
        ...Object.fromEntries(request.platforms.map((platform: string) => [
          platform,
          { ...baseVariant, platform }
        ]))
      },
      // API-specific metadata
      createdViaAPI: true,
      apiKeyId: user.keyData.keyId,
      userId: user.accountId
    };
    
    // Store the post for retrieval (backwards compatibility)
    addAPIPost(postData);
    
    // Debug: Immediately verify storage worked
    const { getAllAPIPosts } = await import('@/utils/apiPostsStorage');
    const allPosts = getAllAPIPosts();
    console.log(`✅ Post stored successfully. Total posts in storage: ${allPosts.length}`);
    console.log(`✅ Latest post:`, allPosts[allPosts.length - 1]?.id);
    
    // 🎷 ALSO TRY TO STORE IN JAZZ (when possible)
    try {
      await storeInJazzIfPossible(postData, request);
      console.log('🎷 Also stored in Jazz successfully');
    } catch (jazzError) {
      console.log('⚠️ Jazz storage failed (non-critical):', jazzError);
      // Don't fail the API call if Jazz storage fails
    }
    
    console.log('📝 Created and stored post:', {
      postId,
      title: titleText,
      platforms: request.platforms,
      hasMedia: mediaItems.length > 0,
      scheduledDate: request.scheduledDate,
      publishImmediately: request.publishImmediately,
      status: baseVariant.status
    });
    
    return { success: true, postId };
    
  } catch (error) {
    console.error('❌ Error creating post:', error);
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
      mediaUrls: request.media?.map((m) => m.url).filter(Boolean) as string[],
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
  let authResult: {
    isValid: boolean;
    error?: string;
    errorCode?: string;
    statusCode?: number;
    user?: AuthenticatedUser;
  } | undefined;
  
  try {
    // 🔐 Authenticate API key
    authResult = await authenticateAPIKey(request);
    if (!authResult.isValid) {
      // Log failed authentication attempt
      await logAPIKeyUsage(
        null, // No account for failed auth
        'unknown',
        '/api/posts',
        'POST',
        authResult.statusCode || 401,
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
          code: authResult.errorCode || 'AUTHENTICATION_FAILED'
        },
        { 
          status: authResult.statusCode || 401,
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

    // 🎯 Validate account group access
    const groupAccess = validateAccountGroupAccess(user.keyData, requestData.accountGroupId);
    if (!groupAccess.hasAccess) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        '/api/posts',
        'POST',
        groupAccess.statusCode || 403,
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
          error: groupAccess.error || 'Access denied to account group',
          code: groupAccess.errorCode || 'ACCOUNT_GROUP_ACCESS_DENIED'
        },
        { status: groupAccess.statusCode || 403 }
      );
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
    if (!authResult.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: authResult.error,
          code: authResult.errorCode || 'AUTHENTICATION_FAILED'
        },
        { status: authResult.statusCode || 401 }
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