import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { extractTweetId, detectPlatformFromUrl, extractPostIdFromUrl } from './postValidation';
import { formatThreadWithNumbering, ThreadPost } from './threadUtils';
import { INTERNAL_TO_AYRSHARE_PLATFORM, isBusinessPlanMode } from './ayrshareIntegration';
import { 
  logAyrshareOperation, 
  logAyrshareAPICall, 
  logAyrshareAPIResponse, 
  logTwitterDebug,
  logPostWorkflow,
  generateRequestId 
} from './ayrshareLogger';
// Removed duplicate handling - Ayrshare handles duplicates appropriately

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
	const requestId = generateRequestId();
	
	logPostWorkflow('Standard Post Started', postData, 'started', undefined, { requestId });
	
	// Map platform names for Ayrshare compatibility
	const mappedPlatforms = mapPlatformsForAyrshare(postData.platforms);
	
	// Enhanced Twitter/X debugging
	logTwitterDebug('Platform Mapping', {
		platforms: postData.platforms,
		mappedPlatforms,
		hasTwitter: mappedPlatforms.includes('twitter'),
		postLength: postData.post?.length || 0,
		twitterOptions: postData.twitterOptions,
		scheduledDate: postData.scheduleDate
	});
	
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${AYRSHARE_API_KEY}`
	};

	// Only add Profile-Key header in Business Plan mode
	if (isBusinessPlanMode() && postData.profileKey) {
		headers['Profile-Key'] = postData.profileKey;
	}

	// Check if we need to add Twitter options for long posts
	const hasTwitter = mappedPlatforms.includes('twitter') || mappedPlatforms.includes('x');
	const postLength = postData.post?.length || 0;
	const needsTwitterOptions = hasTwitter && !postData.twitterOptions && postLength > 280;
	
	// Enhanced Twitter debugging with structured logging
	logTwitterDebug('Threading Analysis', {
		mappedPlatforms,
		hasTwitter,
		postLength,
		needsThreading: needsTwitterOptions,
		twitterOptions: postData.twitterOptions,
		scheduledDate: postData.scheduleDate
	});

	const requestBody = {
		...postData,
		platforms: mappedPlatforms,
		// Remove profileKey from the body as it's only used in headers
		profileKey: undefined,
		// Use provided twitterOptions, or add default ones for long posts
		twitterOptions: postData.twitterOptions || (needsTwitterOptions ? {
			thread: true,
			threadNumber: true
		} : undefined)
	};

	// Clean up undefined fields that might cause issues with Ayrshare
	// But preserve twitterOptions even if they exist as an object
	const cleanedBody = Object.fromEntries(
		Object.entries(requestBody).filter(([key, value]) => {
			// Always keep twitterOptions if it exists as an object
			if (key === 'twitterOptions' && value && typeof value === 'object') {
				return true;
			}
			// Filter out other undefined values
			return value !== undefined;
		})
	);

	// Log media processing with structured logging
	logAyrshareOperation({
		timestamp: new Date().toISOString(),
		operation: 'Media Processing',
		status: 'started',
		data: {
			originalMediaCount: postData.mediaUrls?.length || 0,
			cleanedMediaCount: cleanedBody.mediaUrls?.length || 0,
			mediaUrls: cleanedBody.mediaUrls,
			mediaPresent: !!cleanedBody.mediaUrls?.length
		},
		requestId
	});
	
	// Validate and log schedule date if present
	if (cleanedBody.scheduleDate) {
		// Validate schedule date format and timing
		let scheduleDate: Date;
		try {
			scheduleDate = new Date(cleanedBody.scheduleDate);
			if (isNaN(scheduleDate.getTime())) {
				throw new Error('Invalid date format');
			}
		} catch (dateError) {
			logAyrshareOperation({
				timestamp: new Date().toISOString(),
				operation: 'Schedule Validation Failed',
				status: 'error',
				error: 'Invalid schedule date format',
				data: {
					scheduleDate: cleanedBody.scheduleDate,
					error: dateError instanceof Error ? dateError.message : 'Unknown date error'
				},
				requestId
			});
			throw new Error(`Invalid schedule date format: ${cleanedBody.scheduleDate}`);
		}

		const now = new Date();
		const minutesFromNow = Math.round((scheduleDate.getTime() - now.getTime()) / (1000 * 60));
		
		// Ayrshare requires at least 5 minutes in the future
		const minMinutes = 5;
		
		logAyrshareOperation({
			timestamp: new Date().toISOString(),
			operation: 'Schedule Validation',
			status: minutesFromNow >= minMinutes ? 'success' : 'warning',
			data: {
				scheduleDate: cleanedBody.scheduleDate,
				parsedDate: scheduleDate.toISOString(),
				currentTime: now.toISOString(),
				isFutureDate: scheduleDate > now,
				minutesFromNow,
				isScheduled: true,
				willSchedule: minutesFromNow >= minMinutes,
				meetsMinimum: minutesFromNow >= minMinutes,
				minimumRequired: minMinutes
			},
			requestId
		});

		if (minutesFromNow < minMinutes) {
			const warningMessage = minutesFromNow <= 0 
				? 'Scheduled date is in the past - post will be published immediately'
				: `Scheduled date is too soon (${minutesFromNow} minutes) - Ayrshare requires at least ${minMinutes} minutes. Post may be published immediately.`;
				
			logAyrshareOperation({
				timestamp: new Date().toISOString(),
				operation: 'Schedule Warning',
				status: 'warning',
				data: {
					message: warningMessage,
					scheduleDate: cleanedBody.scheduleDate,
					minutesFromNow,
					willBeImmediate: true
				},
				requestId
			});
		}
	} else {
		logAyrshareOperation({
			timestamp: new Date().toISOString(),
			operation: 'Schedule Check',
			status: 'started',
			data: {
				isScheduled: false,
				willPublishImmediately: true,
				hasScheduleDate: false
			},
			requestId
		});
	}

	// Removed pre-publish duplicate checking - let Ayrshare handle duplicates naturally

	// Log the API call with structured logging
	logAyrshareAPICall('Standard Post', `${AYRSHARE_API_URL}/post`, 'POST', headers, cleanedBody, requestId);

	try {
		const startTime = Date.now();
		
		const response = await fetch(`${AYRSHARE_API_URL}/post`, {
			method: 'POST',
			headers,
			body: JSON.stringify(cleanedBody)
		});

		const responseTime = Date.now() - startTime;
		const result = await response.json();

		// Log the API response with structured logging
		logAyrshareAPIResponse('Standard Post', response.status, response.statusText, result, responseTime, requestId);
	
	// Log successful responses too
	if (response.ok) {
		console.log('✅ Ayrshare API Success Response:', {
			status: response.status,
			result: result
		});
		
		// Check for platform-specific issues in successful responses
		if (result.posts && Array.isArray(result.posts)) {
			result.posts.forEach((post: any, index: number) => {
				console.log(`📋 Post ${index + 1} details:`, {
					id: post.id,
					status: post.status,
					platforms: post.platforms || 'N/A',
					errors: post.errors || 'None'
				});
				
				// Specific Twitter debugging
				if (post.platforms && (post.platforms.twitter || post.platforms.x)) {
					console.log(`🐦 TWITTER RESULT for Post ${index + 1}:`, {
						twitterResult: post.platforms.twitter || post.platforms.x,
						twitterStatus: post.platforms.twitter?.status || post.platforms.x?.status,
						twitterId: post.platforms.twitter?.postId || post.platforms.x?.postId,
						twitterUrl: post.platforms.twitter?.postUrl || post.platforms.x?.postUrl
					});
				}
				
				// Check for platform-specific errors even in "successful" responses
				if (post.errors && Array.isArray(post.errors)) {
					post.errors.forEach((error: any) => {
						console.error(`❌ Platform Error in Post ${index + 1}:`, {
							platform: error.platform,
							code: error.code,
							message: error.message,
							status: error.status
						});
						
						// Extra Twitter error details
						if (error.platform === 'twitter' || error.platform === 'x') {
							console.error(`🐦 TWITTER ERROR DETAILS:`, {
								errorCode: error.code,
								errorMessage: error.message,
								errorStatus: error.status,
								fullError: error
							});
						}
					});
				}
			});
		}
		
		// Check for postIds to see which platforms succeeded
		if (result.postIds) {
			console.log('📍 Platform Post IDs:', result.postIds);
			Object.entries(result.postIds).forEach(([platform, postId]) => {
				console.log(`✅ ${platform.toUpperCase()}: ${postId}`);
			});
			
			// Specific Twitter success check
			if (result.postIds.twitter) {
				console.log('🐦 ✅ TWITTER SUCCESS - Post ID:', result.postIds.twitter);
			} else {
				console.log('🐦 ❌ TWITTER NOT IN SUCCESS LIST');
				console.log('🐦 Available platforms in postIds:', Object.keys(result.postIds));
			}
		}
		
		// Final platform summary
		console.log('📊 FINAL PLATFORM SUMMARY:');
		console.log('  - Original platforms:', postData.platforms);
		console.log('  - Mapped platforms:', mappedPlatforms);
		console.log('  - Success platforms:', result.postIds ? Object.keys(result.postIds) : 'None');
	}
	
	if (!response.ok) {
		// Log the full error response for debugging
		console.error('❌ Ayrshare API Error Response:', {
			status: response.status,
			statusText: response.statusText,
			result: result,
			requestBody: cleanedBody
		});
		
		// Additional debugging for the specific error structure
		console.error('🔍 Full result object:', JSON.stringify(result, null, 2));
		if (result.posts && Array.isArray(result.posts)) {
			console.error('🔍 Posts array length:', result.posts.length);
			result.posts.forEach((post: any, index: number) => {
				console.error(`🔍 Post ${index + 1}:`, JSON.stringify(post, null, 2));
				if (post.errors) {
					console.error(`🔍 Post ${index + 1} errors:`, JSON.stringify(post.errors, null, 2));
				}
			});
		}
		
		// Enhanced error handling for specific platform issues
		// Check for errors in the main result.errors array
		if (result.errors && Array.isArray(result.errors)) {
			const platformErrors = result.errors.map((error: any) => {
				if (error.platform && error.message) {
					if (error.code === 272) {
						return `${error.platform.toUpperCase()}: Account authorization expired. Please go to https://app.ayrshare.com/social-accounts and reconnect your ${error.platform} account.`;
					}
					if (error.code === 156) {
						return `${error.platform.toUpperCase()}: Account not linked. Please connect your ${error.platform} account at https://app.ayrshare.com/social-accounts`;
					}
					if (error.code === 139 && error.platform === 'instagram') {
						return `INSTAGRAM: Media processing error. Instagram posts require images or videos. Please add media to your post or remove Instagram from selected platforms.`;
					}
					return `${error.platform.toUpperCase()}: ${error.message}`;
				}
				return error.message || 'Unknown platform error';
			});
			
			if (platformErrors.length > 0) {
				throw new Error(platformErrors.join('\n'));
			}
		}
		
		// Check for errors in the result.posts array structure
		if (result.posts && Array.isArray(result.posts)) {
			const postErrors: string[] = [];
			result.posts.forEach((post: any, index: number) => {
				if (post.errors && Array.isArray(post.errors)) {
					post.errors.forEach((error: any) => {
						if (error.platform && error.message) {
							if (error.code === 272) {
								postErrors.push(`${error.platform.toUpperCase()}: Account authorization expired. Please go to https://app.ayrshare.com/social-accounts and reconnect your ${error.platform} account.`);
							} else if (error.code === 156) {
								postErrors.push(`${error.platform.toUpperCase()}: Account not linked. Please connect your ${error.platform} account at https://app.ayrshare.com/social-accounts`);
							} else if (error.code === 139 && error.platform === 'instagram') {
								postErrors.push(`INSTAGRAM: Media processing error. Instagram posts require images or videos. Please add media to your post or remove Instagram from selected platforms.`);
							} else if (error.code === 132 && (error.platform === 'twitter' || error.platform === 'x')) {
								postErrors.push(`TWITTER: ${error.message} Auto-threading should have been enabled - this may indicate a configuration issue.`);
							} else if (error.platform === 'tiktok') {
								postErrors.push(`TIKTOK: ${error.message} (Code: ${error.code || 'N/A'}) - Check if TikTok account is properly connected at https://app.ayrshare.com/social-accounts`);
							} else {
								postErrors.push(`${error.platform.toUpperCase()}: ${error.message} (Code: ${error.code || 'N/A'})`);
							}
						} else {
							postErrors.push(`Post ${index + 1}: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
						}
					});
				}
			});
			
			if (postErrors.length > 0) {
				throw new Error(postErrors.join('\n'));
			}
		}
		
		// Handle specific 400 errors related to media
		if (response.status === 400) {
			if (result.message && result.message.includes('media')) {
				throw new Error(`Media Error: ${result.message}. Please check that your media URLs are publicly accessible and in a supported format.`);
			}
			
			// Check if the error is related to problematic URLs (like Lunary OG images)
			if (cleanedBody.mediaUrls && cleanedBody.mediaUrls.some((url: string) => url.includes('lunary.app'))) {
				throw new Error(`Media URL Error: Ayrshare cannot access the provided media URL. This often happens with dynamic image URLs. Please try uploading the image directly or using a different image source.`);
			}
		}
		
		// Handle duplicate errors naturally - don't try to recover
		// Ayrshare prevents duplicates for good reasons (spam prevention, platform policies)
		if (response.status === 400 && result.posts?.[0]?.errors?.some((e: any) => e.code === 137)) {
			logAyrshareOperation({
				timestamp: new Date().toISOString(),
				operation: 'Duplicate Content Detected',
				status: 'error',
				error: 'Duplicate content - Ayrshare prevents posting duplicate content within 48 hours',
				data: { 
					httpStatus: response.status,
					duplicatePostId: result.posts?.[0]?.id,
					affectedPlatforms: result.posts?.[0]?.errors?.map((e: any) => e.platform) || []
				},
				requestId
			});
			
			throw new Error('Duplicate content detected. Ayrshare prevents posting identical content within 48 hours to comply with social media platform policies.');
		}

		console.error('❌ Ayrshare API Error:', response.status, result.message || result.error || 'Unknown error');
		throw new Error(result.message || result.error || `Failed to publish post (${response.status})`);
	}

	return result;
	
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		
		logPostWorkflow('Standard Post Network Error', postData, 'error', errorMessage, { 
			requestId,
			errorType: 'network',
			stack: error instanceof Error ? error.stack : undefined
		});
		
		throw error;
	}
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