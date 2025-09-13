import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Checking Jazz worker configuration...');
    
    // Check environment variables
    const envCheck = {
      JAZZ_WORKER_ACCOUNT: !!process.env.JAZZ_WORKER_ACCOUNT,
      JAZZ_WORKER_SECRET: !!process.env.JAZZ_WORKER_SECRET,
      JAZZ_SYNC_SERVER: !!process.env.JAZZ_SYNC_SERVER,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('🔧 Environment variables check:', envCheck);
    
    // Try to initialize worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz worker not available',
        envCheck,
        suggestion: 'Check that JAZZ_WORKER_ACCOUNT and JAZZ_WORKER_SECRET are set in your .env.local file'
      }, { status: 500 });
    }
    
    // Test worker capabilities
    const workerInfo = {
      id: worker.id,
      hasProfile: !!worker.profile,
      profileName: worker.profile?.name || 'No name set'
    };
    
    console.log('✅ Worker info:', workerInfo);
    
    // Try a simple transaction test
    let transactionTest = 'not_tested';
    try {
      // Test if we can access the worker's own data
      if (worker.profile) {
        transactionTest = 'success';
      } else {
        transactionTest = 'profile_not_available';
      }
    } catch (transactionError) {
      console.error('❌ Transaction test failed:', transactionError);
      transactionTest = `failed: ${transactionError instanceof Error ? transactionError.message : 'unknown error'}`;
    }
    
    return NextResponse.json({
      success: true,
      envCheck,
      workerInfo,
      transactionTest,
      message: 'Jazz worker is available and configured'
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      suggestion: 'Check server logs for more details'
    }, { status: 500 });
  }
} 