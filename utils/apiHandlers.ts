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
 * Handles multi-post creation for platforms that don't support native threading
 * @param postData - Base post data
 * @param threadPosts - Array of thread posts
 * @param intervalMinutes - Minutes between posts
 * @returns Array of API responses
 */
export const handleMultiPosts = async (
	postData: PostData, 
	threadPosts: ThreadPost[], 
	intervalMinutes: number = 5
) => {
	const promises = threadPosts.map((threadPost, index) => {
		const threadData: PostData = {
			...postData,
			post: formatThreadWithNumbering(threadPost.content, threadPost.index, threadPost.total),
			// Add delay between posts (except for the first one)
			...(index > 0 && { 
				scheduleDate: new Date(Date.now() + (index * intervalMinutes * 60000)).toISOString() 
			})
		};
		
		return fetch(`${AYRSHARE_API_URL}/post`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${AYRSHARE_API_KEY}`
			},
			body: JSON.stringify(threadData)
		});
	});

	const results = await Promise.all(promises);
	const responses = await Promise.all(results.map(r => r.json()));
	
	// Check for any failures
	results.forEach((result, index) => {
		if (!result.ok) {
			console.error(`Failed to create post ${index + 1}:`, responses[index]);
		}
	});
	
	return responses;
};

/**
 * Handles comment posting for platforms that support it
 * @param postData - Post data
 * @param originalPostId - ID of the original post to comment on
 * @param platform - Target platform
 * @returns API response
 */
export const handleCommentPost = async (
	postData: PostData, 
	originalPostId: string, 
	platform: string
) => {
	// This is a placeholder for comment functionality
	// The actual implementation would depend on Ayrshare's comments API
	console.log('Comment post functionality would be implemented here', {
		postData,
		originalPostId,
		platform
	});
	
	// For now, we'll just post as a regular post
	// In a real implementation, you'd use the /comments endpoint
	return handleStandardPost(postData);
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