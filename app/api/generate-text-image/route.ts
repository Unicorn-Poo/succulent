import { NextRequest, NextResponse } from "next/server";

interface TextImageRequest {
  text: string;
  platform?: string;
  brandName?: string;
  scheme?: number;
}

// Platform-specific dimensions
const PLATFORM_SIZES: Record<string, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1080 },
  facebook: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  twitter: { width: 1200, height: 675 },
  x: { width: 1200, height: 675 },
  pinterest: { width: 1000, height: 1500 },
  tiktok: { width: 1080, height: 1920 },
};

/**
 * POST /api/generate-text-image
 * Returns a URL to the Vercel OG text image endpoint
 * The URL itself IS the image - Ayrshare can fetch it directly
 */
export async function POST(request: NextRequest) {
  try {
    const body: TextImageRequest = await request.json();
    const { text, platform = "instagram", brandName, scheme } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Get the base URL (works in both dev and production)
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // Build the image URL with query params
    const params = new URLSearchParams({
      text: text.slice(0, 200), // Limit text length
      platform: platform.toLowerCase(),
    });
    
    if (brandName) {
      params.set("brand", brandName);
    }
    
    if (scheme !== undefined) {
      params.set("scheme", scheme.toString());
    }

    const imageUrl = `${baseUrl}/api/text-image?${params.toString()}`;
    
    // Get dimensions for response
    const dimensions = PLATFORM_SIZES[platform.toLowerCase()] || PLATFORM_SIZES.instagram;

    return NextResponse.json({
      success: true,
      imageUrl,
      format: "png",
      width: dimensions.width,
      height: dimensions.height,
      platform,
    });
  } catch (error) {
    console.error("❌ [TEXT-IMAGE] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate text image URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

