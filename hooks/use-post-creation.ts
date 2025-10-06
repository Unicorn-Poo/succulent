"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Post, PostFullyLoaded, ImageMedia, VideoMedia, PostVariant, MediaItem, ReplyTo, PlatformNames } from "../app/schema";
import { co, FileStream } from "jazz-tools";
// Note: createImage might be imported differently in your Jazz version
import { 
	platformIcons, 
	platformLabels, 
	PLATFORM_CHARACTER_LIMITS 
} from "../utils/postConstants";
import { validateReplyUrl, detectPlatformFromUrl } from "../utils/postValidation";
import { generateThreadPreview, ThreadPost } from "../utils/threadUtils";
import { 
	handleStandardPost, 
	handleReplyPost, 
	handleMultiPosts, 
	handleApiError,
	PostData,
	fetchPostContent
} from "../utils/apiHandlers";
import { isBusinessPlanMode } from "../utils/ayrshareIntegration";

type SeriesType = "reply" | "thread" | null;

interface PostCreationProps {
	post: PostFullyLoaded;
	accountGroup: {
		id: string;
		name: string;
		ayrshareProfileKey?: string;
		ayrshareProfileTitle?: string;
		accounts: Record<string, {
			id: string;
			platform: string;
			name: string;
			profileKey?: string;
			isLinked?: boolean;
			status?: "pending" | "linked" | "error" | "expired";
			// Legacy fields for backward compatibility
			apiUrl?: string;
			avatar?: string;
			username?: string;
			displayName?: string;
			url?: string;
		}> | any[]; // Allow array for Jazz CoList
	};
}

