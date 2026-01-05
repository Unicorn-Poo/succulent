import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { DEFAULT_MEDIA_FORMAT, MediaFormat } from "@/utils/mediaProxy";

/**
 * Convert problematic media URLs to Ayrshare-compatible formats
 * This endpoint downloads the media and re-serves it in a format Ayrshare can process
 *
 * Handles URLs like:
 * - /api/convert-media-url/https%3A%2F%2Flunary.app%2Fapi%2Fog%2F...png (path-based)
 * - /api/convert-media-url?url=https://lunary.app/api/og/... (query param)
 */

async function fetchAndServeImage(
  mediaUrl: string,
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): Promise<Response> {
  console.log("🔄 Converting media URL for Ayrshare compatibility:", mediaUrl);

  // Check if it's a Lunary OG image URL
  if (mediaUrl.includes("lunary.app/api/og/")) {
    console.log("🔍 [LUNARY FETCH] Fetching Lunary OG image at publish time:", {
      url: mediaUrl,
      timestamp: new Date().toISOString(),
      warning: "⚠️ This image may differ from the one shown when scheduled if Lunary generates dynamic images"
    });
    try {
      // Download the image from Lunary with proper headers
      const response = await fetch(mediaUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Succulent/1.0)",
          Accept: "image/png, image/jpeg, image/webp, image/*",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const originalContentType =
        response.headers.get("content-type") || "image/png";

      if (!originalContentType.startsWith("image/")) {
        throw new Error(
          `Invalid content type: ${originalContentType}. Expected image.`
        );
      }

      console.log(
        "✅ Downloaded image:",
        buffer.byteLength,
        "bytes, type:",
        originalContentType
      );

      let outputBuffer = buffer;
      let outputContentType = originalContentType;
      if (format === "jpg") {
        try {
          outputBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
          outputContentType = "image/jpeg";
          console.log(
            "🎨 Converted image to JPEG for TikTok compatibility",
            outputBuffer.byteLength
          );
        } catch (conversionError) {
          console.warn(
            "⚠️ Failed to convert image to JPG, serving original instead:",
            conversionError
          );
        }
      }

      return new Response(outputBuffer, {
        headers: {
          "Content-Type": outputContentType,
          "Content-Length": outputBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } catch (error) {
      console.error("❌ Error downloading Lunary image:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to download image from Lunary",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  // For other URLs, redirect to original URL
  return NextResponse.redirect(mediaUrl);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = new URL(request.url);

  // Try query param first
  let mediaUrl = url.searchParams.get("url");
  let requestedFormat: MediaFormat = DEFAULT_MEDIA_FORMAT;
  const formatParam = url.searchParams.get("format");
  if (formatParam === "jpg" || formatParam === "png") {
    requestedFormat = formatParam as MediaFormat;
  }

  // If not in query params, extract from path
  // Format: /api/convert-media-url/[encoded-url].png
  if (!mediaUrl && path && path.length > 0) {
    // Join path segments and remove file extension
    let pathString = path.join("/");

    const extensionMatch = pathString.match(/\.(png|jpe?g|webp|gif)$/i);
    if (extensionMatch) {
      const ext = extensionMatch[1].toLowerCase();
      requestedFormat = ext.startsWith("jpg") ? "jpg" : "png";
      pathString = pathString.slice(0, extensionMatch.index);
    }

    try {
      // Decode the URL - it was encoded with encodeURIComponent
      // CRITICAL: This must preserve all query parameters exactly as-is
      mediaUrl = decodeURIComponent(pathString);
      
      // Verify the decoded URL is valid and log for debugging
      if (mediaUrl.includes("lunary.app/api/og/")) {
        console.log("🔍 [LUNARY URL DECODED]", {
          originalEncoded: pathString.substring(0, 100) + "...",
          decoded: mediaUrl,
          hasQueryParams: mediaUrl.includes("?"),
          queryParams: mediaUrl.includes("?") ? mediaUrl.split("?")[1] : "none",
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      console.warn("⚠️ Failed to decode URL from path:", pathString);
      mediaUrl = pathString;
    }
  }

  if (!mediaUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  return fetchAndServeImage(mediaUrl, requestedFormat);
}

export async function POST(request: NextRequest) {
  try {
    const { mediaUrl, format } = await request.json();

    if (!mediaUrl) {
      return NextResponse.json(
        { success: false, error: "mediaUrl is required" },
        { status: 400 }
      );
    }

    const requestedFormat =
      format === "jpg" ? "jpg" : format === "png" ? "png" : DEFAULT_MEDIA_FORMAT;
    return fetchAndServeImage(mediaUrl, requestedFormat);
  } catch (error) {
    console.error("❌ Media conversion error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Media conversion failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
