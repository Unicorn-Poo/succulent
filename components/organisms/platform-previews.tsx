"use client";

import { Card, Avatar, Text, Badge, Button } from "@radix-ui/themes";
import { Heart, MessageCircle, Repeat2, Share, MoreHorizontal, Play, Bookmark, Send, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { ThreadPost } from "@/utils/threadUtils";
import { useState, useEffect } from "react";
import { ReplyPreview } from "@/components/molecules";

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
	media?: any[];
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
						/>
					</div>
				)}
				<div className="flex items-center justify-between max-w-md text-gray-500">
					<Button variant="ghost" size="1" className="hover:bg-lime-50 hover:text-lime-500"><MessageCircle className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-green-50 hover:text-green-500"><Repeat2 className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-red-50 hover:text-red-500"><Heart className="w-4 h-4" /></Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50 hover:text-lime-500"><Share className="w-4 h-4" /></Button>
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
						// authorAvatar={replyTo.authorAvatar}
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
								Replying to <a href="#" className="text-lime-500">@{replyTo.authorUsername}</a>
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
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		const weeks = Math.floor(days / 7);
		
		if (minutes < 60) return `${minutes}m`;
		if (hours < 24) return `${hours}h`;
		if (days < 7) return `${days}d`;
		return `${weeks}w`;
	};

	const currentPost = isThread && threadPosts.length > 0 ? threadPosts[currentThreadIndex] : null;
	const displayContent = currentPost ? currentPost.content : content;
	const threadInfo = currentPost ? `${currentPost.index}/${currentPost.total}` : null;
	
	const authorName = account?.displayName || account?.name || 'User';
	const authorUsername = account?.username || account?.name || 'scapesquared';
	const authorAvatar = account?.avatar;
	
	const likes = "123";
	const commentsCount = "47";

	return (
		<div className="w-full max-w-md mx-auto bg-white" style={{ 
			fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			fontSize: '14px',
			lineHeight: '18px'
		}}>
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 bg-white">
				<div className="flex items-center">
					{/* Profile Picture with Story Ring */}
					<div className="relative mr-3">
						<div className="w-8 h-8 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
							<img
								src={authorAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face"}
								alt={authorName}
								className="w-full h-full rounded-full object-cover bg-white p-0.5"
							/>
						</div>
					</div>
					{/* Username */}
					<div className="flex items-center">
						<span className="text-sm font-semibold text-black">{authorUsername}</span>
						{isThread && threadInfo && (
							<span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
								{threadInfo}
							</span>
						)}
					</div>
				</div>
				{/* Three Dots Menu */}
				<button className="p-1">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
						<circle cx="12" cy="5" r="1.5" fill="black"/>
						<circle cx="12" cy="12" r="1.5" fill="black"/>
						<circle cx="12" cy="19" r="1.5" fill="black"/>
					</svg>
				</button>
			</div>

			{/* Media Area - Exactly Square */}
			<div className="relative w-full aspect-square bg-gray-100">
				{media.length > 0 ? (
					<MultiImageViewer media={media} platform="instagram" />
				) : (
					<div className="w-full h-full bg-gray-200 flex items-center justify-center">
						<svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
							<circle cx="8.5" cy="8.5" r="1.5"/>
							<polyline points="21,15 16,10 5,21"/>
						</svg>
					</div>
				)}
			</div>

			{/* Action Buttons */}
			<div className="px-4 py-2">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center space-x-4">
						{/* Heart */}
						<button className="p-1 hover:opacity-60">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
							</svg>
						</button>
						{/* Comment */}
						<button className="p-1 hover:opacity-60">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
								<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
							</svg>
						</button>
						{/* Share/Send */}
						<button className="p-1 hover:opacity-60">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
								<line x1="22" y1="2" x2="11" y2="13"/>
								<polygon points="22,2 15,22 11,13 2,9 22,2"/>
							</svg>
						</button>
					</div>
					{/* Bookmark */}
					<button className="p-1 hover:opacity-60">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
							<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
						</svg>
					</button>
				</div>
			</div>

			{/* Content Area */}
			<div className="px-4 pb-4">
				{/* Likes */}
				<div className="mb-1">
					<span className="text-sm font-semibold text-black">{likes} likes</span>
				</div>

				{/* Caption */}
				<div className="mb-1 text-sm text-black leading-[18px]">
					<span className="font-semibold">{authorUsername}</span>
					<span className="ml-1 whitespace-pre-wrap">{displayContent}</span>
				</div>

				{/* View Comments */}
				<div className="mb-1">
					<button className="text-sm text-gray-500 hover:text-gray-700">
						View all {commentsCount} comments
					</button>
				</div>

				{/* Timestamp */}
				<div className="mb-3">
					<span className="text-xs text-gray-500 uppercase tracking-wide">
						{formatTimestamp(timestamp)}
					</span>
				</div>

				{/* Add Comment */}
				<div className="border-t border-gray-200 pt-3">
					<div className="flex items-center space-x-3">
						<div className="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0"></div>
						<span className="text-sm text-gray-500">Add a comment...</span>
					</div>
				</div>
			</div>
		</div>
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
									<Badge variant="soft" size="1" color="lime">
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
					<Text size="1" color="lime" className="block mb-3">
						Continue reading...
					</Text>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between pt-2 border-t">
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
						<Heart className="w-4 h-4 mr-2" />
						Like
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
						<MessageCircle className="w-4 h-4 mr-2" />
						Comment
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
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
									<Badge variant="soft" size="1" color="lime">
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
					<Text size="1" color="lime" className="block mb-3">
						See more posts in this series...
					</Text>
				)}

				{/* Actions */}
				<div className="flex items-center justify-between pt-3 border-t">
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
						<Heart className="w-4 h-4 mr-2" />
						Like
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
						<MessageCircle className="w-4 h-4 mr-2" />
						Comment
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
						<Repeat2 className="w-4 h-4 mr-2" />
						Repost
					</Button>
					<Button variant="ghost" size="1" className="hover:bg-lime-50">
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
	media?: any[];
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

