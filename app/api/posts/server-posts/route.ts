import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// 🎷 SERVER JAZZ POSTS RETRIEVAL
// =============================================================================

/**
 * GET /api/posts/server-posts - Get Jazz posts from server worker account
 * This endpoint retrieves posts created by the API and stored in the server worker
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const accountGroupId = url.searchParams.get('accountGroupId');
    
    console.log('🎷 Fetching server Jazz posts for account group:', accountGroupId);
    
    // Import Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 503 }
      );
    }
    
    console.log('🎷 Server worker ready:', worker.id);
    
    // Import Jazz schemas
    const { Post } = await import('@/app/schema');
    
    // Query posts from the server worker's account
    // This is a simplified approach - in production you'd want more sophisticated querying
    
    try {
      // For now, return a mock response indicating the server posts exist
      // TODO: Implement proper Jazz post querying from server worker account
      
      const mockServerPosts = [
        {
          id: 'server_post_example',
          title: 'Server Jazz Post',
          content: 'This post was created via API and stored in Jazz server worker',
          accountGroupId: accountGroupId || 'demo',
          platforms: ['x'],
          createdAt: new Date().toISOString(),
          status: 'draft',
          createdViaAPI: true,
          source: 'server-worker'
        }
      ];
      
      const filteredPosts = accountGroupId 
        ? mockServerPosts.filter(post => post.accountGroupId === accountGroupId)
        : mockServerPosts;
      
      console.log(`🎷 Returning ${filteredPosts.length} server Jazz posts`);
      
      return NextResponse.json({
        success: true,
        data: {
          posts: filteredPosts,
          source: 'server-worker',
          workerAccount: worker.id,
          pagination: {
            total: filteredPosts.length,
            limit: 20,
            offset: 0,
            hasMore: false
          }
        }
      });
      
    } catch (queryError) {
      console.error('❌ Error querying server Jazz posts:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to query server posts' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in server posts endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
} 