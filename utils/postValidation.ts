/**
 * Validation patterns for different social media platforms
 */
const URL_VALIDATION_PATTERNS = [
	/^https:\/\/(www\.)?twitter\.com\/\w+\/status\/\d+/,
	/^https:\/\/(www\.)?x\.com\/\w+\/status\/\d+/,
	/^https:\/\/(www\.)?instagram\.com\/p\/[\w-]+/,
	/^https:\/\/(www\.)?facebook\.com\/\w+\/posts\/\d+/,
	/^https:\/\/(www\.)?linkedin\.com\/posts\/[\w-]+/,
	/^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
];

/**
 * Validates if a URL is a valid social media post URL
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is valid
 */
export const validateReplyUrl = (url: string): boolean => {
	if (!url || typeof url !== 'string') {
		return false;
	}
	
	return URL_VALIDATION_PATTERNS.some(pattern => pattern.test(url));
};

/**
 * Extracts tweet ID from Twitter/X URL for reply functionality
 * @param url - Twitter/X URL
 * @returns Tweet ID or null if not found
 */
export const extractTweetId = (url: string): string | null => {
	const tweetIdMatch = url.match(/status\/(\d+)/);
	return tweetIdMatch ? tweetIdMatch[1] : null;
};

/**
 * Detects the platform from a social media URL
 * @param url - Social media URL
 * @returns Platform name or null if not detected
 */
export const detectPlatformFromUrl = (url: string): string | null => {
	if (/twitter\.com|x\.com/.test(url)) return 'x';
	if (/instagram\.com/.test(url)) return 'instagram';
	if (/facebook\.com/.test(url)) return 'facebook';
	if (/linkedin\.com/.test(url)) return 'linkedin';
	if (/youtube\.com/.test(url)) return 'youtube';
	return null;
};

/**
 * Validates post content based on platform-specific rules
 * @param content - Post content
 * @param platform - Target platform
 * @returns Validation result with errors if any
 */
export const validatePostContent = (content: string, platform: string) => {
	const errors: string[] = [];
	
	if (!content || content.trim().length === 0) {
		errors.push('Post content cannot be empty');
	}
	
	// Platform-specific validations can be added here
	switch (platform) {
		case 'x':
		case 'twitter':
			if (content.length > 280) {
				errors.push('Twitter posts cannot exceed 280 characters');
			}
			break;
		case 'instagram':
			if (content.length > 2200) {
				errors.push('Instagram posts cannot exceed 2200 characters');
			}
			break;
		// Add more platform-specific validations as needed
	}
	
	return {
		isValid: errors.length === 0,
		errors
	};
}; 