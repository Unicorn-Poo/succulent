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
	
	// Platform-specific validations based on current platform limits
	switch (platform) {
		case 'x':
		case 'twitter':
			if (content.length > 280) {
				errors.push('Twitter/X posts cannot exceed 280 characters');
			}
			break;
		case 'instagram':
			if (content.length > 2200) {
				errors.push('Instagram posts cannot exceed 2200 characters');
			}
			break;
		case 'bluesky':
			if (content.length > 300) {
				errors.push('Bluesky posts cannot exceed 300 characters');
			}
			break;
		case 'facebook':
			if (content.length > 63206) {
				errors.push('Facebook posts cannot exceed 63,206 characters');
			}
			break;
		case 'linkedin':
			if (content.length > 3000) {
				errors.push('LinkedIn posts cannot exceed 3,000 characters');
			}
			break;
		case 'tiktok':
			if (content.length > 150) {
				errors.push('TikTok posts cannot exceed 150 characters');
			}
			break;
		case 'pinterest':
			if (content.length > 500) {
				errors.push('Pinterest posts cannot exceed 500 characters');
			}
			break;
		case 'reddit':
			if (content.length > 40000) {
				errors.push('Reddit posts cannot exceed 40,000 characters');
			}
			break;
		case 'telegram':
			if (content.length > 4096) {
				errors.push('Telegram posts cannot exceed 4,096 characters');
			}
			break;
		case 'threads':
			if (content.length > 500) {
				errors.push('Threads posts cannot exceed 500 characters');
			}
			break;
		case 'youtube':
			if (content.length > 5000) {
				errors.push('YouTube posts cannot exceed 5,000 characters');
			}
			break;
		case 'google':
		case 'gmb':
			if (content.length > 1500) {
				errors.push('Google My Business posts cannot exceed 1,500 characters');
			}
			break;
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
  // PRIORITY 1: Check if post is actually published (publishedAt takes precedence)
  // This should override any status field if the post has been published
  if (post.publishedAt || (post.variants && Object.values(post.variants).some((v: any) => v?.publishedAt))) {
    return 'published';
  }

  // PRIORITY 1.5: Check if post has ayrsharePostId (indicates it was published to Ayrshare)
  // If a variant has ayrsharePostId but no scheduledFor, it's likely published
  if (post.variants) {
    for (const variant of Object.values(post.variants)) {
      const v = variant as any;
      // If variant has ayrsharePostId and no scheduledFor, it was published
      if (v?.ayrsharePostId && !v?.scheduledFor) {
        return 'published';
      }
      // If variant has ayrsharePostId AND scheduledFor in the future, it's scheduled
      if (v?.ayrsharePostId && v?.scheduledFor) {
        const scheduledDate = new Date(v.scheduledFor);
        const now = new Date();
        if (scheduledDate > now) {
          return 'scheduled';
        } else {
          // Scheduled date has passed, so it's published
          return 'published';
        }
      }
    }
  }

  // PRIORITY 2: Check if there's a direct status field (legacy posts)
  if (post.status && ['draft', 'scheduled', 'published'].includes(post.status)) {
    // But only trust it if not published (already checked above)
    return post.status;
  }

  // PRIORITY 3: Check variants for status - look in all platform variants
  if (post.variants) {
    // Check common variant names first
    const commonVariants = ['base', 'instagram', 'x', 'twitter', 'facebook', 'linkedin', 'youtube', 'tiktok'];
    
    for (const variantKey of commonVariants) {
      const variant = post.variants[variantKey];
      // Only trust status if variant doesn't have publishedAt (already checked above)
      if (variant?.status && ['draft', 'scheduled', 'published'].includes(variant.status)) {
        // Double-check: if this variant has publishedAt, it's published regardless of status
        if (variant.publishedAt) {
          return 'published';
        }
        // If variant has ayrsharePostId, it's published (even if status says scheduled)
        if (variant.ayrsharePostId && !variant.scheduledFor) {
          return 'published';
        }
        return variant.status;
      }
    }
    
    // If not found in common variants, check all variants
    for (const [variantKey, variant] of Object.entries(post.variants)) {
      if (variant && typeof variant === 'object') {
        const v = variant as any;
        // If variant has publishedAt, it's published
        if (v.publishedAt) {
          return 'published';
        }
        // If variant has ayrsharePostId and no scheduledFor, it's published
        if (v.ayrsharePostId && !v.scheduledFor) {
          return 'published';
        }
        // Otherwise check status field
        if (v.status && ['draft', 'scheduled', 'published'].includes(v.status)) {
          return v.status;
        }
      }
    }
  }

  // PRIORITY 4: Check scheduledFor (only if not published)
  if (post.scheduledFor || (post.variants && Object.values(post.variants).some((v: any) => v?.scheduledFor))) {
    return 'scheduled';
  }

  // Only default to draft if we truly can't determine the status
  return 'draft';
} 