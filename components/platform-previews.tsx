"use client";

import { Card, Avatar, Text, Badge, Button, Box } from "@radix-ui/themes";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Play, Bookmark, Send, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import Image from "next/image";
import { ThreadPost } from "../utils/threadUtils";
import { MediaItem } from "../app/schema";
import { useState } from "react";
import { ReplyPreview } from "./reply-preview";

interface AccountInfo {
	id: string;
	platform: string;
	name: string;
	apiUrl: string;
	avatar: string;
	username: string;
	displayName: string;
	url: string;
}

interface BasePreviewProps {
	content: string;
	platform: string;
	account?: AccountInfo;
	timestamp?: Date;
	media?: MediaItem[];
	isReply?: boolean;
	isQuote?: boolean;
	replyTo?: any; 
	isThread?: boolean;
	threadPosts?: ThreadPost[];
	currentThreadIndex?: number;
}

// Twitter/X Preview Component
export const TwitterPreview = ({ 
	content, 
	account, 
	timestamp = new Date(), 
	media = [],
	isReply = false,
	isQuote = false,
	replyTo,
	isThread = false,
	threadPosts = [],
	currentThreadIndex = 0
}: BasePreviewProps) => {
	const formatTimestamp = (date: Date) => {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;

	const MainTweet = () => (
		<div className="flex gap-3">
			<Avatar
				size="2"
				src={account?.avatar || `https://avatar.vercel.sh/${account?.username}`}
				fallback={account?.displayName ? account.displayName[0] : 'U'}
				className="flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<Text weight="bold" size="2">{account?.displayName || 'User'}</Text>
					<Text size="2" color="gray">@{account?.username || 'user'}</Text>
					<span className="text-gray-500">·</span>
					<Text size="1" color="gray">{formatTimestamp(timestamp)}</Text>
				</div>
				<div className="mb-3 whitespace-pre-wrap">{displayContent}</div>
				{isQuote && replyTo && (
					<div className="border rounded-xl mt-3">
						<ReplyPreview 
							htmlContent={replyTo.authorPostContent} 
							author={replyTo.author}
							username={replyTo.authorUsername}
							platform={replyTo.platform}
							authorAvatar={replyTo.authorAvatar}
						/>
					</div>
				)}
				<div className="flex items-center justify-between max-w-md text-gray-500">
					<Button variant="ghost" size="1" className="hover:bg-blue-50 hover:text-blue-500"><MessageCircle className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-green-50 hover:text-green-500"><Repeat2 className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-red-50 hover:text-red-500"><Heart className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50 hover:text-blue-500"><Share className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-gray-50"><Bookmark className="w-4 h-4" /></Button>
				</div>
			</div>
		</div>
	);

	if (isReply && !isQuote && replyTo) {
		return (
			<Card className="max-w-2xl mx-auto bg-white">
				<div className="p-4">
					<ReplyPreview 
						htmlContent={replyTo.authorPostContent}
						author={replyTo.author}
						username={replyTo.authorUsername}
						platform={replyTo.platform}
						authorAvatar={replyTo.authorAvatar}
					/>
					<div className="flex gap-3 mt-4">
						<Avatar
							size="2"
							src={account?.avatar || `https://avatar.vercel.sh/${account?.username}`}
							fallback={account?.displayName ? account.displayName[0] : 'U'}
							className="flex-shrink-0"
						/>
						<div className="flex-1">
							<Text as="p" color="gray" size="2" className="mb-2">
								Replying to <a href="#" className="text-blue-500">@{replyTo.authorUsername}</a>
							</Text>
							<div className="whitespace-pre-wrap">{displayContent}</div>
						</div>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card className="max-w-2xl mx-auto bg-white">
			<div className="p-4">
				<MainTweet />
			</div>
		</Card>
	);
};

// Instagram Preview Component
export const InstagramPreview = ({ 
	content, 
	account, 
	timestamp = new Date(), 
	media = [],
	isThread = false,
	threadPosts = [],
	currentThreadIndex = 0,
	isReply,
	replyTo
}: BasePreviewProps) => {
	const formatTimestamp = (date: Date) => {
		return date.toLocaleDateString();
	};

	if (isReply && replyTo) {
		let username = replyTo.authorUsername || 'unknown';
		const avatar = replyTo.authorAvatar;
		let likes = replyTo.likesCount || '0';
		let commentsCount = '0';
		let postDate = 'Recently';
		let caption = '';
	
		if (replyTo.authorPostContent) {
			const rawContent = replyTo.authorPostContent;
			const likesMatch = rawContent.match(/(\d+)\s*likes/);
			const commentsMatch = rawContent.match(/(\d+)\s*comments/);
			const userMatch = rawContent.match(/-\s*(\w+)\s*on/);
			const dateMatch = rawContent.match(/on\s+(.*?):/);
			const captionMatch = rawContent.match(/:\s*(.*)/);
	
			if (likesMatch) likes = likesMatch[1];
			if (commentsMatch) commentsCount = commentsMatch[1];
			if (userMatch) username = userMatch[1];
			if (dateMatch) postDate = dateMatch[1].toUpperCase();
			if (captionMatch) {
				caption = captionMatch[1].trim().replace(/^"/, '').replace(/"\.*$/, '').replace(/&quot;/g, '');
			}
		}

		return (
			<Card className="max-w-md mx-auto bg-white shadow-lg rounded-lg">
				{/* Header */}
				<div className="flex items-center justify-between p-3 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<Avatar size="2" src={avatar} fallback={username.charAt(0).toUpperCase()} radius="full" />
						<Text weight="bold" size="2">{username}</Text>
					</div>
					<Button variant="ghost" size="1"><MoreHorizontal className="w-5 h-5 text-gray-500" /></Button>
				</div>
	
				{/* Media Area */}
				<div className="relative aspect-square bg-gray-100 flex items-center justify-center">
					 <ImageIcon className="w-20 h-20 text-gray-300" />
				</div>
	
				{/* Actions & Details */}
				<div className="p-3">
					<div className="flex items-center justify-between mb-3 text-gray-600">
						<div className="flex items-center gap-4">
							<Heart className="w-6 h-6" />
							<MessageCircle className="w-6 h-6" />
							<Send className="w-6 h-6" />
						</div>
						<Bookmark className="w-6 h-6" />
					</div>
	
					<Text size="2" weight="bold" className="block mb-1">{likes} likes</Text>
					
					 <div className="space-y-1 mb-2">
						<Text size="2" as="p">
							<span className="font-semibold">{username}</span>{" "}
							<span className="whitespace-pre-wrap">{caption}</span>
						</Text>
					</div>
	
					<Text size="1" color="gray" className="block cursor-pointer mb-2 hover:underline">View all {commentsCount} comments</Text>

					<div className="mt-2">
						<Text size="2" as="p">
							<span className="font-semibold">{account?.displayName || account?.username || 'you'}</span>
							<span className="whitespace-pre-wrap"> {content}</span>
						</Text>
					</div>

					<Text size="1" color="gray" className="block mt-2 uppercase">{postDate}</Text>
				</div>
			</Card>
		);
	}

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;
	
	const authorName = isReply ? replyTo?.author : account?.displayName || 'User';
	const authorUsername = isReply ? replyTo?.authorUsername : account?.username || 'username';
	const authorAvatar = isReply ? replyTo?.authorAvatar : account?.avatar;
	
	let postContentForDisplay = isReply ? replyTo?.authorPostContent : displayContent;
	if (isReply && postContentForDisplay) {
		postContentForDisplay = postContentForDisplay.replace(/"/g, '').replace(/\.$/, '');
	}
	
	const likes = isReply ? (replyTo?.likesCount || '48') : "123";

	return (
		<Card className="max-w-md mx-auto bg-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-3">
					<Avatar
						size="2"
						src={authorAvatar || `https://avatar.vercel.sh/${authorUsername}`}
						fallback={authorName ? authorName[0] : 'U'}
					/>
					<div>
						<Text weight="bold" size="2">{authorUsername}</Text>
						{isThread && threadInfo && (
							<Badge variant="soft" size="1" color="purple" className="ml-2">
								{threadInfo}
							</Badge>
						)}
					</div>
				</div>
				<Button variant="ghost" size="1">
					<MoreHorizontal className="w-5 h-5" />
				</Button>
			</div>

			{/* Media or Post Content */}
			<div className="relative aspect-square bg-gray-100 flex items-center justify-center">
				{isReply && postContentForDisplay ? (
					<div className="p-4 text-center" dangerouslySetInnerHTML={{ __html: postContentForDisplay }}/>
				) : media.length > 0 ? (
					<MultiImageViewer media={media} platform="instagram" />
				) : (
					<ImageIcon className="w-16 h-16 text-gray-300" />
				)}
			</div>

			{/* Actions */}
			<div className="p-4">
				<div className="flex items-center justify-between mb-3">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="1" className="hover:text-red-500">
							<Heart className="w-6 h-6" />
						</Button>
						<Button variant="ghost" size="1">
							<MessageCircle className="w-6 h-6" />
						</Button>
						<Button variant="ghost" size="1">
							<Send className="w-6 h-6" />
						</Button>
					</div>
					<Button variant="ghost" size="1">
						<Bookmark className="w-6 h-6" />
					</Button>
				</div>

				{/* Likes */}
				<Text size="2" weight="bold" className="block mb-2">{likes} likes</Text>

				{/* Caption */}
				<div className="space-y-1">
					<Text size="2">
						<span className="font-semibold">{authorUsername}</span>{" "}
						<span className="whitespace-pre-wrap">{postContentForDisplay}</span>
					</Text>
					
					{/* Thread continuation */}
					{isThread && threadPosts.length > 1 && currentThreadIndex < threadPosts.length - 1 && (
						<Text size="1" color="gray">
							...more
						</Text>
					)}
				</div>

				{/* Timestamp */}
				<Text size="1" color="gray" className="block mt-2">
					{formatTimestamp(timestamp)}
				</Text>
				{isReply && (
					<div className="mt-4 pt-2 border-t border-gray-200">
						<p className="text-sm text-gray-500">Replying to <span className="font-semibold">{authorUsername}</span></p>
					</div>
				)}
			</div>
		</Card>
	);
};


// Facebook Preview Component
export const FacebookPreview = ({ 
	content, 
	account, 
	timestamp = new Date(), 
	media = [],
	isReply = false,
	isQuote = false,
	replyTo,
	isThread = false,
	threadPosts = [],
	currentThreadIndex = 0
}: BasePreviewProps) => {
	const formatTimestamp = (date: Date) => {
		return date.toLocaleString();
	};

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;

	return (
		<Card className="max-w-lg mx-auto bg-white">
			<div className="p-4">
				{/* Header */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<Avatar
							size="2"
							src={account?.avatar || `https://avatar.vercel.sh/${account?.username}`}
							fallback={account?.displayName ? account.displayName[0] : 'U'}
						/>
						<div>
							<Text weight="bold" size="2">{account?.displayName || 'User'}</Text>
							<div className="flex items-center gap-2">
								<Text size="1" color="gray">{formatTimestamp(timestamp)}</Text>
								{threadInfo && (
									<Badge variant="soft" size="1" color="blue">
										{threadInfo}
									</Badge>
								)}
							</div>
						</div>
					</div>
					<Button variant="ghost" size="1">
						<MoreHorizontal className="w-5 h-5" />
					</Button>
				</div>

				{/* Reply indicator */}
				{isReply && !isQuote && replyTo && (
					<div className="border rounded-lg p-3 mt-3">
						<Text size="1" color="gray" className="mb-2 block">Replying to {replyTo.author}</Text>
						<div className="text-sm italic text-gray-500">{replyTo.authorPostContent}</div>
					</div>
				)}

				{/* Content */}
				<div className="mb-3">
					<Text size="2" className="whitespace-pre-wrap">{displayContent}</Text>
				</div>

				{/* Media */}
				{media.length > 0 && (
					<div className="mb-3 rounded-lg overflow-hidden border">
						<MultiImageViewer media={media} platform="facebook" />
					</div>
				)}

				{/* Thread continuation */}
				{isThread && threadPosts.length > 1 && currentThreadIndex < threadPosts.length - 1 && (
					<Text size="1" color="blue" className="block mb-3">
						Continue reading...
					</Text>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between pt-2 border-t">
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<Heart className="w-4 h-4 mr-2" />
						Like
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<MessageCircle className="w-4 h-4 mr-2" />
						Comment
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<Share className="w-4 h-4 mr-2" />
						Share
					</Button>
				</div>
			</div>
		</Card>
	);
};

// LinkedIn Preview Component
export const LinkedInPreview = ({ 
	content, 
	account, 
	timestamp = new Date(), 
	media = [],
	isReply = false,
	isQuote = false,
	replyTo,
	isThread = false,
	threadPosts = [],
	currentThreadIndex = 0
}: BasePreviewProps) => {
	const formatTimestamp = (date: Date) => {
		return date.toLocaleDateString();
	};

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;

	return (
		<Card className="max-w-lg mx-auto bg-white">
			<div className="p-4">
				{/* Header */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<Avatar
							size="2"
							src={account?.avatar || `https://avatar.vercel.sh/${account?.username}`}
							fallback={account?.displayName ? account.displayName[0] : 'U'}
						/>
						<div>
							<Text weight="bold" size="2">{account?.displayName || 'User'}</Text>
							<Text size="1" color="gray">Professional Title</Text>
							<div className="flex items-center gap-2">
								<Text size="1" color="gray">{formatTimestamp(timestamp)}</Text>
								{threadInfo && (
									<Badge variant="soft" size="1" color="blue">
										{threadInfo}
									</Badge>
								)}
							</div>
						</div>
					</div>
					<Button variant="ghost" size="1">
						<MoreHorizontal className="w-5 h-5" />
					</Button>
				</div>

				{/* Reply indicator */}
				{isReply && !isQuote && replyTo && (
					<div className="border rounded-lg p-3 mt-3">
						<Text size="1" color="gray" className="mb-2 block">Replying to {replyTo.author}</Text>
						<div className="text-sm italic text-gray-500">{replyTo.authorPostContent}</div>
					</div>
				)}

				{/* Content */}
				<div className="mb-3">
					<Text size="2" className="whitespace-pre-wrap">{displayContent}</Text>
				</div>

				{/* Media */}
				{media.length > 0 && (
					<div className="mb-3 rounded-lg overflow-hidden border">
						<MultiImageViewer media={media} platform="linkedin" />
					</div>
				)}

				{/* Thread continuation */}
				{isThread && threadPosts.length > 1 && currentThreadIndex < threadPosts.length - 1 && (
					<Text size="1" color="blue" className="block mb-3">
						See more posts in this series...
					</Text>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between pt-3 border-t">
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<Heart className="w-4 h-4 mr-2" />
						Like
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<MessageCircle className="w-4 h-4 mr-2" />
						Comment
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<Repeat2 className="w-4 h-4 mr-2" />
						Repost
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-blue-50">
						<Send className="w-4 h-4 mr-2" />
						Send
					</Button>
				</div>
			</div>
		</Card>
	);
};

// YouTube Preview Component (Community Post)
export const YouTubePreview = ({ 
	content, 
	account, 
	timestamp = new Date(), 
	media = [],
	isReply = false,
	isQuote = false,
	replyTo,
	isThread = false,
	threadPosts = [],
	currentThreadIndex = 0
}: BasePreviewProps) => {
	const formatTimestamp = (date: Date) => {
		return date.toLocaleDateString();
	};

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;

	return (
		<Card className="max-w-lg mx-auto bg-white">
			<div className="p-4">
				{/* Header */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<Avatar
							size="2"
							src={account?.avatar || `https://avatar.vercel.sh/${account?.username}`}
							fallback={account?.displayName ? account.displayName[0] : 'U'}
						/>
						<div>
							<Text weight="bold" size="2">{account?.displayName || 'User'}</Text>
							<div className="flex items-center gap-2">
								<Text size="1" color="gray">{formatTimestamp(timestamp)}</Text>
								{threadInfo && (
									<Badge variant="soft" size="1" color="red">
										{threadInfo}
									</Badge>
								)}
							</div>
						</div>
					</div>
					<Button variant="ghost" size="1">
						<MoreHorizontal className="w-5 h-5" />
					</Button>
				</div>

				{/* Reply indicator */}
				{isReply && !isQuote && replyTo && (
					<div className="border rounded-lg p-3 mt-3">
						<Text size="1" color="gray" className="mb-2 block">Replying to {replyTo.author}</Text>
						<div className="text-sm italic text-gray-500">{replyTo.authorPostContent}</div>
					</div>
				)}

				{/* Content */}
				<div className="mb-3">
					<Text size="2" className="whitespace-pre-wrap">{displayContent}</Text>
				</div>

				{/* Media */}
				{media.length > 0 && (
					<div className="mb-3 rounded-lg overflow-hidden border">
						<MultiImageViewer media={media} platform="youtube" />
					</div>
				)}

				{/* Thread continuation */}
				{isThread && threadPosts.length > 1 && currentThreadIndex < threadPosts.length - 1 && (
					<Text size="1" color="red" className="block mb-3">
						More posts in this series...
					</Text>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between pt-3 border-t">
					<Button variant="ghost" size="1" className="hover:bg-red-50">
						<Heart className="w-4 h-4 mr-2" />
						Like
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-red-50">
						<MessageCircle className="w-4 h-4 mr-2" />
						Comment
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-red-50">
						<Share className="w-4 h-4 mr-2" />
						Share
					</Button>
				</div>
			</div>
		</Card>
	);
};

// Main Preview Component that routes to platform-specific previews
interface PreviewProps {
	platform: string;
	content: string;
	account?: AccountInfo;
	timestamp?: Date;
	media?: MediaItem[];
	isReply?: boolean;
	isQuote?: boolean;
	replyTo?: any; 
	isThread?: boolean;
	threadPosts?: ThreadPost[];
	currentThreadIndex?: number;
}

export const PlatformPreview = (props: PreviewProps) => {
	const account = props.account;
	const baseProps = {
		...props,
		timestamp: props.timestamp || new Date(),
		media: props.media || [],
		isReply: props.isReply || false,
		isQuote: props.isQuote || false,
		isThread: props.isThread || false,
		threadPosts: props.threadPosts || [],
		currentThreadIndex: props.currentThreadIndex || 0,
	};

	switch (props.platform) {
		case 'x':
		case 'twitter':
			return <TwitterPreview {...baseProps} />;
		case 'instagram':
			return <InstagramPreview {...baseProps} />;
		case 'facebook':
			return <FacebookPreview {...baseProps} />;
		case 'linkedin':
			return <LinkedInPreview {...baseProps} />;
		case 'youtube':
			return <YouTubePreview {...baseProps} />;
		default:
			return <TwitterPreview {...baseProps} />;
	}
}; 

const MultiImageViewer = ({ media, platform }: { media: MediaItem[], platform: string }) => {
	const [currentIndex, setCurrentIndex] = useState(0);

	if (platform === 'twitter' && media.length > 1) {
		const gridClasses = {
			2: 'grid-cols-2 grid-rows-1',
			3: 'grid-cols-2 grid-rows-2',
			4: 'grid-cols-2 grid-rows-2',
		};
		const gridClass = gridClasses[media.length as keyof typeof gridClasses] || 'grid-cols-2 grid-rows-2';

		return (
			<div className={`grid ${gridClass} gap-0.5`}>
				{media.slice(0, 4).map((item, index) => (
					<div
						key={index}
						className={`relative ${
							media.length === 3 && index === 0 ? 'row-span-2' : ''
						} ${
							media.length === 3 && index !== 0 ? 'col-start-2' : ''
						}`}
						style={{ paddingTop: '100%' }}
					>
						<MediaItemRenderer item={item} />
					</div>
				))}
			</div>
		);
	}

	// Default to carousel for other platforms or single image on Twitter
	return (
		<div className="relative w-full h-full">
			<div className="overflow-hidden w-full h-full">
				<div
					className="flex transition-transform duration-300 ease-in-out h-full"
					style={{ transform: `translateX(-${currentIndex * 100}%)` }}
				>
					{media.map((item, index) => (
						<div key={index} className="flex-shrink-0 w-full h-full">
							<MediaItemRenderer item={item} isCarousel />
						</div>
					))}
				</div>
			</div>
			{media.length > 1 && (
				<>
					<Button
						variant="soft"
						size="1"
						onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => p === 0 ? media.length - 1 : p - 1); }}
						className="absolute top-1/2 left-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8 z-10"
					>
						<ChevronLeft className="w-4 h-4" />
					</Button>
					<Button
						variant="soft"
						size="1"
						onClick={(e) => { e.stopPropagation(); setCurrentIndex(p => p === media.length - 1 ? 0 : p + 1); }}
						className="absolute top-1/2 right-2 transform -translate-y-1/2 !rounded-full !w-8 !h-8 z-10"
					>
						<ChevronRight className="w-4 h-4" />
					</Button>
					<div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
						{media.map((_, index) => (
							<button
								key={index}
								onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
								className={`w-2 h-2 rounded-full ${currentIndex === index ? 'bg-white' : 'bg-gray-400'}`}
							/>
						))}
					</div>
				</>
			)}
		</div>
	);
};

const MediaItemRenderer = ({ item, isCarousel }: { item: MediaItem, isCarousel?: boolean }) => {
	const commonClass = isCarousel ? "absolute inset-0 w-full h-full object-cover" : "absolute inset-0 w-full h-full object-cover";

	if (item.type === 'image') {
		return (
			<Image
				src={item.image?.toString() || ""}
				alt={item.alt?.toString() || ""}
				layout="fill"
				className={commonClass}
			/>
		);
	}

	if (item.type === 'video') {
		return (
			<div className="relative w-full h-full bg-black">
				<video
					src={item.video?.toString() || ""}
					className={commonClass}
					controls={false}
				/>
				<div className="absolute inset-0 flex items-center justify-center">
					<Play className="w-12 h-12 text-white" />
				</div>
			</div>
		);
	}

	return null;
}; 