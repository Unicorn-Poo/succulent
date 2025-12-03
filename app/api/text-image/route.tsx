import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Platform dimensions
const SIZES: Record<string, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1080 },
  facebook: { width: 1200, height: 630 },
  linkedin: { width: 1200, height: 627 },
  twitter: { width: 1200, height: 675 },
  x: { width: 1200, height: 675 },
  pinterest: { width: 1000, height: 1500 },
  tiktok: { width: 1080, height: 1920 },
};

// Color schemes
const SCHEMES = [
  { bg1: "#1a2e05", bg2: "#365314", accent: "#84cc16" }, // Lime
  { bg1: "#1e1b4b", bg2: "#3730a3", accent: "#a855f7" }, // Purple  
  { bg1: "#0c1929", bg2: "#1e3a5f", accent: "#3b82f6" }, // Blue
  { bg1: "#1c1917", bg2: "#44403c", accent: "#f97316" }, // Orange
  { bg1: "#1f1218", bg2: "#4a1d35", accent: "#ec4899" }, // Pink
  { bg1: "#042f2e", bg2: "#134e4a", accent: "#14b8a6" }, // Teal
  { bg1: "#18181b", bg2: "#3f3f46", accent: "#fafafa" }, // Dark
];

/**
 * GET /api/text-image
 * Generate a text-based image using Vercel OG
 * 
 * Query params:
 * - text: The text to display (required)
 * - platform: instagram, pinterest, tiktok, etc (default: instagram)
 * - scheme: 0-6 for color scheme (default: random)
 * - brand: Brand name to show at bottom (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const text = searchParams.get("text") || "Your content here";
    const platform = searchParams.get("platform")?.toLowerCase() || "instagram";
    const schemeIndex = searchParams.get("scheme");
    const brand = searchParams.get("brand");

    // Get dimensions
    const size = SIZES[platform] || SIZES.instagram;
    const isPortrait = size.height > size.width;

    // Get color scheme (random if not specified)
    const scheme = schemeIndex 
      ? SCHEMES[parseInt(schemeIndex) % SCHEMES.length]
      : SCHEMES[Math.floor(Math.random() * SCHEMES.length)];

    // Clean text - remove hashtags and emojis for cleaner image
    const cleanText = text
      .replace(/#\w+/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      .trim()
      .slice(0, 200);

    // Calculate font size based on text length and dimensions
    const baseSize = isPortrait ? 48 : 44;
    const fontSize = cleanText.length > 100 ? baseSize * 0.8 : baseSize;

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(135deg, ${scheme.bg1} 0%, ${scheme.bg2} 100%)`,
            padding: isPortrait ? "80px 60px" : "60px 80px",
            position: "relative",
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: "absolute",
              top: "8%",
              left: "8%",
              width: isPortrait ? 80 : 100,
              height: isPortrait ? 80 : 100,
              borderRadius: "50%",
              background: scheme.accent,
              opacity: 0.15,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "12%",
              right: "10%",
              width: isPortrait ? 120 : 140,
              height: isPortrait ? 120 : 140,
              borderRadius: "50%",
              background: scheme.accent,
              opacity: 0.1,
            }}
          />

          {/* Quote mark */}
          <div
            style={{
              position: "absolute",
              top: isPortrait ? "15%" : "20%",
              left: isPortrait ? "10%" : "12%",
              fontSize: isPortrait ? 120 : 100,
              color: scheme.accent,
              opacity: 0.3,
              fontFamily: "Georgia, serif",
              lineHeight: 1,
            }}
          >
            "
          </div>

          {/* Main text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              maxWidth: "90%",
              zIndex: 1,
            }}
          >
            <p
              style={{
                color: "#ffffff",
                fontSize,
                fontWeight: 700,
                lineHeight: 1.4,
                margin: 0,
                textAlign: "center",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              {cleanText}
            </p>
          </div>

          {/* Brand name */}
          {brand && (
            <div
              style={{
                position: "absolute",
                bottom: isPortrait ? 60 : 40,
                color: scheme.accent,
                fontSize: 24,
                fontWeight: 500,
                opacity: 0.9,
              }}
            >
              {brand}
            </div>
          )}

          {/* Accent line at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 6,
              background: scheme.accent,
              opacity: 0.8,
            }}
          />
        </div>
      ),
      {
        width: size.width,
        height: size.height,
      }
    );
  } catch (error) {
    console.error("Error generating text image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}

