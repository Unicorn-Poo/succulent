import { NextRequest, NextResponse } from 'next/server';
import { syncPostStatusesForAccountGroup } from '../../../utils/postStatusSync';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync-post-status - Sync post statuses from Ayrshare
 * 
 * This endpoint triggers a sync of post statuses for a specific account group,
 * updating Jazz posts with the latest status from Ayrshare.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId } = body;

    if (!accountGroupId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'accountGroupId is required' 
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting post status sync for account group: ${accountGroupId}`);

    // Get Jazz server worker
    const { jazzServerWorker } = await import('../../../utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Jazz server worker not available - check server configuration' 
        },
        { status: 500 }
      );
    }

    const { AccountGroup } = await import('../../../app/schema');
    
    const accountGroup = await AccountGroup.load(accountGroupId, { 
      loadAs: worker,
      resolve: {
        posts: {
          $each: {
            title: true,
            variants: { $each: true }
          }
        }
      }
    });

    if (!accountGroup) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Account group ${accountGroupId} not found` 
        },
        { status: 404 }
      );
    }

    // Sync post statuses
    const syncResult = await syncPostStatusesForAccountGroup(accountGroup);

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        message: `Post status sync completed successfully. Updated ${syncResult.updated} posts.`,
        data: {
          updated: syncResult.updated,
          errors: syncResult.errors
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Post status sync failed. ${syncResult.errors.join(', ')}`,
        data: {
          updated: syncResult.updated,
          errors: syncResult.errors
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in post status sync endpoint:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync post statuses' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-post-status - Check sync status or trigger for specific account group
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountGroupId = searchParams.get('accountGroupId');

  if (!accountGroupId) {
    return NextResponse.json({
      success: false,
      error: 'accountGroupId query parameter is required'
    }, { status: 400 });
  }

  // For GET requests, just return info about the account group's sync status
  try {
    const { jazzServerWorker } = await import('../../../utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz server worker not available'
      }, { status: 500 });
    }

    const { AccountGroup } = await import('../../../app/schema');
    
    const accountGroup = await AccountGroup.load(accountGroupId, { 
      loadAs: worker,
      resolve: {
        posts: {
          $each: {
            title: true,
            variants: { $each: true }
          }
        }
      }
    });

    if (!accountGroup) {
      return NextResponse.json({
        success: false,
        error: `Account group ${accountGroupId} not found`
      }, { status: 404 });
    }

    // Count posts by status
    let scheduledCount = 0;
    let publishedCount = 0;
    let draftCount = 0;
    let withAyrshareId = 0;

    if (accountGroup.posts) {
      for (const post of accountGroup.posts) {
        if (!post?.variants) continue;
        
        for (const variant of Object.values(post.variants)) {
          const variantObj = variant as any;
          if (variantObj.ayrsharePostId) withAyrshareId++;
          
          switch (variantObj.status) {
            case 'scheduled': scheduledCount++; break;
            case 'published': publishedCount++; break;
            case 'draft': draftCount++; break;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        accountGroupId,
        totalPosts: accountGroup.posts?.length || 0,
        statusCounts: {
          scheduled: scheduledCount,
          published: publishedCount,
          draft: draftCount
        },
        withAyrshareId,
        lastSyncTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sync status'
    }, { status: 500 });
  }
}
