import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateImageRequest {
  prompt: string;
  platform?: string;
  style?: "natural" | "vivid";
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}

/**
 * Platform-specific image dimensions
 */
const PLATFORM_SIZES: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
  instagram: "1024x1024", // Square for feed posts
  facebook: "1792x1024", // Landscape
  linkedin: "1792x1024", // Landscape
  twitter: "1792x1024", // Landscape
  x: "1792x1024",
  pinterest: "1024x1792", // Portrait (Pinterest loves tall images)
  tiktok: "1024x1792", // Portrait for TikTok covers
  youtube: "1792x1024", // Landscape for thumbnails
};

/**
 * POST /api/generate-image
 * Generate an AI image using DALL-E 3
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();
    const { prompt, platform, style = "natural", size } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Determine image size based on platform or use provided size
    const imageSize = size || (platform ? PLATFORM_SIZES[platform.toLowerCase()] : "1024x1024") || "1024x1024";

    console.log("🎨 [GENERATE-IMAGE] Creating image:", {
      promptPreview: prompt.slice(0, 100),
      platform,
      size: imageSize,
      style,
    });

    // Generate image with DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create a professional, high-quality social media image: ${prompt}. Style: clean, modern, visually striking. Avoid text in the image unless specifically requested.`,
      n: 1,
      size: imageSize,
      style: style,
      quality: "standard", // Use "hd" for higher quality (costs more)
    });

    const imageUrl = response.data[0]?.url;
    const revisedPrompt = response.data[0]?.revised_prompt;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    console.log("✅ [GENERATE-IMAGE] Image created successfully");

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt,
      size: imageSize,
      platform,
    });
  } catch (error: any) {
    console.error("❌ [GENERATE-IMAGE] Error:", error);

    // Handle specific OpenAI errors
    if (error?.code === "content_policy_violation") {
      return NextResponse.json(
        { error: "Content policy violation - try a different prompt" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

