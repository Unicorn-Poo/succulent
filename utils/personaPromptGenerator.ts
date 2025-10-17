import { BrandPersona } from './brandPersonaManager';

export interface PersonaPromptInput {
  brandName: string;
  industry: string;
  targetAudience: string;
  brandDescription: string;
  personalityTraits: string;
  contentFocus: string;
  platforms: string[];
  additionalNotes?: string;
}

export interface ChatGPTPersonaResponse {
  name: string;
  description: string;
  voice: {
    tone: string;
    personality: string[];
    writingStyle: string;
    emojiUsage: string;
    languageLevel: string;
  };
  messaging: {
    keyMessages: string[];
    valueProposition: string;
    targetAudience: string;
    contentPillars: string[];
    avoidTopics: string[];
  };
  engagement: {
    commentStyle: string;
    dmApproach: string;
    hashtagStrategy: string;
    mentionStyle: string;
  };
  contentGuidelines: {
    postLength: string;
    contentMix: {
      educational: number;
      entertainment: number;
      promotional: number;
      personal: number;
    };
    callToActionStyle: string;
    questionFrequency: string;
  };
  platformCustomization: Record<string, any>;
  examples: {
    samplePosts: string[];
    sampleReplies: string[];
    sampleDMs: string[];
  };
}

/**
 * Generate a comprehensive ChatGPT prompt for creating brand persona
 */
export function generateChatGPTPersonaPrompt(input: PersonaPromptInput): string {
  return `Create a detailed social media brand persona for AI automation tools. I need a comprehensive JSON response that will guide AI-powered content creation, auto-replies, DM campaigns, and hashtag optimization.

**BRAND INFORMATION:**
- Brand Name: ${input.brandName}
- Industry: ${input.industry}
- Target Audience: ${input.targetAudience}
- Brand Description: ${input.brandDescription}
- Personality Traits: ${input.personalityTraits}
- Content Focus: ${input.contentFocus}
- Primary Platforms: ${input.platforms.join(', ')}
${input.additionalNotes ? `- Additional Notes: ${input.additionalNotes}` : ''}

**REQUIRED OUTPUT FORMAT:**
Please respond with ONLY a JSON object (no markdown formatting) that includes:

{
  "name": "Brand name",
  "description": "2-sentence brand persona description",
  "voice": {
    "tone": "professional|casual|friendly|authoritative|playful|inspirational|educational",
    "personality": ["trait1", "trait2", "trait3", "trait4"],
    "writingStyle": "formal|conversational|witty|direct|storytelling|technical",
    "emojiUsage": "none|minimal|moderate|frequent",
    "languageLevel": "simple|intermediate|advanced|expert"
  },
  "messaging": {
    "keyMessages": ["message1", "message2", "message3"],
    "valueProposition": "Single sentence describing unique value",
    "targetAudience": "Detailed audience description",
    "contentPillars": ["pillar1", "pillar2", "pillar3", "pillar4"],
    "avoidTopics": ["topic1", "topic2", "topic3"]
  },
  "engagement": {
    "commentStyle": "brief|detailed|questions|supportive|expert",
    "dmApproach": "professional|friendly|direct|collaborative",
    "hashtagStrategy": "branded|trending|niche|mixed",
    "mentionStyle": "conservative|active|strategic"
  },
  "contentGuidelines": {
    "postLength": "short|medium|long|varies",
    "contentMix": {
      "educational": 40,
      "entertainment": 30,
      "promotional": 20,
      "personal": 10
    },
    "callToActionStyle": "subtle|direct|creative|none",
    "questionFrequency": "rare|occasional|frequent|always"
  },
  "platformCustomization": {
    ${input.platforms.map(platform => `"${platform}": {
      "adaptedTone": "Platform-specific tone adaptation",
      "specificHashtags": ["hashtag1", "hashtag2", "hashtag3"],
      "contentFocus": "Platform-specific content focus",
      "engagementStyle": "Platform-specific engagement approach"
    }`).join(',\n    ')}
  },
  "examples": {
    "samplePosts": [
      "Example post 1 in brand voice with appropriate hashtags",
      "Example post 2 showing content style and tone",
      "Example post 3 demonstrating engagement approach"
    ],
    "sampleReplies": [
      "Example positive comment reply",
      "Example neutral comment reply", 
      "Example negative/constructive comment reply"
    ],
    "sampleDMs": [
      "Example collaboration outreach DM",
      "Example new follower welcome DM",
      "Example follow-up DM"
    ]
  }
}

**IMPORTANT GUIDELINES:**
1. Make the voice authentic and consistent across all examples
2. Ensure platform customizations reflect real platform differences
3. Create realistic, actionable content examples
4. Match the personality traits in all generated content
5. Consider the target audience in language and approach
6. Make hashtag strategies platform-appropriate
7. Ensure content mix percentages add up to 100
8. Keep examples concise but representative of the brand voice

Generate the persona that will make AI automation feel authentically human and on-brand.`;
}

/**
 * Parse ChatGPT response and convert to BrandPersona
 */
