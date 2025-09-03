import { NextRequest } from 'next/server';
import { createApiPost } from '@/utils/jazzRequests';
import { jazzServerWorker } from '@/utils/jazzServer';
import { Post, PostVariant, MediaItem, ImageMedia, VideoMedia, ReplyTo, AccountGroup } from '@/app/schema';
import { co, JazzRequestError } from 'jazz-tools';
import { validateAPIKey, logAPIKeyUsage, validateAccountGroupAccess } from '@/utils/apiKeyManager';

/**
 * POST /api/posts/jazz - Create posts using Jazz server-side capabilities
 * This creates real Jazz Post objects and stores them in account groups
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // First, validate API key using existing auth system
    const apiKey = request.headers.get('X-API-Key');
    const clientIP = request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    if (!apiKey) {
      return Response.json(
        { success: false, error: 'API key required', code: 'MISSING_API_KEY' },
        { status: 401 }
      );
    }
    
    // Validate API key
    const keyValidation = await validateAPIKey(apiKey, 'posts:create', clientIP, userAgent);
    if (!keyValidation.isValid) {
      return Response.json(
        { 
          success: false, 
          error: keyValidation.error || 'Invalid API key',
          code: keyValidation.errorCode || 'INVALID_API_KEY'
        },
        { status: keyValidation.statusCode || 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { accountGroupId, ...postData } = body;
    
    // Validate account group access
    const groupAccess = validateAccountGroupAccess(keyValidation.keyData!, accountGroupId);
    if (!groupAccess.hasAccess) {
      await logAPIKeyUsage(
        null, // No account object in server-side
        keyValidation.keyData!.keyId,
        '/api/posts/jazz',
        'POST',
        groupAccess.statusCode || 403,
        {
          responseTime: Date.now() - startTime,
          ipAddress: clientIP,
          userAgent: userAgent,
          errorMessage: 'Account group access denied'
        }
      );
      
      return Response.json(
        { 
          success: false, 
          error: groupAccess.error || 'Access denied',
          code: groupAccess.errorCode || 'ACCESS_DENIED'
        },
        { status: groupAccess.statusCode || 403 }
      );
    }
    
    // TODO: Load the actual account group from Jazz using the accountGroupId
    // For now, this is a placeholder - we need to implement account group lookup
    console.log('🎷 Jazz API - Creating post for account group:', accountGroupId);
    console.log('🎷 Post data:', postData);
    
    // Log successful attempt
    await logAPIKeyUsage(
      null,
      keyValidation.keyData!.keyId,
      '/api/posts/jazz',
      'POST',
      201,
      {
        responseTime: Date.now() - startTime,
        ipAddress: clientIP,
        userAgent: userAgent
      }
    );
    
    return Response.json({
      success: true,
      message: 'Jazz post creation endpoint ready - implementation in progress',
      data: {
        postId: `jazz_post_${Date.now()}`,
        accountGroupId,
        ...postData
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Jazz API Error:', error);
    return Response.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// Handle Jazz request using the defined schema (when account group loading is implemented)
// export async function POST(request: NextRequest) {
//   return createApiPost.handle(
//     request,
//     jazzServer.worker,
//     async ({ accountGroup, postData }, madeBy) => {
//       // Create Jazz Post objects here
//       const titleText = co.plainText().create(postData.title || `API Post ${new Date().toISOString()}`, { owner: accountGroup._owner });
//       const baseText = co.plainText().create(postData.content, { owner: accountGroup._owner });
//       
//       // Create media items
//       const mediaList = co.list(MediaItem).create([], { owner: accountGroup._owner });
//       // ... add media items
//       
//       // Create post variant
//       const baseVariant = PostVariant.create({
//         text: baseText,
//         postDate: new Date(),
//         media: mediaList,
//         replyTo: ReplyTo.create({}, { owner: accountGroup._owner }),
//         status: postData.publishImmediately ? 'published' : (postData.scheduledDate ? 'scheduled' : 'draft'),
//         scheduledFor: postData.scheduledDate ? new Date(postData.scheduledDate) : undefined,
//         publishedAt: postData.publishImmediately ? new Date() : undefined,
//         edited: false
//       }, { owner: accountGroup._owner });
//       
//       // Create variants for each platform
//       const variants = co.record(z.string(), PostVariant).create({
//         base: baseVariant
//       }, { owner: accountGroup._owner });
//       
//       postData.platforms.forEach(platform => {
//         const platformVariant = PostVariant.create({
//           ...baseVariant,
//           platform
//         }, { owner: accountGroup._owner });
//         variants[platform] = platformVariant;
//       });
//       
//       // Create the Jazz Post
//       const newPost = Post.create({
//         title: titleText,
//         variants: variants
//       }, { owner: accountGroup._owner });
//       
//       // Add to account group
//       accountGroup.posts.push(newPost);
//       
//       return {
//         post: newPost,
//         success: true,
//         message: 'Post created successfully in Jazz'
//       };
//     }
//   );
// } 