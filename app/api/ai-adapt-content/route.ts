import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const dynamic = "force-dynamic";

// Platform character limits and requirements
const PLATFORM_LIMITS: Record<string, { maxChars: number; description: string }> = {
  x: { maxChars: 280, description: "X/Twitter - punchy, direct, under 280 chars, 1-2 hashtags max" },
  twitter: { maxChars: 280, description: "Twitter - punchy, direct, under 280 chars, 1-2 hashtags max" },
  instagram: { maxChars: 2200, description: "Instagram - hook + value + CTA, line breaks for readability, 5-10 hashtags at end" },
  facebook: { maxChars: 63206, description: "Facebook - conversational, can be longer form, engagement-focused" },
  linkedin: { maxChars: 3000, description: "LinkedIn - professional but personable, insights/lessons, 3-5 hashtags" },
  tiktok: { maxChars: 150, description: "TikTok - SHORT caption only (not a script), punchy one-liner, 3-5 hashtags" },
  threads: { maxChars: 500, description: "Threads - conversational, Instagram-style but shorter" },
  bluesky: { maxChars: 300, description: "Bluesky - similar to Twitter, concise and engaging" },
  pinterest: { maxChars: 500, description: "Pinterest - descriptive, keyword-rich, inspirational" },
  youtube: { maxChars: 5000, description: "YouTube - detailed description, timestamps encouraged" },
};

interface AdaptContentRequest {
  content: string;
  platforms: string[];
  brandContext?: string;
  preserveHashtags?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdaptContentRequest = await request.json();
    const { content, platforms, brandContext, preserveHashtags = true } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    if (!platforms?.length) {
      return NextResponse.json({ error: "At least one platform is required" }, { status: 400 });
    }

    const adaptedContent: Record<string, { content: string; charCount: number; withinLimit: boolean }> = {};

    // Process platforms in parallel for speed
    await Promise.all(
      platforms.map(async (platform) => {
        const platformKey = platform.toLowerCase();
        const limits = PLATFORM_LIMITS[platformKey];

        if (!limits) {
          // Unknown platform - return original content
          adaptedContent[platform] = {
            content,
            charCount: content.length,
            withinLimit: true,
          };
          return;
        }

        // If content is already within limits, minor optimization only
        if (content.length <= limits.maxChars) {
          // Still run through AI for platform-specific formatting
          const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            system: `You are a social media expert. Optimize this content for ${platform}.
            
Rules:
- Keep the SAME message and meaning
- Apply platform-specific formatting (${limits.description})
- ${preserveHashtags ? "Keep relevant hashtags, move to end if needed" : "Remove hashtags"}
- DO NOT add new information
- DO NOT use markdown formatting
- DO NOT use em-dashes (—)
- Return ONLY the optimized post text, nothing else`,
            prompt: `Optimize for ${platform} (max ${limits.maxChars} chars):\n\n${content}`,
            temperature: 0.3,
          });

          adaptedContent[platform] = {
            content: text.trim(),
            charCount: text.trim().length,
            withinLimit: text.trim().length <= limits.maxChars,
          };
        } else {
          // Content exceeds limit - need to condense
          const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            system: `You are a social media expert. CONDENSE this content for ${platform}.

CRITICAL: The output MUST be under ${limits.maxChars} characters.

Rules:
- Preserve the CORE message - what's the one key point?
- ${limits.description}
- ${preserveHashtags ? "Keep 1-2 most relevant hashtags only" : "Remove all hashtags"}
- Cut fluff, keep impact
- DO NOT use markdown
- DO NOT use em-dashes (—)
- Return ONLY the condensed post text, nothing else`,
            prompt: `CONDENSE to under ${limits.maxChars} chars for ${platform}:\n\n${content}`,
            temperature: 0.4,
          });

          let finalText = text.trim();
          
          // Safety check - if still over limit, truncate intelligently
          if (finalText.length > limits.maxChars) {
            // Find last complete sentence or phrase that fits
            const cutoff = limits.maxChars - 3; // Leave room for "..."
            const lastSpace = finalText.lastIndexOf(" ", cutoff);
            const lastPeriod = finalText.lastIndexOf(".", cutoff);
            const lastQuestion = finalText.lastIndexOf("?", cutoff);
            const lastExclaim = finalText.lastIndexOf("!", cutoff);
            
            const bestBreak = Math.max(lastPeriod, lastQuestion, lastExclaim);
            if (bestBreak > cutoff * 0.7) {
              finalText = finalText.slice(0, bestBreak + 1);
            } else if (lastSpace > cutoff * 0.7) {
              finalText = finalText.slice(0, lastSpace) + "...";
            } else {
              finalText = finalText.slice(0, cutoff) + "...";
            }
          }

          adaptedContent[platform] = {
            content: finalText,
            charCount: finalText.length,
            withinLimit: finalText.length <= limits.maxChars,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      original: {
        content,
        charCount: content.length,
      },
      adapted: adaptedContent,
    });
  } catch (error) {
    console.error("❌ [AI-ADAPT] Error:", error);
    return NextResponse.json(
      { error: "Failed to adapt content", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

