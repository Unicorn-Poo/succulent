import { NextRequest, NextResponse } from 'next/server';
import { Group } from 'jazz-tools';

export async function POST(request: NextRequest) {
  try {
    const { accountGroupId } = await request.json();
    
    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'accountGroupId is required' },
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

    console.log('🔍 Testing server worker access to account group:', accountGroupId);
    console.log('🤖 Server worker ID:', worker.id);

    // Try to load the account group
    const { AccountGroup } = await import('@/app/schema');
    
    try {
      console.log('📥 Attempting to load account group...');
      const accountGroup = await AccountGroup.load(accountGroupId, { 
        loadAs: worker,
        resolve: {
          accounts: true,
          posts: true
        }
      });
      
      if (!accountGroup) {
        return NextResponse.json({
          success: false,
          error: 'Account group not found',
          details: 'Server worker cannot access this account group'
        }, { status: 404 });
      }
      
      // Analyze the account group
      const groupInfo = {
        id: accountGroup.id,
        name: accountGroup.name,
        owner: accountGroup._owner?.id,
        ownerType: accountGroup._owner?.constructor?.name,
        accountsCount: accountGroup.accounts?.length || 0,
        postsCount: accountGroup.posts?.length || 0,
        canAddMember: accountGroup._owner instanceof Group
      };
      
      console.log('✅ Account group loaded successfully:', groupInfo);
      
      // Try to add server worker permissions
      let permissionResult = 'not_attempted';
      if (accountGroup._owner instanceof Group) {
        try {
          console.log('🔧 Attempting to add server worker to account group...');
          accountGroup._owner.addMember(worker, 'writer');
          permissionResult = 'success';
          console.log('✅ Server worker added successfully');
        } catch (permError) {
          console.error('❌ Failed to add server worker:', permError);
          permissionResult = `failed: ${permError instanceof Error ? permError.message : 'unknown'}`;
        }
      } else {
        permissionResult = 'owner_not_group';
      }
      
      return NextResponse.json({
        success: true,
        message: 'Account group accessible',
        groupInfo,
        serverWorkerID: worker.id,
        permissionResult
      });
      
    } catch (loadError) {
      console.error('❌ Failed to load account group:', loadError);
      
      return NextResponse.json({
        success: false,
        error: 'Cannot load account group',
        details: loadError instanceof Error ? loadError.message : 'Unknown error',
        serverWorkerID: worker.id,
        suggestion: 'Server worker does not have permissions to access this account group'
      }, { status: 403 });
    }

  } catch (error) {
    console.error('❌ Debug account group access error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Account group access debug endpoint',
    usage: 'POST with { "accountGroupId": "co_..." } to test server worker access'
  });
} 