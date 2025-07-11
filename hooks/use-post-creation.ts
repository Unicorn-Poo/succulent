"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Post, PostFullyLoaded } from "../app/schema";
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
		}>;
	};
}

export function usePostCreation({ post, accountGroup }: PostCreationProps) {
	const [activeTab, setActiveTab] = useState("base");
	const [seriesType, setSeriesType] = useState<"reply" | null>(null);
	const [title, setTitle] = useState(post.title?.toString() || "");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
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
		const content = contextText ?? currentPost.variants[activeTab]?.text?.toString() ?? "";
		return manualThreadMode && content.includes('\n\n');
	}, [manualThreadMode, contextText, currentPost.variants, activeTab]);

	const isImplicitThread = useMemo(() => {
		const content = contextText ?? currentPost.variants[activeTab]?.text?.toString() ?? "";
		const platform = accountGroup.accounts[activeTab]?.platform || 'default';
		const limit = PLATFORM_CHARACTER_LIMITS[platform as keyof typeof PLATFORM_CHARACTER_LIMITS] || PLATFORM_CHARACTER_LIMITS.default;
		return content.length > limit;
	}, [contextText, currentPost.variants, activeTab, accountGroup.accounts]);

	const isThread = isExplicitThread || isImplicitThread;

	useEffect(() => {
		const replyToData = currentPost.variants[activeTab]?.replyTo;
		if (replyToData?.url) {
			setReplyUrl(replyToData.url);
			setSeriesType('reply');
		} else {
			setReplyUrl('');
			setSeriesType(null);
		}
	}, [activeTab, currentPost.variants]);

	const isValidReplyUrl = useMemo(() => 
		replyUrl ? validateReplyUrl(replyUrl) : false, 
		[replyUrl]
	);

	const detectedPlatform = useMemo(() => 
		replyUrl ? detectPlatformFromUrl(replyUrl) : null, 
		[replyUrl]
	);

	const availableAccounts = useMemo(() => 
		Object.entries(accountGroup.accounts).filter(
			([key]) => !selectedPlatforms.includes(key)
		), 
		[accountGroup.accounts, selectedPlatforms]
	);

	const hasUnsavedChanges = useMemo(() => {
		if (!contextText) return false;
		const savedContent = currentPost.variants[activeTab]?.text?.toString() || "";
		return contextText !== savedContent;
	}, [contextText, currentPost.variants, activeTab]);

	const canPublish = useMemo(() => {
		const content = currentPost.variants[activeTab]?.text?.toString() || "";
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
		const platforms = Object.keys(currentPost.variants).filter(key => key !== "title");
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
			const savedContent = currentPost.variants[activeTab]?.text?.toString() || "";
			updateThreadPreview(savedContent);
		}
	}, [contextText, currentPost.variants, activeTab, updateThreadPreview]);

	useEffect(() => {
		const text = contextText ?? currentPost.variants[activeTab]?.text?.toString() ?? '';
		if (isThread) {
			const threads = generateThreadPreview(text, activeTab);
			setThreadPosts(threads);
		} else {
			setThreadPosts([]);
		}
	}, [contextText, currentPost.variants, activeTab, isThread]);

	useEffect(() => {
		const replyToData = currentPost.variants[activeTab]?.replyTo;

		const shouldFetch = isValidReplyUrl && seriesType === 'reply' && (!replyToData || replyToData.url !== replyUrl || !replyToData.authorPostContent);

		if (shouldFetch) {
			const fetchContent = async () => {
				setIsFetchingReply(true);
				setFetchReplyError(null);
				try {
					const postContent = await fetchPostContent(replyUrl);
					
					setPost(prevPost => {
						const newPost = { ...prevPost };
						const variant = newPost.variants[activeTab];
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
						return newPost;
					});

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
			setPost(prevPost => {
				const newPost = { ...prevPost };
				const variant = newPost.variants[activeTab];
				if (variant && variant.replyTo) {
					variant.replyTo = {};
				}
				return newPost;
			});
		}
	}, [replyUrl, isValidReplyUrl, seriesType, activeTab, currentPost.variants, detectedPlatform]);

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
			setPost(prevPost => {
				const newPost = { ...prevPost };
				if (newPost.variants[activeTab]) {
					newPost.variants[activeTab] = {
						...newPost.variants[activeTab],
						text: contextText,
						edited: true,
						lastModified: new Date().toISOString(),
					} as Post['variants'][keyof Post['variants']];
				}
				return newPost;
			});

			setContextText(null);
			setSuccess("Content saved successfully!");

		} catch (error) {
			console.error('Error saving content:', error);
			setErrors([handleApiError(error)]);
		} finally {
			setIsSaving(false);
		}
	}, [contextText, currentPost.variants, activeTab]);

	const handlePublishPost = useCallback(async () => {
		setIsScheduling(true);
		setErrors([]);
		setSuccess("");

		try {
			const platforms = selectedPlatforms.filter(p => p !== "base");
			const postText = currentPost.variants[activeTab]?.text?.toString() || "";

			if (!postText.trim()) {
				throw new Error("Post content cannot be empty");
			}

			// =============================================================================
			// 🆓 FREE ACCOUNT MODE (ACTIVE FOR DEVELOPMENT)
			// =============================================================================
			if (!isBusinessPlanMode()) {
				// Free account mode - no profile keys needed
				const mediaUrls = currentPost.variants[activeTab]?.media?.map(item => 
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

			const mediaUrls = currentPost.variants[activeTab]?.media?.map(item => 
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
		currentPost,
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

		setPost(prevPost => {
			const newPost = { ...prevPost };
			const variant = newPost.variants[activeTab];
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
			return newPost;
		});
	};

	const handleTitleSave = useCallback(() => {
		setIsEditingTitle(false);
		setPost(prevPost => ({...prevPost, title: title }));
		console.log('Title updated:', title);
	}, [title]);

	const handleClearSchedule = useCallback(() => {
		setScheduledDate(null);
		setShowSettings(false);
	}, []);

	const handleAddAccount = useCallback((platform: string) => {
		if (!selectedPlatforms.includes(platform)) {
			setSelectedPlatforms(prev => [...prev, platform]);
		}
		setShowAddAccountDialog(false);
	}, [selectedPlatforms]);

	const handleRemoveAccount = useCallback((platform: string) => {
		setSelectedPlatforms(prev => prev.filter(p => p !== platform));
		if (activeTab === platform) {
			setActiveTab("base");
		}
	}, [activeTab]);

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

	const handleImageUpload = useCallback(() => {
		const newImage = {
			type: 'image',
			image: `https://source.unsplash.com/random/800x600?sig=${Math.random()}`,
			alt: 'A randomly uploaded image',
		};

		setPost(prevPost => {
			const newPost = { ...prevPost };
			const variant = newPost.variants[activeTab];
			if (variant) {
				const currentMedia = (variant.media || []);
				
				const updatedPost = {
					...newPost,
					variants: {
						...newPost.variants,
						[activeTab]: {
							...variant,
							media: [...currentMedia, newImage],
						},
					},
				};
				return updatedPost as PostFullyLoaded;
			}
			return newPost;
		});
	}, [activeTab]);

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