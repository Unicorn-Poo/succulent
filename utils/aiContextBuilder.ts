/**
 * AI Context Builder - Creates rich context for AI prompts from account group data
 * Uses brand persona, content feedback, and historical performance to guide AI generation
 */

import type { AccountGroupType, BrandPersonaType, ContentFeedbackType } from '../app/schema';

export interface BrandContext {
	voice: string;
	contentPillars: string[];
	targetAudience: string;
	examples: string[];
	preferences: {
		acceptedPatterns: string[];
		rejectedPatterns: string[];
		editPatterns: string[];
	};
	platformSpecific?: Record<string, {
		adaptedTone?: string;
		specificHashtags?: string[];
		contentFocus?: string;
	}>;
}

/**
 * Extract patterns from accepted content feedback
 */
function extractAcceptedPatterns(feedback: ContentFeedbackType[]): string[] {
	const accepted = feedback.filter(f => f.accepted);
	if (accepted.length === 0) return [];

	const patterns: string[] = [];

	// Analyze content length patterns
	const avgLength = accepted.reduce((sum, f) => sum + f.generatedContent.length, 0) / accepted.length;
	if (avgLength < 150) {
		patterns.push('Short, punchy content performs well');
	} else if (avgLength > 300) {
		patterns.push('Longer, detailed content is preferred');
	}

	// Analyze tone patterns from metadata
	const tones = accepted.map(f => f.toneUsed).filter(Boolean);
	if (tones.length > 0) {
		const toneCounts = tones.reduce((acc, tone) => {
			acc[tone!] = (acc[tone!] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
		const topTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0];
		if (topTone) {
			patterns.push(`${topTone[0]} tone resonates well`);
		}
	}

	// Analyze content pillar patterns
	const pillars = accepted.map(f => f.contentPillar).filter(Boolean);
	if (pillars.length > 0) {
		const pillarCounts = pillars.reduce((acc, pillar) => {
			acc[pillar!] = (acc[pillar!] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
		const topPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0];
		if (topPillar) {
			patterns.push(`Content about ${topPillar[0]} gets approved`);
		}
	}

	// Include some example accepted content snippets
	const examples = accepted
		.slice(-3)
		.map(f => f.generatedContent.slice(0, 100) + '...');
	patterns.push(...examples.map(e => `Example: "${e}"`));

	return patterns;
}

/**
 * Extract patterns from rejected content feedback
 */
function extractRejectedPatterns(feedback: ContentFeedbackType[]): string[] {
	const rejected = feedback.filter(f => !f.accepted);
	if (rejected.length === 0) return [];

	const patterns: string[] = [];

	// Extract rejection reasons
	const reasons = rejected.map(f => f.reason).filter(Boolean);
	patterns.push(...reasons.slice(-5) as string[]);

	// Analyze what NOT to do based on rejected tones
	const rejectedTones = rejected.map(f => f.toneUsed).filter(Boolean);
	if (rejectedTones.length > 0) {
		const toneCounts = rejectedTones.reduce((acc, tone) => {
			acc[tone!] = (acc[tone!] || 0) + 1;
			return acc;
		}, {} as Record<string, number>);
		const worstTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0];
		if (worstTone && worstTone[1] >= 2) {
			patterns.push(`Avoid ${worstTone[0]} tone - consistently rejected`);
		}
	}

	return patterns;
}

/**
 * Extract patterns from edited content (user's corrections teach us preferences)
 */
function extractEditPatterns(feedback: ContentFeedbackType[]): string[] {
	const edited = feedback.filter(f => f.accepted && f.editedVersion);
	if (edited.length === 0) return [];

	const patterns: string[] = [];

	// Analyze what users changed
	edited.slice(-5).forEach(f => {
		const original = f.generatedContent;
		const edited = f.editedVersion!;
		
		// Check if length changed significantly
		if (edited.length < original.length * 0.7) {
			patterns.push('User prefers shorter versions');
		} else if (edited.length > original.length * 1.3) {
			patterns.push('User adds more detail/context');
		}

		// Check for emoji changes
		const originalEmojis = (original.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
		const editedEmojis = (edited.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]/gu) || []).length;
		if (editedEmojis > originalEmojis + 2) {
			patterns.push('User adds more emojis');
		} else if (editedEmojis < originalEmojis - 2) {
			patterns.push('User removes emojis');
		}
	});

	return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Build rich brand context from account group data
 */
export function buildBrandContext(accountGroup: AccountGroupType): BrandContext | null {
	const persona = accountGroup.brandPersona;
	const feedback = Array.from(accountGroup.contentFeedback || []);

	if (!persona) {
		return null;
	}

	// Parse platform customization if stored as JSON
	let platformCustomization: Record<string, any> | undefined;
	if (persona.platformCustomization) {
		try {
			platformCustomization = JSON.parse(persona.platformCustomization);
		} catch {
			// Invalid JSON, ignore
		}
	}

	return {
		voice: `${persona.tone}, ${persona.writingStyle}`,
		contentPillars: persona.contentPillars || [],
		targetAudience: persona.targetAudience || 'general audience',
		examples: persona.samplePosts || [],
		preferences: {
			acceptedPatterns: extractAcceptedPatterns(feedback as ContentFeedbackType[]),
			rejectedPatterns: extractRejectedPatterns(feedback as ContentFeedbackType[]),
			editPatterns: extractEditPatterns(feedback as ContentFeedbackType[]),
		},
		platformSpecific: platformCustomization,
	};
}

/**
 * Generate a system prompt for AI content generation based on brand context
 */
export function generateBrandSystemPrompt(context: BrandContext, platform: string): string {
	const platformConfig = context.platformSpecific?.[platform];

	let prompt = `You are a social media content creator for a brand with these characteristics:

## BRAND VOICE
- Tone: ${context.voice}
- Target Audience: ${context.targetAudience}

## CONTENT PILLARS (topics to focus on)
${context.contentPillars.map(p => `- ${p}`).join('\n')}

`;

	if (context.examples.length > 0) {
		prompt += `## EXAMPLE POSTS (match this style)
${context.examples.slice(0, 3).map((e, i) => `${i + 1}. "${e}"`).join('\n')}

`;
	}

	if (platformConfig) {
		prompt += `## PLATFORM-SPECIFIC (${platform.toUpperCase()})
${platformConfig.adaptedTone ? `- Adapted Tone: ${platformConfig.adaptedTone}` : ''}
${platformConfig.contentFocus ? `- Content Focus: ${platformConfig.contentFocus}` : ''}
${platformConfig.specificHashtags?.length ? `- Hashtags to use: ${platformConfig.specificHashtags.join(', ')}` : ''}

`;
	}

	// Add learned preferences
	if (context.preferences.acceptedPatterns.length > 0) {
		prompt += `## WHAT WORKS (learned from accepted content)
${context.preferences.acceptedPatterns.slice(0, 5).map(p => `- ${p}`).join('\n')}

`;
	}

	if (context.preferences.rejectedPatterns.length > 0) {
		prompt += `## WHAT TO AVOID (learned from rejected content)
${context.preferences.rejectedPatterns.slice(0, 5).map(p => `- ${p}`).join('\n')}

`;
	}

	if (context.preferences.editPatterns.length > 0) {
		prompt += `## USER PREFERENCES (learned from edits)
${context.preferences.editPatterns.map(p => `- ${p}`).join('\n')}

`;
	}

	prompt += `## INSTRUCTIONS
- Create content that matches the brand voice and style
- Focus on the content pillars
- Keep the target audience in mind
- Learn from what has been accepted/rejected before
- Be authentic and engaging`;

	return prompt;
}

/**
 * Generate a content prompt for AI generation with platform-specific guidance
 */
export function generateContentPrompt(
	topic: string,
	contentType: 'post' | 'reply' | 'caption' | 'thread',
	platform: string,
	additionalContext?: string
): string {
	const platformGuidelines: Record<string, string> = {
		instagram: `
- Keep it visual and engaging
- Use line breaks for readability
- Include relevant hashtags (5-10)
- End with a call-to-action or question`,
		x: `
- Keep it concise (under 280 characters for single tweet)
- Use hashtags sparingly (1-3)
- Make it conversational and shareable
- Consider adding a hook at the start`,
		linkedin: `
- Professional but personable tone
- Use bullet points for key takeaways
- Include a thought-provoking question
- Keep it industry-relevant`,
		tiktok: `
- Trendy, casual language
- Use popular sounds/trends references
- Keep it snappy and attention-grabbing
- Include relevant hashtags`,
		facebook: `
- Conversational and community-focused
- Ask questions to encourage engagement
- Use moderate hashtags (3-5)
- Tell stories when possible`,
		pinterest: `
- Descriptive and keyword-rich
- Focus on value and inspiration
- Include clear call-to-action
- Use relevant hashtags`,
		threads: `
- Conversational and authentic
- Keep it brief but meaningful
- Encourage discussion
- Minimal hashtags (1-2)`,
	};

	let prompt = `Create a ${contentType} about: "${topic}"

Platform: ${platform.toUpperCase()}
${platformGuidelines[platform] || '- Create engaging, platform-appropriate content'}
`;

	if (additionalContext) {
		prompt += `\nAdditional context: ${additionalContext}`;
	}

	return prompt;
}

/**
 * Calculate a confidence score for content based on how well it matches learned preferences
 */
export function calculateContentConfidence(
	content: string,
	context: BrandContext
): number {
	let score = 70; // Base score

	// Check if content includes content pillars
	const pillarsUsed = context.contentPillars.filter(pillar =>
		content.toLowerCase().includes(pillar.toLowerCase())
	);
	score += pillarsUsed.length * 5;

	// Check content length matches patterns
	const lengthPatterns = context.preferences.acceptedPatterns.filter(p =>
		p.includes('length') || p.includes('Short') || p.includes('Longer')
	);
	if (lengthPatterns.some(p => p.includes('Short')) && content.length < 150) {
		score += 10;
	}
	if (lengthPatterns.some(p => p.includes('Longer')) && content.length > 300) {
		score += 10;
	}

	// Penalize if content matches rejection patterns
	const rejectionKeywords = context.preferences.rejectedPatterns
		.filter(p => !p.startsWith('Avoid'))
		.flatMap(p => p.toLowerCase().split(' '));
	const rejectionMatches = rejectionKeywords.filter(k =>
		content.toLowerCase().includes(k)
	);
	score -= rejectionMatches.length * 3;

	// Cap between 0 and 100
	return Math.max(0, Math.min(100, score));
}

/**
 * Quick function to get context string for API routes
 */
export function getContextForAPI(accountGroup: AccountGroupType | null): {
	systemPrompt: string;
	hasContext: boolean;
	brandName?: string;
} {
	if (!accountGroup) {
		return {
			systemPrompt: 'You are a helpful social media content creator. Create engaging, platform-appropriate content.',
			hasContext: false,
		};
	}

	const context = buildBrandContext(accountGroup);
	if (!context) {
		return {
			systemPrompt: 'You are a helpful social media content creator. Create engaging, platform-appropriate content.',
			hasContext: false,
		};
	}

	return {
		systemPrompt: generateBrandSystemPrompt(context, 'general'),
		hasContext: true,
		brandName: accountGroup.brandPersona?.name,
	};
}

