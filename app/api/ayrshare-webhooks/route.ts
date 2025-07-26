import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-ayrshare-signature');
    
    // Process different webhook events
    switch (body.event) {
      case 'social.account.added':
        console.log('✅ Social account linked:', {
          profileKey: body.profileKey,
          platform: body.platform,
          accountName: body.accountName,
          timestamp: body.timestamp
        });
        
        // You could emit a real-time event here for immediate UI updates
        // For example: emit to WebSocket clients, trigger server-sent events, etc.
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