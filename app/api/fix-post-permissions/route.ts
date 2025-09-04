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
    const { AccountGroup, Post, PostVariant } = await import('@/app/schema');
    const { Group, Account } = await import('jazz-tools');
    
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
          variants: { $each: {
            text: true,
            media: { $each: true },
            replyTo: true
          }}
        }}
      }
    });
    
    if (!accountGroup) {
      return NextResponse.json({
        success: false,
        error: 'Account group not found'
      }, { status: 404 });
    }

    // Ensure server worker has permissions on account group
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
        message: 'No posts to fix',
        fixed: 0
      });
    }

    let fixedCount = 0;
    const postsArray = Array.from(accountGroup.posts).filter(post => post != null);
    
    for (const post of postsArray) {
      try {
        // Check if user can access this post
        const userAccount = await Account.load('co_zd7E1euyyaLfiZWMCcXYAckFVUz');
        if (!userAccount || !post) continue;
        
        const canAccess = userAccount.canRead(post);
        if (canAccess) {
          continue; // Post is already accessible
        }

        // Post has permission issues - need to transfer ownership
        // Since we can't change ownership of existing objects, we'll recreate the post
        // with proper ownership and replace it in the list
        
        const { co, z } = await import('jazz-tools');
        const { PostVariant, MediaItem, ReplyTo } = await import('@/app/schema');
        
        const groupOwner = accountGroup._owner;
        
        // Create new post objects with correct ownership
        const titleText = co.plainText().create(
          post.title?.toString() || 'Migrated Post',
          { owner: groupOwner }
        );
        
        // Recreate variants with proper ownership
        const newVariants = co.record(z.string(), PostVariant).create({}, { owner: groupOwner });
        
        if (post.variants) {
          for (const [variantKey, variant] of Object.entries(post.variants)) {
            if (variant && typeof variant === 'object') {
              const baseText = co.plainText().create(
                variant.text?.toString() || '',
                { owner: groupOwner }
              );
              
              const mediaList = co.list(MediaItem).create([], { owner: groupOwner });
              
              const replyToObj = ReplyTo.create({
                url: variant.replyTo?.url,
                platform: variant.replyTo?.platform,
                author: variant.replyTo?.author,
                authorUsername: variant.replyTo?.authorUsername,
                authorPostContent: variant.replyTo?.authorPostContent,
                authorAvatar: variant.replyTo?.authorAvatar,
                likesCount: variant.replyTo?.likesCount,
              }, { owner: groupOwner });
              
                             const newVariant = PostVariant.create({
                 text: baseText,
                 postDate: variant.postDate || new Date(),
                 media: mediaList,
                 replyTo: replyToObj,
                 status: variant.status || 'draft',
                 scheduledFor: variant.scheduledFor,
                 publishedAt: variant.publishedAt,
                 edited: variant.edited || false,
                 lastModified: variant.lastModified,
                 performance: variant.performance || undefined,
                 ayrsharePostId: variant.ayrsharePostId,
                 socialPostUrl: variant.socialPostUrl,
               }, { owner: groupOwner });
              
              newVariants[variantKey] = newVariant;
            }
          }
        }
        
        const newPost = Post.create({
          title: titleText,
          variants: newVariants,
        }, { owner: groupOwner });
        
        // Replace the old post with the new one
        const postIndex = accountGroup.posts.indexOf(post);
        if (postIndex >= 0) {
          accountGroup.posts[postIndex] = newPost;
          fixedCount++;
        }
        
      } catch (postError) {
        console.error('❌ Failed to fix post permissions:', postError);
        // Continue with other posts
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed permissions for ${fixedCount} posts`,
      fixed: fixedCount,
      total: postsArray.length
    });

  } catch (error) {
    console.error('❌ Error fixing post permissions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix permissions'
    }, { status: 500 });
  }
} 