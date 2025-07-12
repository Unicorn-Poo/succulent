"use client";

import { Card, Text } from "@radix-ui/themes";
import {
	AlertCircle,
	Check,
	Package,
	Loader2,
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
import { useState, useEffect, useMemo } from "react";

interface PostCreationProps {
	post: PostFullyLoaded;
	accountGroup: any; // Account group with Gelato credentials
}

// Simple inline Gelato button to avoid React hook conflicts
const GelatoButton = ({ 
	disabled, 
	onClick, 
	children, 
	className 
}: { 
	disabled: boolean; 
	onClick: () => void; 
	children: React.ReactNode; 
	className: string 
}) => {
	const [loading, setLoading] = useState(false);

	const handleClick = async () => {
		setLoading(true);
		try {
			await onClick();
		} finally {
			setLoading(false);
		}
	};

	return (
		<button
			onClick={handleClick}
			disabled={disabled || loading}
			className={className}
		>
			{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
			{children}
		</button>
	);
};

// Simple template selector
const TemplateSelector = ({ 
	templates, 
	selectedTemplate, 
	onSelect, 
	className,
	loading,
	error,
	onRetry
}: { 
	templates: any[]; 
	selectedTemplate: any; 
	onSelect: (template: any) => void; 
	className: string;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
}) => {
	if (loading) {
		return (
			<div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg ${className}`}>
				<Loader2 className="w-4 h-4 animate-spin" />
				<Text size="2" color="gray">Loading templates from your Gelato store...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
				<Text size="2" color="red">{error}</Text>
				{onRetry && (
					<button
						onClick={onRetry}
						className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
					>
						Try Again
					</button>
				)}
			</div>
		);
	}

	if (templates.length === 0) {
		return (
			<div className={`p-3 bg-yellow-50 border border-yellow-200 rounded-lg ${className}`}>
				<Text size="2" color="orange">No templates found in your Gelato store</Text>
			</div>
		);
	}

	const formatTemplateTitle = (template: any) => {
		// Extract meaningful name from displayName or name
		let primaryName = template.displayName || template.name || `Template ${template.id}`;
		
		// Transform common patterns to more user-friendly names
		primaryName = primaryName
			.replace(/^.*([Xx]-scape|[Xx]scape).*print.*$/i, 'X-Scape Print')
			.replace(/^.*canvas.*$/i, 'Canvas')
			.replace(/^.*poster.*$/i, 'Poster')
			.replace(/^.*t-shirt.*$/i, 'T-Shirt')
			.replace(/^.*tshirt.*$/i, 'T-Shirt')
			.replace(/^.*hoodie.*$/i, 'Hoodie')
			.replace(/^.*mug.*$/i, 'Mug')
			.replace(/^.*tote.*bag.*$/i, 'Tote Bag')
			.replace(/^.*phone.*case.*$/i, 'Phone Case');
			
		// Add meaningful details if available (skip "Unknown" values)
		const details = [];
		if (template.details?.size && template.details.size !== 'Unknown') {
			details.push(template.details.size);
		}
		if (template.details?.material && template.details.material !== 'Unknown') {
			details.push(template.details.material);
		}
		if (template.details?.color && template.details.color !== 'Unknown') {
			details.push(template.details.color);
		}
		if (template.details?.orientation && template.details.orientation !== 'Unknown') {
			details.push(template.details.orientation);
		}
		
		// Capitalize product type for better readability, but skip generic types
		const productType = template.productType && 
			!['unknown', 'c-type', 'template'].includes(template.productType.toLowerCase()) ? 
			template.productType.charAt(0).toUpperCase() + template.productType.slice(1) : 
			null;
			
		// Format: "Primary Name (Size, Material) - Product Type" or variations
		let formattedTitle = primaryName;
		
		if (details.length > 0) {
			formattedTitle += ` (${details.join(', ')})`;
		}
		
		if (productType && !primaryName.toLowerCase().includes(productType.toLowerCase())) {
			formattedTitle += ` - ${productType}`;
		}
		
		return formattedTitle;
	};

	return (
		<select
			value={selectedTemplate?.id || ''}
			onChange={(e) => {
				const template = templates.find((t: any) => t.id === e.target.value);
				if (template) onSelect(template);
			}}
			className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
		>
			<option value="">Select a template...</option>
			{templates.map((template: any) => (
				<option key={template.id} value={template.id}>
					{formatTemplateTitle(template)}
				</option>
			))}
		</select>
	);
};

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
	// Get account group's secure Gelato credentials
	const accountGroupGelatoCredentials = accountGroup?.gelatoCredentials;
	const isGelatoConfigured = accountGroupGelatoCredentials?.isConfigured || false;
	
	// Gelato state
	const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
	const [gelatoProducts, setGelatoProducts] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
	const [showGelatoSection, setShowGelatoSection] = useState(false);
	
	// Get templates directly from Jazz collaborative data structure
	const gelatoTemplates = useMemo(() => {
		console.log('Post-creation: Processing templates...');
		console.log('Post-creation: accountGroupGelatoCredentials?.templates:', accountGroupGelatoCredentials?.templates);
		
		if (!accountGroupGelatoCredentials?.templates) {
			console.log('Post-creation: No templates found');
			return [];
		}
		
		// DEBUG: Let's see the raw templates from Jazz
		console.log('Post-creation: Raw templates from Jazz:', accountGroupGelatoCredentials.templates);
		console.log('Post-creation: Templates count:', accountGroupGelatoCredentials.templates.length);
		
		accountGroupGelatoCredentials.templates.forEach((template: any, index: number) => {
			console.log(`Post-creation: Jazz Template ${index}:`, {
				fullObject: template,
				gelatoTemplateId: template.gelatoTemplateId,
				name: template.name,
				allKeys: Object.keys(template),
				hasGelatoTemplateId: !!template.gelatoTemplateId
			});
		});
		
		const filteredTemplates = accountGroupGelatoCredentials.templates
			.filter((template: any) => {
				// Check for both new and potentially old template structures
				const hasId = template && (template.gelatoTemplateId || template.name);
				console.log('Post-creation: Template filter check:', { 
					template, 
					hasId,
					gelatoTemplateId: template?.gelatoTemplateId,
					name: template?.name 
				});
				return hasId;
			});
			
		console.log('Post-creation: Filtered templates:', filteredTemplates);
		
		const mappedTemplates = filteredTemplates.map((template: any, index: number) => {
			// DEBUG: Show all template properties
			console.log(`Post-creation: Template ${index} raw data:`, JSON.stringify(template, null, 2));
			console.log(`Post-creation: Template ${index} gelatoTemplateId:`, template.gelatoTemplateId);
			console.log(`Post-creation: Template ${index} name:`, template.name);
			console.log(`Post-creation: Template ${index} all keys:`, Object.keys(template));
			
			// For the dropdown, we can use a display-friendly ID, but we need to keep the real gelatoTemplateId
			const displayId = template.gelatoTemplateId || `template-${index}-${template.name?.replace(/[^a-zA-Z0-9]/g, '-')}`;
			
			console.log(`Post-creation: Template ${index} display ID will be:`, displayId);
			console.log(`Post-creation: Template ${index} gelato template ID:`, template.gelatoTemplateId);
			console.log(`Post-creation: Template ${index} used fallback?`, !template.gelatoTemplateId);
			
			const mapped = {
				id: displayId, // For dropdown display and selection
				gelatoTemplateId: template.gelatoTemplateId, // The REAL Gelato template ID for API calls
				name: template.name,
				displayName: template.displayName || template.name,
				productType: template.productType,
				description: template.description,
				details: template.details,
				fetchedAt: template.fetchedAt,
				isActive: template.isActive,
				// DEBUG: Add raw template data for inspection
				_debug: {
					originalTemplate: template,
					hasGelatoTemplateId: !!template.gelatoTemplateId,
					gelatoTemplateId: template.gelatoTemplateId,
					usingFallback: !template.gelatoTemplateId
				}
			};
			console.log('Post-creation: Mapped template:', mapped);
			return mapped;
		});
		
		console.log('Post-creation: Final mapped templates:', mappedTemplates);
		return mappedTemplates;
	}, [accountGroupGelatoCredentials?.templates]);
	
	const templateError = gelatoTemplates.length === 0 && isGelatoConfigured ? 
		'No templates imported yet. Use the Settings tab to import templates by ID.' : null;

	// Set first template as default when templates are available
	useEffect(() => {
		if (gelatoTemplates.length > 0 && !selectedTemplate) {
			setSelectedTemplate(gelatoTemplates[0]);
		}
	}, [gelatoTemplates, selectedTemplate]);

	// Convert Jazz images to data URLs for direct use in Gelato API
	const convertImagesToDataUrls = async (media: any[]): Promise<string[]> => {
		const imageUrls: string[] = [];
		
		for (const mediaItem of media) {
			if (mediaItem?.type === 'image' && mediaItem.image) {
				try {
					// Get blob from Jazz FileStream
					let blob = null;
					
					if (typeof mediaItem.image.getBlob === 'function') {
						blob = await mediaItem.image.getBlob();
					} else if (typeof mediaItem.image.toBlob === 'function') {
						blob = await mediaItem.image.toBlob();
					}
					
					if (blob) {
						// Convert blob to data URL for direct use
						const dataUrl = await new Promise<string>((resolve) => {
							const reader = new FileReader();
							reader.onload = (e) => resolve(e.target?.result as string);
							reader.readAsDataURL(blob);
						});
						
						imageUrls.push(dataUrl);
						console.log('Converted Jazz image to data URL');
					}
				} catch (error) {
					console.error('Error converting image:', error);
				}
			}
		}
		
		return imageUrls;
	};

	// Create real Gelato product
	const createRealGelatoProduct = async () => {
		if (!isGelatoConfigured || !selectedTemplate || !accountGroupGelatoCredentials) {
			handleGelatoError('Missing Gelato configuration or template selection');
			return;
		}

		try {
			// Convert Jazz images to data URLs for Gelato API
			const mediaArray = currentPost.variants[activeTab]?.media?.filter(Boolean) || [];
			const imageUrls = await convertImagesToDataUrls(mediaArray);

			if (imageUrls.length === 0) {
				handleGelatoError('No images found in this post to create a product');
				return;
			}

			const productData = {
				title: title || 'Succulent Social Media Product',
				description: `Custom ${selectedTemplate.displayName || selectedTemplate.name || 'product'} created from social media post: "${title || 'Untitled Post'}"`,
				currency: 'USD',
			};

			console.log('Creating product with data:', {
				apiKey: accountGroupGelatoCredentials.apiKey ? '***' : 'missing',
				storeId: accountGroupGelatoCredentials.storeId,
				templateId: selectedTemplate.gelatoTemplateId || selectedTemplate.id,
				productData: productData,
				imageUrls: imageUrls?.length || 0,
			});

			const response = await fetch('/api/create-gelato-product', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: accountGroupGelatoCredentials.apiKey,
					storeId: accountGroupGelatoCredentials.storeId,
					templateId: selectedTemplate.gelatoTemplateId || selectedTemplate.id, // Use the real Gelato template ID
					productData: productData,
					imageUrls: imageUrls,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					handleGelatoProductCreated({
						productId: result.productId,
						product: result.product,
						template: selectedTemplate,
						sourcePost: {
							title: title || 'Untitled Post',
							variant: activeTab
						}
					});
				} else {
					handleGelatoError(result.error || 'Failed to create product');
				}
			} else {
				const errorData = await response.json();
				handleGelatoError(errorData.error || 'Failed to create product');
			}
		} catch (error) {
			console.error('Error creating Gelato product:', error);
			handleGelatoError(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	};

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
	const convertToSucculentPost = (): any => { // Changed to any to avoid SucculentPost type conflict
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
							{/* Setup Instructions when credentials are missing */}
							{!isGelatoConfigured && (
								<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
									<Text size="2" weight="medium" className="block mb-2 text-blue-800">
										🔧 Gelato Store Setup Required
									</Text>
									<Text size="2" className="block mb-3 text-blue-700">
										Connect your Gelato store to create print-on-demand products from your posts.
									</Text>
									<div className="space-y-2">
										<Text size="2" className="block text-blue-700">
											<strong>Step 1:</strong> Get your API credentials from{' '}
											<a href="https://gelato.com/developers" target="_blank" className="underline">
												gelato.com/developers
											</a>
										</Text>
										<Text size="2" className="block text-blue-700">
											<strong>Step 2:</strong> Go to the "Settings" tab in this account group
										</Text>
										<Text size="2" className="block text-blue-700">
											<strong>Step 3:</strong> Enter your credentials and test the connection
										</Text>
									</div>
									<div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
										<Text size="1" className="text-green-700">
											🔐 <strong>Security:</strong> Your credentials are encrypted and stored securely in your profile
										</Text>
									</div>
								</div>
							)}

							{!hasImages && (
								<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<Text size="2" color="orange">
										⚠️ This post doesn&apos;t have any images. Add images to create Gelato products.
									</Text>
								</div>
							)}

							{hasImages && isGelatoConfigured && (
								<>
									{/* Template Selection */}
									<div>
										<Text size="2" weight="medium" className="block mb-2">
											Choose Product Template:
										</Text>
																			<TemplateSelector
										templates={gelatoTemplates}
										selectedTemplate={selectedTemplate}
										onSelect={setSelectedTemplate}
										className="w-full"
										error={templateError}
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
										disabled={!selectedTemplate || !hasImages}
										onClick={createRealGelatoProduct}
										className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									>
										<Package className="w-4 h-4" />
										Create {selectedTemplate?.displayName || selectedTemplate?.name || 'Product'}
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

							{/* Demo/Test Button when not configured */}
							{!isGelatoConfigured && hasImages && (
								<GelatoButton
									disabled={false}
									onClick={() => {
										console.log('Demo: Would create Gelato product with:', {
											post: convertToSucculentPost(),
											template: selectedTemplate,
											variant: activeTab
										});
										handleGelatoError('Please add your Gelato API credentials to create real products');
									}}
									className="w-full bg-gray-400 hover:bg-gray-500 text-white py-3 px-4 rounded-lg font-medium"
								>
									Demo Mode - Add API Key to Create Real Products
								</GelatoButton>
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
