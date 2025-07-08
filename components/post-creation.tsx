"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Card, TextArea, TextField, Dialog, Box, Text, Badge } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { Input } from "./input";
import {
	Edit3,
	Save,
	Plus,
	Calendar,
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
	Globe
} from "lucide-react";
import { Post, PostFullyLoaded } from "../app/schema";
import Image from "next/image";
import { MediaItem } from "../app/schema";

// Import utility functions
import { platformIcons, platformLabels } from "../utils/postConstants";
import { validateReplyUrl, detectPlatformFromUrl } from "../utils/postValidation";
import { generateThreadPreview, ThreadPost } from "../utils/threadUtils";
import { 
	handleStandardPost, 
	handleReplyPost, 
	handleMultiPosts, 
	handleApiError,
	PostData 
} from "../utils/apiHandlers";

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
	const [seriesType, setSeriesType] = useState<SeriesType | null>(null);
	const [title, setTitle] = useState(post.title?.toString() || "");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [replyUrl, setReplyUrl] = useState("");
	const [postingInterval, setPostingInterval] = useState(5);
	const [showSettings, setShowSettings] = useState(false);
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
	const [showThreadPreview, setShowThreadPreview] = useState(false);
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

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
		if (seriesType === "multi" && text) {
			const threads = generateThreadPreview(text, activeTab);
			setThreadPosts(threads);
		} else {
			setThreadPosts([]);
		}
	}, [seriesType, activeTab]);

	useEffect(() => {
		if (contextText) {
			updateThreadPreview(contextText);
		} else {
			// Update thread preview with saved content if no context text
			const savedContent = post.variants[activeTab]?.text?.toString() || "";
			updateThreadPreview(savedContent);
		}
	}, [contextText, post.variants, activeTab, updateThreadPreview]);

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

			// Prepare base post data
			const basePostData: PostData = {
				post: postText,
				platforms: platforms,
				...(mediaUrls.length > 0 && { mediaUrls }),
				...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }),
			};

			let result;

			// Handle different post types
			if (seriesType === "reply" && replyUrl && isValidReplyUrl) {
				result = await handleReplyPost(basePostData, replyUrl);
			} else if (seriesType === "multi" && threadPosts.length > 1) {
				if (platforms.includes("x")) {
					// Use native Twitter threading
					const twitterPostData = {
						...basePostData,
						twitterOptions: { thread: true, threadNumber: true }
					};
					result = await handleStandardPost(twitterPostData);
				} else {
					// Use multi-post for other platforms
					result = await handleMultiPosts(basePostData, threadPosts, postingInterval);
				}
			} else {
				// Standard post
				result = await handleStandardPost(basePostData);
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
		postingInterval
	]);

	const handleContentChange = useCallback((newContent: string) => {
		setContextText(newContent);
		// Clear any previous success messages when editing
		setSuccess("");
	}, []);

	const handleTitleSave = useCallback(() => {
		setIsEditingTitle(false);
		console.log('Title updated:', title);
	}, [title]);

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
		if (!seriesType || seriesType !== "multi") return "";
		
		if (activeTab === "x") {
			return "This will be posted as a Twitter thread with automatic numbering.";
		} else {
			return "This will be posted as multiple connected posts with numbering.";
		}
	}, [seriesType, activeTab]);

	return (
		<div className="w-full max-w-4xl mx-auto p-6 space-y-6">
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

						return (
							<div key={platform} className="flex items-center">
								<Button
									variant={activeTab === platform ? "solid" : "outline"}
									size="2"
									onClick={() => setActiveTab(platform)}
									className="flex items-center gap-2"
								>
									<Image
										src={platformIcon}
										alt={platform}
										width={16}
										height={16}
									/>
									{displayName}
									{post.variants[platform]?.edited && (
										<Badge variant="soft" color="orange" className="ml-1">
											•
										</Badge>
									)}
								</Button>
								{platform !== "base" && (
									<Button
										size="1"
										variant="ghost"
										onClick={() => handleRemoveAccount(platform)}
										className="ml-1"
									>
										<X className="w-3 h-3" />
									</Button>
								)}
							</div>
						);
					})}
					
					{availableAccounts.length > 0 && (
						<Button
							variant="outline"
							size="2"
							onClick={() => setShowAddAccountDialog(true)}
							className="flex items-center gap-2"
						>
							<Plus className="w-4 h-4" />
							Add Account
						</Button>
					)}
				</div>
			</div>

			{/* Post Type Selection */}
			<Card>
				<div className="p-4 space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Globe className="w-5 h-5 text-gray-500" />
							<Text weight="medium">Post Type</Text>
						</div>
						<Button
							variant="outline"
							size="1"
							onClick={() => setShowSettings(true)}
						>
							<Calendar className="w-4 h-4" />
							Schedule
						</Button>
					</div>

					<div className="flex gap-2">
						<Button
							variant={seriesType === null ? "solid" : "outline"}
							size="2"
							onClick={() => setSeriesType(null)}
						>
							<Hash className="w-4 h-4" />
							Standard Post
						</Button>
						<Button
							variant={seriesType === "reply" ? "solid" : "outline"}
							size="2"
							onClick={() => setSeriesType("reply")}
						>
							<MessageSquare className="w-4 h-4" />
							Reply/Comment
						</Button>
						<Button
							variant={seriesType === "multi" ? "solid" : "outline"}
							size="2"
							onClick={() => setSeriesType("multi")}
						>
							<ListOrdered className="w-4 h-4" />
							Thread/Multi-Post
						</Button>
					</div>

					{/* Post Type Descriptions */}
					{seriesType === "reply" && (
						<Box className="bg-blue-50 p-3 rounded-lg">
							<Text size="2" color="blue">
								{getReplyDescription()}
							</Text>
						</Box>
					)}

					{seriesType === "multi" && (
						<Box className="bg-green-50 p-3 rounded-lg">
							<Text size="2" color="green">
								{getMultiDescription()}
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
								onChange={(e) => setReplyUrl(e.target.value)}
								className={isValidReplyUrl ? "border-green-500" : replyUrl ? "border-red-500" : ""}
							/>
							{replyUrl && (
								<div className="flex items-center gap-2 text-sm">
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
					</div>
				</Card>
			)}

			{/* Thread Preview */}
			{seriesType === "multi" && threadPosts.length > 1 && (
				<Card>
					<div className="p-4 space-y-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<ListOrdered className="w-4 h-4" />
								<Text weight="medium">Thread Preview ({threadPosts.length} posts)</Text>
							</div>
							<Button
								variant="ghost"
								size="1"
								onClick={() => setShowThreadPreview(!showThreadPreview)}
							>
								{showThreadPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
							</Button>
						</div>
						
						{showThreadPreview && (
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
						)}
					</div>
				</Card>
			)}

			{/* Main Post Content */}
			<Card>
				<div className="p-6 space-y-6">
					{/* Media Display */}
					{post.variants[activeTab]?.media?.map((mediaItem, imageIndex) => (
						<div key={imageIndex} className="space-y-4">
							<div className="flex justify-center">
								{mediaItem && <MediaComponent mediaItem={mediaItem} />}
							</div>
						</div>
					))}

					{/* Content Editor */}
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<div className="flex items-center gap-2">
								{post.variants[activeTab]?.edited && (
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
								placeholder="What's happening?"
								className="min-h-32 resize-none text-lg leading-relaxed"
								rows={6}
							/>
							
							{/* Character count */}
							<div className="absolute bottom-2 right-2 text-sm text-gray-500">
								{(contextText || post.variants[activeTab]?.text?.toString() || "").length} characters
							</div>
						</div>

						{/* Action Buttons */}
						<div className="flex justify-between items-center">
							<div className="flex gap-2">
								{/* Additional controls can go here */}
							</div>
							
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
												{scheduledDate ? "Scheduling..." : "Publishing..."}
											</>
										) : (
											<>
												<Globe className="w-4 h-4" />
												{scheduledDate ? "Schedule Post" : "Publish Post"}
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</div>
				</div>
			</Card>

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
						Configure scheduling and advanced options.
					</Dialog.Description>
					
					<div className="space-y-4 mt-4">
						<div>
							<Label.Root htmlFor="schedule">Schedule Post</Label.Root>
							<Input
								id="schedule"
								type="datetime-local"
								onChange={(e) => setScheduledDate(new Date(e.target.value))}
								className="mt-1"
							/>
						</div>
						
						{seriesType === "multi" && (
							<div>
								<Label.Root htmlFor="interval">
									Posting Interval (minutes)
								</Label.Root>
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

					<div className="flex justify-end gap-2 mt-6">
						<Button variant="soft" onClick={() => setShowSettings(false)}>
							Cancel
						</Button>
						<Button onClick={() => setShowSettings(false)}>
							Save Settings
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	);
}

const MediaComponent = ({ mediaItem }: { mediaItem: MediaItem }) => {
	return (
		<div className="max-w-lg mx-auto">
			{mediaItem.type === "image" && (
				<Image
					src={mediaItem.image?.toString() ?? ""}
					alt={mediaItem.alt?.toString() ?? "image"}
					width={500}
					height={500}
					className="rounded-lg shadow-md"
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
