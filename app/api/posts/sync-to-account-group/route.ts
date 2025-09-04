import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// 🔄 SYNC SERVER POSTS TO USER ACCOUNT GROUP
// =============================================================================

/**
 * POST /api/posts/sync-to-account-group
 * Called by the UI to sync server-created API posts into user's account group
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId, userAccountId } = body;
    
    console.log('🔄 Syncing server posts to user account group:', { accountGroupId, userAccountId });
    
    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'Missing accountGroupId' },
        { status: 400 }
      );
    }
    
    // Import Jazz server worker and schemas
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup, Post } = await import('@/app/schema');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 503 }
      );
    }
    
    try {
      // Load the target account group
      console.log('🔍 Loading account group:', accountGroupId);
      const accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
      
      if (!accountGroup) {
        return NextResponse.json(
          { success: false, error: 'Account group not found' },
          { status: 404 }
        );
      }
      
      console.log('✅ Account group loaded:', accountGroup.id);
      
      // TODO: Query server worker for posts that belong to this account group
      // For now, return success indicating the sync endpoint is working
      
      return NextResponse.json({
        success: true,
        message: 'Sync endpoint ready',
        data: {
          accountGroupId,
          accountGroupExists: true,
          serverWorkerAccount: worker.id
        }
      });
      
    } catch (loadError) {
      console.error('❌ Failed to load account group:', loadError);
      return NextResponse.json(
        { success: false, error: 'Failed to load account group' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error in sync endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 