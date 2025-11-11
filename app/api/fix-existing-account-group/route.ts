import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId } = body;
    
    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'accountGroupId is required' },
        { status: 400 }
      );
    }

    // Get server worker info
    const serverWorkerId = process.env.JAZZ_WORKER_ACCOUNT || process.env.NEXT_PUBLIC_JAZZ_WORKER_ACCOUNT;
    
    if (!serverWorkerId) {
      return NextResponse.json({
        success: false,
        error: 'Server worker not configured',
        instructions: [
          'The server worker account is not configured.',
          'Please set JAZZ_WORKER_ACCOUNT in your .env.local file.'
        ]
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual permission setup required',
      accountGroupId,
      serverWorkerId,
      problem: `The account group ${accountGroupId} exists but the server worker (${serverWorkerId}) doesn't have permissions to access it. This prevents API calls from working.`,
      solution: 'Add server worker permissions using the browser console',
      instructions: [
        `1. Navigate to: https://app.succulent.social/account-group/${accountGroupId}#settings`,
        '2. Open browser developer console (F12)',
        '3. Run the following code:',
        '',
        '```javascript',
        `// Get the account group`,
        `const accountGroup = me.root.accountGroups.find(g => g.id === "${accountGroupId}");`,
        '',
        'if (accountGroup) {',
        '  // Load server worker',
        '  const { Account } = await import("jazz-tools");',
        `  const worker = await Account.load("${serverWorkerId}");`,
        '  ',
        '  if (worker && accountGroup._owner instanceof Group) {',
        '    // Add worker to account group permissions',
        '    accountGroup._owner.addMember(worker, "writer");',
        '    console.log("✅ Server worker permissions added!");',
        '  } else {',
        '    console.error("❌ Worker not found or invalid account group structure");',
        '  }',
        '} else {',
        `  console.error("❌ Account group ${accountGroupId} not found");`,
        '}',
        '```',
        '',
        '4. Verify success by testing your API call again'
      ],
      alternativeSolution: 'Use the fix-account-group-permissions endpoint if this account group was created with a user account that has the necessary permissions.'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Endpoint error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 