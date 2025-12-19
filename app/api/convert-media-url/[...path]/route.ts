import { NextRequest, NextResponse } from "next/server";

/**
 * Convert problematic media URLs to Ayrshare-compatible formats
 * This endpoint downloads the media and re-serves it in a format Ayrshare can process
 *
 * Handles URLs like:
 * - /api/convert-media-url/https%3A%2F%2Flunary.app%2Fapi%2Fog%2F...png (path-based)
 * - /api/convert-media-url?url=https://lunary.app/api/og/... (query param)
 */

async function fetchAndServeImage(mediaUrl: string): Promise<Response> {
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

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/png";

      // Validate that we got an image
      if (!contentType.startsWith("image/")) {
        throw new Error(`Invalid content type: ${contentType}. Expected image.`);
      }

      console.log(
        "✅ Downloaded image:",
        buffer.byteLength,
        "bytes, type:",
        contentType
      );

      // Return the image directly with proper headers for Ayrshare
      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": buffer.byteLength.toString(),
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

  // If not in query params, extract from path
  // Format: /api/convert-media-url/[encoded-url].png
  if (!mediaUrl && path && path.length > 0) {
    // Join path segments and remove file extension
    let pathString = path.join("/");

    // Remove file extension (.png, .jpg, etc.)
    pathString = pathString.replace(/\.(png|jpg|jpeg|webp|gif)$/i, "");

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

  return fetchAndServeImage(mediaUrl);
}

export async function POST(request: NextRequest) {
  try {
    const { mediaUrl } = await request.json();

    if (!mediaUrl) {
      return NextResponse.json(
        { success: false, error: "mediaUrl is required" },
        { status: 400 }
      );
    }

    return fetchAndServeImage(mediaUrl);
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

