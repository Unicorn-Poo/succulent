/**
 * Post Status Sync Utility
 * 
 * This utility syncs post statuses from Ayrshare to Jazz posts,
 * ensuring that scheduled posts are marked as published when they go live.
 */

import { fetchPostHistory, type AyrshareHistoryPost } from './postPerformance';

interface PostStatusSyncResult {
  success: boolean;
  updated: number;
  errors: string[];
}

/**
 * Sync post statuses for an account group from Ayrshare
 * This will update Jazz posts with the latest status from Ayrshare
 */
export async function syncPostStatusesForAccountGroup(
  accountGroup: any,
  profileKey?: string
): Promise<PostStatusSyncResult> {
  const result: PostStatusSyncResult = {
    success: true,
    updated: 0,
    errors: []
  };

  try {
    if (!accountGroup.posts || accountGroup.posts.length === 0) {
      console.log('📝 No posts to sync for account group');
      return result;
    }

    // Get the profile key for API calls
    const ayrshareProfileKey = profileKey || accountGroup.ayrshareProfileKey;
    if (!ayrshareProfileKey) {
      result.errors.push('No Ayrshare profile key available');
      result.success = false;
      return result;
    }

    console.log(`🔄 Starting post status sync for ${accountGroup.posts.length} posts`);

    // Get recent post history from Ayrshare to check statuses
    const historyResult = await fetchPostHistory(ayrshareProfileKey, {
      limit: 50, // Check last 50 posts
      lastDays: 30 // Check posts from last 30 days
    });

    if (!historyResult || !historyResult.history) {
      result.errors.push('Failed to fetch Ayrshare post history');
      result.success = false;
      return result;
    }

    const ayrshareHistory = historyResult.history;
    console.log(`📊 Retrieved ${ayrshareHistory.length} posts from Ayrshare history`);

    // Create a map of ayrsharePostId to status for quick lookup
    const ayrshareStatusMap = new Map<string, { status: string; publishedAt?: Date }>();
    
    for (const ayrsharePost of ayrshareHistory) {
      if (ayrsharePost.id) {
        // Determine overall status from postIds array
        const hasSuccessfulPost = ayrsharePost.postIds.some(p => p.status === 'success');
        const hasPendingPost = ayrsharePost.postIds.some(p => p.status === 'pending');
        
        let overallStatus: string;
        if (hasSuccessfulPost) {
          overallStatus = 'published';
        } else if (hasPendingPost) {
          overallStatus = 'scheduled';
        } else {
          overallStatus = 'draft';
        }
        
        ayrshareStatusMap.set(ayrsharePost.id, {
          status: overallStatus,
          publishedAt: hasSuccessfulPost && ayrsharePost.created ? 
                      new Date(ayrsharePost.created) : undefined
        });
      }
    }

    // Update Jazz posts with current Ayrshare status
    for (const post of accountGroup.posts) {
      if (!post?.variants) continue;

      for (const [variantKey, variant] of Object.entries(post.variants)) {
        const variantObj = variant as any;
        
        if (!variantObj.ayrsharePostId) continue;

        const ayrshareStatus = ayrshareStatusMap.get(variantObj.ayrsharePostId);
        if (!ayrshareStatus) continue;

        // Only update if status has changed
        if (variantObj.status !== ayrshareStatus.status) {
          console.log(`🔄 Updating post ${variantObj.ayrsharePostId} status: ${variantObj.status} → ${ayrshareStatus.status}`);
          
          variantObj.status = ayrshareStatus.status;
          
          if (ayrshareStatus.status === 'published' && ayrshareStatus.publishedAt) {
            variantObj.publishedAt = ayrshareStatus.publishedAt;
            // Clear scheduledFor when published
            variantObj.scheduledFor = undefined;
          } else if (ayrshareStatus.status === 'scheduled') {
            // Clear publishedAt when scheduled
            variantObj.publishedAt = undefined;
          }
          
          result.updated++;
        }
        
        // Also update base variant if this is a platform variant
        if (variantKey !== 'base' && post.variants.base) {
          const baseVariant = post.variants.base as any;
          // Update base variant to match if it's different
          if (baseVariant.status !== ayrshareStatus.status) {
            baseVariant.status = ayrshareStatus.status;
            if (ayrshareStatus.status === 'published' && ayrshareStatus.publishedAt) {
              baseVariant.publishedAt = ayrshareStatus.publishedAt;
              baseVariant.scheduledFor = undefined;
            } else if (ayrshareStatus.status === 'scheduled') {
              baseVariant.publishedAt = undefined;
            }
          }
        }
      }
    }

    console.log(`✅ Post status sync completed. Updated ${result.updated} posts`);
    
  } catch (error) {
    console.error('❌ Error syncing post statuses:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.success = false;
  }

  return result;
}

/**
 * Sync post statuses for all account groups that have scheduled posts
 * This can be called periodically to keep statuses up to date
 */
export async function syncAllScheduledPostStatuses(): Promise<PostStatusSyncResult> {
  const result: PostStatusSyncResult = {
    success: true,
    updated: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting global post status sync for scheduled posts');
    
    // This would need to be implemented to iterate through all account groups
    // For now, we'll return a placeholder
    
    console.log('⚠️ Global sync not yet implemented - use per-account-group sync');
    
  } catch (error) {
    console.error('❌ Error in global post status sync:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    result.success = false;
  }

  return result;
}
