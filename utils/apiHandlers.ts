import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { extractTweetId, detectPlatformFromUrl, extractPostIdFromUrl } from './postValidation';
import { formatThreadWithNumbering, ThreadPost } from './threadUtils';
import { INTERNAL_TO_AYRSHARE_PLATFORM, isBusinessPlanMode } from './ayrshareIntegration';

/**
 * Interface for post data sent to Ayrshare API
 */
export interface PostData {
	post: string;
	platforms: string[];
	profileKey?: string; // Only used in Business Plan mode
	mediaUrls?: string[];
	scheduleDate?: string;
	twitterOptions?: {
		thread?: boolean;
		threadNumber?: boolean;
		replyToTweetId?: string;
		mediaUrls?: string[];
	};
	instagramOptions?: any;
	facebookOptions?: any;
	linkedinOptions?: any;
}

/**
 * Maps internal platform names to Ayrshare platform names
 */
const mapPlatformsForAyrshare = (platforms: string[]): string[] => {
	return platforms.map(platform => INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform);
};

/**
 * Standard post handler for regular posts and Twitter threading
 * @param postData - Post data to send to API
 * @returns API response
 */
export const handleStandardPost = async (postData: PostData) => {
	// Map platform names for Ayrshare compatibility
	const mappedPlatforms = mapPlatformsForAyrshare(postData.platforms);
	
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${AYRSHARE_API_KEY}`
	};

	// Only add Profile-Key header in Business Plan mode
	if (isBusinessPlanMode() && postData.profileKey) {
		headers['Profile-Key'] = postData.profileKey;
	}

	const response = await fetch(`${AYRSHARE_API_URL}/post`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			...postData,
			platforms: mappedPlatforms,
			// Remove profileKey from the body as it's only used in headers
			profileKey: undefined
		})
	});

	const result = await response.json();
	
	if (!response.ok) {
		throw new Error(result.message || 'Failed to publish post');
	}

	return result;
};

/**
 * Fetches the content of a public social media post from its URL.
 * NOTE: This assumes a hypothetical Ayrshare endpoint (`/utils/url-info`) exists 
 * for scraping post data, as this is not explicitly in the public documentation.
 * @param url - The URL of the post to fetch.
 * @returns The structured content of the post.
 */
export const fetchPostContent = async (url: string) => {
	const response = await fetch(`/api/url-info?url=${encodeURIComponent(url)}`);

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || 'Failed to fetch post content.');
	}

	const result = await response.json();
	return result;
};

/**
 * Handles reply functionality for different platforms
 * @param postData - Post data
 * @param replyUrl - URL of post to reply to
 * @returns API response
 */
export const handleReplyPost = async (postData: PostData, replyUrl: string) => {
	const detectedPlatform = detectPlatformFromUrl(replyUrl);

	if (!detectedPlatform) {
		throw new Error("Could not detect a supported platform from the provided URL.");
	}

	// Map internal platform to Ayrshare platform
	const ayrshareDetectedPlatform = INTERNAL_TO_AYRSHARE_PLATFORM[detectedPlatform] || detectedPlatform;
	const ayrsharePostPlatforms = mapPlatformsForAyrshare(postData.platforms);

	if (!ayrsharePostPlatforms.includes(ayrshareDetectedPlatform)) {
		throw new Error(`To reply, you must select the platform corresponding to the URL (${detectedPlatform}).`);
	}

	// We are only replying on the detected platform.
	const replyPostData: PostData = { 
		...postData, 
		platforms: [ayrshareDetectedPlatform] 
	};

	if (ayrshareDetectedPlatform === 'twitter') {
		const tweetId = extractTweetId(replyUrl);
		if (!tweetId) throw new Error("Could not extract Tweet ID from the URL.");
		
		replyPostData.twitterOptions = { ...replyPostData.twitterOptions, replyToTweetId: tweetId };
		return handleStandardPost(replyPostData);
	} else {
		// For other platforms, use the comment endpoint
		const postId = extractPostIdFromUrl(replyUrl);
		if (!postId) throw new Error(`Could not extract Post ID from the URL for ${detectedPlatform}.`);
		
		// The /comment endpoint needs `id` and `post` (comment content).
		return handleCommentPost({ 
			post: replyPostData.post, 
			platforms: [ayrshareDetectedPlatform],
			profileKey: replyPostData.profileKey
		}, postId, ayrshareDetectedPlatform);
	}
};

/**
 * Handles multi-post creation by posting the first item and then commenting with the rest.
 * @param postData - Base post data
 * @param threadPosts - Array of thread posts
 * @returns Array of API responses
 */
export const handleMultiPosts = async (
	postData: PostData, 
	threadPosts: ThreadPost[]
) => {
	if (threadPosts.length === 0) {
		throw new Error("No content available to post.");
	}

	// 1. Post the first item in the thread as the main post
	const firstPostData: PostData = {
		...postData,
		post: threadPosts[0].content,
	};
	const firstPostResult = await handleStandardPost(firstPostData);

	// 2. Extract post IDs from the first post's response
	const postIds = firstPostResult.postIds || {};
	const successfulPlatforms = Object.keys(postIds);

	if (successfulPlatforms.length === 0) {
		throw new Error("Initial post failed, cannot post comments.");
	}

	// 3. Post the remaining items as comments
	const commentPromises = [];
	for (let i = 1; i < threadPosts.length; i++) {
		const commentText = threadPosts[i].content;

		for (const platform of successfulPlatforms) {
			const platformPostId = postIds[platform];
			if (platformPostId) {
				const commentData: PostData = {
					post: commentText,
					platforms: [platform],
					profileKey: postData.profileKey
				};
				// We'll post each comment as a reply to the original post.
				// For a true chain, we'd need to get the comment ID and reply to it,
				// but this is a solid implementation for most platforms.
				commentPromises.push(handleCommentPost(commentData, platformPostId, platform));
			}
		}
	}

	const commentResults = await Promise.all(commentPromises);

	return [firstPostResult, ...commentResults];
};

/**
 * Handles comment posting for platforms that support it
 * @param postData - Post data for the comment
 * @param originalPostId - ID of the original post to comment on
 * @param platform - Target platform
 * @returns API response
 */
export const handleCommentPost = async (
	postData: PostData, 
	originalPostId: string, 
	platform: string
) => {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${AYRSHARE_API_KEY}`
	};

	// Only add Profile-Key header in Business Plan mode
	if (isBusinessPlanMode() && postData.profileKey) {
		headers['Profile-Key'] = postData.profileKey;
	}

	const response = await fetch(`${AYRSHARE_API_URL}/comment`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			...postData,
			id: originalPostId,
			platforms: [platform], // Ensure we only target one platform per comment
			profileKey: undefined // Remove from body
		})
	});

	const result = await response.json();
	
	if (!response.ok) {
		throw new Error(result.message || `Failed to post comment on ${platform}`);
	}

	return result;
};

/**
 * Schedules a post for future publishing
 * @param postData - Post data with schedule date
 * @returns API response
 */
export const schedulePost = async (postData: PostData) => {
	if (!postData.scheduleDate) {
		throw new Error('Schedule date is required for scheduled posts');
	}

	return handleStandardPost(postData);
};

/**
 * Validates API credentials
 * @returns boolean indicating if credentials are valid
 */
export const validateApiCredentials = (): boolean => {
	return Boolean(AYRSHARE_API_KEY);
};

/**
 * Generic error handler for API responses
 * @param error - Error from API call
 * @returns User-friendly error message
 */
export const handleApiError = (error: any): string => {
	if (error instanceof Error) {
		return error.message;
	}
	
	if (error?.response?.data?.message) {
		return error.response.data.message;
	}
	
	if (typeof error === 'string') {
		return error;
	}
	
	return 'An unexpected error occurred while publishing your post';
}; 