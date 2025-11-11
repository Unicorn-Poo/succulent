import { NextRequest, NextResponse } from 'next/server';
import { fetchPlatformPostHistory } from '@/utils/postPerformance';

// =============================================================================
// 📜 PLATFORM-SPECIFIC POST HISTORY API ENDPOINT  
// =============================================================================

// Note: Jazz import functionality moved to client-side components
// where we have access to Jazz AccountGroup objects and context

// Force dynamic rendering to prevent build-time static analysis issues
export const dynamic = 'force-dynamic';

/**
 * GET /api/post-history/[platform]
 * Fetch historical post data for a specific platform using Ayrshare's platform-specific endpoint
 * This should return ALL posts ever posted on the platform, not just Ayrshare posts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const { platform } = await params;
    
    // Extract query parameters
    const profileKey = searchParams.get('profileKey');
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastDays = parseInt(searchParams.get('lastDays') || '0'); // 0 = all history
    const status = searchParams.get('status') || 'all';
    const shouldImport = searchParams.get('import') === 'true';
    const accountGroupId = searchParams.get('accountGroupId');

    console.log(`🔍 Fetching ${platform} history:`, {
      profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
      limit,
      lastDays: lastDays === 0 ? 'ALL' : lastDays,
      status,
      shouldImport,
      accountGroupId
    });

    // Fetch from Ayrshare using platform-specific endpoint
    let historyResponse;
    try {
      historyResponse = await fetchPlatformPostHistory(platform, profileKey || undefined, {
        limit,
        lastDays,
        status
      });
    } catch (error) {
      console.error(`❌ Failed to fetch ${platform} history from Ayrshare:`, error);
      return NextResponse.json(
        { 
          error: `Failed to fetch ${platform} post history from Ayrshare`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!historyResponse) {
      return NextResponse.json(
        { error: `No response from Ayrshare ${platform} API` },
        { status: 500 }
      );
    }

    // Note: Jazz import will be handled client-side where we have access to Jazz context
    // The API just fetches the data from Ayrshare
    const importResult = {
      shouldImport: shouldImport && accountGroupId && historyResponse.history.length > 0,
      postsCount: historyResponse.history.length,
      accountGroupId,
      message: shouldImport ? 'Posts ready for Jazz import on client side' : null
    };

    // Format response data - handle empty/null history
    const formattedPosts = (historyResponse.history || []).map(post => ({
      id: post.id,
      content: post.post,
      platforms: post.platforms,
      status: post.status,
      created: post.created,
      postIds: (post.postIds || []).map(postId => ({
        platform: postId.platform,
        socialId: postId.id,
        status: postId.status,
        postUrl: postId.postUrl,
        isVideo: postId.isVideo
      })),
      mediaUrls: post.mediaUrls || [],
      urls: post.urls || [],
      notes: post.notes,
      type: post.type
    }));

    return NextResponse.json({
      success: true,
      data: {
        posts: formattedPosts,
        totalCount: historyResponse.count,
        lastUpdated: historyResponse.lastUpdated,
        nextUpdate: historyResponse.nextUpdate,
        refId: historyResponse.refId
      },
      import: importResult,
      metadata: {
        platform,
        profileKey: profileKey ? 'provided' : 'not_provided',
        limit,
        lastDays,
        status,
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Platform-specific post history API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/post-history/[platform]
 * Import historical posts for a specific platform into an account group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  try {
    const body = await request.json();
    const { accountGroupId, profileKey, options = {} } = body;

    if (!accountGroupId) {
      return NextResponse.json(
        { error: 'accountGroupId is required' },
        { status: 400 }
      );
    }

    console.log(`📥 Importing ${platform} posts to Jazz:`, {
      accountGroupId,
      profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
      options
    });

    // Fetch posts first
    const historyResponse = await fetchPlatformPostHistory(platform, profileKey, {
      limit: options.limit || 100,
      lastDays: options.lastDays || 0, // 0 = all history
      status: options.status || 'all'
    });

    if (!historyResponse || !historyResponse.history) {
      return NextResponse.json({
        success: false,
        error: `No ${platform} posts found to import`,
        imported: 0
      });
    }

    // Client-side Jazz import will be handled by the component
    const importResult = {
      shouldImport: true,
      postsCount: historyResponse.history.length,
      accountGroupId,
      message: 'Posts ready for Jazz import on client side'
    };

    return NextResponse.json({
      success: true,
      imported: 0, // Will be updated by client-side import
      errors: [],
      message: importResult.message,
      totalPosts: historyResponse.history.length,
      shouldImport: importResult.shouldImport,
      postsCount: importResult.postsCount
    });

  } catch (error) {
    console.error(`❌ ${platform} import error:`, error);
    return NextResponse.json(
      { 
        error: 'Failed to import posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 