export function parseChatGPTPersonaResponse(jsonResponse: string): BrandPersona | null {
  try {
    const parsed: ChatGPTPersonaResponse = JSON.parse(jsonResponse);
    
    // Convert ChatGPT response to our BrandPersona format
    const persona: BrandPersona = {
      id: `chatgpt_${Date.now()}`,
      name: parsed.name,
      description: parsed.description,
      voice: {
        tone: parsed.voice.tone as any,
        personality: parsed.voice.personality,
        writingStyle: parsed.voice.writingStyle as any,
        emojiUsage: parsed.voice.emojiUsage as any,
        languageLevel: parsed.voice.languageLevel as any
      },
      messaging: {
        keyMessages: parsed.messaging.keyMessages,
        valueProposition: parsed.messaging.valueProposition,
        targetAudience: parsed.messaging.targetAudience,
        contentPillars: parsed.messaging.contentPillars,
        avoidTopics: parsed.messaging.avoidTopics
      },
      engagement: {
        commentStyle: parsed.engagement.commentStyle as any,
        dmApproach: parsed.engagement.dmApproach as any,
        hashtagStrategy: parsed.engagement.hashtagStrategy as any,
        mentionStyle: parsed.engagement.mentionStyle as any
      },
      contentGuidelines: {
        postLength: parsed.contentGuidelines.postLength as any,
        contentMix: parsed.contentGuidelines.contentMix,
        callToActionStyle: parsed.contentGuidelines.callToActionStyle as any,
        questionFrequency: parsed.contentGuidelines.questionFrequency as any
      },
      platformCustomization: parsed.platformCustomization,
      examples: parsed.examples
    };

    return persona;
  } catch (error) {
    console.error('Error parsing ChatGPT persona response:', error);
    return null;
  }
}

/**
 * Generate example inputs for different brand types
 */
export const getPersonaPromptExamples = (): PersonaPromptInput[] => [
  {
    brandName: "TechFlow Solutions",
    industry: "SaaS and Business Automation",
    targetAudience: "Small business owners, entrepreneurs, and productivity enthusiasts aged 25-45",
    brandDescription: "We help busy entrepreneurs automate their workflows and scale their businesses efficiently through smart technology solutions.",
    personalityTraits: "Professional yet approachable, data-driven, solution-focused, innovative, trustworthy",
    contentFocus: "Business automation tips, productivity hacks, case studies, industry insights, and tool recommendations",
    platforms: ["linkedin", "twitter", "instagram"],
    additionalNotes: "We want to be seen as the go-to experts for business automation while remaining accessible to non-technical users."
  },
  {
    brandName: "Wellness With Sarah",
    industry: "Health and Wellness Coaching",
    targetAudience: "Busy women aged 28-45 who want to prioritize their health and wellness but struggle with time and motivation",
    brandDescription: "I'm a certified wellness coach who helps overwhelmed women create sustainable healthy habits that fit into their busy lives.",
    personalityTraits: "Warm, encouraging, authentic, relatable, motivational, evidence-based but not preachy",
    contentFocus: "Quick wellness tips, healthy recipes, mindset shifts, self-care practices, and real-life wellness struggles and wins",
    platforms: ["instagram", "tiktok", "facebook"],
    additionalNotes: "I want to be relatable and show that wellness doesn't have to be perfect or expensive. I share my own struggles and wins."
  },
  {
    brandName: "Digital Marketing Mastery",
    industry: "Digital Marketing Education",
    targetAudience: "Small business owners, freelancers, and marketing professionals who want to improve their digital marketing skills",
    brandDescription: "We teach practical, results-driven digital marketing strategies that actually work for small businesses and freelancers.",
    personalityTraits: "Knowledgeable, practical, no-nonsense, results-focused, encouraging, anti-hype",
    contentFocus: "Marketing strategies, case studies, tool reviews, industry updates, and actionable tips that drive real results",
    platforms: ["linkedin", "twitter", "youtube", "instagram"],
    additionalNotes: "We're against get-rich-quick schemes and focus on proven strategies. We use data and real examples, not just theory."
  },
  {
    brandName: "Creative Studio Co",
    industry: "Design and Creative Services",
    targetAudience: "Small business owners, startups, and entrepreneurs who need professional design but have limited budgets",
    brandDescription: "A boutique creative studio that makes professional design accessible to small businesses through affordable packages and educational content.",
    personalityTraits: "Creative, inspiring, professional yet fun, detail-oriented, supportive of small businesses",
    contentFocus: "Design tips, brand strategy, behind-the-scenes creative process, small business spotlights, and design trends",
    platforms: ["instagram", "pinterest", "linkedin", "tiktok"],
    additionalNotes: "We want to demystify good design and show that professional branding is accessible to everyone, not just big corporations."
  }
];

/**
 * Generate a simplified prompt for quick persona creation
 */
export function generateQuickPersonaPrompt(
  brandName: string,
  description: string,
  platforms: string[]
): string {
  return `Create a social media brand persona JSON for "${brandName}".

Brand: ${description}
Platforms: ${platforms.join(', ')}

Return ONLY JSON with these fields:
- voice: {tone, personality[], writingStyle, emojiUsage, languageLevel}
- messaging: {keyMessages[], valueProposition, targetAudience, contentPillars[], avoidTopics[]}
- engagement: {commentStyle, dmApproach, hashtagStrategy, mentionStyle}
- contentGuidelines: {postLength, contentMix{educational, entertainment, promotional, personal}, callToActionStyle, questionFrequency}
- examples: {samplePosts[], sampleReplies[], sampleDMs[]}

Make it authentic and platform-appropriate.`;
}

/**
 * Validate persona completeness
 */
export function validatePersonaCompleteness(persona: Partial<BrandPersona>): {
  isComplete: boolean;
  missingFields: string[];
  completionScore: number;
} {
  const requiredFields = [
    'name',
    'description',
    'voice.tone',
    'voice.personality',
    'messaging.valueProposition',
    'messaging.targetAudience',
    'messaging.contentPillars',
    'engagement.commentStyle',
    'contentGuidelines.contentMix'
  ];

  const missingFields: string[] = [];
  let score = 0;

  requiredFields.forEach(field => {
    const fieldValue = getNestedValue(persona, field);
    if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
      missingFields.push(field);
    } else {
      score += 100 / requiredFields.length;
    }
  });

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionScore: Math.round(score)
  };
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
