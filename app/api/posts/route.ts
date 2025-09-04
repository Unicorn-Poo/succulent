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
// Removed workaround storage imports - using proper Jazz integration

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
 * Add a server-created post to the user's account group
 */
async function addPostToUserAccountGroup(jazzPost: any, accountGroupId: string): Promise<void> {
  const { jazzServerWorker } = await import('@/utils/jazzServer');
  const { MyAppAccount, AccountGroup } = await import('@/app/schema');
  const worker = await jazzServerWorker;
  
  if (!worker) {
    throw new Error('Jazz worker not available');
  }

  const accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
  
  if (!accountGroup) {
    throw new Error(`Account group ${accountGroupId} not found`);
  }
  
  if (!accountGroup.posts) {
    const { co } = await import('jazz-tools');
    const { Post } = await import('@/app/schema');
    accountGroup.posts = co.list(Post).create([], { owner: accountGroup._owner });
  }
  
  accountGroup.posts.push(jazzPost);
}

/**
 * Create Jazz post directly in user's account group using server worker credentials
 */
async function createJazzPostInAccountGroup(
  postData: any,
  request: CreatePostRequest,
  user: AuthenticatedUser
): Promise<any | null> {
  try {
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      throw new Error('Jazz server worker not available - check credentials in .env.local');
    }
    
    const { AccountGroup, Post, PostVariant, MediaItem, ReplyTo } = await import('@/app/schema');
    const { co, z, Group } = await import('jazz-tools');
    
    const accountGroup = await AccountGroup.load(request.accountGroupId, { 
      loadAs: worker,
      resolve: {
        posts: true // Load existing posts list
      }
    });
    if (!accountGroup) {
      throw new Error(`Account group ${request.accountGroupId} not found`);
    }

    // Ensure server worker has proper permissions on account group
    if (accountGroup._owner instanceof Group) {
      try {
        accountGroup._owner.addMember(worker, 'writer');
      } catch (permError) {
        // Worker might already be a member, continue
      }
    }
    
    // Create all objects owned by the account group (not server worker)
    const groupOwner = accountGroup._owner;
    
    const titleText = co.plainText().create(
      postData.title || `API Post ${new Date().toISOString()}`,
      { owner: groupOwner }
    );
    
    const baseText = co.plainText().create(request.content, { owner: groupOwner });
    const mediaList = co.list(MediaItem).create([], { owner: groupOwner });
    
    // Handle URL-based media for API posts
    if (request.media && request.media.length > 0) {
      const { URLImageMedia, URLVideoMedia } = await import('@/app/schema');
      
      for (const mediaItem of request.media) {
        try {
          if (mediaItem.type === 'image') {
            const altText = co.plainText().create(mediaItem.alt || '', { owner: groupOwner });
            
            const urlImageMedia = URLImageMedia.create({
              type: 'url-image',
              url: mediaItem.url,
              alt: altText,
              filename: mediaItem.filename
            }, { owner: groupOwner });
            
            mediaList.push(urlImageMedia);
            
          } else if (mediaItem.type === 'video') {
            const altText = co.plainText().create(mediaItem.alt || '', { owner: groupOwner });
            
            const urlVideoMedia = URLVideoMedia.create({
              type: 'url-video',
              url: mediaItem.url,
              alt: altText,
              filename: mediaItem.filename
            }, { owner: groupOwner });
             
             mediaList.push(urlVideoMedia);
           }
        } catch (mediaError) {
          console.error('❌ Failed to create URL media item:', mediaError);
        }
      }
    }
    
    const replyToObj = ReplyTo.create({
      url: request.replyTo?.url,
      platform: request.replyTo?.platform,
      author: undefined,
      authorUsername: undefined,
      authorPostContent: undefined,
      authorAvatar: undefined,
      likesCount: undefined,
    }, { owner: groupOwner });
    
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
    }, { owner: groupOwner });
    
    const variants = co.record(z.string(), PostVariant).create({ base: baseVariant }, { owner: groupOwner });
    
    for (const platform of request.platforms) {
      const platformVariant = PostVariant.create({
        text: baseVariant.text,
        postDate: baseVariant.postDate,
        media: mediaList, // Use the same media list for all variants
        replyTo: baseVariant.replyTo,
        status: baseVariant.status,
        scheduledFor: baseVariant.scheduledFor,
        publishedAt: baseVariant.publishedAt,
        edited: baseVariant.edited,
        lastModified: baseVariant.lastModified,
        performance: baseVariant.performance,
        ayrsharePostId: baseVariant.ayrsharePostId,
        socialPostUrl: baseVariant.socialPostUrl,
      }, { owner: groupOwner });
      variants[platform] = platformVariant;
    }
    
    const jazzPost = Post.create({
      title: titleText,
      variants: variants,
    }, { owner: groupOwner });
    
    // Ensure posts list exists and add the post
    if (!accountGroup.posts) {
      const { co } = await import('jazz-tools');
      accountGroup.posts = co.list(Post).create([], { owner: groupOwner });
    }
    accountGroup.posts.push(jazzPost);
    
    return jazzPost;
    
  } catch (error) {
    console.error('❌ Failed to create Jazz post in account group:', error);
    throw error;
  }
}

// Removed old storeInJazzIfPossible function - using proper Jazz integration

async function createPostInJazz(
  request: CreatePostRequest, 
  user: AuthenticatedUser
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const now = new Date();
    const postData = {
      title: request.title || `API Post ${now.toISOString()}`,
      content: request.content,
      platforms: request.platforms,
      createdAt: now,
      accountGroupId: request.accountGroupId,
      createdViaAPI: true,
      apiKeyId: user.keyData.keyId,
      userId: user.accountId
    };
    
    const jazzPost = await createJazzPostInAccountGroup(postData, request, user);
    
    if (jazzPost) {
      return { success: true, postId: jazzPost.id };
    } else {
      throw new Error('Jazz post creation failed');
    }
    
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
      
      // Log the incoming API request
      console.log('📨 Incoming API POST request:', {
        url: request.url,
        method: request.method,
        headers: {
          'Content-Type': request.headers.get('Content-Type'),
          'X-API-Key': request.headers.get('X-API-Key')?.substring(0, 10) + '...',
        },
        body: JSON.stringify(body, null, 2)
      });
      
      requestData = CreatePostSchema.parse(body);
      
      // Log the parsed and validated data
      console.log('✅ Parsed API request data:', {
        accountGroupId: requestData.accountGroupId,
        title: requestData.title,
        content: requestData.content?.substring(0, 100) + '...',
        platforms: requestData.platforms,
        hasMedia: !!(requestData.media && requestData.media.length > 0),
        mediaCount: requestData.media?.length || 0,
        media: requestData.media?.map(m => ({
          type: m.type,
          url: m.url,
          alt: m.alt,
          filename: m.filename
        })) || [],
        scheduledDate: requestData.scheduledDate,
        publishImmediately: requestData.publishImmediately
      });
      
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
    
    const redirectUrl = new URL('/api/posts/list', request.url);
    redirectUrl.searchParams.set('accountGroupId', accountGroupId);
    
    return NextResponse.redirect(redirectUrl, 301);
    
  } catch (error) {
    console.error('❌ Error redirecting to posts list:', error);
    
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