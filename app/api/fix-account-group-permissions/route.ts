import { NextRequest, NextResponse } from 'next/server';
import { AccountGroup } from '@/app/schema';
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

    console.log('🔧 Attempting to fix permissions for account group:', accountGroupId);

    // Try to load the account group as the server worker
    let accountGroup;
    try {
      accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
    } catch (loadError) {
      console.error('❌ Failed to load account group:', loadError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot access account group ${accountGroupId}. This usually means the server worker was not added to the group when it was created.`,
          details: loadError instanceof Error ? loadError.message : 'Unknown error'
        },
        { status: 403 }
      );
    }
    
    if (!accountGroup) {
      return NextResponse.json(
        { success: false, error: `Account group ${accountGroupId} not found` },
        { status: 404 }
      );
    }

    // Check if the account group owner is a Group and add server worker permissions
    if (accountGroup._owner instanceof Group) {
      try {
        console.log('🔧 Adding server worker to account group permissions:', worker.id);
        accountGroup._owner.addMember(worker, 'writer');
        console.log('✅ Server worker permissions added successfully');
        
        return NextResponse.json({
          success: true,
          message: `Server worker permissions added to account group ${accountGroupId}`,
          accountGroupId,
          serverWorkerID: worker.id
        });
        
      } catch (permError) {
        console.error('❌ Failed to add server worker permissions:', permError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to add server worker permissions',
            details: permError instanceof Error ? permError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account group has invalid ownership structure. Must be owned by a Group.' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('❌ Error fixing account group permissions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 