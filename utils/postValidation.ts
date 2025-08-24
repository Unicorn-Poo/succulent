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
 * Extracts a post ID from a social media URL.
 * This is a best-effort parser and may not cover all URL formats.
 * @param url - The social media post URL
 * @returns The extracted post ID or null.
 */
export const extractPostIdFromUrl = (url: string): string | null => {
	const platform = detectPlatformFromUrl(url);
	let match;

	switch (platform) {
		case 'x':
		case 'twitter':
			return extractTweetId(url);
		case 'facebook':
			match = url.match(/posts\/(\d+)/) || 
					url.match(/story_fbid=(\d+)/) || 
					url.match(/videos\/(\d+)/);
			return match ? match[1] : null;
		case 'instagram':
			match = url.match(/\/p\/([\w-]+)/);
			return match ? match[1] : null;
		case 'linkedin':
			match = url.match(/\/posts\/([\w-]+)/) || 
					url.match(/urn:li:activity:(\d+)/);
			return match ? match[1] : null;
		case 'youtube':
			match = url.match(/watch\?v=([\w-]+)/);
			return match ? match[1] : null;
		default:
			return null;
	}
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

/**
 * Extract post status from platform variants, falling back to legacy fields
 * @param post - Post object with variants
 * @returns The actual post status, with proper fallback logic
 */
export function getPostStatus(post: any): 'draft' | 'scheduled' | 'published' {
  // First check if there's a direct status field (legacy posts)
  if (post.status && ['draft', 'scheduled', 'published'].includes(post.status)) {
    return post.status;
  }

  // Check variants for status - look in all platform variants
  if (post.variants) {
    // Check common variant names first
    const commonVariants = ['base', 'instagram', 'x', 'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok'];
    
    for (const variantKey of commonVariants) {
      const variant = post.variants[variantKey];
      if (variant?.status && ['draft', 'scheduled', 'published'].includes(variant.status)) {
        return variant.status;
      }
    }
    
    // If not found in common variants, check all variants
    for (const [variantKey, variant] of Object.entries(post.variants)) {
      if (variant && typeof variant === 'object' && (variant as any).status) {
        const status = (variant as any).status;
        if (['draft', 'scheduled', 'published'].includes(status)) {
          return status;
        }
      }
    }
  }

  // Final fallback - if post has publishedAt or scheduledFor, it's likely not a draft
  if (post.publishedAt || (post.variants && Object.values(post.variants).some((v: any) => v?.publishedAt))) {
    return 'published';
  }
  
  if (post.scheduledFor || (post.variants && Object.values(post.variants).some((v: any) => v?.scheduledFor))) {
    return 'scheduled';
  }

  // Only default to draft if we truly can't determine the status
  return 'draft';
} 