"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Post, PostFullyLoaded, ImageMedia, VideoMedia, PostVariant, MediaItem, ReplyTo } from "../app/schema";
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

type SeriesType = "reply" | "multi";

interface PostCreationProps {
	post: PostFullyLoaded;
	accountGroup: {
		id: string;
		name: string;
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
			console.log('🧹 Immediately removing corrupted variant:', corruptedVariantId);
			delete post.variants[corruptedVariantId];
		}
	} catch (error) {
		console.error('Error during immediate cleanup:', error);
	}

	const [activeTab, setActiveTab] = useState("base");
	const [seriesType, setSeriesType] = useState<"reply" | null>(null);
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

	// Sync currentPost with post prop changes
	useEffect(() => {
		setPost(post);
	}, [post]);

	// Clean up corrupted variants immediately to prevent Jazz loading errors
	useEffect(() => {
		try {
			const corruptedVariantId = 'co_zerhbvzPjo6yVD4HZ7URSzung3k';
			
			// Check if the corrupted variant exists and remove it
			if (post.variants && post.variants[corruptedVariantId]) {
				console.log('🧹 Removing corrupted variant:', corruptedVariantId);
				delete post.variants[corruptedVariantId];
			}
			
			// Also clean up any other variants with broken references
			Object.keys(post.variants || {}).forEach(key => {
				if (key !== 'title') {
					const variant = post.variants[key];
					if (variant && (variant.text === null || variant.media === null || variant.replyTo === null)) {
						console.log('🧹 Removing broken variant:', key);
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
		const platform = accountGroup.accounts[activeTab]?.platform || 'default';
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

	const detectedPlatform = useMemo(() => 
		replyUrl ? detectPlatformFromUrl(replyUrl) : null, 
		[replyUrl]
	);

	const availableAccounts = useMemo(() => {
		// Handle both legacy account groups (object) and Jazz account groups (array)
		let allAccounts: [string, any][] = [];
		
		if (accountGroup.accounts) {
			if (Array.isArray(accountGroup.accounts)) {
				// Jazz CoList - treat as array
				allAccounts = (accountGroup.accounts as any[]).map((account, index) => {
					// Extract the key and ensure proper account structure
					const accountKey = account.id || account.platform || `account-${index}`;
					const accountData = {
						id: account.id,
						name: account.name || account.displayName || account.username || 'Unknown Account',
						platform: account.platform || 'unknown',
						profileKey: account.profileKey,
						isLinked: account.isLinked || true,
						status: account.status || 'linked'
					};
					
					return [accountKey, accountData];
				});
			} else {
				// Legacy object - use Object.entries
				allAccounts = Object.entries(accountGroup.accounts);
			}
		}
		
		const filtered = allAccounts.filter(
			([key]) => !selectedPlatforms.includes(key)
		);
		
		// Minimal logging for monitoring
		console.log(`💼 Account Manager: ${filtered.length} available accounts`);
		
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
		
		// Safely check for additional variants without triggering Jazz loading errors
		try {
			Object.keys(currentPost.variants || {}).forEach(key => {
				if (key !== "title" && key !== "base" && key !== 'co_zerhbvzPjo6yVD4HZ7URSzung3k') {
					// Only add if it's a valid platform key and not corrupted
					try {
						const variant = currentPost.variants[key];
						if (variant && variant.text !== null && variant.text !== undefined) {
							platforms.push(key);
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
	}, [currentPost.variants]);

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
					if (variant) {
						variant.replyTo = {
							url: replyUrl,
							platform: detectedPlatform || undefined,
							author: postContent.author,
							authorUsername: postContent.authorUsername,
							authorPostContent: postContent.authorPostContent,
							authorAvatar: postContent.authorAvatar,
							likesCount: postContent.likesCount,
						};
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
				variant.replyTo = {};
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
				// Free account mode - no profile keys needed
				const mediaUrls = post.variants[activeTab]?.media?.map(item => 
					item?.type === "image" ? item.image?.publicUrl : item?.type === "video" ? item.video?.publicUrl : undefined
				).filter(Boolean) as string[] || [];

				const basePostData: PostData = {
					post: postText,
					platforms,
					mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
					scheduleDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined
				};

				let results;

				if (seriesType === "reply" && replyUrl) {
					results = await handleReplyPost(basePostData, replyUrl);
				} else if (seriesType === "multi" && contextText.trim()) {
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
			// 🚀 BUSINESS PLAN MODE (COMMENTED OUT FOR DEVELOPMENT)
			// =============================================================================
			/*
			// Business Plan mode - requires profile keys
			const firstAccount = Object.values(accountGroup.accounts)[0];
			const profileKey = firstAccount?.profileKey;

			if (!profileKey) {
				throw new Error("No Ayrshare profile found. Please create and link your accounts first.");
			}

			const mediaUrls = post.variants[activeTab]?.media?.map(item => 
				item?.type === "image" ? item.image?.publicUrl : item?.type === "video" ? item.video?.publicUrl : undefined
			).filter(Boolean) as string[] || [];

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
			} else if (seriesType === "multi" && contextText.trim()) {
				const threadPosts = generateThreadPreview(contextText);
				results = await handleMultiPosts(basePostData, threadPosts);
			} else {
				results = await handleStandardPost(basePostData);
			}

			setSuccess("Post published successfully!");
			setResults(results);
			*/

		} catch (error) {
			const errorMessage = handleApiError(error);
			setErrors([errorMessage]);
			console.error("Failed to publish post:", error);
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
		if (variant) {
			if (!variant.replyTo) {
				variant.replyTo = {};
			}
			variant.replyTo.url = newUrl;
			if (!newUrl) {
				variant.replyTo = {};
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
		setShowSettings(false);
	}, []);

	const handleAddAccount = useCallback((platform: string) => {
		if (!selectedPlatforms.includes(platform)) {
			try {
				// Create a new PostVariant for this platform
				const baseVariant = post.variants.base;
				const baseText = baseVariant?.text?.toString() || "";
				
				// Create the collaborative objects
				const platformText = co.plainText().create(baseText, { owner: post._owner });
				const mediaList = co.list(MediaItem).create([], { owner: post._owner });
				const replyToObj = ReplyTo.create({}, { owner: post._owner });
				
				// Create the platform variant
				const platformVariant = PostVariant.create({
					text: platformText,
					postDate: new Date(),
					media: mediaList,
					replyTo: replyToObj,
					edited: false,
					lastModified: undefined,
				}, { owner: post._owner });
				
				// Add to post variants
				post.variants[platform] = platformVariant;
				
				setSelectedPlatforms(prev => [...prev, platform]);
				console.log(`➕ Added platform: ${platform} with Jazz variant`);
			} catch (error) {
				console.error('Error creating Jazz variant for platform:', platform, error);
				// Fallback to just state update
				setSelectedPlatforms(prev => [...prev, platform]);
			}
		}
		setShowAddAccountDialog(false);
	}, [selectedPlatforms, post]);

	const handleRemoveAccount = useCallback((platform: string) => {
		try {
			// Remove the Jazz variant
			if (post.variants[platform]) {
				delete post.variants[platform];
				console.log(`🗑️ Removed platform: ${platform} and its Jazz variant`);
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
		setShowPreviewModal(true);
	}, []);

	const handleImageUpload = useCallback(async () => {
		// Create a file input element
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = 'image/*,video/*';
		fileInput.multiple = true;
		
		fileInput.onchange = async (event) => {
			const files = (event.target as HTMLInputElement).files;
			if (!files || files.length === 0) return;
			
			setSuccess('Processing files...');
			setErrors([]);
			
			try {
				// Process each selected file
				for (const file of Array.from(files)) {
					// Check if it's an image or video
					const isImage = file.type.startsWith('image/');
					const isVideo = file.type.startsWith('video/');
					
					if (!isImage && !isVideo) {
						setErrors(prev => [...prev, `Unsupported file type: ${file.type}`]);
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
						// Use the proper async FileStream creation method
						const fileStream = await FileStream.createFromBlob(file, { owner });
						
						// Create ImageMedia with the FileStream
						mediaItem = ImageMedia.create({
							type: 'image' as const,
							image: fileStream,
							alt: undefined,
						}, { owner });
					} else {
						// Use the proper async FileStream creation method for video
						const fileStream = await FileStream.createFromBlob(file, { owner });
						
						mediaItem = VideoMedia.create({
							type: 'video' as const,
							video: fileStream,
							alt: undefined,
						}, { owner });
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
        handleAddAccount,
        handleRemoveAccount,
        getReplyDescription,
        getMultiDescription,
        handlePreview,
        handleImageUpload,
		isExplicitThread,
		isImplicitThread
    };
} 