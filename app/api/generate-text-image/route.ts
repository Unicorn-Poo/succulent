import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

interface TextImageRequest {
  text: string;
  platform?: string;
  scheme?: number;
  useAI?: boolean; // New: use AI to generate a hook/theme
  brandName?: string;
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
 * Use AI to generate a punchy hook/theme for the image
 * This creates something thematic rather than just the first sentence
 */
async function generateImageHook(fullContent: string, brandName?: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system: `You create punchy, memorable hooks for social media images.
      
Rules:
- Output ONLY the hook text (5-12 words ideal)
- Capture the THEME or KEY INSIGHT, not a literal summary
- Make it quotable and shareable
- NO hashtags, NO emojis, NO URLs
- NO em-dashes (—)
- Think: what would make someone stop scrolling?
${brandName ? `- Brand voice: ${brandName}` : ""}

Examples of good hooks:
- "Your morning routine is lying to you"
- "The gap between wanting and doing"
- "Simple doesn't mean easy"
- "What nobody tells you about growth"`,
      prompt: `Create a punchy image hook for this post:\n\n${fullContent.slice(0, 500)}`,
      temperature: 0.7,
    });
    
    // Clean and return
    return text.trim().replace(/^["']|["']$/g, ""); // Remove quotes if AI added them
  } catch (error) {
    console.error("AI hook generation failed, falling back to extraction:", error);
    return extractImageText(fullContent);
  }
}

/**
 * Extract the key message from post content (fallback method)
 * Removes hashtags, mentions, URLs, emojis, and CTAs
 * Returns a clean, punchy quote for the image
 */
function extractImageText(fullContent: string): string {
  let text = fullContent;
  
  // Remove hashtags
  text = text.replace(/#\w+/g, "");
  
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, "");
  
  // Remove mentions
  text = text.replace(/@\w+/g, "");
  
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, "");
  text = text.replace(/[\u{2600}-\u{26FF}]/gu, "");
  text = text.replace(/[\u{2700}-\u{27BF}]/gu, "");
  
  // Remove common CTA phrases
  const ctaPhrases = [
    /check out .*/i,
    /click the link .*/i,
    /link in bio.*/i,
    /follow for more.*/i,
    /share this.*/i,
    /tag someone.*/i,
    /download .*/i,
    /try .* today.*/i,
    /sign up.*/i,
    /learn more.*/i,
  ];
  for (const phrase of ctaPhrases) {
    text = text.replace(phrase, "");
  }
  
  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  // Get first sentence or first 100 chars if no sentence ending
  const firstSentence = text.match(/^[^.!?]+[.!?]/);
  if (firstSentence && firstSentence[0].length > 20) {
    text = firstSentence[0].trim();
  } else if (text.length > 100) {
    // Find a good break point
    const breakPoint = text.lastIndexOf(" ", 100);
    text = text.slice(0, breakPoint > 50 ? breakPoint : 100) + "...";
  }
  
  return text;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/generate-text-image
 * Returns a URL to the Vercel OG text image endpoint
 * Uses AI to generate a thematic hook, or extracts from content
 */
export async function POST(request: NextRequest) {
  try {
    const body: TextImageRequest = await request.json();
    const { text, platform = "instagram", scheme, useAI = true, brandName } = body;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Generate image text - use AI for thematic hook, or fallback to extraction
    const imageText = useAI 
      ? await generateImageHook(text, brandName)
      : extractImageText(text);

    // Get the base URL (works in both dev and production)
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    // Build the image URL with query params
    const params = new URLSearchParams({
      text: imageText,
      platform: platform.toLowerCase(),
    });
    
    if (scheme !== undefined) {
      params.set("scheme", scheme.toString());
    }

    const imageUrl = `${baseUrl}/api/text-image?${params.toString()}`;
    
    // Get dimensions for response
    const dimensions = PLATFORM_SIZES[platform.toLowerCase()] || PLATFORM_SIZES.instagram;

    return NextResponse.json({
      success: true,
      imageUrl,
      imageText,  // Return the extracted text so UI can show it
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

