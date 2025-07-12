"use client";

import { Card, Text } from "@radix-ui/themes";
import {
	AlertCircle,
	Check,
	Package,
} from "lucide-react";
import { PostFullyLoaded } from "@/app/schema";
import { PreviewModal } from "./preview-modal";
import { usePostCreation } from "@/hooks/use-post-creation";
import { PostCreationHeader } from "./post-creation/post-creation-header";
import { PostActions } from "./post-creation/post-actions";
import { ReplyPanel } from "./post-creation/reply-panel";
import { PostContent } from "./post-creation/post-content";
import { ThreadPreview } from "./post-creation/thread-preview";
import { AddAccountDialog } from "./post-creation/add-account-dialog";
import { SettingsDialog } from "./post-creation/settings-dialog";
import { GelatoButton, TemplateSelector } from "succulent-gelato";
import type { SucculentPost, TemplateMapping } from "succulent-gelato";
import { useState } from "react";

interface PostCreationProps {
	post: PostFullyLoaded;
	accountGroup: {
		id: string;
		name: string;
		accounts: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
	};
}

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
	// Gelato configuration - TODO: move to env variables and config file
	const gelatoConfig = {
		gelato: {
			apiKey: process.env.NEXT_PUBLIC_GELATO_API_KEY || '',
			storeId: process.env.NEXT_PUBLIC_GELATO_STORE_ID || '',
		},
		templates: [
			{
				id: '0a2c9a58-d1d4-4a79-b9b2-8726663a50df', // TODO: Replace with your actual template ID
				name: 'Custom T-Shirt',
				description: 'High-quality custom t-shirt from social media post',
				productType: 'apparel',
				isDefault: true,
			},
			{
				id: 'poster-template-id', // TODO: Replace with actual template ID
				name: 'Art Poster',
				description: 'Beautiful poster from social media post',
				productType: 'poster',
			},
		] as TemplateMapping[],
	};

	// Gelato state
	const [selectedTemplate, setSelectedTemplate] = useState<TemplateMapping | null>(
		gelatoConfig.templates.find(t => t.isDefault) || gelatoConfig.templates[0] || null
	);
	const [gelatoProducts, setGelatoProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
	const [showGelatoSection, setShowGelatoSection] = useState(false);

	const {
		activeTab, setActiveTab,
		seriesType,
		title, setTitle,
		isEditingTitle, setIsEditingTitle,
		replyUrl,
		postingInterval, setPostingInterval,
		showSettings, setShowSettings,
		showSaveButton,
		showPublishButton,
		contextText,
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
		post: currentPost,
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
		handlePreview,
		handleImageUpload,
		isExplicitThread,
		isImplicitThread
	} = usePostCreation({ post, accountGroup });

	// Gelato handlers
	const handleGelatoProductCreated = (result: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
		setGelatoProducts(prev => [...prev, result]);
		console.log('✅ Gelato product created:', result);
		// You can add a toast notification here if you have a toast system
	};

	const handleGelatoError = (error: string) => {
		console.error('❌ Gelato product creation failed:', error);
		// You can add error handling/toast notification here
	};

	// Convert post to SucculentPost format for Gelato
	const convertToSucculentPost = (): SucculentPost => {
		const variants: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
		
		Object.keys(currentPost.variants).forEach(platformName => {
			const variant = currentPost.variants[platformName];
			if (variant) {
				variants[platformName] = {
					text: variant.text?.toString() || '',
					postDate: new Date(),
					media: variant.media?.filter(Boolean) || [],
					edited: variant.edited || false,
					lastModified: variant.lastModified,
				};
			}
		});

		return {
			title: title || 'Untitled Post',
			variants,
		};
	};

	// Check if post has images for Gelato
	const hasImages = currentPost.variants[activeTab]?.media?.some(
		(item: any) => item?.type === 'image' // eslint-disable-line @typescript-eslint/no-explicit-any
	) || false;

	return (
		<div className="space-y-6">
			<PostCreationHeader
				title={title}
				setTitle={setTitle}
				isEditingTitle={isEditingTitle}
				setIsEditingTitle={setIsEditingTitle}
				handleTitleSave={handleTitleSave}
				selectedPlatforms={selectedPlatforms}
				accountGroup={accountGroup}
				seriesType={seriesType}
				detectedPlatform={detectedPlatform}
				activeTab={activeTab}
				setActiveTab={setActiveTab}
				handleRemoveAccount={handleRemoveAccount}
				availableAccounts={availableAccounts}
				setShowAddAccountDialog={setShowAddAccountDialog}
				post={currentPost}
			/>

			<PostActions
				seriesType={seriesType}
				handleToggleReplyMode={handleToggleReplyMode}
				hasMultipleAccounts={hasMultipleAccounts}
				detectedPlatform={detectedPlatform}
				isQuoteTweet={isQuoteTweet}
				setIsQuoteTweet={setIsQuoteTweet}
				manualThreadMode={manualThreadMode}
				setManualThreadMode={setManualThreadMode}
				handlePreview={handlePreview}
				scheduledDate={scheduledDate}
				setShowSettings={setShowSettings}
				showPublishButton={showPublishButton}
				handlePublishPost={handlePublishPost}
				isScheduling={isScheduling}
				getReplyDescription={getReplyDescription}
				isThread={isThread}
			/>

			{seriesType === "reply" && (
				<ReplyPanel
					replyUrl={replyUrl}
					handleReplyUrlChange={handleReplyUrlChange}
					isValidReplyUrl={isValidReplyUrl}
					detectedPlatform={detectedPlatform}
					isFetchingReply={isFetchingReply}
					fetchReplyError={fetchReplyError}
					post={currentPost}
					activeTab={activeTab}
				/>
			)}

			<PostContent
				seriesType={seriesType}
				post={currentPost}
				activeTab={activeTab}
				handleImageUpload={handleImageUpload}
				contextText={contextText}
				handleContentChange={handleContentChange}
				hasUnsavedChanges={hasUnsavedChanges}
				showSaveButton={showSaveButton}
				handleSaveContent={handleSaveContent}
				isSaving={isSaving}
				isImplicitThread={isImplicitThread}
				isExplicitThread={isExplicitThread}
			/>

			<ThreadPreview isThread={isThread} threadPosts={threadPosts} />

			{/* Gelato Product Creation Section */}
			<Card>
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<Package className="w-5 h-5 text-blue-600" />
							<Text weight="medium" size="3">Create Gelato Products</Text>
							{hasImages && (
								<span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
									Images detected
								</span>
							)}
						</div>
						<button
							onClick={() => setShowGelatoSection(!showGelatoSection)}
							className="text-sm text-gray-600 hover:text-gray-800"
						>
							{showGelatoSection ? 'Hide' : 'Show'}
						</button>
					</div>

					{showGelatoSection && (
						<div className="space-y-4">
							{/* Setup Instructions when API key is missing */}
							{!gelatoConfig.gelato.apiKey && (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<Text size="2" weight="medium" className="block mb-2 text-blue-800">
										🔧 Setup Required
									</Text>
									<Text size="2" className="block mb-3 text-blue-700">
										To create Gelato products, add your API credentials to the .env file:
									</Text>
									<div className="bg-white p-3 rounded border font-mono text-sm">
										<div>NEXT_PUBLIC_GELATO_API_KEY=your-api-key</div>
										<div>NEXT_PUBLIC_GELATO_STORE_ID=your-store-id</div>
									</div>
									<Text size="1" className="block mt-2 text-blue-600">
										Get your credentials from: <a href="https://gelato.com/developers" target="_blank" className="underline">gelato.com/developers</a>
									</Text>
								</div>
							)}

							{!hasImages && (
								<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<Text size="2" color="orange">
										⚠️ This post doesn&apos;t have any images. Add images to create Gelato products.
									</Text>
								</div>
							)}

							{hasImages && gelatoConfig.gelato.apiKey && (
								<>
									{/* Template Selection */}
									<div>
										<Text size="2" weight="medium" className="block mb-2">
											Choose Product Template:
										</Text>
										<TemplateSelector
											templates={gelatoConfig.templates}
											selectedTemplate={selectedTemplate}
											onSelect={setSelectedTemplate}
											className="w-full"
										/>
									</div>

									{/* Platform Variant Selection */}
									<div>
										<Text size="2" weight="medium" className="block mb-2">
											Platform Variant:
										</Text>
										<Text size="2" color="gray" className="block mb-1">
											Using: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
										</Text>
									</div>

									{/* Create Product Button */}
									<GelatoButton
										config={gelatoConfig}
										post={convertToSucculentPost()}
										variant={activeTab}
										template={selectedTemplate || undefined}
										disabled={!selectedTemplate || !hasImages}
										onProductCreated={handleGelatoProductCreated}
										onError={handleGelatoError}
										className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
									>
										Create {selectedTemplate?.name || 'Product'}
									</GelatoButton>

									{/* Created Products List */}
									{gelatoProducts.length > 0 && (
										<div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
											<Text size="2" weight="medium" className="block mb-2">
												Created Products ({gelatoProducts.length}):
											</Text>
											<div className="space-y-2">
												{gelatoProducts.map((product, index) => (
													<div key={index} className="text-sm bg-white p-2 rounded border">
														<div className="font-medium">Product ID: {product.productId}</div>
														<div className="text-gray-600">
															{product.sourcePost.title}
															{product.sourcePost.variant && ` (${product.sourcePost.variant})`}
														</div>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}

							{/* Demo/Test Button when no API key */}
							{!gelatoConfig.gelato.apiKey && hasImages && (
								<button
									onClick={() => {
										console.log('Demo: Would create Gelato product with:', {
											post: convertToSucculentPost(),
											template: selectedTemplate,
											variant: activeTab
										});
										handleGelatoError('Please add your Gelato API credentials to create real products');
									}}
									className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg font-medium"
								>
									Demo Mode - Add API Key to Create Real Products
								</button>
							)}
						</div>
					)}
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

			<AddAccountDialog
				open={showAddAccountDialog}
				onOpenChange={setShowAddAccountDialog}
				availableAccounts={availableAccounts}
				handleAddAccount={handleAddAccount}
			/>

			<SettingsDialog
				open={showSettings}
				onOpenChange={setShowSettings}
				scheduledDate={scheduledDate}
				setScheduledDate={setScheduledDate}
				isThread={isThread}
				postingInterval={postingInterval}
				setPostingInterval={setPostingInterval}
				handleClearSchedule={handleClearSchedule}
			/>

			{/* Preview Modal */}
			<PreviewModal
				isOpen={showPreviewModal}
				onClose={() => setShowPreviewModal(false)}
				content={contextText || currentPost.variants[activeTab]?.text?.toString() || ""}
				selectedPlatforms={selectedPlatforms}
				accountGroup={accountGroup}
				activeTab={activeTab}
				media={currentPost.variants[activeTab]?.media?.filter(Boolean) as any[] || []} // eslint-disable-line @typescript-eslint/no-explicit-any
				isReply={seriesType === "reply"}
				isQuote={isQuoteTweet}
				replyTo={currentPost.variants[activeTab]?.replyTo}
				isThread={isThread}
				threadPosts={threadPosts}
				replyUrl={replyUrl}
			/>
		</div>
	);
}
