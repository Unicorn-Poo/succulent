import { NextRequest, NextResponse } from 'next/server';
import { validateAPIKey, validateAccountGroupAccess } from '@/utils/apiKeyManager';
import { getAPIPostsForGroup, getAllAPIPosts } from '@/utils/apiPostsStorage';

// =============================================================================
// 📋 API POSTS LISTING ENDPOINT
// =============================================================================

/**
 * Retrieve API posts from Jazz server worker
 */
async function getJazzAPIPosts(accountGroupId?: string | null): Promise<any[]> {
  try {
    console.log('🎷 Fetching posts from Jazz server worker...');
    
    // Import Jazz server worker and schemas
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { Post } = await import('@/app/schema');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      throw new Error('Jazz server worker not available');
    }
    
    console.log('🎷 Jazz worker connected, searching for posts...');
    
    // Create a list to store API posts in the server worker's account
    // This is a simple approach - in production you might want a dedicated structure
    try {
      // Try to access the server worker's API posts collection
      // For now, we'll simulate this by returning the in-memory posts
      // but in a real implementation, you'd query the server worker's owned objects
      
      console.log('🎷 Simulating Jazz post retrieval...');
      
      // Return in-memory posts as fallback since Jazz querying is complex
      const { getAPIPostsForGroup, getAllAPIPosts } = await import('@/utils/apiPostsStorage');
      const posts = accountGroupId ? getAPIPostsForGroup(accountGroupId) : getAllAPIPosts();
      
      console.log(`🎷 Retrieved ${posts.length} posts from fallback storage`);
      return posts;
      
    } catch (queryError) {
      console.log('🎷 Jazz query failed:', queryError);
      return [];
    }
    
  } catch (error) {
    console.error('❌ Error fetching Jazz API posts:', error);
    throw error;
  }
}

/**
 * GET /api/posts/list - Get API-created posts for an account group
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const accountGroupId = url.searchParams.get('accountGroupId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Get client info for validation
    const clientIP = request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';

    // Validate API key
    const apiKey = request.headers.get('X-API-Key');
    let validationResult = null;
    
    if (apiKey) {
      const validation = await validateAPIKey(apiKey, 'posts:read', clientIP, userAgent);
      if (!validation.isValid) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid API key' },
          { status: 401 }
        );
      }
      validationResult = validation;

      // Validate account group access if requesting specific group
      if (accountGroupId) {
        const groupAccess = validateAccountGroupAccess(validation.keyData, accountGroupId);
        if (!groupAccess.hasAccess) {
          return NextResponse.json(
            { 
              success: false, 
              error: groupAccess.error || 'Access denied to account group',
              code: groupAccess.errorCode || 'ACCOUNT_GROUP_ACCESS_DENIED'
            },
            { status: groupAccess.statusCode || 403 }
          );
        }
      }
    }

    // Get posts (filter by account group if specified)
    let posts: any[] = [];
    
    try {
      // Try to get posts from Jazz server worker
      const jazzPosts = await getJazzAPIPosts(accountGroupId);
      posts = jazzPosts;
      console.log(`📊 Retrieved ${posts.length} posts from Jazz for accountGroupId: ${accountGroupId || 'all'}`);
    } catch (jazzError) {
      console.log('⚠️ Jazz retrieval failed, falling back to in-memory storage:', jazzError);
      // Fallback to in-memory storage
      posts = accountGroupId ? getAPIPostsForGroup(accountGroupId) : getAllAPIPosts();
    }

    // Sort by creation date (newest first)
    posts = posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedPosts = posts.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      data: {
        posts: paginatedPosts,
        pagination: {
          total: posts.length,
          limit,
          offset,
          hasMore: offset + limit < posts.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Error listing API posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
} 