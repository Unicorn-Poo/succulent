import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-ayrshare-signature');
    
    // Process different webhook events
    switch (body.event) {
      case 'social.account.added':
        
        // TODO: Implement real-time UI updates
        // Could use WebSocket, Server-Sent Events, or database triggers
        // to notify the UI that new accounts are available
        break;
        
      case 'social.account.removed':
        console.log('❌ Social account unlinked:', {
          profileKey: body.profileKey,
          platform: body.platform,
          timestamp: body.timestamp
        });
        break;
        
      case 'social.account.error':
        console.log('⚠️ Social account error:', {
          profileKey: body.profileKey,
          platform: body.platform,
          error: body.error,
          timestamp: body.timestamp
        });
        break;

      case 'post.published':
      case 'post.scheduled':
      case 'post.failed':
        await handlePostStatusWebhook(body);
        break;
        
      default:
        console.log('Unknown webhook event:', body.event);
    }
    
    // Return success response
    return NextResponse.json({ 
      status: 'success',
      processed: true 
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to process webhook' 
      },
      { status: 500 }
    );
  }
}

/**
 * Handle post status webhooks from Ayrshare
 */
async function handlePostStatusWebhook(webhookData: any) {
  try {
    const { event, postId, profileKey, platform, status, timestamp } = webhookData;
    
    console.log(`📡 Processing ${event} webhook for post ${postId}`);
    
    // Log webhook for monitoring and debugging
    console.log(`📡 Webhook received for post ${postId} on profile ${profileKey}`);
    console.log(`📊 Event details:`, { event, platform, status, timestamp });
    
    // For production, webhooks are logged for monitoring
    // The actual post status updates are handled by the sync mechanism
    // This approach is more reliable than trying to update Jazz directly in webhooks
    console.log(`✅ Webhook logged - status updates handled by sync mechanism`);
    
  } catch (error) {
    console.error('❌ Error handling post status webhook:', error);
  }
} 