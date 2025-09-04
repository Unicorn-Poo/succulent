import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const accountGroupId = url.searchParams.get('accountGroupId');
    
    if (!accountGroupId) {
      return NextResponse.json({
        success: false,
        error: 'accountGroupId parameter required'
      }, { status: 400 });
    }

    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup } = await import('@/app/schema');
    const { Group } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz server worker not available'
      }, { status: 503 });
    }

    const accountGroup = await AccountGroup.load(accountGroupId, { 
      loadAs: worker,
      resolve: {
        posts: { $each: {
          variants: { $each: true }
        }}
      }
    });
    
    if (!accountGroup) {
      return NextResponse.json({
        success: false,
        error: 'Account group not found or no permissions'
      }, { status: 404 });
    }

    const ownerInfo = accountGroup._owner instanceof Group ? {
      type: 'Group',
      id: accountGroup._owner.id,
      members: Array.from(accountGroup._owner.members || []).map((member: any) => ({
        id: member?.id,
        role: member?.role
      }))
    } : {
      type: 'Account',
      id: accountGroup._owner?.id
    };

    const postsInfo = accountGroup.posts ? {
      count: Array.from(accountGroup.posts).length,
      posts: Array.from(accountGroup.posts).map((post: any) => ({
        id: post?.id,
        title: post?.title?.toString(),
        hasVariants: !!post?.variants,
        variantKeys: post?.variants ? Object.keys(post.variants) : []
      }))
    } : { count: 0, posts: [] };

    return NextResponse.json({
      success: true,
      debug: {
        accountGroup: {
          id: accountGroup.id,
          name: accountGroup.name,
          owner: ownerInfo,
          posts: postsInfo
        },
        serverWorker: {
          id: worker.id,
          hasPermissions: accountGroup._owner instanceof Group ? 
            Array.from(accountGroup._owner.members || []).some((m: any) => m?.id === worker.id) : false
        }
      }
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
} 