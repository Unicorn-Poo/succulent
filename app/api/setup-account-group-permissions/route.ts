import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accountGroupId } = await request.json();
    
    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'accountGroupId is required' },
        { status: 400 }
      );
    }

    if (!process.env.JAZZ_WORKER_ACCOUNT) {
      return NextResponse.json(
        { success: false, error: 'JAZZ_WORKER_ACCOUNT not configured' },
        { status: 500 }
      );
    }

    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup } = await import('@/app/schema');
    const { Account, Group } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 503 }
      );
    }

    const serverWorker = await Account.load(process.env.JAZZ_WORKER_ACCOUNT);
    if (!serverWorker) {
      return NextResponse.json(
        { success: false, error: 'Server worker account not found' },
        { status: 404 }
      );
    }

    const accountGroup = await AccountGroup.load(accountGroupId, { loadAs: worker });
    if (!accountGroup) {
      return NextResponse.json(
        { success: false, error: 'Account group not found' },
        { status: 404 }
      );
    }

    if (accountGroup._owner instanceof Group) {
      try {
        accountGroup._owner.addMember(serverWorker, 'writer');
      } catch (error) {
        // Worker might already be a member
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Server worker permissions configured for account group',
      accountGroupId,
      workerAccountId: process.env.JAZZ_WORKER_ACCOUNT
    });

  } catch (error) {
    console.error('❌ Error setting up account group permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup permissions' },
      { status: 500 }
    );
  }
} 