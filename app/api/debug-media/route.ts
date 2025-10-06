import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT - Test media URL generation immediately
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [DEBUG] Testing media URL generation...');
    
    // Test the media proxy endpoint
    const testFileStreamId = 'co_test123'; // Example ID
    const proxyUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/media-proxy/${testFileStreamId}`;
    
    console.log('🔧 [DEBUG] Generated proxy URL:', proxyUrl);
    
    return NextResponse.json({
      success: true,
      proxyUrl,
      baseUrl: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
      environment: process.env.NODE_ENV || 'development'
    });
    
  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
