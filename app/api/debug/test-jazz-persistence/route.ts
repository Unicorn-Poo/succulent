import { NextRequest, NextResponse } from 'next/server';

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

    console.log('🧪 Testing basic Jazz persistence...');

    try {
      // Create a simple test object to see if it persists
      const { co, z } = await import('jazz-tools');
      
      const TestObject = co.map({
        message: z.string(),
        timestamp: z.date(),
        testId: z.string()
      });
      
      const testId = `test_${Date.now()}`;
      const testObj = TestObject.create({
        message: 'Hello from Jazz persistence test',
        timestamp: new Date(),
        testId: testId
      }, { owner: worker });
      
      console.log('✅ Test object created:', {
        id: testObj.id,
        testId: testId,
        message: testObj.message,
        owner: testObj._owner?.id
      });
      
      // Wait a moment and try to reload it
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reloadedObj = await TestObject.load(testObj.id, { loadAs: worker });
      
      if (reloadedObj) {
        console.log('✅ Test object successfully reloaded:', {
          id: reloadedObj.id,
          message: reloadedObj.message,
          testId: reloadedObj.testId
        });
        
        return NextResponse.json({
          success: true,
          message: 'Jazz persistence is working',
          testObject: {
            id: testObj.id,
            testId: testId,
            message: testObj.message,
            reloaded: true
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Test object could not be reloaded',
          details: 'Object was created but not found when reloading'
        });
      }
      
    } catch (testError) {
      console.error('❌ Jazz persistence test failed:', testError);
      
      return NextResponse.json({
        success: false,
        error: 'Jazz persistence test failed',
        details: testError instanceof Error ? testError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Test persistence endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Jazz persistence test endpoint',
    usage: 'POST with { "accountId": "co_..." } to test basic persistence'
  });
} 