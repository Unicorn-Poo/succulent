import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// 🔄 API POSTS SYNC ENDPOINT
// =============================================================================

/**
 * POST /api/sync-api-posts - Sync API posts into user's Jazz account group
 * This endpoint is called by the UI to integrate API posts into Jazz
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId, apiPosts } = body;
    
    console.log('🔄 Syncing API posts to Jazz account group:', accountGroupId);
    console.log('📝 Posts to sync:', apiPosts?.length || 0);
    
    if (!accountGroupId || !apiPosts || !Array.isArray(apiPosts)) {
      return NextResponse.json(
        { success: false, error: 'Missing accountGroupId or apiPosts array' },
        { status: 400 }
      );
    }
    
    // This endpoint is designed to be called from the client-side
    // where the user has access to their own account group
    // The actual sync logic will be implemented in the UI component
    
    return NextResponse.json({
      success: true,
      message: 'Sync endpoint ready - implement client-side logic',
      data: {
        accountGroupId,
        postsToSync: apiPosts.length,
        instructions: 'Call this endpoint from client-side with user context'
      }
    });

  } catch (error) {
    console.error('❌ Error in sync API posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync API posts' },
      { status: 500 }
    );
  }
} 