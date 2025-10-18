/**
 * Reliable Post Publishing Update System
 * Ensures post status updates are consistently applied and tracked
 */

import { 
  notifyPostPublished, 
  notifyBulkUploadComplete, 
  getPushoverConfig 
} from './pushoverNotifications';

interface PostUpdateData {
  jazzPost: any;
  publishResults: any;
  platforms: string[];
  isScheduled: boolean;
  postTitle: string;
  accountGroup?: any;
}

interface BulkUpdateSummary {
  totalPosts: number;
  successCount: number;
  scheduledCount: number;
  failedCount: number;
  accountGroup?: any;
}

/**
 * Update Jazz post with publishing results - same pattern as existing updateJazzPostWithAyrshareIds
 */
export async function updatePostWithResults(data: PostUpdateData): Promise<{
  success: boolean;
  error?: string;
  notificationSent?: boolean;
}> {
  const { jazzPost, publishResults, platforms, isScheduled, postTitle, accountGroup } = data;
  
  try {
    let updateSuccess = false;
    let socialUrls: Record<string, string> = {};

    // Same logic as existing updateJazzPostWithAyrshareIds function
    if (publishResults && jazzPost?.variants) {
      // Extract post IDs from different result formats
      let postIds: Record<string, string> = {};
      
      if (publishResults.postIds) {
        postIds = publishResults.postIds;
      } else if (publishResults.id) {
        platforms.forEach(platform => {
          postIds[platform] = publishResults.id;
        });
      } else if (Array.isArray(publishResults)) {
        if (publishResults[0]?.postIds) {
          postIds = publishResults[0].postIds;
        } else if (publishResults[0]?.id) {
          platforms.forEach(platform => {
            postIds[platform] = publishResults[0].id;
          });
        }
      }

      // Update each platform variant with its ayrsharePostId
      if (Object.keys(postIds).length > 0) {
        for (const [platform, ayrsharePostId] of Object.entries(postIds)) {
          const internalPlatform = platform === 'twitter' ? 'x' : platform;
          
          const variant = jazzPost.variants[internalPlatform];
          if (variant && ayrsharePostId) {
            variant.ayrsharePostId = ayrsharePostId;
            
            // Additional updates beyond the existing function
            variant.status = isScheduled ? 'scheduled' : 'published';
            if (!isScheduled) {
              variant.publishedAt = new Date();
            }
            
            // Store social URL for notifications
            socialUrls[internalPlatform] = generateSocialUrl(internalPlatform, ayrsharePostId);
            variant.socialPostUrl = socialUrls[internalPlatform];
            
            updateSuccess = true;
          }
        }
      }
    }

    // Step 2: Send notification if configured
    let notificationSent = false;
    if (updateSuccess && accountGroup) {
      try {
        const pushoverConfig = getPushoverConfig(accountGroup);
        
        const shouldNotify = isScheduled 
          ? pushoverConfig.enabled && accountGroup?.notificationSettings?.pushover?.notifyOnSchedule !== false
          : pushoverConfig.enabled && accountGroup?.notificationSettings?.pushover?.notifyOnPublish !== false;

        if (shouldNotify) {
          const notificationResult = await notifyPostPublished(pushoverConfig, {
            postTitle,
            platforms,
            accountGroupName: accountGroup?.name,
            scheduledDate: isScheduled ? 'scheduled time' : undefined,
            // REMOVED: postId: jazzPost?.id - Jazz IDs should not be accessed directly
            ayrsharePostId: publishResults?.id,
            socialUrls,
            status: isScheduled ? 'scheduled' : 'published',
          });
          
          notificationSent = notificationResult.success;
          
          if (!notificationResult.success) {
            // Notification failure is not critical, just track it
          }
        }
      } catch (notificationError) {
        console.error('❌ Notification error:', notificationError);
      }
    }

    if (updateSuccess) {
      return { success: true, notificationSent };
    } else {
      return { success: false, error: 'Failed to update any variants' };
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to update post "${postTitle}":`, error);
    
    // Send failure notification if configured
    if (accountGroup) {
      try {
        const pushoverConfig = getPushoverConfig(accountGroup);
        
        if (pushoverConfig.enabled && accountGroup?.notificationSettings?.pushover?.notifyOnFailure !== false) {
          await notifyPostPublished(pushoverConfig, {
            postTitle,
            platforms,
            accountGroupName: accountGroup?.name,
            status: 'failed',
            errorMessage,
          });
        }
      } catch (notificationError) {
        console.error('❌ Failure notification error:', notificationError);
      }
    }
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Update multiple posts and send bulk completion notification
 */
export async function updateBulkPostsWithResults(
  updates: PostUpdateData[],
  summary: BulkUpdateSummary
): Promise<{
  totalUpdated: number;
  totalFailed: number;
  notificationSent: boolean;
}> {
  let totalUpdated = 0;
  let totalFailed = 0;

  // Process all updates
  for (const updateData of updates) {
    const result = await updatePostWithResults(updateData);
    if (result.success) {
      totalUpdated++;
    } else {
      totalFailed++;
    }
  }

  // Send bulk completion notification
  let notificationSent = false;
  if (summary.accountGroup) {
    try {
      const pushoverConfig = getPushoverConfig(summary.accountGroup);
      
      if (pushoverConfig.enabled && summary.accountGroup?.notificationSettings?.pushover?.notifyOnBulkComplete !== false) {
        const notificationResult = await notifyBulkUploadComplete(pushoverConfig, {
          totalPosts: summary.totalPosts,
          successCount: summary.successCount,
          scheduledCount: summary.scheduledCount,
          failedCount: summary.failedCount,
          accountGroupName: summary.accountGroup?.name,
        });
        
        notificationSent = notificationResult.success;
      }
    } catch (notificationError) {
      console.error('❌ Bulk notification error:', notificationError);
    }
  }

  return {
    totalUpdated,
    totalFailed,
    notificationSent,
  };
}

/**
 * Generate social media URL from platform and post ID
 */
function generateSocialUrl(platform: string, postId: string): string {
  switch (platform.toLowerCase()) {
    case 'x':
    case 'twitter':
      return `https://twitter.com/i/web/status/${postId}`;
    case 'instagram':
      return `https://www.instagram.com/p/${postId}/`;
    case 'facebook':
      return `https://www.facebook.com/posts/${postId}`;
    case 'linkedin':
      return `https://www.linkedin.com/posts/activity-${postId}`;
    case 'threads':
      return `https://www.threads.net/@username/post/${postId}`;
    case 'bluesky':
      return `https://bsky.app/profile/username/post/${postId}`;
    default:
      return `https://${platform}.com/post/${postId}`;
  }
}

/**
 * Retry failed post updates with exponential backoff
 */
export async function retryFailedUpdate(
  updateData: PostUpdateData,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<{ success: boolean; error?: string; attempts: number }> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    
    const result = await updatePostWithResults(updateData);
    
    if (result.success) {
      return { success: true, attempts };
    }
    
    // If this isn't the last attempt, wait before retrying
    if (attempts < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return { 
    success: false, 
    error: `Failed after ${attempts} attempts`, 
    attempts 
  };
}

/**
 * Validate that a post update was successful
 * SAFE: This function only reads variant properties, never accesses Jazz IDs
 */
export function validatePostUpdate(jazzPost: any, expectedStatus: 'scheduled' | 'published'): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  if (!jazzPost?.variants) {
    issues.push('Post has no variants');
    return { isValid: false, issues };
  }
  
  for (const [platform, variant] of Object.entries(jazzPost.variants)) {
    const variantObj = variant as any;
    
    if (!variantObj) {
      issues.push(`${platform} variant is null`);
      continue;
    }
    
    if (variantObj.status !== expectedStatus) {
      issues.push(`${platform} variant status is ${variantObj.status}, expected ${expectedStatus}`);
    }
    
    if (expectedStatus === 'published' && !variantObj.publishedAt) {
      issues.push(`${platform} variant missing publishedAt timestamp`);
    }
    
    if (!variantObj.ayrsharePostId) {
      issues.push(`${platform} variant missing ayrsharePostId`);
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
  };
}
