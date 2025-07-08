"use client";

import { useState, useEffect } from "react";
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

type SeriesType = "reply" | "multi";

// Ayrshare API configuration
const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
const AYRSHARE_API_URL = "https://app.ayrshare.com/api";

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

const platformIcons = {
	base: "/sprout.svg",
	x: "/icons8-twitter.svg",
	instagram: "/icons8-instagram.svg",
	youtube: "/icons8-youtube-logo.svg",
	facebook: "/icons8-facebook.svg",
	linkedin: "/icons8-linkedin.svg",
};

const platformLabels = {
	base: "Base",
	x: "X/Twitter",
	instagram: "Instagram",
	youtube: "YouTube",
	facebook: "Facebook",
	linkedin: "LinkedIn",
};

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
	const [activeTab, setActiveTab] = useState("base");
	const [seriesType, setSeriesType] = useState<SeriesType | null>(null);
	const [title, setTitle] = useState(post.title?.toString() || "");
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [replyUrl, setReplyUrl] = useState("");
	const [isValidReplyUrl, setIsValidReplyUrl] = useState(false);
	const [postingInterval, setPostingInterval] = useState(5);
	const [showSettings, setShowSettings] = useState(false);
	const [showReplyDialog, setShowReplyDialog] = useState(false);
	const [showSaveButton, setShowSaveButton] = useState(false);
	const [contextText, setContextText] = useState<string | null>(null);
	const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
	const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
	const [isScheduling, setIsScheduling] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [success, setSuccess] = useState("");
	const [threadPosts, setThreadPosts] = useState<string[]>([]);
	const [showThreadPreview, setShowThreadPreview] = useState(false);
	const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

	// Initialize selected platforms from post variants
	useEffect(() => {
		const platforms = Object.keys(post.variants).filter(key => key !== "title");
		setSelectedPlatforms(platforms);
	}, [post.variants]);

	// Reply URL validation
	useEffect(() => {
		if (replyUrl) {
			const isValid = validateReplyUrl(replyUrl);
			setIsValidReplyUrl(isValid);
		} else {
			setIsValidReplyUrl(false);
		}
	}, [replyUrl]);

	// Thread preview generation
	useEffect(() => {
		if (seriesType === "multi" && contextText) {
			generateThreadPreview(contextText);
		}
	}, [seriesType, contextText]);

	const validateReplyUrl = (url: string): boolean => {
		const patterns = [
			/^https:\/\/(www\.)?twitter\.com\/\w+\/status\/\d+/,
			/^https:\/\/(www\.)?x\.com\/\w+\/status\/\d+/,
			/^https:\/\/(www\.)?instagram\.com\/p\/[\w-]+/,
			/^https:\/\/(www\.)?facebook\.com\/\w+\/posts\/\d+/,
			/^https:\/\/(www\.)?linkedin\.com\/posts\/[\w-]+/,
			/^https:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
		];
		return patterns.some(pattern => pattern.test(url));
	};

	const generateThreadPreview = (text: string) => {
		const maxLength = activeTab === "x" ? 280 : 2200;
		const paragraphs = text.split('\n\n').filter(p => p.trim());
		const threads: string[] = [];
		let currentThread = "";

		paragraphs.forEach(paragraph => {
			if (currentThread.length + paragraph.length + 2 <= maxLength) {
				currentThread += (currentThread ? '\n\n' : '') + paragraph;
			} else {
				if (currentThread) threads.push(currentThread);
				currentThread = paragraph;
			}
		});

		if (currentThread) threads.push(currentThread);
		setThreadPosts(threads);
	};

	const handleSave = async () => {
		setShowSaveButton(false);
		setContextText(null);
		setErrors([]);
		setSuccess("");

		try {
			const platforms = selectedPlatforms.filter(p => p !== "base");
			const postText = contextText || post.variants[activeTab]?.text?.toString() || "";

			// Prepare platform-specific options
			const platformOptions: any = {};
			
			// Handle reply functionality
			if (seriesType === "reply" && replyUrl) {
				if (platforms.includes("x")) {
					// For Twitter, extract tweet ID from URL
					const tweetIdMatch = replyUrl.match(/status\/(\d+)/);
					if (tweetIdMatch) {
						platformOptions.twitterOptions = {
							replyToTweetId: tweetIdMatch[1]
						};
					}
				}
				// For other platforms, this becomes a comment (handled differently)
			}

			// Handle threading/multi-post
			if (seriesType === "multi") {
				if (platforms.includes("x")) {
					platformOptions.twitterOptions = {
						...platformOptions.twitterOptions,
						thread: true,
						threadNumber: true,
					};
				}
				// For other platforms, we'll create multiple posts
			}

			// Prepare media URLs
			const mediaUrls = post.variants[activeTab]?.media?.map(m => 
				m?.type === "image" ? m?.image?.toString() : m?.video?.toString()
			) || [];

			// Prepare post data for Ayrshare
			const postData: any = {
				post: postText,
				platforms: platforms,
				...(mediaUrls.length > 0 && { mediaUrls }),
				...(scheduledDate && { scheduleDate: scheduledDate.toISOString() }),
				...platformOptions
			};

			setIsScheduling(true);

			// Handle different post types
			if (seriesType === "reply" && replyUrl && !platforms.includes("x")) {
				// For non-Twitter platforms, post as comment
				await handleCommentPost(postData);
			} else if (seriesType === "multi" && !platforms.includes("x")) {
				// For non-Twitter platforms, create multiple posts
				await handleMultiPosts(postData);
			} else {
				// Standard post or Twitter threading
				await handleStandardPost(postData);
			}

			setSuccess("Post saved successfully!");
			
			// Update post state
			if (post.variants[activeTab]) {
				post.variants[activeTab] = {
					...post.variants[activeTab],
					text: postText,
					edited: true,
				} as Post['variants'][keyof Post['variants']];
			}

		} catch (error) {
			console.error('Error saving post:', error);
			setErrors([error instanceof Error ? error.message : 'Failed to save post']);
		} finally {
			setIsScheduling(false);
		}
	};

	const handleStandardPost = async (postData: any) => {
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

		console.log('Post published successfully:', result);
	};

	const handleCommentPost = async (postData: any) => {
		// For platforms that don't support direct replies, we create a comment
		// This would require additional API calls to the comments endpoint
		console.log('Comment post functionality would be implemented here');
	};

	const handleMultiPosts = async (postData: any) => {
		// Create multiple posts for platforms that don't support threading
		const promises = threadPosts.map((threadText, index) => {
			const threadData = {
				...postData,
				post: `${threadText} ${index + 1}/${threadPosts.length}`,
				// Add delay between posts
				...(index > 0 && { scheduleDate: new Date(Date.now() + (index * postingInterval * 60000)).toISOString() })
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
		
		console.log('Multi-posts created:', responses);
	};

	const handleTitleSave = () => {
		setIsEditingTitle(false);
		// Update post title (you might want to save this to your backend)
		console.log('Title updated:', title);
	};

	const handleAddAccount = (platform: string) => {
		if (!selectedPlatforms.includes(platform)) {
			setSelectedPlatforms([...selectedPlatforms, platform]);
		}
		setShowAddAccountDialog(false);
	};

	const handleRemoveAccount = (platform: string) => {
		setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
		if (activeTab === platform) {
			setActiveTab("base");
		}
	};

	const getReplyDescription = () => {
		if (!seriesType || seriesType !== "reply") return "";
		
		if (activeTab === "x") {
			return "This will be posted as a reply to the specified tweet.";
		} else {
			return "This will be posted as a comment on the specified post.";
		}
	};

	const getMultiDescription = () => {
		if (!seriesType || seriesType !== "multi") return "";
		
		if (activeTab === "x") {
			return "This will be posted as a Twitter thread with automatic numbering.";
		} else {
			return "This will be posted as multiple connected posts with numbering.";
		}
	};

	const availableAccounts = Object.entries(accountGroup.accounts).filter(
		([key, account]) => !selectedPlatforms.includes(key)
	);

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
											<span className="text-green-600">Valid URL detected</span>
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
											<Badge variant="soft" size="1">{index + 1}/{threadPosts.length}</Badge>
											<Text size="1" color="gray">{thread.length} characters</Text>
										</div>
										<Text size="2">{thread}</Text>
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
						{post.variants[activeTab]?.edited && (
							<div className="flex justify-end">
								<Badge variant="soft" color="orange">
									<Edit3 className="w-3 h-3 mr-1" />
									Edited
								</Badge>
							</div>
						)}

						<div className="relative">
							<TextArea
								value={contextText || post.variants[activeTab]?.text?.toString() || ""}
								onChange={(e) => {
									setContextText(e.target.value);
									setShowSaveButton(true);
								}}
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
							
							{showSaveButton && (
								<Button
									onClick={handleSave}
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
											<Save className="w-4 h-4" />
											{scheduledDate ? "Schedule Post" : "Publish Post"}
										</>
									)}
								</Button>
							)}
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
