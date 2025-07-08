import { PLATFORM_CHARACTER_LIMITS } from './postConstants';

/**
 * Interface for thread post data
 */
export interface ThreadPost {
	content: string;
	characterCount: number;
	index: number;
	total: number;
}

/**
 * Generates thread preview by splitting text into appropriate chunks
 * @param text - The full text to split into threads
 * @param platform - Target platform (affects character limits)
 * @returns Array of thread posts
 */
export const generateThreadPreview = (text: string, platform: string = 'default'): ThreadPost[] => {
	if (!text || text.trim().length === 0) {
		return [];
	}

	const maxLength = PLATFORM_CHARACTER_LIMITS[platform as keyof typeof PLATFORM_CHARACTER_LIMITS] || PLATFORM_CHARACTER_LIMITS.default;
	const paragraphs = text.split('\n\n').filter(p => p.trim());
	const threads: string[] = [];
	let currentThread = "";

	paragraphs.forEach(paragraph => {
		// Reserve space for thread numbering (e.g., " 1/5")
		const numberingSpace = 10;
		const availableLength = maxLength - numberingSpace;

		if (currentThread.length + paragraph.length + 2 <= availableLength) {
			currentThread += (currentThread ? '\n\n' : '') + paragraph;
		} else {
			if (currentThread) {
				threads.push(currentThread);
			}
			
			// If single paragraph is too long, split it by sentences
			if (paragraph.length > availableLength) {
				const splitParagraph = splitLongParagraph(paragraph, availableLength);
				threads.push(...splitParagraph);
				currentThread = "";
			} else {
				currentThread = paragraph;
			}
		}
	});

	if (currentThread) {
		threads.push(currentThread);
	}

	// Convert to ThreadPost objects with metadata
	return threads.map((content, index) => ({
		content,
		characterCount: content.length,
		index: index + 1,
		total: threads.length
	}));
};

/**
 * Splits a long paragraph into smaller chunks
 * @param paragraph - The paragraph to split
 * @param maxLength - Maximum length per chunk
 * @returns Array of paragraph chunks
 */
const splitLongParagraph = (paragraph: string, maxLength: number): string[] => {
	const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
	const chunks: string[] = [];
	let currentChunk = "";

	sentences.forEach(sentence => {
		const trimmedSentence = sentence.trim();
		if (!trimmedSentence) return;

		const sentenceWithPunctuation = trimmedSentence + '.';
		
		if (currentChunk.length + sentenceWithPunctuation.length + 1 <= maxLength) {
			currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
		} else {
			if (currentChunk) {
				chunks.push(currentChunk);
			}
			
			// If single sentence is still too long, split by words
			if (sentenceWithPunctuation.length > maxLength) {
				const wordChunks = splitByWords(sentenceWithPunctuation, maxLength);
				chunks.push(...wordChunks);
				currentChunk = "";
			} else {
				currentChunk = sentenceWithPunctuation;
			}
		}
	});

	if (currentChunk) {
		chunks.push(currentChunk);
	}

	return chunks;
};

/**
 * Splits text by words when sentences are too long
 * @param text - Text to split
 * @param maxLength - Maximum length per chunk
 * @returns Array of word chunks
 */
const splitByWords = (text: string, maxLength: number): string[] => {
	const words = text.split(' ');
	const chunks: string[] = [];
	let currentChunk = "";

	words.forEach(word => {
		if (currentChunk.length + word.length + 1 <= maxLength) {
			currentChunk += (currentChunk ? ' ' : '') + word;
		} else {
			if (currentChunk) {
				chunks.push(currentChunk);
			}
			
			// If single word is still too long, truncate it
			if (word.length > maxLength) {
				chunks.push(word.substring(0, maxLength - 3) + '...');
				currentChunk = "";
			} else {
				currentChunk = word;
			}
		}
	});

	if (currentChunk) {
		chunks.push(currentChunk);
	}

	return chunks;
};

/**
 * Formats thread content with numbering
 * @param content - Thread content
 * @param index - Thread index (1-based)
 * @param total - Total number of threads
 * @returns Formatted content with numbering
 */
export const formatThreadWithNumbering = (content: string, index: number, total: number): string => {
	if (total <= 1) return content;
	return `${content} ${index}/${total}`;
};

/**
 * Calculates optimal posting intervals based on thread length
 * @param threadCount - Number of threads
 * @param platform - Target platform
 * @returns Recommended interval in minutes
 */
export const calculateOptimalInterval = (threadCount: number, platform: string): number => {
	if (platform === 'x' || platform === 'twitter') {
		// Twitter threads can be posted immediately
		return 0;
	}
	
	// For other platforms, use intervals based on thread count
	if (threadCount <= 3) return 5;
	if (threadCount <= 6) return 10;
	return 15;
}; 