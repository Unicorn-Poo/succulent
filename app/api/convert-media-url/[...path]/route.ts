import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { DEFAULT_MEDIA_FORMAT, MediaFormat } from "@/utils/mediaProxy";

/**
 * Convert problematic media URLs to Ayrshare-compatible formats
 * This endpoint downloads the media and re-serves it in a format Ayrshare can process
 *
 * Handles URLs like:
 * - /api/convert-media-url?u=<base64url>&format=png (query param)
 * - /api/convert-media-url?url=https://lunary.app/api/og/... (legacy query param)
 * - /api/convert-media-url/https%3A%2F%2Flunary.app%2Fapi%2Fog%2F...png (path-based, legacy)
 */

function isValidMediaUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function normalizeUrlFromPathParts(parts: string[]): string | null {
  if (!parts.length) return null;
  if (parts[0] === "http:" || parts[0] === "https:") {
    if (parts.length >= 2 && parts[1] === "") {
      return `${parts[0]}//${parts.slice(2).join("/")}`;
    }
    return `${parts[0]}//${parts.slice(1).join("/")}`;
  }
  return parts.join("/");
}

async function fetchAndServeImage(
  mediaUrl: string,
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): Promise<Response> {
  if (!isValidMediaUrl(mediaUrl)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid media URL",
        details: "URL must be absolute and start with http(s).",
      },
      { status: 400 }
    );
  }

  console.log("🔄 Converting media URL for Ayrshare compatibility:", mediaUrl);

  // Check if it's a Lunary OG image URL
  if (mediaUrl.includes("lunary.app/api/og/")) {
    console.log("🔍 [LUNARY FETCH] Fetching Lunary OG image at publish time:", {
      url: mediaUrl,
      timestamp: new Date().toISOString(),
      warning:
        "⚠️ This image may differ from the one shown when scheduled if Lunary generates dynamic images",
    });
    try {
      // Download the image from Lunary with proper headers
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12_000);
      const response = await fetch(mediaUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Succulent/1.0)",
          Accept: "image/png, image/jpeg, image/webp, image/*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`
        );
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && Number(contentLength) > 8_000_000) {
        return NextResponse.json(
          {
            success: false,
            error: "Image too large",
            details: "Media exceeds 8MB limit.",
          },
          { status: 413 }
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > 8_000_000) {
        return NextResponse.json(
          {
            success: false,
            error: "Image too large",
            details: "Media exceeds 8MB limit.",
          },
          { status: 413 }
        );
      }
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

      let outputBuffer: Buffer = buffer;
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

      return new Response(Buffer.from(outputBuffer), {
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

export async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path } = await params;
  console.log("🔎 Proxy hit", {
    url: request.url,
    ua: request.headers.get("user-agent"),
    forward: request.headers.get("x-forwarded-for"),
  });
  const url = new URL(request.url);

  // Try query param first
  let mediaUrl = url.searchParams.get("url");
  const encodedParam = url.searchParams.get("u");
  if (encodedParam) {
    const decoded = decodeBase64Url(encodedParam);
    if (decoded) {
      mediaUrl = decoded;
    }
  }
  let requestedFormat: MediaFormat = DEFAULT_MEDIA_FORMAT;
  const formatParam = url.searchParams.get("format");
  if (formatParam === "jpg" || formatParam === "png") {
    requestedFormat = formatParam as MediaFormat;
  }

  // If not in query params, extract from path
  // Format: /api/convert-media-url/[encoded-url].png
  if (!mediaUrl) {
    const proxyPrefix = "/api/convert-media-url/";
    const rawPath = request.nextUrl.pathname.startsWith(proxyPrefix)
      ? request.nextUrl.pathname.slice(proxyPrefix.length)
      : path.join("/");
    console.log("🔍 Raw encoded path:", rawPath);

    if (rawPath) {
      let pathString = rawPath;

      const extensionMatch = pathString.match(/\.(png|jpe?g|webp|gif)$/i);
      if (extensionMatch) {
        const ext = extensionMatch[1].toLowerCase();
        requestedFormat = ext.startsWith("jpg") ? "jpg" : "png";
        pathString = pathString.slice(0, extensionMatch.index);
      }

      try {
        mediaUrl = decodeURIComponent(pathString);
      } catch (decodeError) {
        console.warn("⚠️ Failed to decode URL from path:", pathString, {
          error: decodeError instanceof Error ? decodeError.message : decodeError,
        });
        mediaUrl = pathString;
      }
    }
  }

  if (!mediaUrl) {
    const normalized = normalizeUrlFromPathParts(path);
    if (normalized) {
      mediaUrl = normalized;
    }
  }

  if (!mediaUrl) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  if (!isValidMediaUrl(mediaUrl)) {
    console.warn("⚠️ Invalid media URL received:", mediaUrl);
    return NextResponse.json(
      { error: "Invalid url parameter" },
      { status: 400 }
    );
  }

  return fetchAndServeImage(mediaUrl, requestedFormat);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const response = await handleRequest(request, context);
  return new Response(null, {
    status: response.status,
    headers: response.headers,
  });
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

    if (!isValidMediaUrl(mediaUrl)) {
      return NextResponse.json(
        { success: false, error: "mediaUrl must be an absolute http(s) URL" },
        { status: 400 }
      );
    }

    const requestedFormat =
      format === "jpg"
        ? "jpg"
        : format === "png"
        ? "png"
        : DEFAULT_MEDIA_FORMAT;
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
