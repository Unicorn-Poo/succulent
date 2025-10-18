/**
 * Pushover Notifications Integration
 * Sends real-time notifications when posts are published
 */

interface PushoverConfig {
  apiToken: string;
  userKey: string;
  enabled: boolean;
}

interface NotificationData {
  title: string;
  message: string;
  url?: string;
  priority?: number; // -2 to 2 (lowest to emergency)
  sound?: string;
  device?: string;
}

interface PublishingNotificationData {
  postTitle: string;
  platforms: string[];
  accountGroupName?: string;
  scheduledDate?: string;
  ayrsharePostId?: string;
  socialUrls?: Record<string, string>;
  status: 'published' | 'scheduled' | 'failed';
  errorMessage?: string;
}

/**
 * Send a notification via Pushover
 */
export async function sendPushoverNotification(
  config: PushoverConfig,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled || !config.apiToken || !config.userKey) {
    return { success: false, error: 'Pushover not configured or disabled' };
  }

  try {
    const payload = {
      token: config.apiToken,
      user: config.userKey,
      title: data.title,
      message: data.message,
      url: data.url,
      priority: data.priority || 0,
      sound: data.sound || 'pushover',
      device: data.device,
    };

    // Remove undefined values and ensure all values are strings
    const cleanPayload: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        cleanPayload[key] = String(value);
      }
    }

    const response = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(cleanPayload),
    });

    const result = await response.json();

    if (response.ok && result.status === 1) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.errors?.join(', ') || 'Unknown Pushover API error' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

/**
 * Send notification for successful post publishing
 */
export async function notifyPostPublished(
  config: PushoverConfig,
  data: PublishingNotificationData
): Promise<{ success: boolean; error?: string }> {
  const platformsList = data.platforms.join(', ');
  const accountInfo = data.accountGroupName ? ` (${data.accountGroupName})` : '';
  
  let message: string;
  let title: string;
  let priority = 0;
  let url: string | undefined;

  switch (data.status) {
    case 'published':
      title = '✅ Post Published Successfully';
      message = `"${data.postTitle}" has been published to ${platformsList}${accountInfo}`;
      
      // If we have social URLs, include the first one
      if (data.socialUrls && Object.keys(data.socialUrls).length > 0) {
        const firstUrl = Object.values(data.socialUrls)[0];
        if (firstUrl) {
          url = firstUrl;
        }
      }
      break;

    case 'scheduled':
      title = '📅 Post Scheduled Successfully';
      message = `"${data.postTitle}" has been scheduled for ${data.scheduledDate} on ${platformsList}${accountInfo}`;
      break;

    case 'failed':
      title = '❌ Post Publishing Failed';
      message = `Failed to publish "${data.postTitle}" to ${platformsList}${accountInfo}`;
      if (data.errorMessage) {
        message += `\n\nError: ${data.errorMessage}`;
      }
      priority = 1; // High priority for failures
      break;
  }

  return await sendPushoverNotification(config, {
    title,
    message,
    url,
    priority,
  });
}

/**
 * Send notification for bulk upload completion
 */
export async function notifyBulkUploadComplete(
  config: PushoverConfig,
  data: {
    totalPosts: number;
    successCount: number;
    scheduledCount: number;
    failedCount: number;
    accountGroupName?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const accountInfo = data.accountGroupName ? ` (${data.accountGroupName})` : '';
  
  let title: string;
  let message: string;
  let priority = 0;

  if (data.failedCount === 0) {
    title = '✅ Bulk Upload Completed';
    message = `Successfully processed ${data.totalPosts} posts${accountInfo}`;
    if (data.scheduledCount > 0) {
      message += `\n• ${data.successCount} published immediately\n• ${data.scheduledCount} scheduled`;
    }
  } else {
    title = '⚠️ Bulk Upload Completed with Issues';
    message = `Processed ${data.totalPosts} posts${accountInfo}:\n• ${data.successCount} successful\n• ${data.failedCount} failed`;
    if (data.scheduledCount > 0) {
      message += `\n• ${data.scheduledCount} scheduled`;
    }
    priority = 1; // High priority for partial failures
  }

  return await sendPushoverNotification(config, {
    title,
    message,
    priority,
  });
}

/**
 * Test Pushover configuration
 */
export async function testPushoverConfig(
  config: PushoverConfig
): Promise<{ success: boolean; error?: string }> {
  return await sendPushoverNotification(config, {
    title: '🧪 Succulent Test Notification',
    message: 'Your Pushover integration is working correctly!',
  });
}

/**
 * Get Pushover configuration from account group
 */
export function getPushoverConfig(accountGroup: any): PushoverConfig {
  return {
    apiToken: accountGroup?.notificationSettings?.pushover?.apiToken || '',
    userKey: accountGroup?.notificationSettings?.pushover?.userKey || '',
    enabled: accountGroup?.notificationSettings?.pushover?.enabled || false,
  };
}
