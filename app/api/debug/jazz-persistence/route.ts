import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();
    
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Get the Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 500 }
      );
    }

    console.log('🔍 Testing Jazz persistence for account:', accountId);

    // Try to load the user's account from server side
    const { MyAppAccount } = await import('@/app/schema');
    
    try {
      const userAccount = await MyAppAccount.load(accountId, { 
        loadAs: worker,
        resolve: {
          profile: {
            apiKeys: { $each: true }
          }
        }
      });
      
      if (!userAccount) {
        return NextResponse.json({
          success: false,
          error: 'Account not found',
          details: 'Server worker cannot load this account - likely a permission issue'
        }, { status: 404 });
      }
      
      // Check what we can see
      const debugInfo = {
        accountId: userAccount.id,
        hasProfile: !!userAccount.profile,
        profileName: userAccount.profile?.name,
        profileId: userAccount.profile?.id,
        profileOwner: userAccount.profile?._owner?.id,
        hasApiKeys: !!userAccount.profile?.apiKeys,
        apiKeysCount: userAccount.profile?.apiKeys?.length || 0,
        apiKeysOwner: userAccount.profile?.apiKeys?._owner?.id
      };
      
      console.log('🔍 Server-side account state:', debugInfo);
      
      return NextResponse.json({
        success: true,
        message: 'Server can access account',
        debugInfo
      });
      
    } catch (loadError) {
      console.error('❌ Failed to load account from server:', loadError);
      
      return NextResponse.json({
        success: false,
        error: 'Cannot load account from server',
        details: loadError instanceof Error ? loadError.message : 'Unknown error',
        suggestion: 'This indicates the server worker does not have permission to access user accounts'
      }, { status: 403 });
    }

  } catch (error) {
    console.error('❌ Debug persistence endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Jazz persistence debug endpoint',
    usage: 'POST with { "accountId": "co_..." } to test persistence'
  });
} 