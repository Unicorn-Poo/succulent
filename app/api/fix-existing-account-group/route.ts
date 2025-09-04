import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId, userAccountId } = body;
    
    if (!accountGroupId || !userAccountId) {
      return NextResponse.json(
        { success: false, error: 'Missing accountGroupId or userAccountId' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Manual permission setup required',
      instructions: [
        'Since the account group already exists without server worker permissions,',
        'you need to manually add the server worker to the account group.',
        '',
        'In the browser console on the account group page, run:',
        '',
        '// Get the account group',
        'const accountGroup = me.root.accountGroups.find(g => g.id === "co_zoGYXV8cVVhsid7FewArNZCpqMT");',
        '',
        '// Load server worker',
        'const { Account } = await import("jazz-tools");',
        'const worker = await Account.load("co_z3yX5GhwhWRDktvH4iao5Qk51vy");',
        '',
        '// Add worker to account group permissions',
        'accountGroup._owner.addMember(worker, "writer");',
        '',
        'console.log("Server worker permissions added!");'
      ],
      serverWorkerId: 'co_z3yX5GhwhWRDktvH4iao5Qk51vy',
      accountGroupId
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Endpoint error' },
      { status: 500 }
    );
  }
} 