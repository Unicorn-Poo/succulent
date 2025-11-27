import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Ayrshare API base URL - Note: DM functionality varies by platform
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

interface DMRequest {
  recipientUsername: string;
  recipientId?: string;
  platform: string;
  profileKey?: string;
  messageType: "welcome" | "outreach" | "followup" | "custom";
  customMessage?: string;
  brandPersona?: {
    tone: string;
    personality: string[];
    targetAudience?: string;
  };
  context?: {
    isNewFollower?: boolean;
    previousInteraction?: string;
    recipientBio?: string;
  };
}

/**
 * Generate AI DM based on message type and brand persona
 */
async function generateAIDM(
  recipientUsername: string,
  messageType: DMRequest["messageType"],
  brandPersona?: DMRequest["brandPersona"],
  context?: DMRequest["context"]
): Promise<string> {
  const tone = brandPersona?.tone || "friendly";
  const personality =
    brandPersona?.personality?.join(", ") || "helpful, authentic";
  const targetAudience = brandPersona?.targetAudience || "general audience";

  let messagePrompt = "";

  switch (messageType) {
    case "welcome":
      messagePrompt = `Generate a warm welcome message for a new follower. 
Keep it brief, genuine, and inviting without being pushy.
${context?.recipientBio ? `Their bio mentions: ${context.recipientBio}` : ""}`;
      break;
    case "outreach":
      messagePrompt = `Generate a professional outreach message for potential collaboration.
Be respectful of their time, mention shared interests if known, and propose value.
${context?.recipientBio ? `Their bio mentions: ${context.recipientBio}` : ""}`;
      break;
    case "followup":
      messagePrompt = `Generate a friendly follow-up message.
Reference the previous interaction if known and provide value.
${
  context?.previousInteraction
    ? `Previous interaction: ${context.previousInteraction}`
    : ""
}`;
      break;
    default:
      messagePrompt = "Generate a friendly, professional direct message.";
  }

  const prompt = `You are writing a direct message on behalf of a brand on social media.

BRAND VOICE:
- Tone: ${tone}
- Personality: ${personality}
- Target audience: ${targetAudience}

RECIPIENT: @${recipientUsername}
${context?.isNewFollower ? "They just followed us." : ""}

TASK: ${messagePrompt}

Guidelines:
1. Keep it concise (2-4 sentences max)
2. Be genuine, not salesy
3. Don't use excessive emojis (0-2 max)
4. Make it feel personal, not automated
5. End with a soft call to action if appropriate

Message:`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      temperature: 0.8,
    });

    return text.trim();
  } catch (error) {
    console.error("AI DM generation error:", error);

    // Fallback messages by type
    const fallbacks: Record<string, string> = {
      welcome: `Hey @${recipientUsername}! Thanks for the follow! 🙌 Great to connect with you.`,
      outreach: `Hi @${recipientUsername}! I came across your profile and love what you're doing. Would love to connect!`,
      followup: `Hey @${recipientUsername}! Just wanted to check in and see how you're doing!`,
      custom: `Hey @${recipientUsername}! Thanks for connecting!`,
    };

    return fallbacks[messageType] || fallbacks.custom;
  }
}

/**
 * POST /api/automation/dm
 * Send an automated DM
 */
export async function POST(request: NextRequest) {
  try {
    const body: DMRequest = await request.json();
    const {
      recipientUsername,
      recipientId,
      platform,
      profileKey,
      messageType,
      customMessage,
      brandPersona,
      context,
    } = body;

    if (!recipientUsername || !platform || !messageType) {
      return NextResponse.json(
        { error: "recipientUsername, platform, and messageType are required" },
        { status: 400 }
      );
    }

    // Get API key from environment - check both possible variable names
    const apiKey = process.env.AYRSHARE_API_KEY || process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Ayrshare API key not configured. Set AYRSHARE_API_KEY or NEXT_PUBLIC_AYRSHARE_API_KEY in environment." },
        { status: 500 }
      );
    }

    // Generate message (use custom if provided, otherwise AI-generate)
    const message =
      customMessage ||
      (await generateAIDM(
        recipientUsername,
        messageType,
        brandPersona,
        context
      ));

    // Note: DM functionality through Ayrshare may be limited
    // This is a placeholder for when DM API is available
    // Currently, most platforms restrict automated DMs

    // For now, we'll return the generated message without sending
    // In production, you'd integrate with platform-specific DM APIs

    return NextResponse.json({
      success: true,
      status: "generated", // or "sent" when actually sending
      message,
      recipient: recipientUsername,
      platform,
      messageType,
      note: "DM functionality may be limited by platform restrictions. Consider manual sending for compliance.",
    });

    /* 
    // Future implementation when DM API is available:
    const dmPayload = {
      recipient: recipientId || recipientUsername,
      message,
      platform,
      ...(profileKey && { profileKey }),
    };

    const response = await fetch(`${AYRSHARE_API_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(dmPayload),
    });

    const result = await response.json();
    */
  } catch (error) {
    console.error("DM API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/automation/dm/templates
 * Get DM template suggestions
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const messageType = searchParams.get("type") || "all";

  const templates = {
    welcome: [
      "Hey! Thanks for the follow! 🙌 Great to connect with you.",
      "Welcome to the community! Really glad to have you here.",
      "Hey there! Thanks for following. Looking forward to sharing valuable content with you!",
    ],
    outreach: [
      "Hi! I love what you're creating. Would love to explore ways we could collaborate.",
      "Hey! Your content really resonates with our community. Let's connect!",
      "Hi there! I think our audiences would really benefit from each other. Open to chatting?",
    ],
    followup: [
      "Hey! Just wanted to check in and see if you had any questions.",
      "Hi! Hope you've been finding our content helpful. Any feedback?",
      "Hey there! We noticed you've been engaging - thanks! Anything we can help with?",
    ],
    engagement: [
      "Thanks for the love on our posts! Really appreciate your support.",
      "Your comments always brighten our day! Thanks for being part of the community.",
      "We see you! Thanks for being such an engaged follower.",
    ],
  };

  if (messageType === "all") {
    return NextResponse.json({ templates });
  }

  return NextResponse.json({
    type: messageType,
    templates: templates[messageType as keyof typeof templates] || [],
  });
}
