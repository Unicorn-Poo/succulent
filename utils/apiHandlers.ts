import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { extractTweetId } from './postValidation';
import { formatThreadWithNumbering, ThreadPost } from './threadUtils';

/**
 * Interface for post data sent to Ayrshare API
 */
export interface PostData {
	post: string;
	platforms: string[];
	mediaUrls?: string[];
	scheduleDate?: string;
	twitterOptions?: {
		thread?: boolean;
		threadNumber?: boolean;
		replyToTweetId?: string;
	};
	instagramOptions?: any;
	facebookOptions?: any;
	linkedinOptions?: any;
}

/**
 * Standard post handler for regular posts and Twitter threading
 * @param postData - Post data to send to API
 * @returns API response
 */
export const handleStandardPost = async (postData: PostData) => {
	const response = await fetch(`${AYRSHARE_API_URL}/post`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${AYRSHARE_API_KEY}`
		},
		body: JSON.stringify(postData)
	});

	const result = await response.json();
	
	if (!response.ok) {
		throw new Error(result.message || 'Failed to publish post');
	}

	return result;
};

/**
 * Handles reply functionality for different platforms
 * @param postData - Post data
 * @param replyUrl - URL of post to reply to
 * @returns API response
 */
export const handleReplyPost = async (postData: PostData, replyUrl: string) => {
	const updatedPostData = { ...postData };

	// Handle Twitter/X replies
	if (postData.platforms.includes('x') || postData.platforms.includes('twitter')) {
		const tweetId = extractTweetId(replyUrl);
		if (tweetId) {
			updatedPostData.twitterOptions = {
				...updatedPostData.twitterOptions,
				replyToTweetId: tweetId
			};
		}
	}

	// For other platforms, replies are handled as comments
	// This would require additional API calls to the comments endpoint
	const nonTwitterPlatforms = postData.platforms.filter(p => p !== 'x' && p !== 'twitter');
	
	if (nonTwitterPlatforms.length > 0) {
		// TODO: Implement comment posting for non-Twitter platforms
		console.log('Comment posting for platforms:', nonTwitterPlatforms);
		// This would involve calling the /comments endpoint after the original post
	}

	return handleStandardPost(updatedPostData);
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
	const response = await fetch(`${AYRSHARE_API_URL}/comment`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${AYRSHARE_API_KEY}`
		},
		body: JSON.stringify({
			...postData,
			id: originalPostId,
			platforms: [platform] // Ensure we only target one platform per comment
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