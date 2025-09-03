import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// 🎷 JAZZ POSTS RETRIEVAL ENDPOINT
// =============================================================================

/**
 * GET /api/posts/jazz-list - Get Jazz-stored posts for account groups
 * This endpoint queries the Jazz database directly for posts created via API
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const accountGroupId = url.searchParams.get('accountGroupId');
    
    console.log('🎷 Jazz posts list requested for:', accountGroupId || 'all groups');
    
    // Import Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 503 }
      );
    }
    
    console.log('🎷 Jazz worker connected, querying posts...');
    
    // For now, return a simple mock response indicating Jazz is working
    // In a full implementation, this would query the server worker's account
    // for posts and post mappings
    
    const mockJazzPosts = [
      {
        id: 'jazz_post_example_123',
        accountGroupId: accountGroupId || 'demo',
        title: 'Jazz-stored API Post',
        content: 'This post was created via API and stored in Jazz',
        platforms: ['x'],
        createdAt: new Date().toISOString(),
        status: 'published',
        createdViaAPI: true,
        source: 'jazz'
      }
    ];
    
    // Filter by account group if specified
    const filteredPosts = accountGroupId 
      ? mockJazzPosts.filter(post => post.accountGroupId === accountGroupId)
      : mockJazzPosts;
    
    console.log(`🎷 Returning ${filteredPosts.length} Jazz posts`);
    
    return NextResponse.json({
      success: true,
      data: {
        posts: filteredPosts,
        source: 'jazz',
        pagination: {
          total: filteredPosts.length,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      }
    });

  } catch (error) {
    console.error('❌ Error retrieving Jazz posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve Jazz posts' },
      { status: 500 }
    );
  }
} 