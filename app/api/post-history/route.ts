import { NextRequest, NextResponse } from 'next/server';
import { fetchPostHistory, importPostHistoryForAccountGroup, importAyrsharePostsToAccountGroup } from '@/utils/postPerformance';

// =============================================================================
// 📜 POST HISTORY API ENDPOINT
// =============================================================================

/**
 * GET /api/post-history
 * Fetch historical post data for linked accounts
 * 
 * Query Parameters:
 * - profileKey: Ayrshare profile key (optional)
 * - platforms: Comma-separated list of platforms (optional)
 * - limit: Number of posts to fetch (default: 50, max: 200)
 * - lastDays: Number of days to look back (0 = all history)
 * - status: Post status filter ('success', 'pending', 'error')
 * - import: Whether to import posts into account group ('true'/'false')
 * - accountGroupId: Account group ID for importing (required if import=true)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const profileKey = searchParams.get('profileKey') || undefined;
    const platformsParam = searchParams.get('platforms');
    const limitParam = searchParams.get('limit');
    const lastDaysParam = searchParams.get('lastDays');
    const status = searchParams.get('status') || undefined;
    const shouldImport = searchParams.get('import') === 'true';
    const accountGroupId = searchParams.get('accountGroupId');

    // Parse and validate parameters
    const platforms = platformsParam ? platformsParam.split(',').map(p => p.trim()) : undefined;
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 200) : 50;
    const lastDays = lastDaysParam ? parseInt(lastDaysParam, 10) : 0;

    // Validate required parameters for import
    if (shouldImport && !accountGroupId) {
      return NextResponse.json(
        { error: 'accountGroupId is required when import=true' },
        { status: 400 }
      );
    }



    // Fetch post history from Ayrshare
    console.log('🔍 Fetching post history with params:', {
      profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
      platforms,
      limit,
      lastDays,
      status
    });

    let historyResponse;
    try {
      historyResponse = await fetchPostHistory(profileKey, {
        limit,
        platforms,
        lastDays,
        status
      });
    } catch (error) {
      console.error('❌ Failed to fetch from Ayrshare:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch post history from Ayrshare',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!historyResponse) {
      return NextResponse.json(
        { error: 'No response from Ayrshare API' },
        { status: 500 }
      );
    }

    // If import is requested, handle the import process
    let importResult = null;
    if (shouldImport && accountGroupId && historyResponse.history.length > 0) {
      try {
        // Import posts to Jazz AccountGroup
        importResult = await importAyrsharePostsToAccountGroup(
          accountGroupId,
          historyResponse.history,
          profileKey || undefined
        );
      } catch (error) {
        console.error('❌ Failed to import posts to Jazz:', error);
        importResult = {
          error: 'Failed to import posts to Jazz',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Format response data
    const formattedPosts = historyResponse.history.map(post => ({
      id: post.id,
      content: post.post,
      platforms: post.platforms,
      status: post.status,
      created: post.created,
      postIds: post.postIds.map(postId => ({
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
        profileKey: profileKey ? 'provided' : 'not_provided',
        platforms: platforms || 'all',
        limit,
        lastDays,
        status: status || 'all',
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching post history:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch post history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/post-history
 * Import historical posts into an account group
 * 
 * Body:
 * - accountGroupId: Account group ID (required)
 * - profileKey: Ayrshare profile key (optional)
 * - options: Import options (limit, lastDays, platforms)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId, profileKey, options = {} } = body;

    if (!accountGroupId) {
      return NextResponse.json(
        { error: 'accountGroupId is required' },
        { status: 400 }
      );
    }



    // Note: In a real implementation, you'd:
    // 1. Fetch the account group from your database/Jazz
    // 2. Call importPostHistoryForAccountGroup with the actual account group object
    
    // For now, return a structured response about what would happen
    const historyResponse = await fetchPostHistory(profileKey, options);
    
    if (!historyResponse) {
      return NextResponse.json(
        { error: 'Failed to fetch post history for import' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Import simulation completed',
      data: {
        accountGroupId,
        postsAvailable: historyResponse.history.length,
        postsToImport: historyResponse.history.filter(p => p.status === 'success').length,
        platforms: [...new Set(historyResponse.history.flatMap(p => p.platforms))],
        dateRange: {
          oldest: historyResponse.history.length > 0 ? 
            Math.min(...historyResponse.history.map(p => new Date(p.created).getTime())) : null,
          newest: historyResponse.history.length > 0 ? 
            Math.max(...historyResponse.history.map(p => new Date(p.created).getTime())) : null
        }
      },
      note: 'To complete the import, integrate with your Jazz/database layer using importPostHistoryForAccountGroup()'
    });

  } catch (error) {
    console.error('❌ Error importing post history:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to import post history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 