"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button, Card, TextArea, TextField, Dialog, Box, Text, Badge, Switch, Avatar } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { Input } from "./input";
import {
	Edit3,
	Save,
	Plus,
	Calendar,
	CalendarDays,
	MessageSquare,
	ListOrdered,
	X,
	Link as LinkIcon,
	Loader2,
	AlertCircle,
	Check,
	Hash,
	ChevronDown,
	ChevronUp,
	Globe,
	Eye,
	Upload,
	ChevronLeft,
	ChevronRight,
	ListTree
} from "lucide-react";
import { Post, PostFullyLoaded } from "../app/schema";
import Image from "next/image";
import { MediaItem } from "../app/schema";

// Import utility functions
import { platformIcons, platformLabels, PLATFORM_CHARACTER_LIMITS } from "../utils/postConstants";
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
import { PreviewModal } from "./preview-modal";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
  } from "./tooltip"
import { PlatformPreview } from "./platform-previews";
import parse, { domToReact, HTMLReactParserOptions } from 'html-react-parser';

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
			apiUrl: string;
		}>;
	};
}

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
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

	const hasMultipleAccounts = useMemo(() => {
		return selectedPlatforms.filter(p => p !== 'base').length > 1;
	}, [selectedPlatforms]);

	// Ref for dropdown to handle clicks outside
	const dropdownRef = useRef<HTMLDivElement>(null);

	const handleToggleReplyMode = useCallback(() => {
		setSeriesType(prev => prev === 'reply' ? null : 'reply');
	}, []);

	const isExplicitThread = useMemo(() => {
		const content = contextText ?? post.variants[activeTab]?.text?.toString() ?? "";
		return manualThreadMode && content.includes('\n\n');
	}, [manualThreadMode, contextText, post.variants, activeTab]);

	const isImplicitThread = useMemo(() => {
		const content = contextText ?? post.variants[activeTab]?.text?.toString() ?? "";
		const platform = accountGroup.accounts[activeTab]?.platform || 'default';
		const limit = PLATFORM_CHARACTER_LIMITS[platform as keyof typeof PLATFORM_CHARACTER_LIMITS] || PLATFORM_CHARACTER_LIMITS.default;
		return content.length > limit;
	}, [contextText, post.variants, activeTab, accountGroup.accounts]);

	const isThread = isExplicitThread || isImplicitThread;

	// Sync component state with the post variant's replyTo data
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

	// Memoized values for performance
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

	// Check if current content is different from saved content
	const hasUnsavedChanges = useMemo(() => {
		if (!contextText) return false; // No changes if no context text
		const savedContent = post.variants[activeTab]?.text?.toString() || "";
		return contextText !== savedContent;
	}, [contextText, post.variants, activeTab]);

	// Check if post variant has content that can be published
	const canPublish = useMemo(() => {
		const content = post.variants[activeTab]?.text?.toString() || "";
		return content.trim().length > 0 && selectedPlatforms.length > 1; // More than just "base"
	}, [post.variants, activeTab, selectedPlatforms]);

	// Get current post type for dropdown
	const currentPostType = useMemo(() => {
		if (seriesType === "reply") return "reply";
		return "standard";
	}, [seriesType]);

	// Handle post type change from dropdown
	const handlePostTypeChange = useCallback((value: string) => {
		if (value === 'reply') {
			setSeriesType("reply");
		} else {
			setSeriesType(null);
		}
	}, []);

	// Handle clicks outside dropdown to close it
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

	// Initialize selected platforms from post variants
	useEffect(() => {
		const platforms = Object.keys(post.variants).filter(key => key !== "title");
		setSelectedPlatforms(platforms);
	}, [post.variants]);

	// Update save button visibility based on unsaved changes
	useEffect(() => {
		setShowSaveButton(hasUnsavedChanges);
	}, [hasUnsavedChanges]);

	// Update publish button visibility based on content availability
	useEffect(() => {
		setShowPublishButton(canPublish && !hasUnsavedChanges);
	}, [canPublish, hasUnsavedChanges]);

	// Thread preview generation with useCallback for performance
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
			// Update thread preview with saved content if no context text
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

		// Only fetch if the URL is valid and we don't already have the content for this URL
		if (isValidReplyUrl && (!replyToData || replyToData.url !== replyUrl || !replyToData.authorPostContent)) {
			const fetchContent = async () => {
				setIsFetchingReply(true);
				setFetchReplyError(null);
				try {
					const postContent = await fetchPostContent(replyUrl);
					// Save the fetched data to Jazz
					const variant = post.variants[activeTab];
					if (variant) {
						variant.replyTo = {
							url: replyUrl,
							platform: detectedPlatform || undefined,
							author: postContent.author,
							authorUsername: postContent.authorUsername,
							authorPostContent: postContent.authorPostContent,
							authorAvatar: postContent.avatar,
						};
					}
				} catch (error) {
					setFetchReplyError(error instanceof Error ? error.message : "Failed to fetch post.");
				} finally {
					setIsFetchingReply(false);
				}
			};
	
			// Debounce the fetch
			const handler = setTimeout(() => {
				fetchContent();
			}, 500); // 500ms delay
	
			return () => {
				clearTimeout(handler);
			};
		} else if (!isValidReplyUrl) {
			setFetchReplyError(null);
			const variant = post.variants[activeTab];
			if (variant && variant.replyTo) {
				// Clear replyTo data if the URL is cleared or invalid
				variant.replyTo = {};
			}
		}
	}, [replyUrl, isValidReplyUrl, activeTab, post.variants, detectedPlatform]);

	useEffect(() => {
		// When a platform is detected from the reply URL, switch to that tab
		if (detectedPlatform && seriesType === 'reply') {
			// Find the account key that matches the detected platform
			const accountKey = Object.keys(accountGroup.accounts).find(
				key => accountGroup.accounts[key].platform === detectedPlatform
			);
			if (accountKey) {
				setActiveTab(accountKey);
			}
		}
	}, [detectedPlatform, seriesType, accountGroup.accounts]);

	// Save content to post variant (not publishing)
	const handleSaveContent = useCallback(async () => {
		if (!contextText) return;

		setIsSaving(true);
		setErrors([]);
		setSuccess("");

		try {
			// Update post variant with new content
			if (post.variants[activeTab]) {
				post.variants[activeTab] = {
					...post.variants[activeTab],
					text: contextText,
					edited: true,
					lastModified: new Date().toISOString(),
				} as Post['variants'][keyof Post['variants']];
			}

			// Clear context text since it's now saved
			setContextText(null);
			setSuccess("Content saved successfully!");

			// Here you would typically save to your backend/database
			// await savePostToDatabase(post);

		} catch (error) {
			console.error('Error saving content:', error);
			setErrors([handleApiError(error)]);
		} finally {
			setIsSaving(false);
		}
	}, [contextText, post.variants, activeTab]);

	// Publish post to social media platforms
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

			// Prepare media URLs
			const mediaUrls = post.variants[activeTab]?.media?.map(m => 
				m?.type === "image" ? m?.image?.toString() : m?.video?.toString()
			)?.filter((url): url is string => Boolean(url)) || [];

			// Handle different post types and platforms
			if (seriesType === "reply" && replyUrl && isValidReplyUrl) {
				const replyData = {
					post: postText,
					platforms,
					...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }),
				};
				await handleReplyPost(replyData, replyUrl);
			} else {
				const twitterPlatforms = platforms.filter(p => p === 'x' || p === 'twitter');
				const otherPlatforms = platforms.filter(p => p !== 'x' && p !== 'twitter');
				const content = contextText ?? post.variants[activeTab]?.text?.toString() ?? "";

				// Handle Twitter
				if (twitterPlatforms.length > 0) {
					const isTwitterThread = (manualThreadMode && content.includes('\n\n')) || content.length > PLATFORM_CHARACTER_LIMITS.x;
					const twitterPostData: PostData = {
						post: content,
						platforms: twitterPlatforms,
						...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }),
						...(isTwitterThread && {
							twitterOptions: {
								thread: true,
								threadNumber: true,
								mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
							}
						}),
						...(!isTwitterThread && mediaUrls.length > 0 && { mediaUrls }),
					};
					await handleStandardPost(twitterPostData);
				}

				// Handle other platforms
				if (otherPlatforms.length > 0) {
					const threadedPlatforms: string[] = [];
					const standardPlatforms: string[] = [];

					otherPlatforms.forEach(platformKey => {
						const platformInfo = accountGroup.accounts[platformKey];
						const platformName = platformInfo?.platform || 'default';
						const limit = PLATFORM_CHARACTER_LIMITS[platformName as keyof typeof PLATFORM_CHARACTER_LIMITS] || PLATFORM_CHARACTER_LIMITS.default;
						
						if ((manualThreadMode && content.includes('\n\n')) || content.length > limit) {
							threadedPlatforms.push(platformKey);
						} else {
							standardPlatforms.push(platformKey);
						}
					});

					if (standardPlatforms.length > 0) {
						await handleStandardPost({ post: content, platforms: standardPlatforms, mediaUrls, ...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }) });
					}
			
					if (threadedPlatforms.length > 0) {
						const threads = generateThreadPreview(content, 'default');
						await handleMultiPosts({ post: content, platforms: threadedPlatforms, mediaUrls, ...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }) }, threads);
					}
				}
			}

			setSuccess("Post published successfully!");
			
			// Post published successfully - no need to modify the post object
			// as publishing status would typically be handled by your backend/database

		} catch (error) {
			console.error('Error publishing post:', error);
			setErrors([handleApiError(error)]);
		} finally {
			setIsScheduling(false);
		}
	}, [
		selectedPlatforms, 
		post.variants, 
		activeTab, 
		scheduledDate, 
		seriesType, 
		replyUrl, 
		isValidReplyUrl, 
		threadPosts, 
		postingInterval,
		isThread,
		manualThreadMode,
	]);

	const handleContentChange = useCallback((newContent: string) => {
		setContextText(newContent);
		// Clear any previous success messages when editing
		setSuccess("");
	}, []);

	const handleReplyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newUrl = e.target.value;
		setReplyUrl(newUrl);

		// Immediately update the URL in the Jazz object
		const variant = post.variants[activeTab];
		if (variant) {
			if (!variant.replyTo) {
				variant.replyTo = {};
			}
			variant.replyTo.url = newUrl;
			// Clear old content when URL changes
			if (!newUrl) {
				variant.replyTo = {};
			} else {
				variant.replyTo.authorPostContent = undefined; 
			}
		}
	};

	const handleTitleSave = useCallback(() => {
		setIsEditingTitle(false);
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

	// Handle preview functionality
	const handlePreview = useCallback(() => {
		setShowPreviewModal(true);
	}, []);

	// Helper function to extract username from URL
	const extractUsernameFromUrl = useCallback((url: string) => {
		if (url.includes('twitter.com') || url.includes('x.com')) {
			const match = url.match(/\/([^\/]+)\/status/);
			return match ? match[1] : 'user';
		}
		return 'user';
	}, []);

	const handleImageUpload = useCallback(() => {
		// This is a placeholder for a real file upload.
		const newImage = {
			type: 'image',
			image: `https://source.unsplash.com/random/800x600?sig=${Math.random()}`,
			alt: 'A randomly uploaded image',
		} as unknown as MediaItem;

		const variant = post.variants[activeTab];
		if (variant) {
			const currentMedia = (variant.media || []) as MediaItem[];
			
			const updatedPost = {
				...post,
				variants: {
					...post.variants,
					[activeTab]: {
						...variant,
						media: [...currentMedia, newImage],
					},
				},
			};

			setPost(updatedPost as unknown as PostFullyLoaded);
		}
	}, [activeTab, post]);
	
	const setPost = (newPost: PostFullyLoaded) => {
		// This function would ideally update the post object in a central state management store.
		// For this example, we're assuming the `post` prop can be updated this way to trigger re-renders.
		// In a real Jazz app, mutations to CoValues automatically trigger re-renders.
		// To simulate this, we'll log it and expect the parent component to handle state updates.
		console.log('Post updated (mock):', newPost);
		// Note: To make this fully work without a real state management solution,
		// we would need to lift state up or use a context. For now, this will
		// log the change, and the UI will depend on how the parent handles the `post` prop.
	};

	return (
		<div className="space-y-6">
			{/* Header with Title and Platform Tabs */}
			<div className="space-y-4">
				{/* Editable Title */}
				<div className="flex items-center gap-2">
					{isEditingTitle ? (
						<div className="flex items-center gap-2 flex-1">
							<TextField.Root
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter post title..."
								className="flex-1"
							/>
							<Button size="1" onClick={handleTitleSave}>
								<Check className="w-4 h-4" />
							</Button>
							<Button size="1" variant="soft" onClick={() => setIsEditingTitle(false)}>
								<X className="w-4 h-4" />
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-2 flex-1">
							<h1 className="text-3xl font-bold cursor-pointer" onClick={() => setIsEditingTitle(true)}>
								{title || "Untitled Post"}
							</h1>
							<Button size="1" variant="ghost" onClick={() => setIsEditingTitle(true)}>
								<Edit3 className="w-4 h-4" />
							</Button>
						</div>
					)}
				</div>

				{/* Platform Tabs */}
				<div className="flex items-center gap-2 flex-wrap">
					{selectedPlatforms.map((platform) => {
						const account = accountGroup.accounts[platform];
						const platformIcon = platform === "base" 
							? platformIcons.base 
							: platformIcons[account?.platform as keyof typeof platformIcons] || platformIcons.base;
						const displayName = platform === "base" 
							? "Base" 
							: account?.name || platform;
						const isReplyAndNotBase = seriesType === 'reply' && platform !== 'base';
						const isDisabled = seriesType === 'reply' && platform !== 'base' && detectedPlatform !== account?.platform;

						return (
							<TooltipProvider key={platform}>
								<Tooltip>
									<TooltipTrigger asChild>
										<div className="flex items-center">
											<Button
												variant={activeTab === platform ? "solid" : "outline"}
												size="2"
												onClick={() => !isDisabled && setActiveTab(platform)}
												className="flex items-center gap-2"
												disabled={isDisabled}
											>
												<Image
													src={platformIcon}
													alt={platform}
													width={16}
													height={16}
												/>
												{displayName}
												{/* Hide edited badge in reply mode */}
												{seriesType !== 'reply' && platform !== "base" && post.variants[platform]?.edited && (
													<Badge variant="soft" color="orange" className="ml-1">
														•
													</Badge>
												)}
												{platform !== "base" && (
													<span
														onClick={(e) => {
															e.stopPropagation(); // Prevent tab switch
															handleRemoveAccount(platform);
														}}
														className="ml-1 p-0.5 rounded-full hover:bg-gray-500/20"
													>
														<X className="w-3 h-3" />
													</span>
												)}
											</Button>
										</div>
									</TooltipTrigger>
									{isDisabled && (
										<TooltipContent>
											<p>Replies are only available for the detected platform.</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						);
					})}
					
					{availableAccounts.length > 0 && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="outline"
										size="2"
										onClick={() => setShowAddAccountDialog(true)}
										className="flex items-center gap-2"
										disabled={seriesType === 'reply'}
									>
										<Plus className="w-4 h-4" />
										Add Account
									</Button>
								</TooltipTrigger>
								{seriesType === 'reply' && (
									<TooltipContent>
										<p>You cannot add accounts while in reply mode.</p>
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</div>

			{/* Post Type Selection & Actions */}
			<Card>
				<div className="p-4 space-y-4">
					<div className="flex items-start justify-between gap-2">
						{/* Post Type Actions */}
						<div className="flex items-center gap-2">
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={seriesType === 'reply' ? 'soft' : 'outline'}
											onClick={handleToggleReplyMode}
											disabled={hasMultipleAccounts}
										>
											<MessageSquare className="w-4 h-4" />
											<span className="hidden sm:inline ml-2">Reply</span>
										</Button>
									</TooltipTrigger>
									{hasMultipleAccounts && (
										<TooltipContent>
											<p>Replies can only be sent from a single account.</p>
										</TooltipContent>
									)}
								</Tooltip>
							</TooltipProvider>
						</div>

						{/* Action Buttons & Toggles */}
						<div className="flex items-center justify-end gap-4">
							{/* Thread Toggle */}
							<div className="flex items-center gap-2">
								<Label.Root htmlFor="thread-toggle" className="text-sm font-medium">
									Create Thread
								</Label.Root>
								<Switch
									id="thread-toggle"
									checked={manualThreadMode}
									onCheckedChange={setManualThreadMode}
								/>
							</div>

							<div className="flex items-center gap-2">
								{/* Preview Button */}
								<Button
									variant="outline"
									size="2"
									onClick={handlePreview}
								>
									<Eye className="w-4 h-4 mr-2" />
									<span className="hidden sm:inline">Preview</span>
								</Button>
								
								{/* Schedule Button */}
								<Button
									variant="outline"
									size="2"
									onClick={() => setShowSettings(true)}
									className="flex items-center gap-2"
								>
									{scheduledDate ? (
										<>
											<CalendarDays className="w-4 h-4" />
											<span className="hidden sm:inline">
												{scheduledDate.toLocaleDateString(undefined, { 
													month: 'short', 
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
											<span className="sm:hidden">
												{scheduledDate.toLocaleDateString(undefined, { 
													month: 'short', 
													day: 'numeric'
												})}
											</span>
										</>
									) : (
										<>
											<Calendar className="w-4 h-4" />
											<span className="hidden sm:inline">Schedule</span>
										</>
									)}
								</Button>

								{/* Publish Button - appears when content is saved and ready to publish */}
								{showPublishButton && (
									<Button
										onClick={handlePublishPost}
										disabled={isScheduling}
										className="flex items-center gap-2"
									>
										{isScheduling ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin" />
												<span className="hidden sm:inline">{scheduledDate ? "Scheduling..." : "Publishing..."}</span>
											</>
										) : (
											<>
												<Globe className="w-4 h-4" />
												<span className="hidden sm:inline">{scheduledDate ? "Schedule" : "Publish"}</span>
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</div>

					{/* Post Type Descriptions */}
					{seriesType === "reply" && (
						<Box className="bg-blue-50 p-3 rounded-lg mt-4">
							<Text size="2" color="blue">
								{getReplyDescription()} Replies do not support media.
							</Text>
						</Box>
					)}

					{isThread && seriesType !== 'reply' && (
						<Box className="bg-green-50 p-3 rounded-lg">
							<Text size="2" color="green">
								This post will be published as a thread.
							</Text>
						</Box>
					)}
				</div>
			</Card>

			{/* Reply URL Input */}
			{seriesType === "reply" && (
				<Card>
					<div className="p-4 space-y-3">
						<div className="flex items-center gap-2">
							<LinkIcon className="w-4 h-4" />
							<Text weight="medium">Reply/Comment URL</Text>
						</div>
						<div className="space-y-2">
							<Input
								type="url"
								placeholder="Paste the URL of the post you want to reply to..."
								value={replyUrl}
								onChange={handleReplyUrlChange}
								className={isValidReplyUrl ? "border-green-500" : replyUrl ? "border-red-500" : ""}
							/>
							{replyUrl && (
								<div className="flex items-center gap-2 text-sm mt-2">
									{isValidReplyUrl ? (
										<>
											<Check className="w-4 h-4 text-green-500" />
											<span className="text-green-600">Valid {detectedPlatform} URL detected</span>
										</>
									) : (
										<>
											<AlertCircle className="w-4 h-4 text-red-500" />
											<span className="text-red-600">Please enter a valid social media post URL</span>
										</>
									)}
								</div>
							)}
						</div>
						{isFetchingReply && (
							<Box className="flex items-center gap-2 text-sm text-gray-500">
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>Fetching post...</span>
							</Box>
						)}
						{fetchReplyError && (
							 <Box className="text-sm text-red-600">
								{fetchReplyError}
							</Box>
						)}
						<ReplyToPostPreview replyTo={post.variants[activeTab]?.replyTo} />
					</div>
				</Card>
			)}


			{/* Main Post Content */}
			<Card>
				<div className="p-6 space-y-6">
					{/* Media Display */}
					{seriesType !== 'reply' ? (
						<div className="space-y-2">
							{(post.variants[activeTab]?.media && post.variants[activeTab]!.media!.length > 0) ? (
								<div className="relative group">
									<MediaCarousel media={post.variants[activeTab]!.media!.filter(Boolean) as MediaItem[]} />
									<Button
										variant="soft"
										size="1"
										onClick={handleImageUpload}
										className="absolute top-2 right-2 !rounded-full !w-8 !h-8 opacity-0 group-hover:opacity-100 transition-opacity z-20"
									>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
							) : (
								<div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8">
									<Button
										variant="soft"
										onClick={handleImageUpload}
									>
										<Upload className="w-4 h-4 mr-2" />
										Add Media
									</Button>
								</div>
							)}
						</div>
					) : null}

					{/* Content Editor */}
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								{/* Don't show edited badge on base component */}
								{seriesType !== 'reply' && activeTab !== "base" && post.variants[activeTab]?.edited && (
									<Badge variant="soft" color="orange">
										<Edit3 className="w-3 h-3 mr-1" />
										Edited
									</Badge>
								)}
							</div>
							
							{hasUnsavedChanges && (
								<Text size="1" color="orange">
									Unsaved changes
								</Text>
							)}
						</div>

						<div className="relative">
							<TextArea
								value={contextText || post.variants[activeTab]?.text?.toString() || ""}
								onChange={(e) => handleContentChange(e.target.value)}
								placeholder="What's happening? Use double line breaks for threads."
								className="min-h-32 resize-none text-lg leading-relaxed"
								rows={6}
							/>
							
							{/* Character count */}
							<div className="absolute bottom-2 right-2 text-sm text-gray-500 flex items-center gap-2">
								{isImplicitThread && (
									<Badge color="blue" variant="soft">
										<ListTree className="w-3 h-3 mr-1" />
										Auto-threaded
									</Badge>
								)}
								{isExplicitThread && (
									<Badge color="green" variant="soft">
										<ListTree className="w-3 h-3 mr-1" />
										Thread
									</Badge>
								)}
								<span>{(contextText || post.variants[activeTab]?.text?.toString() || "").length} characters</span>
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-between items-center">
							
							<div className="flex gap-2">
								{/* Save Button - appears when there are unsaved changes */}
								{showSaveButton && (
									<Button
										onClick={handleSaveContent}
										disabled={isSaving}
										variant="soft"
										className="flex items-center gap-2"
									>
										{isSaving ? (
											<>
												<Loader2 className="w-4 h-4 animate-spin" />
												Saving...
											</>
										) : (
											<>
												<Save className="w-4 h-4" />
												Save
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</Card>

			{/* Thread Preview */}
			{isThread && threadPosts.length > 1 && (
				<Card>
					<div className="p-4 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<ListOrdered className="w-4 h-4" />
								<Text weight="medium">Thread Preview ({threadPosts.length} posts)</Text>
							</div>
						</div>
						
						<div className="space-y-2 max-h-60 overflow-y-auto">
							{threadPosts.map((thread, index) => (
								<div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
									<div className="flex items-center gap-2 mb-2">
										<Badge variant="soft" size="1">{thread.index}/{thread.total}</Badge>
										<Text size="1" color="gray">{thread.characterCount} characters</Text>
									</div>
									<Text size="2">{thread.content}</Text>
								</div>
							))}
						</div>
					</div>
				</Card>
			)}

			{/* Status Messages */}
			{errors.length > 0 && (
				<Card>
					<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
						<div className="flex items-center gap-2 mb-2">
							<AlertCircle className="w-4 h-4 text-red-500" />
							<Text weight="medium" color="red">Errors</Text>
						</div>
						<ul className="space-y-1">
							{errors.map((error, index) => (
								<li key={index} className="text-sm text-red-600">• {error}</li>
							))}
						</ul>
					</div>
				</Card>
			)}

			{success && (
				<Card>
					<div className="p-4 bg-green-50 border border-green-200 rounded-lg">
						<div className="flex items-center gap-2">
							<Check className="w-4 h-4 text-green-500" />
							<Text weight="medium" color="green">{success}</Text>
						</div>
					</div>
				</Card>
			)}

			{/* Add Account Dialog */}
			<Dialog.Root open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog}>
				<Dialog.Content style={{ maxWidth: 400 }}>
					<Dialog.Title>Add Account</Dialog.Title>
					<Dialog.Description>
						Select an account to add to this post.
					</Dialog.Description>
					
					<div className="space-y-2 mt-4">
						{availableAccounts.map(([key, account]) => (
							<Button
								key={key}
								variant="outline"
								onClick={() => handleAddAccount(key)}
								className="w-full flex items-center gap-2 justify-start"
							>
								<Image
									src={platformIcons[account.platform as keyof typeof platformIcons] || platformIcons.base}
									alt={account.platform}
									width={20}
									height={20}
								/>
								<div className="text-left">
									<div className="font-medium">{account.name}</div>
									<div className="text-sm text-gray-500">{account.platform}</div>
								</div>
							</Button>
						))}
					</div>
				</Dialog.Content>
			</Dialog.Root>

			{/* Settings Dialog */}
			<Dialog.Root open={showSettings} onOpenChange={setShowSettings}>
				<Dialog.Content style={{ maxWidth: 500 }}>
					<Dialog.Title>Post Settings</Dialog.Title>
					<Dialog.Description>
						Configure scheduling and advanced options for your post.
					</Dialog.Description>
					
					<div className="space-y-4 mt-4">
						<div>
							<Label.Root htmlFor="schedule">Schedule Post</Label.Root>
							{scheduledDate && (
								<div className="text-sm text-gray-600 mb-2">
									Currently scheduled for: {scheduledDate.toLocaleString()}
								</div>
							)}
							<Input
								id="schedule"
								type="datetime-local"
								value={scheduledDate ? scheduledDate.toISOString().slice(0, 16) : ""}
								onChange={(e) => setScheduledDate(new Date(e.target.value))}
								className="mt-1"
							/>
						</div>
						
						{isThread && (
							<div>
								<Label.Root htmlFor="interval">
									Posting Interval (minutes)
								</Label.Root>
								<div className="text-sm text-gray-500 mb-1">
									Time between posts for multi-post sequences
								</div>
								<Input
									id="interval"
									type="number"
									value={postingInterval}
									onChange={(e) => setPostingInterval(Number(e.target.value))}
									min={1}
									max={60}
									className="mt-1"
								/>
							</div>
						)}
					</div>

					<div className="flex justify-between gap-2 mt-6">
						<div>
							{scheduledDate && (
								<Button 
									variant="outline" 
									onClick={handleClearSchedule}
									className="text-red-600 border-red-300 hover:bg-red-50"
								>
									Clear Schedule
								</Button>
							)}
						</div>
						<div className="flex gap-2">
							<Button variant="soft" onClick={() => setShowSettings(false)}>
								Cancel
							</Button>
							<Button onClick={() => setShowSettings(false)}>
								Save Settings
							</Button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Root>

			{/* Preview Modal */}
			<PreviewModal
				isOpen={showPreviewModal}
				onClose={() => setShowPreviewModal(false)}
				content={contextText || post.variants[activeTab]?.text?.toString() || ""}
				selectedPlatforms={selectedPlatforms}
				accountGroup={accountGroup}
				activeTab={activeTab}
				media={post.variants[activeTab]?.media?.filter(Boolean) as MediaItem[] || []}
				isReply={seriesType === "reply"}
				replyToUsername={detectedPlatform === "x" ? extractUsernameFromUrl(replyUrl) : undefined}
				isThread={isThread}
				threadPosts={threadPosts}
				replyUrl={replyUrl}
			/>
		</div>
	);
}

const ReplyToPostPreview = ({ replyTo }: { replyTo: any }) => {
	if (!replyTo?.authorPostContent) return null;

	const decodedText = replyTo.authorPostContent;
	const isTwitter = replyTo.platform === 'x' || replyTo.platform === 'twitter';

	const parserOptions: HTMLReactParserOptions = {
		replace: (domNode: any) => {
			if (domNode.type === 'tag' && domNode.name === 'a') {
				return (
					<a href={domNode.attribs.href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
						{domToReact(domNode.children, parserOptions)}
					</a>
				);
			}
			if (domNode.type === 'tag' && domNode.name === 'br') {
				return <br />;
			}
		}
	};
	
	const formattedText = parse(decodedText, parserOptions);

	return (
		<div className="mt-4">
      {isTwitter ? (
        <>
          {/* <div className="flex items-center mb-2">
            <Avatar
              size="2"
              src={replyTo.authorAvatar || `https://avatar.vercel.sh/${replyTo.authorUsername}`}
              fallback={replyTo.author ? replyTo.author[0] : 'U'}
              className="mr-3"
            />
            <div>
              <Text weight="bold" size="2">{replyTo.author}</Text>
              <Text size="2" color="gray">@{replyTo.authorUsername}</Text>
            </div>
          </div> */}
          <Text as="p" size="2" className="whitespace-pre-wrap">{formattedText}</Text>
          {/* <PlatformPreview platform={replyTo.platform} content={formattedText} /> */}
        </>
      ) : (
        <>
          <Text size="1" color="gray" className="mb-2 block">Replying to:</Text>
          <div className="flex gap-3">
            <Avatar
              size="2"
              src={replyTo.authorAvatar}
              fallback={replyTo.author ? replyTo.author[0] : 'U'}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Text weight="bold" size="2">{replyTo.author}</Text>
                <Text size="2" color="gray">@{replyTo.authorUsername}</Text>
              </div>
              <Text as="p" size="2" className="mt-1 whitespace-pre-wrap">{formattedText}</Text>
            </div>
          </div>
        </>
      )}
		</div>
	);
};

const MediaCarousel = ({ media }: { media: MediaItem[] }) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	const handlePrev = () => {
		setCurrentIndex((prevIndex) => (prevIndex === 0 ? media.length - 1 : prevIndex - 1));
	};

	const handleNext = () => {
		setCurrentIndex((prevIndex) => (prevIndex === media.length - 1 ? 0 : prevIndex + 1));
	};

	if (!media || media.length === 0) return null;

	return (
		<div className="relative max-w-lg mx-auto">
			<div className="overflow-hidden rounded-lg shadow-md">
				<div
					className="flex transition-transform duration-300 ease-in-out"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{media.map((mediaItem, index) => (
						<div key={index} className="flex-shrink-0 w-full">
							<MediaComponent mediaItem={mediaItem} />
						</div>
					))}
				</div>
			</div>

			{media.length > 1 && (
				<>
					<Button
						variant="soft"
						size="1"
						onClick={handlePrev}
						className="absolute top-1/2 left-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="soft"
						size="1"
						onClick={handleNext}
						className="absolute top-1/2 right-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
						{media.map((_, index) => (
							<button
								key={index}
								onClick={() => setCurrentIndex(index)}
								className={`w-2 h-2 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-gray-400'}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

const MediaComponent = ({ mediaItem }: { mediaItem: MediaItem }) => {
	if (!mediaItem) return null;

	return (
		<div className="max-w-lg mx-auto">
			{mediaItem.type === "image" && (
				<Image
					src={mediaItem.image?.toString() ?? ""}
					alt={mediaItem.alt?.toString() ?? "image"}
					width={500}
					height={500}
					className="rounded-lg shadow-md w-full object-cover"
				/>
			)}
			{mediaItem.type === "video" && (
				<video
					src={mediaItem.video?.toString() ?? ""}
					controls
					className="w-full max-w-lg rounded-lg shadow-md"
				/>
			)}
		</div>
	);
};
