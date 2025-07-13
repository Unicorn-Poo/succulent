"use client";

import { useState } from "react";
import { Dialog, Button, Tabs, Box, Text, Badge, Card } from "@radix-ui/themes";
import { X, ChevronLeft, ChevronRight, Grid, Smartphone, Monitor } from "lucide-react";
import { PlatformPreview } from "./platform-previews";
import { ThreadPost } from "@/utils/threadUtils";
import { MediaItem } from "@/app/schema";
import { platformLabels } from "@/utils/postConstants";
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
			avatar?: string;
			username?: string;
			displayName?: string;
			url?: string;
		}>;
	};
	activeTab: string;
	media?: MediaItem[];
	isReply?: boolean;
	isQuote?: boolean;
	replyTo?: any;
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
	isQuote = false,
	replyTo,
	isThread = false,
	threadPosts = [],
	replyUrl
}: PreviewModalProps) => {
	const [currentThreadIndex, setCurrentThreadIndex] = useState(0);
	const [previewMode, setPreviewMode] = useState<'current' | 'all'>('current');

	// Determine the account to display for the preview.
	let displayAccount: any;
	if (isReply && replyTo?.platform) {
		// For replies, find the account that matches the platform.
		displayAccount = Object.values(accountGroup.accounts).find(acc => acc.platform === replyTo.platform);
	} else if (activeTab !== 'base') {
		// For a specific tab, use that account.
		displayAccount = accountGroup.accounts[activeTab];
	} else {
		// For the 'base' tab, use the first account as a default for preview.
		displayAccount = Object.values(accountGroup.accounts)[0];
	}

	// Fallback to a dummy account object if no accounts exist at all.
	if (!displayAccount) {
		displayAccount = { platform: 'x', name: 'User', username: 'user', displayName: 'User', avatar: '' };
	}

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

	const extractedReplyUsername = replyUrl ? extractUsernameFromUrl(replyUrl) : replyTo?.username || 'user';

	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Content style={{ maxWidth: '90vw', maxHeight: '90vh', width: '1200px' }}>
				<div className="flex items-center justify-between mb-4">
					<Dialog.Title>Preview Post</Dialog.Title>
					<div className="flex items-center gap-2">
						{/* Preview Mode Toggle - Hide for replies */}
						{!isReply && (
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
						)}
						
						<Button variant="ghost" size="1" onClick={onClose}>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* Post Type Indicator */}
				<div className="mb-4">
					<div className="flex items-center gap-2 mb-2">
						{isReply && (
							<Badge variant="soft" color="lime">
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
										src={getPlatformIcon(displayAccount.platform)}
										alt={displayAccount.platform}
										width={24}
										height={24}
									/>
									<Text size="3" weight="medium">
										{platformLabels[displayAccount.platform as keyof typeof platformLabels] || displayAccount.platform}
									</Text>
								</div>
								<Text size="1" color="gray">
									@{displayAccount.name}
								</Text>
							</div>
							
							<PlatformPreview
								platform={displayAccount.platform}
								content={content}
								account={displayAccount}
								timestamp={new Date()}
								media={media}
								isReply={isReply}
								isQuote={isQuote}
								replyTo={replyTo}
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
								const accountInfo = {
									...account,
									id: account?.id || '',
									platform: account?.platform || 'x',
									name: account?.name || 'User',
									username: account?.username || 'user',
									displayName: account?.displayName || 'User',
      								avatar: account?.avatar || '',
									apiUrl: account?.apiUrl || '',
									url: account?.url || '',
								};

								return (
									<div key={platform} className="space-y-4">
										<div className="flex items-center gap-2">
											<Image
												src={getPlatformIcon(accountInfo.platform)}
												alt={accountInfo.platform}
												width={24}
												height={24}
											/>
											<Text size="3" weight="medium">
												{platformLabels[accountInfo.platform as keyof typeof platformLabels] || accountInfo.platform}
											</Text>
											<Text size="1" color="gray">
												@{accountInfo.name}
											</Text>
										</div>
										
										<PlatformPreview
											platform={accountInfo.platform}
											content={content}
											account={accountInfo}
											timestamp={new Date()}
											media={media}
											isReply={isReply}
											isQuote={isQuote}
											replyTo={replyTo}
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
							{previewMode === 'current' && !isReply
								? `Previewing for ${platformLabels[displayAccount.platform as keyof typeof platformLabels] || displayAccount.platform}`
								: isReply
								? `Replying on ${platformLabels[replyTo?.platform as keyof typeof platformLabels] || 'platform'}`
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