import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAccountId } = body;
    
    if (!userAccountId) {
      return NextResponse.json(
        { success: false, error: 'Missing userAccountId' },
        { status: 400 }
      );
    }

    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { MyAppAccount } = await import('@/app/schema');
    const { Account, Group } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz worker not available' },
        { status: 503 }
      );
    }

    try {
      const userAccount = await MyAppAccount.load(userAccountId);
      if (!userAccount || !userAccount.root) {
        return NextResponse.json(
          { success: false, error: 'User account or root not found' },
          { status: 404 }
        );
      }

      if (userAccount.root._owner instanceof Group) {
        userAccount.root._owner.addMember(worker, 'writer');
        
        return NextResponse.json({
          success: true,
          message: 'Server worker permissions added',
          data: {
            userAccountId,
            workerAccountId: worker.id,
            rootId: userAccount.root.id
          }
        });
      }
    } catch (loadError) {
      return NextResponse.json(
        { success: false, error: `Failed to load user account: ${loadError instanceof Error ? loadError.message : 'Unknown error'}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Account root owner is not a Group' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error setting up worker permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup permissions' },
      { status: 500 }
    );
  }
} 