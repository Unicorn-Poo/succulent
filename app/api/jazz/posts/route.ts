import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/jazz/posts - List Jazz posts created by the server worker
 * This helps debug if Jazz post creation is working
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Listing Jazz posts from server worker...');
    
    // Import Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz server worker not configured. Set JAZZ_WORKER_ACCOUNT and JAZZ_WORKER_SECRET environment variables.'
      }, { status: 503 });
    }
    
    console.log('🎷 Worker account ID:', worker.id);
    console.log('🎷 Worker root ID:', worker.root?.id);
    
    // Try to access worker root and see what's stored
    const rootInfo = {
      hasRoot: !!worker.root,
      rootId: worker.root?.id,
      rootKeys: worker.root ? Object.keys(worker.root) : []
    };
    
    // Check account groups in worker root
    let accountGroupsInfo = null;
    if (worker.root?.accountGroups) {
      try {
        const accountGroups = Array.from(worker.root.accountGroups || []);
        accountGroupsInfo = {
          count: accountGroups.length,
          groups: accountGroups.map((group: any) => ({
            id: group?.id,
            name: group?.name?.toString(),
            postsCount: group?.posts ? Array.from(group.posts).length : 0
          }))
        };
      } catch (error) {
        accountGroupsInfo = { error: 'Could not access account groups', message: String(error) };
      }
    }
    
    console.log('🎷 Worker root info:', rootInfo);
    console.log('🎷 Account groups info:', accountGroupsInfo);
    
    return NextResponse.json({
      success: true,
      message: 'Jazz worker debug info with account groups',
      worker: {
        accountId: worker.id,
        profileName: worker.profile?.name?.toString(),
        root: rootInfo
      },
      accountGroups: accountGroupsInfo,
      note: 'Exploring Jazz server worker account groups and posts'
    });
    
  } catch (error) {
    console.error('❌ Jazz posts debug failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 