import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accountGroupId } = await request.json();
    
    if (!accountGroupId) {
      return NextResponse.json({
        success: false,
        error: 'accountGroupId is required'
      }, { status: 400 });
    }

    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup, Post } = await import('@/app/schema');
    const { Group, Account } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz server worker not available'
      }, { status: 503 });
    }

    const accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
    if (!accountGroup) {
      return NextResponse.json({
        success: false,
        error: 'Account group not found'
      }, { status: 404 });
    }

    // Ensure server worker has permissions
    if (accountGroup._owner instanceof Group) {
      try {
        accountGroup._owner.addMember(worker, 'writer');
      } catch (error) {
        // Worker might already be a member
      }
    }

    if (!accountGroup.posts) {
      return NextResponse.json({
        success: true,
        message: 'No posts to clear',
        cleared: 0
      });
    }

    const userAccount = await Account.load('co_zd7E1euyyaLfiZWMCcXYAckFVUz');
    if (!userAccount) {
      return NextResponse.json({
        success: false,
        error: 'User account not found'
      }, { status: 404 });
    }

    let clearedCount = 0;
    const postsToRemove: any[] = [];
    
    // Identify posts that the user cannot access
    for (let i = 0; i < accountGroup.posts.length; i++) {
      try {
        const post = accountGroup.posts[i];
        if (!post) {
          postsToRemove.push(i);
          continue;
        }
        
        // Try to access the post - if it throws permission error, mark for removal
        const canAccess = userAccount.canRead(post);
        if (!canAccess) {
          postsToRemove.push(i);
        }
      } catch (permissionError) {
        // Permission error means corrupted ownership
        postsToRemove.push(i);
      }
    }
    
    // Remove corrupted posts (in reverse order to maintain indices)
    for (const index of postsToRemove.reverse()) {
      try {
        accountGroup.posts.splice(index, 1);
        clearedCount++;
      } catch (removeError) {
        console.error('Failed to remove post at index', index, removeError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} corrupted posts`,
      cleared: clearedCount,
      remaining: accountGroup.posts.length
    });

  } catch (error) {
    console.error('❌ Error clearing corrupted posts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear posts'
    }, { status: 500 });
  }
} 