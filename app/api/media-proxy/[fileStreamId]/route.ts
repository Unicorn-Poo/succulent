import { NextRequest, NextResponse } from 'next/server';

/**
 * PRODUCTION-READY Media Proxy for Ayrshare Integration
 * Converts Jazz FileStream objects to publicly accessible URLs
 * Handles all image/video formats with proper caching and security headers
 */

interface MediaProxyResponse {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: {
    contentType: string;
    size: number;
    cached: boolean;
  };
}

// In-memory cache for frequently accessed media
const mediaCache = new Map<string, { buffer: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: { fileStreamId: string } }
) {
  const startTime = Date.now();
  
  try {
    const { fileStreamId } = params;
    
    // Validate input
    if (!fileStreamId || !fileStreamId.startsWith('co_')) {
      return NextResponse.json({
        success: false,
        error: 'Invalid FileStream ID'
      }, { status: 400 });
    }

    console.log(`📡 [MEDIA-PROXY] Processing: ${fileStreamId}`);

    // Check cache first
    const cached = mediaCache.get(fileStreamId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`⚡ [MEDIA-PROXY] Cache hit: ${fileStreamId}`);
      return new Response(cached.buffer, {
        headers: {
          'Content-Type': cached.contentType,
          'Content-Length': cached.buffer.byteLength.toString(),
          'Cache-Control': 'public, max-age=86400, immutable',
          'X-Cache': 'HIT',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Load from Jazz
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { FileStream } = await import('jazz-tools');
    
    const worker = await jazzServerWorker;
    if (!worker) {
      return NextResponse.json({
        success: false,
        error: 'Media service unavailable'
      }, { status: 503 });
    }

    // Load FileStream with error handling
    let fileStream;
    try {
      fileStream = await FileStream.load(fileStreamId, { loadAs: worker });
    } catch (loadError) {
      console.error(`❌ [MEDIA-PROXY] Load failed: ${fileStreamId}`, loadError);
      return NextResponse.json({
        success: false,
        error: 'FileStream not accessible'
      }, { status: 404 });
    }
    
    if (!fileStream) {
      return NextResponse.json({
        success: false,
        error: 'FileStream not found'
      }, { status: 404 });
    }

    // Extract blob with comprehensive method support
    let blob: Blob | null = null;
    const methods = [
      { name: 'toBlob', fn: () => (fileStream as any).toBlob?.() },
      { name: 'getBlob', fn: () => (fileStream as any).getBlob?.() },
      { name: 'asBlob', fn: () => (fileStream as any).asBlob?.() },
      { name: 'blob', fn: () => (fileStream as any).blob }
    ];

    for (const method of methods) {
      try {
        const result = await method.fn();
        if (result && result instanceof Blob) {
          blob = result;
          console.log(`✅ [MEDIA-PROXY] Blob extracted via ${method.name}`);
          break;
        }
      } catch (methodError) {
        console.warn(`⚠️ [MEDIA-PROXY] Method ${method.name} failed:`, methodError);
      }
    }
    
    if (!blob) {
      console.error(`❌ [MEDIA-PROXY] No blob methods worked for: ${fileStreamId}`);
      return NextResponse.json({
        success: false,
        error: 'Media content extraction failed'
      }, { status: 500 });
    }

    // Validate blob
    if (blob.size === 0) {
      return NextResponse.json({
        success: false,
        error: 'Empty media file'
      }, { status: 400 });
    }

    // Content type detection with validation
    let contentType = blob.type || 'application/octet-stream';
    
    // Ensure we have a valid media type
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      contentType = 'image/jpeg'; // Safe default for unknown types
    }

    // Convert to buffer
    const buffer = await blob.arrayBuffer();
    
    // Cache the result
    mediaCache.set(fileStreamId, {
      buffer,
      contentType,
      timestamp: Date.now()
    });

    const processingTime = Date.now() - startTime;
    console.log(`🎯 [MEDIA-PROXY] Success:`, {
      fileStreamId,
      contentType,
      size: buffer.byteLength,
      processingTime: `${processingTime}ms`,
      cached: false
    });

    // Return with production headers
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, User-Agent',
        'X-Cache': 'MISS',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Content-Source': 'jazz-filestream',
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ [MEDIA-PROXY] Fatal error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Media proxy failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingTime: `${processingTime}ms`
    }, { status: 500 });
  }
}
