# Pushover Integration Guide

## Overview

The Succulent app now includes comprehensive Pushover integration for real-time notifications when posts are published, scheduled, or fail. This system also includes improved reliability for post status updates.

## Features

### ✅ **Real-time Notifications**
- **Post Published**: Get notified immediately when posts go live
- **Post Scheduled**: Confirmation when posts are scheduled for later
- **Publishing Failures**: Alert when posts fail to publish
- **Bulk Upload Complete**: Summary notifications for CSV bulk uploads

### ✅ **Reliable Post Updates** 
- Improved post status tracking with retry mechanisms
- Automatic social media URL extraction and storage
- Validation of post updates with error reporting
- Exponential backoff for failed updates

### ✅ **Flexible Configuration**
- Per-account group notification settings
- Granular control over notification types
- Easy setup with Pushover credentials
- Test functionality to verify configuration

## Setup Instructions

### 1. **Get Pushover Account & Credentials**

1. Sign up at [pushover.net](https://pushover.net)
2. Install the Pushover app on your device
3. Create an application:
   - Go to [Applications & Plugins](https://pushover.net/apps)
   - Click "Create an Application/API Token"
   - Fill in the form (name: "Succulent", description: "Social media publishing notifications")
   - Save your **API Token**
4. Get your **User Key** from your [Pushover dashboard](https://pushover.net)

### 2. **Configure in Succulent**

1. Navigate to **Account Settings** → **Notifications**
2. Toggle **"Enable Push Notifications"**
3. Enter your **API Token** and **User Key**
4. Click **"Send Test Notification"** to verify setup
5. Configure which notification types you want to receive:
   - ✅ Post Publishing
   - ✅ Post Scheduling  
   - ✅ Publishing Failures
   - ✅ Bulk Upload Completion
6. Click **"Save Settings"**

## Notification Types

### 📱 **Post Published**
```
✅ Post Published Successfully
"My Amazing Post" has been published to Instagram, X

🔗 View Post: https://instagram.com/p/abc123/
```

### 📅 **Post Scheduled**
```
📅 Post Scheduled Successfully
"Future Post" has been scheduled for Dec 15, 2025 2:30 PM on LinkedIn, Facebook
```

### ❌ **Publishing Failed**
```
❌ Post Publishing Failed
Failed to publish "My Post" to X, Threads

Error: API rate limit exceeded
```

### 📊 **Bulk Upload Complete**
```
✅ Bulk Upload Completed
Successfully processed 25 posts (My Business Account)
• 20 published immediately
• 5 scheduled
```

## Technical Details

### **File Structure**
```
utils/
├── pushoverNotifications.ts      # Core notification functions
├── reliablePostUpdater.ts        # Improved post status updates
└── postStatusSync.ts             # Existing sync utilities

components/
└── notification-settings.tsx     # Settings UI component

app/api/
├── posts/bulk/route.ts           # Updated with notifications
├── posts/route.ts                # Updated with reliable updater
└── test-notifications/route.ts   # Testing endpoint
```

### **Schema Updates**
Added to `AccountGroup` schema:
```typescript
notificationSettings: {
  pushover: {
    enabled: boolean;
    apiToken: string;
    userKey: string;
    notifyOnPublish?: boolean;
    notifyOnSchedule?: boolean;
    notifyOnFailure?: boolean;
    notifyOnBulkComplete?: boolean;
  }
}
```

### **API Integration**
The notification system automatically integrates with:
- **Bulk CSV Upload** (`/api/posts/bulk`)
- **Single Post Creation** (`/api/posts`)
- **Post Status Updates** (via `reliablePostUpdater`)

## Testing

### **Test Endpoint**
Use `/api/test-notifications` to test different notification types:

```bash
curl -X POST /api/test-notifications \
  -H "Content-Type: application/json" \
  -d '{
    "accountGroupId": "your-account-group-id",
    "testType": "publish"
  }'
```

**Available Test Types:**
- `config` - Basic configuration test
- `publish` - Published post notification
- `schedule` - Scheduled post notification  
- `failure` - Failed post notification
- `bulk` - Bulk upload completion

### **Manual Testing**
1. Configure Pushover in Account Settings
2. Create and publish a test post
3. Upload a small CSV file with 2-3 posts
4. Verify notifications arrive on your device

## Troubleshooting

### **Notifications Not Working**

1. **Check Configuration**
   - Verify API Token and User Key are correct
   - Ensure notifications are enabled for the account group
   - Test with the built-in test function

2. **Check Pushover App**
   - Ensure Pushover app is installed and logged in
   - Check notification settings in the app
   - Verify device has internet connection

3. **Check Account Settings**
   - Verify the correct account group is selected
   - Check that specific notification types are enabled
   - Look for error messages in the test results

### **Post Updates Not Reliable**

The new `reliablePostUpdater` includes:
- **Retry Logic**: Failed updates are retried with exponential backoff
- **Validation**: Post updates are validated after completion
- **Error Handling**: Graceful fallback to previous update method
- **Logging**: Detailed logs for debugging

### **Common Issues**

**"API Token or User Key invalid"**
- Double-check credentials from Pushover dashboard
- Ensure no extra spaces or characters

**"Test notification failed"**
- Check internet connection
- Verify Pushover service is operational
- Try with different notification priority

**"Account group not found"**
- Ensure you're using the correct account group ID
- Verify account group has proper permissions

## Best Practices

### **Notification Settings**
- Enable failure notifications for immediate issue awareness
- Use bulk completion notifications for large uploads
- Consider disabling scheduled notifications if you post frequently

### **Security**
- Store Pushover credentials securely (never in client-side code)
- Use different API tokens for development vs production
- Regularly rotate credentials if compromised

### **Performance**
- Notifications are sent asynchronously to avoid blocking post creation
- Failed notifications don't prevent post publishing
- Bulk notifications are batched to reduce API calls

## API Reference

### **Core Functions**

```typescript
// Send basic notification
sendPushoverNotification(config: PushoverConfig, data: NotificationData)

// Post-specific notifications
notifyPostPublished(config: PushoverConfig, data: PublishingNotificationData)
notifyBulkUploadComplete(config: PushoverConfig, data: BulkSummary)

// Configuration & testing
testPushoverConfig(config: PushoverConfig)
getPushoverConfig(accountGroup: AccountGroup)

// Reliable post updates
updatePostWithResults(data: PostUpdateData)
retryFailedUpdate(data: PostUpdateData, maxRetries: number)
validatePostUpdate(jazzPost: any, expectedStatus: string)
```

### **Configuration Types**

```typescript
interface PushoverConfig {
  apiToken: string;
  userKey: string;
  enabled: boolean;
}

interface PublishingNotificationData {
  postTitle: string;
  platforms: string[];
  accountGroupName?: string;
  scheduledDate?: string;
  status: 'published' | 'scheduled' | 'failed';
  errorMessage?: string;
  socialUrls?: Record<string, string>;
}
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Test with the built-in test endpoint
3. Review browser console and server logs
4. Verify Pushover service status

The notification system is designed to be non-blocking - if notifications fail, post publishing will still succeed.

