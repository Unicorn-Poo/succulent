import { NextRequest, NextResponse } from 'next/server';

/**
 * Serve Jazz FileStream media publicly for external services like Ayrshare
 * This endpoint takes a Jazz FileStream ID and serves the media with proper headers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  try {
    const { mediaId } = params;
    
    if (!mediaId) {
      return NextResponse.json({
        error: 'Media ID is required'
      }, { status: 400 });
    }

    console.log('🖼️ Serving media for ID:', mediaId);

    // Import Jazz tools
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { FileStream } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json({
        error: 'Jazz worker not available'
      }, { status: 500 });
    }

    try {
      // Load the FileStream using the Jazz server worker
      const fileStream = await FileStream.load(mediaId, { loadAs: worker });
      
      if (!fileStream) {
        return NextResponse.json({
          error: 'Media not found'
        }, { status: 404 });
      }

      // Get the file blob using the correct Jazz API
      let blob;
      try {
        // Try different methods based on what's available in the Jazz FileStream
        if (typeof (fileStream as any).getBlob === 'function') {
          blob = await (fileStream as any).getBlob();
        } else if (typeof (fileStream as any).toBlob === 'function') {
          blob = await (fileStream as any).toBlob();
        } else if (typeof (fileStream as any).asBlob === 'function') {
          blob = await (fileStream as any).asBlob();
        } else {
          // Try accessing the blob directly if available
          blob = (fileStream as any).blob || (fileStream as any)._blob;
        }
      } catch (blobError) {
        console.error('❌ Error getting blob from FileStream:', blobError);
        return NextResponse.json({
          error: 'Failed to access media content',
          details: blobError instanceof Error ? blobError.message : 'Unknown error'
        }, { status: 500 });
      }
      
      if (!blob) {
        return NextResponse.json({
          error: 'Media content not available'
        }, { status: 404 });
      }

      // Determine content type from blob type or default to image
      let contentType = blob.type || 'image/jpeg';
      
      // If blob.type is empty, try to guess from common patterns
      if (!contentType || contentType === 'application/octet-stream') {
        contentType = 'image/jpeg'; // Safe default
      }

      console.log('✅ Serving media:', {
        mediaId,
        contentType,
        size: blob.size
      });

      // Convert blob to array buffer
      const buffer = await blob.arrayBuffer();

      // Return the media with proper headers for external access
      return new Response(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Disposition': `inline; filename="media.${contentType.split('/')[1] || 'jpg'}"`,
        }
      });

    } catch (jazzError) {
      console.error('❌ Jazz error loading media:', jazzError);
      return NextResponse.json({
        error: 'Failed to load media from Jazz',
        details: jazzError instanceof Error ? jazzError.message : 'Unknown Jazz error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Media serving error:', error);
    return NextResponse.json({
      error: 'Media serving failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