const MultiImageViewer = ({ media, platform }: { media: any[], platform: string }) => {
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

	// Instagram carousel - no arrow buttons, just dots
	if (platform === 'instagram') {
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
				{/* Instagram-style dots at bottom center */}
				{media.length > 1 && (
					<div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
						{media.map((_, index) => (
							<button
								key={index}
								onClick={(e) => {
									e.stopPropagation();
									setCurrentIndex(index);
								}}
								className={`w-1.5 h-1.5 rounded-full transition-opacity hover:opacity-80 ${
									currentIndex === index ? 'bg-white' : 'bg-white bg-opacity-40'
								}`}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	// Default carousel for other platforms
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

// Component to handle Jazz FileStream objects
const FileStreamImage = ({ fileStream, className, alt }: { fileStream: any, className: string, alt: string }) => {
	const [dataUrl, setDataUrl] = useState<string | null>(null);
	const [error, setError] = useState<boolean>(false);

	useEffect(() => {
		let isMounted = true;
		
		const loadImage = async () => {
			try {
				
				if (typeof fileStream.getBlob === 'function') {
					const blob = await fileStream.getBlob();
					
					if (isMounted && blob) {
						// Convert blob to data URL (same as post creation carousel)
						const dataUrl = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onload = (e) => resolve(e.target?.result as string);
							reader.readAsDataURL(blob);
						});
						
						setDataUrl(dataUrl);
					}
				} else if (typeof fileStream.toBlob === 'function') {
					// Fallback method
					const blob = await fileStream.toBlob();
					
					if (isMounted && blob) {
						const dataUrl = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onload = (e) => resolve(e.target?.result as string);
							reader.readAsDataURL(blob);
						});
						
						setDataUrl(dataUrl);
					}
				} else {
					setError(true);
				}
			} catch (err) {
				console.error('Error loading blob:', err);
				if (isMounted) {
					setError(true);
				}
			}
		};

		loadImage();

		return () => {
			isMounted = false;
		};
	}, [fileStream]);

	if (error) {
		return (
			<div className={`${className} bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center`}>
				<span className="text-gray-500 text-sm">Failed to load image</span>
			</div>
		);
	}

	if (!dataUrl) {
		return (
			<div className={`${className} bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center`}>
				<span className="text-gray-500 text-sm">Loading...</span>
			</div>
		);
	}

	return (
		<img
			src={dataUrl}
			alt={alt}
			className={className}
		/>
	);
};

const MediaItemRenderer = ({ item, isCarousel }: { item: any, isCarousel?: boolean }) => {
	const commonClass = isCarousel ? "w-full h-full object-cover" : "w-full h-full object-cover";

	if (item?.type === 'image') {
		const imageObject = item.image;
		
		// Check if it's a Jazz FileStream - be more flexible with detection
		if (imageObject && (
			typeof imageObject.getBlob === 'function' || 
			'getBlob' in imageObject ||
			imageObject._type === 'BinaryCoStream' ||
			imageObject.constructor?.name === 'FileStream'
		)) {
			return (
				<FileStreamImage 
					fileStream={imageObject} 
					className={commonClass}
					alt={item.alt?.toString() || ""}
				/>
			);
		}
		
		// Fallback to regular URL handling for other types
		const getValidUrl = (fileStreamOrImage: any) => {
			if (!fileStreamOrImage) {
				return null;
			}
			
			try {
				// Check if it's already a valid URL string
				if (typeof fileStreamOrImage === 'string') {
					if (fileStreamOrImage.startsWith('http') || fileStreamOrImage.startsWith('data:')) {
						return fileStreamOrImage;
					}
					return null;
				}
				
				// Check if it's a Jazz ImageDefinition
				if (fileStreamOrImage.highestResAvailable) {
					const highestRes = fileStreamOrImage.highestResAvailable();
					if (highestRes && highestRes.publicUrl) {
						return highestRes.publicUrl;
					}
				}
				
				// Check for placeholderDataURL in ImageDefinition
				if (fileStreamOrImage.placeholderDataURL) {
					return fileStreamOrImage.placeholderDataURL;
				}
				
				// Check if it's a Jazz FileStream with publicUrl property
				if (fileStreamOrImage.publicUrl && typeof fileStreamOrImage.publicUrl === 'string') {
					return fileStreamOrImage.publicUrl;
				}
				
				// Check for other common URL properties
				if (fileStreamOrImage.url && typeof fileStreamOrImage.url === 'string') {
					return fileStreamOrImage.url;
				}
				
				return null;
			} catch (error) {
				console.warn('Error processing media item:', error);
				return null;
			}
		};

		const imageUrl = getValidUrl(imageObject);
		
		// Show placeholder if no valid URL
		if (!imageUrl) {
			return (
				<div className={`${commonClass} bg-gray-100 flex items-center justify-center`}>
					<svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-400">
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
						<circle cx="8.5" cy="8.5" r="1.5"/>
						<polyline points="21,15 16,10 5,21"/>
					</svg>
				</div>
			);
		}
		
		return (
			<div className="relative w-full h-full">
				<Image
					src={imageUrl}
					alt={item.alt?.toString() || ""}
					fill
					className={commonClass}
					onError={(e) => {
						console.error('Image failed to load:', imageUrl, e);
					}}
				/>
			</div>
		);
	}

	if (item?.type === 'video') {
		// Handle video FileStream similarly if needed
		const videoObject = item.video;
		
		if (videoObject && typeof videoObject.getBlob === 'function') {
			// For now, show placeholder for videos
			return (
				<div className={`${commonClass} bg-gray-100 flex items-center justify-center`}>
					<Play className="w-8 h-8 text-gray-400" />
				</div>
			);
		}
	}

	return null;
}; 