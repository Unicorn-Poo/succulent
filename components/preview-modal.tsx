"use client";

import { useState } from "react";
import { Dialog, Button, Tabs, Box, Text, Badge, Card } from "@radix-ui/themes";
import { X, ChevronLeft, ChevronRight, Grid, Smartphone, Monitor } from "lucide-react";
import { PlatformPreview } from "./platform-previews";
import { ThreadPost } from "../utils/threadUtils";
import { MediaItem } from "../app/schema";
import { platformLabels } from "../utils/postConstants";
import Image from "next/image";

interface PreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	content: string;
	selectedPlatforms: string[];
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
	activeTab: string;
	media?: MediaItem[];
	isReply?: boolean;
	replyToUsername?: string;
	isThread?: boolean;
	threadPosts?: ThreadPost[];
	replyUrl?: string;
}

export const PreviewModal = ({
	isOpen,
	onClose,
	content,
	selectedPlatforms,
	accountGroup,
	activeTab,
	media = [],
	isReply = false,
	replyToUsername,
	isThread = false,
	threadPosts = [],
	replyUrl
}: PreviewModalProps) => {
	const [currentThreadIndex, setCurrentThreadIndex] = useState(0);
	const [previewMode, setPreviewMode] = useState<'current' | 'all'>('current');

	// Get the current platform info
	const currentPlatform = activeTab === 'base' ? 'x' : activeTab;
	const currentAccount = accountGroup.accounts[currentPlatform];
	const currentAccountName = currentAccount?.name || 'User';
	const currentPlatformName = currentAccount?.platform || currentPlatform;

	// Filter platforms to show previews for (exclude 'base')
	const previewPlatforms = selectedPlatforms.filter(platform => platform !== 'base');

	// Thread navigation handlers
	const handlePreviousThread = () => {
		if (currentThreadIndex > 0) {
			setCurrentThreadIndex(currentThreadIndex - 1);
		}
	};

	const handleNextThread = () => {
		if (currentThreadIndex < threadPosts.length - 1) {
			setCurrentThreadIndex(currentThreadIndex + 1);
		}
	};

	// Get platform icon
	const getPlatformIcon = (platform: string) => {
		const platformIconMap: Record<string, string> = {
			x: "/icons8-twitter.svg",
			twitter: "/icons8-twitter.svg",
			instagram: "/icons8-instagram.svg",
			facebook: "/icons8-facebook.svg",
			linkedin: "/icons8-linkedin.svg",
			youtube: "/icons8-youtube-logo.svg",
		};
		return platformIconMap[platform] || "/sprout.svg";
	};

	// Extract username from reply URL for preview
	const extractUsernameFromUrl = (url: string) => {
		if (url.includes('twitter.com') || url.includes('x.com')) {
			const match = url.match(/\/([^\/]+)\/status/);
			return match ? match[1] : 'user';
		}
		return 'user';
	};

	const extractedReplyUsername = replyUrl ? extractUsernameFromUrl(replyUrl) : replyToUsername || 'user';

	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh', width: '1200px' }}>
				<div className="flex items-center justify-between mb-4">
					<Dialog.Title>Preview Post</Dialog.Title>
					<div className="flex items-center gap-2">
						{/* Preview Mode Toggle */}
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
							<Button
								variant={previewMode === 'current' ? 'solid' : 'ghost'}
								size="1"
								onClick={() => setPreviewMode('current')}
							>
								<Smartphone className="w-4 h-4 mr-1" />
								Current
							</Button>
							<Button
								variant={previewMode === 'all' ? 'solid' : 'ghost'}
								size="1"
								onClick={() => setPreviewMode('all')}
							>
								<Grid className="w-4 h-4 mr-1" />
								All Platforms
							</Button>
						</div>
						
						<Button variant="ghost" size="1" onClick={onClose}>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* Post Type Indicator */}
				<div className="mb-4">
					<div className="flex items-center gap-2 mb-2">
						{isReply && (
							<Badge variant="soft" color="blue">
								Reply Post
							</Badge>
						)}
						{isThread && (
							<Badge variant="soft" color="green">
								Thread Post
							</Badge>
						)}
						{!isReply && !isThread && (
							<Badge variant="soft" color="gray">
								Standard Post
							</Badge>
						)}
					</div>
					
					{/* Thread Navigation */}
					{isThread && threadPosts.length > 1 && (
						<div className="flex items-center gap-2 mb-4">
							<Button
								variant="outline"
								size="1"
								onClick={handlePreviousThread}
								disabled={currentThreadIndex === 0}
							>
								<ChevronLeft className="w-4 h-4" />
							</Button>
							<Text size="2">
								Thread {currentThreadIndex + 1} of {threadPosts.length}
							</Text>
							<Button
								variant="outline"
								size="1"
								onClick={handleNextThread}
								disabled={currentThreadIndex === threadPosts.length - 1}
							>
								<ChevronRight className="w-4 h-4" />
							</Button>
						</div>
					)}
				</div>

				{/* Preview Content */}
				<div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
					{previewMode === 'current' ? (
						// Single Platform Preview
						<div className="flex flex-col items-center">
							<div className="mb-4">
								<div className="flex items-center gap-2 mb-2">
									<Image
										src={getPlatformIcon(currentPlatformName)}
										alt={currentPlatformName}
										width={24}
										height={24}
									/>
									<Text size="3" weight="medium">
										{platformLabels[currentPlatformName as keyof typeof platformLabels] || currentPlatformName}
									</Text>
								</div>
								<Text size="1" color="gray">
									@{currentAccountName}
								</Text>
							</div>
							
							<PlatformPreview
								platform={currentPlatformName}
								content={content}
								accountName={currentAccountName}
								timestamp={new Date()}
								media={media}
								isReply={isReply}
								replyToUsername={extractedReplyUsername}
								isThread={isThread}
								threadPosts={threadPosts}
								currentThreadIndex={currentThreadIndex}
							/>
						</div>
					) : (
						// All Platforms Preview
						<div className="space-y-8">
							{previewPlatforms.map((platform) => {
								const account = accountGroup.accounts[platform];
								const platformName = account?.platform || platform;
								const accountName = account?.name || 'User';
								
								return (
									<div key={platform} className="space-y-4">
										<div className="flex items-center gap-2">
											<Image
												src={getPlatformIcon(platformName)}
												alt={platformName}
												width={24}
												height={24}
											/>
											<Text size="3" weight="medium">
												{platformLabels[platformName as keyof typeof platformLabels] || platformName}
											</Text>
											<Text size="1" color="gray">
												@{accountName}
											</Text>
										</div>
										
										<PlatformPreview
											platform={platformName}
											content={content}
											accountName={accountName}
											timestamp={new Date()}
											media={media}
											isReply={isReply}
											replyToUsername={extractedReplyUsername}
											isThread={isThread}
											threadPosts={threadPosts}
											currentThreadIndex={currentThreadIndex}
										/>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex justify-between items-center mt-4 pt-4 border-t">
					<div className="flex items-center gap-2 text-sm text-gray-500">
						<Text size="1">
							{previewMode === 'current' 
								? `Previewing for ${platformLabels[currentPlatformName as keyof typeof platformLabels] || currentPlatformName}`
								: `Previewing for ${previewPlatforms.length} platform${previewPlatforms.length === 1 ? '' : 's'}`
							}
						</Text>
					</div>
					
					<div className="flex items-center gap-2">
						<Button variant="soft" onClick={onClose}>
							Close
						</Button>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
}; 