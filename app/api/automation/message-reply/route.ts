import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

interface MessageReplyRequest {
  messageContent: string;
  senderUsername: string;
  platform: string;
  conversationContext?: string[];
  brandPersona?: {
    tone: string;
    personality: string[];
    writingStyle?: string;
    emojiUsage?: string;
  };
  numberOfSuggestions?: number;
}

interface SuggestedReply {
  id: string;
  content: string;
  tone: "casual" | "professional" | "friendly";
  confidence: number;
}

/**
 * Generate multiple AI-powered reply suggestions for a DM
 */
async function generateReplySuggestions(
  messageContent: string,
  senderUsername: string,
  platform: string,
  brandPersona?: MessageReplyRequest["brandPersona"],
  conversationContext?: string[],
  numberOfSuggestions: number = 3
): Promise<SuggestedReply[]> {
  const tone = brandPersona?.tone || "friendly";
  const personality =
    brandPersona?.personality?.join(", ") || "helpful, authentic, engaging";
  const writingStyle = brandPersona?.writingStyle || "conversational";
  const emojiUsage = brandPersona?.emojiUsage || "minimal";

  const contextSection = conversationContext?.length
    ? `\nRECENT CONVERSATION CONTEXT:\n${conversationContext.map((msg, i) => `${i + 1}. ${msg}`).join("\n")}`
    : "";

  const prompt = `You are a social media manager responding to a direct message on ${platform} on behalf of a brand.

BRAND VOICE:
- Tone: ${tone}
- Personality: ${personality}
- Writing style: ${writingStyle}
- Emoji usage: ${emojiUsage}
${contextSection}

MESSAGE TO RESPOND TO:
From: @${senderUsername}
Message: "${messageContent}"

Generate ${numberOfSuggestions} different reply suggestions that:
1. Directly address the sender's message
2. Match the brand voice
3. Are appropriate for a DM context (more personal than public comments)
4. Vary in tone: one casual, one professional, one friendly
5. Are concise (1-3 sentences each)
6. Use emojis appropriately based on brand guidelines

Return ONLY a JSON array with exactly ${numberOfSuggestions} objects, each with these fields:
- content: the reply text
- tone: "casual" | "professional" | "friendly"
- confidence: a number from 0 to 100 indicating how well it matches the brand voice

Example format:
[
  {"content": "Hey! Thanks for reaching out...", "tone": "casual", "confidence": 85},
  {"content": "Thank you for your message...", "tone": "professional", "confidence": 90},
  {"content": "So glad to hear from you...", "tone": "friendly", "confidence": 88}
]`;

  try {
    const { text } = await generateText({
      model: openai("gpt-4"),
      prompt,
      temperature: 0.8,
    });

    // Parse the JSON response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in response");
    }

    const suggestions = JSON.parse(jsonMatch[0]);
    
    return suggestions.map((s: any, index: number) => ({
      id: `suggestion-${Date.now()}-${index}`,
      content: s.content,
      tone: s.tone || "friendly",
      confidence: s.confidence || 75,
    }));
  } catch (error) {
    console.error("AI reply generation error:", error);
    // Return fallback suggestions
    return [
      {
        id: `fallback-1-${Date.now()}`,
        content: `Hi @${senderUsername}! Thanks for reaching out. How can we help you today?`,
        tone: "friendly" as const,
        confidence: 60,
      },
      {
        id: `fallback-2-${Date.now()}`,
        content: `Thank you for your message, @${senderUsername}. We appreciate you contacting us.`,
        tone: "professional" as const,
        confidence: 60,
      },
      {
        id: `fallback-3-${Date.now()}`,
        content: `Hey! Great to hear from you. Let me know if you need anything! 👋`,
        tone: "casual" as const,
        confidence: 60,
      },
    ];
  }
}

/**
 * POST /api/automation/message-reply
 * Generate AI-powered reply suggestions for a direct message
 */
export async function POST(request: NextRequest) {
  try {
    const body: MessageReplyRequest = await request.json();
    const {
      messageContent,
      senderUsername,
      platform,
      conversationContext,
      brandPersona,
      numberOfSuggestions = 3,
    } = body;

    if (!messageContent || !senderUsername || !platform) {
      return NextResponse.json(
        { error: "messageContent, senderUsername, and platform are required" },
        { status: 400 }
      );
    }

    // Generate AI reply suggestions
    const suggestions = await generateReplySuggestions(
      messageContent,
      senderUsername,
      platform,
      brandPersona,
      conversationContext,
      numberOfSuggestions
    );

    return NextResponse.json({
      success: true,
      suggestions,
      platform,
      originalMessage: {
        content: messageContent,
        sender: senderUsername,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Message reply API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate reply suggestions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

