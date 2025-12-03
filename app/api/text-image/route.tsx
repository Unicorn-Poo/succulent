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

// Color schemes with more variety
const SCHEMES = [
  { bg1: "#1a2e05", bg2: "#365314", accent: "#84cc16", accent2: "#a3e635" }, // Lime
  { bg1: "#1e1b4b", bg2: "#3730a3", accent: "#a855f7", accent2: "#c084fc" }, // Purple  
  { bg1: "#0c1929", bg2: "#1e3a5f", accent: "#3b82f6", accent2: "#60a5fa" }, // Blue
  { bg1: "#1c1917", bg2: "#44403c", accent: "#f97316", accent2: "#fb923c" }, // Orange
  { bg1: "#1f1218", bg2: "#4a1d35", accent: "#ec4899", accent2: "#f472b6" }, // Pink
  { bg1: "#042f2e", bg2: "#134e4a", accent: "#14b8a6", accent2: "#2dd4bf" }, // Teal
  { bg1: "#18181b", bg2: "#3f3f46", accent: "#fafafa", accent2: "#a1a1aa" }, // Dark
  { bg1: "#450a0a", bg2: "#7f1d1d", accent: "#ef4444", accent2: "#f87171" }, // Red
  { bg1: "#1e3a5f", bg2: "#1e1b4b", accent: "#818cf8", accent2: "#a5b4fc" }, // Indigo
];

// Different visual styles/layouts
const STYLES = [
  "centered",      // Classic centered text
  "left-aligned",  // Text aligned left with accent bar
  "split",         // Diagonal split background
  "corner-accent", // Large accent shape in corner
  "minimal",       // Clean minimal with just text
  "bold-quote",    // Big quote marks
  "geometric",     // Geometric shapes background
  "gradient-orb",  // Gradient orb/blob effect
];

