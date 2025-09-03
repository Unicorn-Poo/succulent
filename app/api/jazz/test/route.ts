import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/jazz/test - Test Jazz server worker connectivity
 * Verifies that Jazz server worker is properly initialized
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Jazz server worker connection...');
    
    // Dynamically import Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Jazz worker not initialized',
        status: 'worker_unavailable'
      }, { status: 500 });
    }
    
    // Test worker properties
    const workerInfo = {
      hasWorker: !!worker,
      accountId: worker.id,
      profileName: worker.profile?.name?.toString(),
      hasRoot: !!worker.root,
      rootId: worker.root?.id
    };
    
    console.log('🎷 Jazz worker info:', workerInfo);
    
    return NextResponse.json({
      success: true,
      message: 'Jazz server worker is connected and ready!',
      worker: workerInfo,
      environment: {
        hasAccountId: !!process.env.JAZZ_WORKER_ACCOUNT,
        hasAccountSecret: !!process.env.JAZZ_WORKER_SECRET,
        syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools"
      }
    });
    
  } catch (error) {
    console.error('❌ Jazz worker test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'connection_failed',
      environment: {
        hasAccountId: !!process.env.JAZZ_WORKER_ACCOUNT,
        hasAccountSecret: !!process.env.JAZZ_WORKER_SECRET,
        syncServer: process.env.JAZZ_SYNC_SERVER || "wss://mesh.jazz.tools"
      }
    }, { status: 500 });
  }
} 