import { NextRequest, NextResponse } from 'next/server';

/**
 * Convert problematic media URLs to Ayrshare-compatible formats
 * This endpoint downloads the media and re-serves it in a format Ayrshare can process
 */
export async function POST(request: NextRequest) {
  try {
    const { mediaUrl } = await request.json();
    
    if (!mediaUrl) {
      return NextResponse.json({
        success: false,
        error: 'mediaUrl is required'
      }, { status: 400 });
    }

    console.log('🔄 Converting media URL for Ayrshare compatibility:', mediaUrl);

    // Check if it's a Lunary OG image URL
    if (mediaUrl.includes('lunary.app/api/og/')) {
      try {
        // Download the image from Lunary with proper headers for Ayrshare compatibility
        const response = await fetch(mediaUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Succulent/1.0)',
            'Accept': 'image/png, image/jpeg, image/webp, image/*'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';
        
        // Validate that we got an image
        if (!contentType.startsWith('image/')) {
          throw new Error(`Invalid content type: ${contentType}. Expected image.`);
        }
        
        console.log('✅ Downloaded image:', buffer.byteLength, 'bytes, type:', contentType);

        // Return the image directly with proper headers for Ayrshare
        return new Response(buffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': buffer.byteLength.toString(),
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });

      } catch (error) {
        console.error('❌ Error downloading Lunary image:', error);
        return NextResponse.json({
          success: false,
          error: 'Failed to download image from Lunary',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // For other URLs, just return them as-is
    return NextResponse.json({
      success: true,
      originalUrl: mediaUrl,
      convertedUrl: mediaUrl,
      message: 'URL is already compatible'
    });

  } catch (error) {
    console.error('❌ Media conversion error:', error);
    return NextResponse.json({
      success: false,
      error: 'Media conversion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get('url');
  
  if (!mediaUrl) {
    return NextResponse.json({
      error: 'Missing url parameter'
    }, { status: 400 });
  }

  // Redirect to POST for actual conversion
  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ mediaUrl }),
    headers: { 'Content-Type': 'application/json' }
  }));
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
