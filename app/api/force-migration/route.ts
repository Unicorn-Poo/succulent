import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, accountGroupId } = await request.json();
    
    if (!process.env.JAZZ_WORKER_ACCOUNT) {
      return NextResponse.json(
        { success: false, error: 'JAZZ_WORKER_ACCOUNT not configured' },
        { status: 503 }
      );
    }

    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup, Post } = await import('@/app/schema');
    const { co } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz server worker not available'
      }, { status: 503 });
    }

    if (action === 'clear_posts' && accountGroupId) {
      const accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
      if (!accountGroup) {
        return NextResponse.json({
          success: false,
          error: 'Account group not found'
        }, { status: 404 });
      }

      // Clear all posts and create a fresh list
      const newPostsList = co.list(Post).create([], { owner: accountGroup._owner });
      accountGroup.posts = newPostsList;

      return NextResponse.json({
        success: true,
        message: 'Posts cleared successfully',
        accountGroupId,
        newPostsListId: newPostsList.id
      });
    }

    return NextResponse.json({
      success: true,
      message: 'To add server worker permissions:',
      instructions: [
        '1. Log out of your Jazz account in the browser',
        '2. Log back in (this will trigger account migration)',
        '3. The migration will automatically add server worker permissions',
        '4. Then API posts will appear in your account groups'
      ],
      serverWorker: {
        id: worker.id,
        name: worker.profile?.name?.toString() || 'My Server Worker'
      },
      nextSteps: 'After re-login, create an API post and it should appear in the UI'
    });

  } catch (error) {
    console.error('❌ Force migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
} 