export function usePostCreation({ post, accountGroup }: PostCreationProps) {
	// Immediate cleanup of corrupted variants before any other processing
	try {
		const corruptedVariantId = 'co_zerhbvzPjo6yVD4HZ7URSzung3k';
		if (post?.variants && post.variants[corruptedVariantId]) {
	
			delete post.variants[corruptedVariantId];
		}
	} catch (error) {
		console.error('Error during immediate cleanup:', error);
	}

	const [activeTab, setActiveTab] = useState("base");
	const [seriesType, setSeriesType] = useState<SeriesType>(null);
	const [title, setTitle] = useState(post.title?.toString() || "");
	const [isEditingTitle, setIsEditingTitle] = useState(false);

	// Sync title with Jazz post object changes, but only if not currently editing
	useEffect(() => {
		if (!isEditingTitle) {
			const jazzTitle = post.title?.toString() || "";
			if (jazzTitle !== title) {
				setTitle(jazzTitle);
			}
		}
	}, [post.title, isEditingTitle, title]);
	const [replyUrl, setReplyUrl] = useState("");
	const [postingInterval, setPostingInterval] = useState(5);
	const [showSettings, setShowSettings] = useState(false);
	const [showPostTypeDropdown, setShowPostTypeDropdown] = useState(false);
	const [showSaveButton, setShowSaveButton] = useState(false);
	const [showPublishButton, setShowPublishButton] = useState(false);
	const [contextText, setContextText] = useState<string | null>(null);
	const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
	const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
	const [isScheduling, setIsScheduling] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [success, setSuccess] = useState("");
	const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([]);
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
	const [showPreviewModal, setShowPreviewModal] = useState(false);
	const [manualThreadMode, setManualThreadMode] = useState(false);
	const [isFetchingReply, setIsFetchingReply] = useState(false);
	const [fetchReplyError, setFetchReplyError] = useState<string | null>(null);
	const [isQuoteTweet, setIsQuoteTweet] = useState(false);
	const [currentPost, setPost] = useState(post);
	const [platformAuthErrors, setPlatformAuthErrors] = useState<any[]>([]);
	const [showAuthErrorDialog, setShowAuthErrorDialog] = useState(false);

	// Sync currentPost with post prop changes
	useEffect(() => {
		setPost(post);
	}, [post]);

	// Initialize form state from existing post data
	useEffect(() => {
		if (post?.variants?.base?.scheduledFor) {
			const existingDate = new Date(post.variants.base.scheduledFor);
			// Only update if the date is actually different to prevent loops
			if (!scheduledDate || existingDate.getTime() !== scheduledDate.getTime()) {
				setScheduledDate(existingDate);
			}
		}
	}, [post?.id]); // Only depend on post ID, not the full post object

	// Clean up corrupted variants immediately to prevent Jazz loading errors
	useEffect(() => {
		try {
			const corruptedVariantId = 'co_zerhbvzPjo6yVD4HZ7URSzung3k';
			
			// Check if the corrupted variant exists and remove it
			if (post.variants && post.variants[corruptedVariantId]) {

				delete post.variants[corruptedVariantId];
			}
			
			// Also clean up any other variants with broken references
			Object.keys(post.variants || {}).forEach(key => {
				if (key !== 'title') {
					const variant = post.variants[key];
					if (variant && (variant.text === null || variant.media === null || variant.replyTo === null)) {

						delete post.variants[key];
					}
				}
			});
		} catch (error) {
			console.error('Error cleaning up variants:', error);
		}
	}, [post]);

	const hasMultipleAccounts = useMemo(() => {
		return selectedPlatforms.filter(p => p !== 'base').length > 1;
	}, [selectedPlatforms]);

	const dropdownRef = useRef<HTMLDivElement>(null);

	const handleToggleReplyMode = useCallback(() => {
		setSeriesType(prev => {
			const newSeriesType = prev === 'reply' ? null : 'reply';
			
			if (newSeriesType === 'reply') {
				// Entering reply mode - clear content and reset state
				setContextText("");
				setReplyUrl("");
				setIsQuoteTweet(false);
				setFetchReplyError(null);
			} else {
				// Exiting reply mode - clear reply-related state
				setReplyUrl("");
				setIsQuoteTweet(false);
				setFetchReplyError(null);
			}
			
			return newSeriesType;
		});
	}, []);

	const isExplicitThread = useMemo(() => {
		// Safely access variant text with fallback to empty string for broken references
		const variant = currentPost.variants[activeTab];
		const content = contextText ?? (variant?.text && typeof variant.text.toString === 'function' ? variant.text.toString() : "") ?? "";
		return manualThreadMode && content.includes('\n\n');
	}, [manualThreadMode, contextText, currentPost.variants, activeTab]);

	const isImplicitThread = useMemo(() => {
		// Safely access variant text with fallback to empty string for broken references
		const variant = currentPost.variants[activeTab];
		const content = contextText ?? (variant?.text && typeof variant.text.toString === 'function' ? variant.text.toString() : "") ?? "";
		
		// Safe platform access with proper type handling
		let platform = 'default';
		if (Array.isArray(accountGroup.accounts)) {
			const account = accountGroup.accounts.find((acc: any) => acc.id === activeTab || acc.platform === activeTab);
			platform = account?.platform || 'default';
		} else if (accountGroup.accounts && typeof accountGroup.accounts === 'object') {
			platform = accountGroup.accounts[activeTab]?.platform || 'default';
		}
		
		const limit = PLATFORM_CHARACTER_LIMITS[platform as keyof typeof PLATFORM_CHARACTER_LIMITS] || PLATFORM_CHARACTER_LIMITS.default;
		return content.length > limit;
	}, [contextText, currentPost.variants, activeTab, accountGroup.accounts]);

	const isThread = isExplicitThread || isImplicitThread;

	useEffect(() => {
		const replyToData = post.variants[activeTab]?.replyTo;
		if (replyToData?.url) {
			setReplyUrl(replyToData.url);
			setSeriesType('reply');
		} else {
			setReplyUrl('');
			setSeriesType(null);
		}
	}, [activeTab, post.variants]);

	const isValidReplyUrl = useMemo(() => 
		replyUrl ? validateReplyUrl(replyUrl) : false, 
		[replyUrl]
	);

	const detectedPlatform = useMemo(() => {
		const detected = replyUrl ? detectPlatformFromUrl(replyUrl) : null;
		// Type cast to ensure it matches the PlatformNames enum
		return detected && PlatformNames.includes(detected as any) ? detected as typeof PlatformNames[number] : null;
	}, [replyUrl]);

	const availableAccounts = useMemo(() => {
		// Handle both legacy account groups (object) and Jazz account groups (array)
		let allAccounts: [string, any][] = [];
		
		if (accountGroup.accounts) {
			if (Array.isArray(accountGroup.accounts)) {
				// Jazz CoList - treat as array
				allAccounts = (accountGroup.accounts as any[]).map((account, index) => {
					// Use platform as the key (this is what handleAddAccount expects)
					const platform = account.platform || 'unknown';
					const accountData = {
						id: account.id,
						name: account.name || account.displayName || account.username || 'Unknown Account',
						platform: platform,
						profileKey: account.profileKey,
						isLinked: account.isLinked || true,
						status: account.status || 'linked'
					};
					
					console.log(`🔍 Available account: platform=${platform}, data=`, accountData);
					return [platform, accountData];
				});
			} else {
				// Legacy object - use Object.entries
				allAccounts = Object.entries(accountGroup.accounts);
			}
		}
		
		const filtered = allAccounts.filter(
			([key]) => !selectedPlatforms.includes(key)
		);
		
		console.log('🔍 All accounts:', allAccounts.map(([key, account]) => `${key}:${account.platform}`));
		console.log('🔍 Selected platforms:', selectedPlatforms);
		console.log('🔍 Available accounts after filtering:', filtered.map(([key, account]) => `${key}:${account.platform}`));
		
		return filtered;
	}, [accountGroup.accounts, selectedPlatforms]);

	const hasUnsavedChanges = useMemo(() => {
		if (!contextText) return false;
		// Safely access variant text with fallback for broken references
		const variant = currentPost.variants[activeTab];
		const savedContent = (variant?.text && typeof variant.text.toString === 'function' ? variant.text.toString() : "") || "";
		return contextText !== savedContent;
	}, [contextText, currentPost.variants, activeTab]);

	const canPublish = useMemo(() => {
		// Safely access variant text with fallback for broken references
		const variant = currentPost.variants[activeTab];
		const content = (variant?.text && typeof variant.text.toString === 'function' ? variant.text.toString() : "") || "";
		return content.trim().length > 0 && selectedPlatforms.length > 1;
	}, [currentPost.variants, activeTab, selectedPlatforms]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowPostTypeDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	useEffect(() => {
		// Only include known safe variants to avoid corrupted ones
		const platforms = ['base']; // Start with just base variant to avoid corruption
		
		// Get list of actually connected platforms from accountGroup
		const connectedPlatforms = new Set<string>();
		if (accountGroup?.accounts) {
			if (Array.isArray(accountGroup.accounts)) {
				// Jazz CoList
				(accountGroup.accounts as any[]).forEach(acc => {
					if (acc?.platform && acc?.isLinked !== false) {
						connectedPlatforms.add(acc.platform);
					}
				});
			} else {
				// Legacy object
				Object.entries(accountGroup.accounts).forEach(([key, acc]: [string, any]) => {
					if (acc?.platform && acc?.isLinked !== false) {
						connectedPlatforms.add(acc.platform);
					}
				});
			}
		}
		
		// Safely check for additional variants without triggering Jazz loading errors
		try {
			Object.keys(currentPost.variants || {}).forEach(key => {
				if (key !== "title" && key !== "base" && key !== 'co_zerhbvzPjo6yVD4HZ7URSzung3k') {
					// Only add if it's a valid platform key, not corrupted, AND actually connected
					try {
						const variant = currentPost.variants[key];
						if (variant && variant.text !== null && variant.text !== undefined) {
							// Only include if this platform is actually connected
							if (connectedPlatforms.has(key)) {
								platforms.push(key);
							} else {
								// Remove the variant for unconnected platforms
								delete currentPost.variants[key];
							}
						}
					} catch (e) {
						console.warn(`Skipping corrupted variant: ${key}`);
					}
				}
			});
		} catch (error) {
			console.warn('Error accessing variants, using base only:', error);
		}
		
		setSelectedPlatforms(platforms);
	}, [currentPost.variants, accountGroup.accounts]);

	useEffect(() => {
		setShowSaveButton(hasUnsavedChanges);
	}, [hasUnsavedChanges]);

	useEffect(() => {
		setShowPublishButton(canPublish && !hasUnsavedChanges);
	}, [canPublish, hasUnsavedChanges]);

	const updateThreadPreview = useCallback((text: string) => {
		if (isThread) {
			const threads = generateThreadPreview(text, activeTab);
			setThreadPosts(threads);
		} else {
			setThreadPosts([]);
		}
	}, [isThread, activeTab]);

	useEffect(() => {
		if (contextText) {
			updateThreadPreview(contextText);
		} else {
			const savedContent = post.variants[activeTab]?.text?.toString() || "";
			updateThreadPreview(savedContent);
		}
	}, [contextText, post.variants, activeTab, updateThreadPreview]);

	useEffect(() => {
		const text = contextText ?? post.variants[activeTab]?.text?.toString() ?? '';
		if (isThread) {
			const threads = generateThreadPreview(text, activeTab);
			setThreadPosts(threads);
		} else {
			setThreadPosts([]);
		}
	}, [contextText, post.variants, activeTab, isThread]);

	useEffect(() => {
		const replyToData = post.variants[activeTab]?.replyTo;

		const shouldFetch = isValidReplyUrl && seriesType === 'reply' && (!replyToData || replyToData.url !== replyUrl || !replyToData.authorPostContent);

		if (shouldFetch) {
			const fetchContent = async () => {
				setIsFetchingReply(true);
				setFetchReplyError(null);
				try {
					const postContent = await fetchPostContent(replyUrl);
					
					// Update the Jazz object directly
					const variant = post.variants[activeTab];
					if (variant && variant.replyTo) {
						// Update existing ReplyTo object properties
						variant.replyTo.url = replyUrl;
						variant.replyTo.platform = detectedPlatform || undefined;
						variant.replyTo.author = postContent.author;
						variant.replyTo.authorUsername = postContent.authorUsername;
						variant.replyTo.authorPostContent = postContent.authorPostContent;
						variant.replyTo.authorAvatar = postContent.authorAvatar;
						variant.replyTo.likesCount = postContent.likesCount;
					}

				} catch (error) {
					setFetchReplyError(error instanceof Error ? error.message : "Failed to fetch post.");
				} finally {
					setIsFetchingReply(false);
				}
			};

			const handler = setTimeout(fetchContent, 500);
			return () => clearTimeout(handler);
		}

		if (!isValidReplyUrl && replyToData?.url) {
			// Clear reply data in Jazz object
			const variant = post.variants[activeTab];
			if (variant && variant.replyTo) {
				// Clear the ReplyTo object properties instead of replacing it
				variant.replyTo.url = undefined;
				variant.replyTo.platform = undefined;
				variant.replyTo.author = undefined;
				variant.replyTo.authorUsername = undefined;
				variant.replyTo.authorPostContent = undefined;
				variant.replyTo.authorAvatar = undefined;
				variant.replyTo.likesCount = undefined;
			}
		}
	}, [replyUrl, isValidReplyUrl, seriesType, activeTab, post.variants, detectedPlatform]);

	// Removed automatic tab switching when platform is detected for replies
	// useEffect(() => {
	// 	if (detectedPlatform && seriesType === 'reply') {
	// 		const accountKey = Object.keys(accountGroup.accounts).find(
	// 			key => accountGroup.accounts[key].platform === detectedPlatform
	// 		);
	// 		if (accountKey) {
	// 			setActiveTab(accountKey);
	// 		}
	// 	}
	// }, [detectedPlatform, seriesType, accountGroup.accounts]);

	const handleSaveContent = useCallback(async () => {
		if (!contextText) return;

		setIsSaving(true);
		setErrors([]);
		setSuccess("");

		try {
			// Update the Jazz CoPlainText using applyDiff (as per Jazz docs)
			const variant = currentPost.variants[activeTab];
			// Only attempt to save if we have a valid variant with proper text reference
			if (variant?.text && typeof variant.text.applyDiff === 'function' && contextText) {
				variant.text.applyDiff(contextText);
				
				// Update metadata fields directly on the Jazz object
				variant.edited = true;
				variant.lastModified = new Date().toISOString();
			}

			setContextText(null);
			setSuccess("Content saved successfully!");

		} catch (error) {
			console.error('Error saving content:', error);
			setErrors([handleApiError(error)]);
		} finally {
			setIsSaving(false);
		}
	}, [contextText, post.variants, activeTab]);

	const handlePublishPost = useCallback(async () => {
		setIsScheduling(true);
		setErrors([]);
		setSuccess("");
		setPlatformAuthErrors([]);
		setShowAuthErrorDialog(false);

		try {
			const platforms = selectedPlatforms.filter(p => p !== "base");
			const postText = post.variants[activeTab]?.text?.toString() || "";

			if (!postText.trim()) {
				throw new Error("Post content cannot be empty");
			}

			// =============================================================================
			// 🆓 FREE ACCOUNT MODE (ACTIVE FOR DEVELOPMENT)
			// =============================================================================
			if (!isBusinessPlanMode()) {
				// Debug media extraction
				console.log('🖼️ DEBUG: Media extraction');
				console.log('📷 Active tab:', activeTab);
				console.log('📷 Post variants:', Object.keys(post.variants));
				console.log('📷 Current variant media:', post.variants[activeTab]?.media);
				
				// EMERGENCY DEBUG: Find the source of [object Object]
				console.log(`🚨 [EMERGENCY] Media debugging - activeTab: ${activeTab}`);
				console.log(`🚨 [EMERGENCY] Post variants:`, Object.keys(post.variants));
				console.log(`🚨 [EMERGENCY] Current variant:`, post.variants[activeTab]);
				console.log(`🚨 [EMERGENCY] Media array:`, post.variants[activeTab]?.media);
				
				// SIMPLE APPROACH: Just skip ALL uploaded media for now
				const mediaUrls: string[] = [];
				
				if (post.variants[activeTab]?.media) {
					for (const [index, item] of post.variants[activeTab].media.entries()) {
						console.log(`🚨 [EMERGENCY] Item ${index}:`, item);
						console.log(`🚨 [EMERGENCY] Item type:`, item?.type);
						console.log(`🚨 [EMERGENCY] Item typeof:`, typeof item);
						
						// ONLY handle external URLs - skip ALL uploaded content
						if (item?.type === "url-image" || item?.type === "url-video") {
							const url = (item as any).url;
							console.log(`🚨 [EMERGENCY] External URL:`, url, typeof url);
							
							if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
								console.log(`✅ [EMERGENCY] Adding valid URL: ${url}`);
								mediaUrls.push(url);
							} else {
								console.error(`❌ [EMERGENCY] Invalid URL:`, url, typeof url);
							}
						} else {
							console.log(`🚨 [EMERGENCY] Skipping uploaded media type: ${item?.type}`);
						}
					}
				}
				
				console.log(`🚨 [EMERGENCY] Final mediaUrls array:`, mediaUrls);
				console.log(`🚨 [EMERGENCY] All URLs are strings:`, mediaUrls.every(url => typeof url === 'string'));
				
				console.log(`📡 [MEDIA] Extracted ${mediaUrls.length} media URLs:`, mediaUrls);
				console.log(`🔍 [MEDIA] URL types:`, mediaUrls.map(url => typeof url));
				console.log(`🔍 [MEDIA] URL values:`, mediaUrls.map(url => String(url).substring(0, 100)));

				// Emergency check - detect any objects that got through
				const hasObjects = mediaUrls.some(url => typeof url !== 'string');
				if (hasObjects) {
					console.error(`🚨 [EMERGENCY] Objects detected in mediaUrls array!`);
					console.error(`🚨 [EMERGENCY] Full array:`, mediaUrls);
					console.error(`🚨 [EMERGENCY] Types:`, mediaUrls.map(url => typeof url));
				}

				// Final validation - ensure all URLs are strings and accessible
				const publicMediaUrls = mediaUrls.filter(url => {
					if (typeof url !== 'string') {
						console.error(`❌ [MEDIA] Non-string URL detected:`, url, typeof url);
						return false;
					}
					if (!url.startsWith('http://') && !url.startsWith('https://')) {
						console.warn(`⚠️ [MEDIA] Non-HTTP URL filtered: ${url}`);
						return false;
					}
					return true;
				});

				console.log(`🎯 [MEDIA] Final URLs for Ayrshare (${publicMediaUrls.length}):`, publicMediaUrls);
				console.log(`🎯 [MEDIA] Final URL types:`, publicMediaUrls.map(url => typeof url));

				// Debug platform detection
				console.log('🔍 Platforms being sent:', platforms);
				console.log('🔍 Contains twitter:', platforms.includes('twitter'));
				console.log('🔍 Contains x:', platforms.includes('x'));
				
				const hasTwitter = platforms.includes('twitter') || platforms.includes('x');
				console.log('🔍 Should enable Twitter options:', hasTwitter);
				
				const twitterOptions = hasTwitter ? {
					thread: true,
					threadNumber: true
				} : undefined;
				
				console.log('🔍 Twitter options created:', twitterOptions);

				const basePostData: PostData = {
					post: postText,
					platforms,
					mediaUrls: publicMediaUrls.length > 0 ? publicMediaUrls : undefined,
					scheduleDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
					// Enable auto-threading for Twitter when post is too long
					twitterOptions
				};
				
				// Debug the final post data being sent to Ayrshare
				console.log('🚀 Final basePostData being sent to Ayrshare:', JSON.stringify(basePostData, null, 2));

				// Warn user if media was filtered out
				if (mediaUrls.length > 0 && publicMediaUrls.length === 0) {
					const hasLunaryUrls = mediaUrls.some(url => url.includes('lunary.app'));
					if (hasLunaryUrls) {
						setErrors(["⚠️ Media URLs removed: The Lunary OG image URLs cannot be accessed by Ayrshare. The post will be published without media. Consider uploading the image directly or using a different image source."]);
						// Continue with posting but without media
					} else {
						setErrors(["⚠️ Media URLs removed: Ayrshare cannot access localhost URLs. Deploy your media to a public URL or use external media sources."]);
						return;
					}
				}

				console.log('📷 Final PostData being sent:', {
					...basePostData,
					mediaUrls: basePostData.mediaUrls
				});

				let results;

				if (seriesType === "reply" && replyUrl) {
					results = await handleReplyPost(basePostData, replyUrl);
				} else if (seriesType === "thread" && contextText?.trim()) {
					const threadPosts = generateThreadPreview(contextText);
					results = await handleMultiPosts(basePostData, threadPosts);
				} else {
					results = await handleStandardPost(basePostData);
				}

				setSuccess("Post published successfully!");
				// setResults(results); // This state is not defined in the original file
				return;
			}

			// =============================================================================
			// 🚀 BUSINESS PLAN MODE (ACTIVE)
			// =============================================================================
			
			// Business Plan mode - requires profile keys
			const profileKey = accountGroup.ayrshareProfileKey;

			if (!profileKey) {
				throw new Error("No Ayrshare profile found for this account group. Please check the account group settings.");
			}

			const mediaUrls = post.variants[activeTab]?.media?.map(item => {
				// Handle URL-based media from API posts
				if (item?.type === "url-image" || item?.type === "url-video") {
					return item.url;
				}
				// Handle FileStream media from UI uploads - use toString() or other methods
				if (item?.type === "image" && item.image) {
					return item.image.toString?.() || null;
				}
				if (item?.type === "video" && item.video) {
					return item.video.toString?.() || null;
				}
				return null;
			}).filter(Boolean) as string[] || [];

			const basePostData: PostData = {
				post: postText,
				platforms,
				profileKey,
				mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
				scheduleDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined
			};

			let results;

			if (seriesType === "reply" && replyUrl) {
				results = await handleReplyPost(basePostData, replyUrl);
			} else if (seriesType === "thread" && contextText?.trim()) {
				const threadPosts = generateThreadPreview(contextText);
				results = await handleMultiPosts(basePostData, threadPosts);
			} else {
				results = await handleStandardPost(basePostData);
			}

			setSuccess("Post published successfully!");
			// setResults(results); // Uncomment when you add results state if needed

		} catch (error) {
			// Check if this is a platform authorization error
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			
			// Parse platform-specific errors from the enhanced error message
			if (errorMessage.includes(':') && errorMessage.includes('authorization')) {
				const platformErrors = errorMessage.split('\n').map(line => {
					const [platform, message] = line.split(':').map(s => s.trim());
					return {
						platform: platform.toLowerCase(),
						code: message.includes('authorization expired') ? 272 : 156,
						message: message,
						resolution: { relink: true, platform: platform.toLowerCase() }
					};
				});
				
				setPlatformAuthErrors(platformErrors);
				setShowAuthErrorDialog(true);
			} else {
				const errorMessageText = handleApiError(error);
				setErrors([errorMessageText]);
			}
		} finally {
			setIsScheduling(false);
		}
	}, [
		selectedPlatforms,
		post,
		activeTab,
		scheduledDate,
		seriesType,
		replyUrl,
		contextText,
		accountGroup.accounts
	]);

	const handleContentChange = useCallback((newContent: string) => {
		setContextText(newContent);
		setSuccess("");
	}, []);

	const handleReplyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newUrl = e.target.value;
		setReplyUrl(newUrl);

		// Update the Jazz object directly
		const variant = post.variants[activeTab];
		if (variant && variant.replyTo) {
			variant.replyTo.url = newUrl;
			if (!newUrl) {
				// Clear all ReplyTo properties instead of replacing the object
				variant.replyTo.url = undefined;
				variant.replyTo.platform = undefined;
				variant.replyTo.author = undefined;
				variant.replyTo.authorUsername = undefined;
				variant.replyTo.authorPostContent = undefined;
				variant.replyTo.authorAvatar = undefined;
				variant.replyTo.likesCount = undefined;
			} else {
				variant.replyTo.authorPostContent = undefined;
			}
		}
	};

	const handleTitleSave = useCallback(() => {
		setIsEditingTitle(false);
		// Update the Jazz CoPlainText using applyDiff (as per Jazz docs)
		try {
			if (post.title) {
				post.title.applyDiff(title);
			}
		} catch (error) {
			console.error('Error updating title:', error);
		}
	}, [title, post]);

	const handleClearSchedule = useCallback(() => {
		setScheduledDate(null);
		// Update the post object to unschedule it
		if (post?.variants?.base) {
			try {
				post.variants.base.scheduledFor = undefined;
				if (post.variants.base.status === 'scheduled') {
					post.variants.base.status = 'draft';
				}
			} catch (error) {
				console.error('Failed to unschedule post:', error);
			}
		}
		setShowSettings(false);
	}, [post]);

	const handleScheduleDateChange = useCallback((date: Date | null) => {
		setScheduledDate(date);
		// Save to post object immediately
		if (post?.variants?.base) {
			try {
				if (date) {
					// Ensure the base variant has the required properties
					if (post.variants.base.scheduledFor !== undefined || 'scheduledFor' in post.variants.base) {
						post.variants.base.scheduledFor = date;
					}
					if (post.variants.base.status !== undefined || 'status' in post.variants.base) {
						post.variants.base.status = 'scheduled';
					}
				} else {
					if (post.variants.base.scheduledFor !== undefined || 'scheduledFor' in post.variants.base) {
						post.variants.base.scheduledFor = undefined;
					}
					if (post.variants.base.status === 'scheduled') {
						post.variants.base.status = 'draft';
					}
				}
			} catch (error) {
				console.error('Failed to save schedule change:', error);
			}
		}
	}, [post]);

	const handleAddAccount = useCallback((platform: string) => {
		console.log('🔍 Adding account for platform:', platform);
		console.log('🔍 Current selectedPlatforms:', selectedPlatforms);
		console.log('🔍 Existing variants:', Object.keys(post.variants || {}));
		
		if (!selectedPlatforms.includes(platform)) {
			try {
				// Check if variant already exists to prevent duplicate key error
				if (post.variants[platform]) {
					console.log(`⚠️ Platform variant ${platform} already exists, just adding to selectedPlatforms`);
					setSelectedPlatforms(prev => [...prev, platform]);
					setShowAddAccountDialog(false);
					return;
				}
				
				// Create a new PostVariant for this platform
				const baseVariant = post.variants.base;
				const baseText = baseVariant?.text?.toString() || "";
				
				console.log(`🔧 Creating new variant for platform: ${platform}`);
				
				// Create the collaborative objects
				const platformText = co.plainText().create(baseText, { owner: post._owner });
				const mediaList = co.list(MediaItem).create([], { owner: post._owner });
				const replyToObj = ReplyTo.create({}, { owner: post._owner });
				
				// Create the platform variant with all required fields
				const platformVariant = PostVariant.create({
					text: platformText,
					postDate: new Date(),
					media: mediaList,
					replyTo: replyToObj,
					status: 'draft', // Add required status field
					edited: false,
					lastModified: undefined,
				}, { owner: post._owner });
				
				// Add to post variants
				post.variants[platform] = platformVariant;
				
				console.log(`✅ Successfully created variant for platform: ${platform}`);
				setSelectedPlatforms(prev => [...prev, platform]);

			} catch (error) {
				console.error('❌ Error creating Jazz variant for platform:', platform, error);
				// Fallback to just state update if Jazz creation fails
				setSelectedPlatforms(prev => [...prev, platform]);
			}
		} else {
			console.log(`ℹ️ Platform ${platform} already selected`);
		}
		setShowAddAccountDialog(false);
	}, [selectedPlatforms, post]);

	const handleRemoveAccount = useCallback((platform: string) => {
		try {
			// Remove the Jazz variant
			if (post.variants[platform]) {
				delete post.variants[platform];

			}
		} catch (error) {
			console.error('Error removing Jazz variant for platform:', platform, error);
		}
		
		setSelectedPlatforms(prev => prev.filter(p => p !== platform));
		
		if (activeTab === platform) {
			setActiveTab("base");
		}
	}, [activeTab, post]);

	const getReplyDescription = useCallback(() => {
		if (!seriesType || seriesType !== "reply") return "";
		
		if (detectedPlatform === "x") {
			return "This will be posted as a reply to the specified tweet.";
		} else {
			return "This will be posted as a comment on the specified post.";
		}
	}, [seriesType, detectedPlatform]);

	const getMultiDescription = useCallback(() => {
		if (!isThread) return "";
		
		if (activeTab === "x") {
			return "This will be posted as a Twitter thread with automatic numbering.";
		} else {
			return "This will be posted as multiple connected posts with numbering.";
		}
	}, [isThread, activeTab]);

	const handlePreview = useCallback(() => {
		// Only allow preview if accounts are selected (excluding 'base')
		const hasSelectedAccounts = selectedPlatforms.filter(p => p !== 'base').length > 0;
		if (hasSelectedAccounts) {
			setShowPreviewModal(true);
		}
	}, [selectedPlatforms]);

	const handleImageUpload = useCallback(async () => {
		// Create a file input element with enhanced Apple Photos support
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		// Explicitly include Apple formats and common extensions
		fileInput.accept = 'image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.m4v';
		fileInput.multiple = true;
		
		fileInput.onchange = async (event) => {
			const files = (event.target as HTMLInputElement).files;
			if (!files || files.length === 0) return;
			
			setSuccess('Processing files...');
			setErrors([]);
			
			try {
				// Process each selected file
				for (const file of Array.from(files)) {
					console.log('📱 Processing file:', {
						name: file.name,
						type: file.type,
						size: file.size,
						lastModified: file.lastModified
					});
					
					// Enhanced file type detection for Apple Photos
					let isImage = file.type.startsWith('image/');
					let isVideo = file.type.startsWith('video/');
					
					// Handle Apple Photos edge cases
					if (!isImage && !isVideo) {
						// Check file extension as fallback (Apple Photos sometimes has missing/wrong MIME types)
						const fileName = file.name.toLowerCase();
						const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif'];
						const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];
						
						isImage = imageExtensions.some(ext => fileName.endsWith(ext));
						isVideo = videoExtensions.some(ext => fileName.endsWith(ext));
						
						if (isImage) {
							console.log('📱 Detected image by extension:', fileName);
						} else if (isVideo) {
							console.log('📱 Detected video by extension:', fileName);
						}
					}
					
					// Handle HEIC/HEIF files specifically (Apple's format)
					if (file.type === 'image/heic' || file.type === 'image/heif' || 
						file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
						console.log('📱 HEIC/HEIF file detected - treating as image');
						isImage = true;
					}
					
					// Handle missing MIME type (common with Apple Photos)
					if (!file.type || file.type === '') {
						console.log('📱 Missing MIME type - detecting by extension');
						const fileName = file.name.toLowerCase();
						if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png')) {
							isImage = true;
						} else if (fileName.endsWith('.mp4') || fileName.endsWith('.mov')) {
							isVideo = true;
						}
					}
					
					if (!isImage && !isVideo) {
						setErrors(prev => [...prev, `Unsupported file type: ${file.type || 'unknown'} (${file.name})`]);
						continue;
					}
					
					// Get the current post's owner for creating new objects
					const variant = post.variants[activeTab];
					if (!variant || !variant.media) {
						setErrors(prev => [...prev, 'No media list found for current post variant']);
						continue;
					}
					
					const owner = variant.media._owner;
					
					let mediaItem;
					if (isImage) {
						console.log('📱 Creating image media for:', file.name);
						try {
							// Use Jazz createImage for proper URL generation
							const { createImage } = await import('jazz-tools/media');
							const imageDefinition = await createImage(file, {
								owner,
								maxSize: 2048, // Reasonable size for social media
								placeholder: false, // No need for blur placeholder
								progressive: false // Simple single resolution
							});
							
							console.log('✅ Jazz ImageDefinition created:', imageDefinition);
							
							// Create ImageMedia with the ImageDefinition
							if (imageDefinition.original) {
								mediaItem = ImageMedia.create({
									type: 'image' as const,
									image: imageDefinition.original, // Use the original FileStream
									alt: `Image from ${file.name}`,
								}, { owner });
							} else {
								throw new Error('ImageDefinition original is null');
							}
							
							console.log('✅ Image media created with ImageDefinition:', mediaItem);
						} catch (imageError) {
							console.error('❌ Failed to create ImageDefinition, falling back to FileStream:', imageError);
							// Fallback to original method
							const fileStream = await FileStream.createFromBlob(file, { owner });
							mediaItem = ImageMedia.create({
								type: 'image' as const,
								image: fileStream,
								alt: `Image from ${file.name}`,
							}, { owner });
						}
					} else {
						console.log('📱 Creating video media for:', file.name);
						// Use the proper async FileStream creation method for video
						const fileStream = await FileStream.createFromBlob(file, { owner });
						
						mediaItem = VideoMedia.create({
							type: 'video' as const,
							video: fileStream,
							alt: `Video from ${file.name}`,
						}, { owner });
						
						console.log('✅ Video media created:', mediaItem);
					}
					
					// Add to the current post variant's media array directly
					if (variant.media) {
						// Add the new media item to the collaborative list
						variant.media.push(mediaItem);
					}
					
					setSuccess(`Successfully uploaded ${file.name}!`);
				}
			} catch (error) {
				setErrors(prev => [...prev, `Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`]);
				setSuccess('');
			}
		};
		
		// Trigger the file dialog
		fileInput.click();
	}, [activeTab, post]);

    return {
        activeTab, setActiveTab,
        seriesType, setSeriesType,
        title, setTitle,
        isEditingTitle, setIsEditingTitle,
        replyUrl, setReplyUrl,
        postingInterval, setPostingInterval,
        showSettings, setShowSettings,
        showSaveButton,
        showPublishButton,
        contextText, setContextText,
        showAddAccountDialog, setShowAddAccountDialog,
        scheduledDate, setScheduledDate,
        isScheduling,
        isSaving,
        errors,
        success,
        threadPosts,
        selectedPlatforms,
        showPreviewModal, setShowPreviewModal,
        manualThreadMode, setManualThreadMode,
        isFetchingReply,
        fetchReplyError,
        isQuoteTweet, setIsQuoteTweet,
        		post: currentPost, setPost,
        hasMultipleAccounts,
        isThread,
        isValidReplyUrl,
        detectedPlatform,
        availableAccounts,
        hasUnsavedChanges,
        handleToggleReplyMode,
        handleSaveContent,
        handlePublishPost,
        handleContentChange,
        handleReplyUrlChange,
        handleTitleSave,
        handleClearSchedule,
        handleScheduleDateChange,
        handleAddAccount,
        handleRemoveAccount,
        getReplyDescription,
        getMultiDescription,
        handlePreview,
        handleImageUpload,
		isExplicitThread,
		isImplicitThread,
		platformAuthErrors,
		showAuthErrorDialog,
		setShowAuthErrorDialog
    };
} 