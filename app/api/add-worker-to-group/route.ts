import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountGroupId } = body;
    
    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'Missing accountGroupId' },
        { status: 400 }
      );
    }

    if (!process.env.JAZZ_WORKER_ACCOUNT) {
      return NextResponse.json(
        { success: false, error: 'Server worker not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Add server worker permissions',
      clientSideScript: `
// Run this in browser console on the account group page:
(async () => {
  try {
    // Import Jazz tools
    const { useAccount } = await import('jazz-tools/react');
    const { MyAppAccount } = await import('/app/schema');
    const { Account } = await import('jazz-tools');
    
    // This won't work because hooks can't be called outside React
    console.error('Cannot use React hooks in console');
    console.log('Alternative: Use the UI component to trigger this');
  } catch (error) {
    console.error('Script error:', error);
  }
})();`,
      alternativeSolution: 'Create a UI button to add server worker permissions',
      instructions: [
        'The browser console approach requires React context.',
        'Instead, I will create a UI component that can add the permissions.',
        'This component will have access to the user account and can add server worker permissions.'
      ]
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Endpoint error' },
      { status: 500 }
    );
  }
} 