/**
 * GET /api/text-image
 * Generate a text-based image using Vercel OG with varied styles
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const text = searchParams.get("text") || "Your content here";
    const platform = searchParams.get("platform")?.toLowerCase() || "instagram";
    const schemeIndex = searchParams.get("scheme");
    const styleIndex = searchParams.get("style");

    // Get dimensions
    const size = SIZES[platform] || SIZES.instagram;
    const isPortrait = size.height > size.width;

    // Get color scheme (random if not specified)
    const scheme = schemeIndex 
      ? SCHEMES[parseInt(schemeIndex) % SCHEMES.length]
      : SCHEMES[Math.floor(Math.random() * SCHEMES.length)];

    // Get style (random if not specified)
    const style = styleIndex
      ? STYLES[parseInt(styleIndex) % STYLES.length]
      : STYLES[Math.floor(Math.random() * STYLES.length)];

    // Clean text
    const cleanText = text
      .replace(/#\w+/g, "")
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
      .trim()
      .slice(0, 200);

    // Calculate font size based on text length and dimensions
    const baseSize = isPortrait ? 52 : 48;
    const fontSize = cleanText.length > 100 ? baseSize * 0.75 : cleanText.length > 60 ? baseSize * 0.9 : baseSize;

    // Render based on style
    return new ImageResponse(
      renderStyle(style, cleanText, scheme, size, isPortrait, fontSize),
      { width: size.width, height: size.height }
    );
  } catch (error) {
    console.error("Error generating text image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}

function renderStyle(
  style: string,
  text: string,
  scheme: typeof SCHEMES[0],
  size: { width: number; height: number },
  isPortrait: boolean,
  fontSize: number
) {
  const { width, height } = size;

  switch (style) {
    case "left-aligned":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: scheme.bg1, position: "relative" }}>
          {/* Accent bar on left */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 12, background: scheme.accent }} />
          {/* Gradient overlay */}
          <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${scheme.bg1} 0%, ${scheme.bg2} 100%)`, opacity: 0.8 }} />
          {/* Text */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 80px", paddingLeft: 60, zIndex: 1 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "left", maxWidth: "85%" }}>
              {text}
            </p>
          </div>
          {/* Corner decoration */}
          <div style={{ position: "absolute", bottom: 40, right: 40, width: 80, height: 80, borderRadius: "50%", background: scheme.accent, opacity: 0.2 }} />
        </div>
      );

    case "split":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: scheme.bg1, position: "relative", overflow: "hidden" }}>
          {/* Right side darker */}
          <div style={{ 
            position: "absolute", 
            top: 0, 
            right: 0, 
            width: "60%", 
            height: "100%", 
            background: scheme.bg2,
          }} />
          {/* Accent stripe */}
          <div style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "40%",
            width: 6,
            background: scheme.accent,
          }} />
          {/* Small decorative circle */}
          <div style={{
            position: "absolute",
            bottom: "15%",
            right: "15%",
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: scheme.accent,
            opacity: 0.2,
          }} />
          {/* Text centered */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 80 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "75%" }}>
              {text}
            </p>
          </div>
        </div>
      );

    case "corner-accent":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: `linear-gradient(135deg, ${scheme.bg1} 0%, ${scheme.bg2} 100%)`, position: "relative" }}>
          {/* Large corner shape */}
          <div style={{
            position: "absolute",
            top: -height * 0.2,
            right: -width * 0.15,
            width: width * 0.6,
            height: width * 0.6,
            borderRadius: "50%",
            background: scheme.accent,
            opacity: 0.15,
          }} />
          {/* Smaller accent */}
          <div style={{
            position: "absolute",
            bottom: height * 0.1,
            left: width * 0.05,
            width: width * 0.15,
            height: width * 0.15,
            borderRadius: "50%",
            background: scheme.accent2,
            opacity: 0.2,
          }} />
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 80, zIndex: 1 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "85%" }}>
              {text}
            </p>
          </div>
        </div>
      );

    case "minimal":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: scheme.bg1, position: "relative" }}>
          {/* Just a subtle line */}
          <div style={{ position: "absolute", top: "50%", left: 60, width: 40, height: 3, background: scheme.accent, transform: "translateY(-50%)" }} />
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 80, paddingLeft: 120 }}>
            <p style={{ color: "#fff", fontSize: fontSize * 0.95, fontWeight: 600, lineHeight: 1.5, margin: 0, textAlign: "left", maxWidth: "85%" }}>
              {text}
            </p>
          </div>
        </div>
      );

    case "bold-quote":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: `linear-gradient(180deg, ${scheme.bg1} 0%, ${scheme.bg2} 100%)`, position: "relative" }}>
          {/* Giant quote marks */}
          <div style={{
            position: "absolute",
            top: isPortrait ? "12%" : "15%",
            left: "8%",
            fontSize: isPortrait ? 200 : 160,
            color: scheme.accent,
            opacity: 0.25,
            fontFamily: "Georgia, serif",
            lineHeight: 0.8,
          }}>
            "
          </div>
          <div style={{
            position: "absolute",
            bottom: isPortrait ? "12%" : "15%",
            right: "8%",
            fontSize: isPortrait ? 200 : 160,
            color: scheme.accent,
            opacity: 0.25,
            fontFamily: "Georgia, serif",
            lineHeight: 0.8,
            transform: "rotate(180deg)",
          }}>
            "
          </div>
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: isPortrait ? 100 : 80 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "80%", fontStyle: "italic" }}>
              {text}
            </p>
          </div>
        </div>
      );

    case "geometric":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: scheme.bg1, position: "relative", overflow: "hidden" }}>
          {/* Geometric shapes */}
          <div style={{ position: "absolute", top: "5%", right: "10%", width: 100, height: 100, background: scheme.accent, opacity: 0.15, transform: "rotate(45deg)" }} />
          <div style={{ position: "absolute", bottom: "15%", left: "5%", width: 60, height: 60, background: scheme.accent2, opacity: 0.2, transform: "rotate(12deg)" }} />
          <div style={{ position: "absolute", top: "40%", right: "5%", width: 40, height: 40, borderRadius: "50%", background: scheme.accent, opacity: 0.2 }} />
          <div style={{ position: "absolute", bottom: "5%", right: "30%", width: 80, height: 80, border: `3px solid ${scheme.accent}`, opacity: 0.15, transform: "rotate(30deg)" }} />
          <div style={{ position: "absolute", top: "60%", left: "15%", width: 30, height: 30, borderRadius: "50%", border: `2px solid ${scheme.accent2}`, opacity: 0.2 }} />
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 80, zIndex: 1 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "80%" }}>
              {text}
            </p>
          </div>
        </div>
      );

    case "gradient-orb":
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: scheme.bg1, position: "relative", overflow: "hidden" }}>
          {/* Gradient orbs */}
          <div style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: width * 0.7,
            height: width * 0.7,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${scheme.accent}40 0%, transparent 70%)`,
          }} />
          <div style={{
            position: "absolute",
            bottom: "-30%",
            right: "-20%",
            width: width * 0.8,
            height: width * 0.8,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${scheme.accent2}30 0%, transparent 70%)`,
          }} />
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: 80, zIndex: 1 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "85%", textShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
              {text}
            </p>
          </div>
        </div>
      );

    // Default: centered
    default:
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", background: `linear-gradient(135deg, ${scheme.bg1} 0%, ${scheme.bg2} 100%)`, position: "relative" }}>
          {/* Decorative elements */}
          <div style={{ position: "absolute", top: "8%", left: "8%", width: isPortrait ? 80 : 100, height: isPortrait ? 80 : 100, borderRadius: "50%", background: scheme.accent, opacity: 0.15 }} />
          <div style={{ position: "absolute", bottom: "12%", right: "10%", width: isPortrait ? 120 : 140, height: isPortrait ? 120 : 140, borderRadius: "50%", background: scheme.accent, opacity: 0.1 }} />
          {/* Text */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: isPortrait ? 80 : 60, zIndex: 1 }}>
            <p style={{ color: "#fff", fontSize, fontWeight: 700, lineHeight: 1.4, margin: 0, textAlign: "center", maxWidth: "90%", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              {text}
            </p>
          </div>
          {/* Accent line */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: scheme.accent, opacity: 0.8 }} />
        </div>
      );
  }
}

