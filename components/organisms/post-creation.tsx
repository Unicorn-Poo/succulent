"use client";

import { Card, Text, Tabs, Button } from "@radix-ui/themes";
import {
	AlertCircle,
	Check,
	Package,
	Loader2,
	Hash,
	Clock,
	TrendingUp,
	BarChart3,
	Trash2,
	AlertTriangle,
} from "lucide-react";
import { PostFullyLoaded, GelatoProduct, ProdigiProduct } from "@/app/schema";
import { co } from "jazz-tools";
import { PreviewModal } from "./preview-modal";
import { usePostCreation } from "@/hooks/use-post-creation";
import { PostCreationHeader } from "./post-creation/post-creation-header";
import { PostActions } from "./post-creation/post-actions";
import { ReplyPanel } from "./post-creation/reply-panel";
import { PostContent } from "./post-creation/post-content";
import { ThreadPreview } from "./post-creation/thread-preview";
import { AddAccountDialog } from "./post-creation/add-account-dialog";
import { SettingsDialog } from "./post-creation/settings-dialog";
import HashtagSuggestions from "./hashtag-suggestions";
import { PlatformAuthorizationError } from "./platform-authorization-error";
import { getOptimalPostTimes, isFeatureAvailable } from "@/utils/ayrshareAnalytics";
import { useState, useEffect, useMemo, useCallback } from "react";

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

// Multi-select template selector for Gelato
const GelatoTemplateSelector = ({ 
	templates, 
	selectedTemplates, 
	onSelect, 
	className,
	loading,
	error,
	onRetry
}: { 
	templates: any[]; 
	selectedTemplates: any[]; 
	onSelect: (templates: any[]) => void; 
	className: string;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
}) => {
	if (loading) {
		return (
			<div className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
				<Loader2 className="w-4 h-4 animate-spin" />
				<Text size="2" color="gray">Loading templates from your Gelato store...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
				<Text size="2" color="red">{error}</Text>
				{onRetry && (
					<button
						onClick={onRetry}
						className="mt-2 text-sm text-lime-600 dark:text-lime-400 hover:text-lime-800 dark:text-lime-300 underline"
					>
						Try Again
					</button>
				)}
			</div>
		);
	}

	if (templates.length === 0) {
		return (
			<div className={`p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg ${className}`}>
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

	const handleTemplateToggle = (template: any) => {
		const isSelected = selectedTemplates.some(t => t.id === template.id);
		if (isSelected) {
			onSelect(selectedTemplates.filter(t => t.id !== template.id));
		} else {
			onSelect([...selectedTemplates, template]);
		}
	};

	return (
		<div className={`space-y-2 ${className}`}>
			<Text size="2" color="gray" className="block mb-2">
				Select one or more templates ({selectedTemplates.length} selected):
			</Text>
			<div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900">
				{templates.map((template: any) => {
					const isSelected = selectedTemplates.some(t => t.id === template.id);
					return (
						<label
							key={template.id}
							className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 border-b border-gray-100 last:border-b-0 ${
								isSelected ? 'bg-lime-50' : ''
							}`}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleTemplateToggle(template)}
								className="w-4 h-4 text-lime-600 dark:text-lime-400 border-gray-300 dark:border-gray-600 rounded focus:ring-lime-500"
							/>
							<div className="flex-1">
								<Text size="2" weight={isSelected ? "medium" : "regular"} className={isSelected ? "text-lime-800 dark:text-lime-300" : ""}>
									{formatTemplateTitle(template)}
								</Text>
								{template.productType && (
									<Text size="1" color="gray" className="block">
										{template.productType}
									</Text>
								)}
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
};

// Multi-select template selector for Prodigi
const ProdigiTemplateSelector = ({ 
	templates, 
	selectedTemplates, 
	onSelect, 
	className,
	loading,
	error,
	onRetry
}: { 
	templates: any[]; 
	selectedTemplates: any[]; 
	onSelect: (templates: any[]) => void; 
	className: string;
	loading?: boolean;
	error?: string | null;
	onRetry?: () => void;
}) => {
	if (loading) {
		return (
			<div className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
				<Loader2 className="w-4 h-4 animate-spin" />
				<Text size="2" color="gray">Loading templates from your Prodigi account...</Text>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
				<Text size="2" color="red">{error}</Text>
				{onRetry && (
					<button
						onClick={onRetry}
						className="mt-2 text-sm text-lime-600 dark:text-lime-400 hover:text-lime-800 dark:text-lime-300 underline"
					>
						Try Again
					</button>
				)}
			</div>
		);
	}

	if (templates.length === 0) {
		return (
			<div className={`p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg ${className}`}>
				<Text size="2" color="orange">No templates found in your Prodigi account</Text>
			</div>
		);
	}

	const handleTemplateToggle = (template: any) => {
		const isSelected = selectedTemplates.some(t => t.id === template.id);
		if (isSelected) {
			onSelect(selectedTemplates.filter(t => t.id !== template.id));
		} else {
			onSelect([...selectedTemplates, template]);
		}
	};

	return (
		<div className={`space-y-2 ${className}`}>
			<Text size="2" color="gray" className="block mb-2">
				Select one or more templates ({selectedTemplates.length} selected):
			</Text>
			<div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900">
				{templates.map((template: any) => {
					const isSelected = selectedTemplates.some(t => t.id === template.id);
					return (
						<label
							key={template.id}
							className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 border-b border-gray-100 last:border-b-0 ${
								isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
							}`}
						>
							<input
								type="checkbox"
								checked={isSelected}
								onChange={() => handleTemplateToggle(template)}
								className="w-4 h-4 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
							/>
							<div className="flex-1">
								<Text size="2" weight={isSelected ? "medium" : "regular"} className={isSelected ? "text-blue-800 dark:text-blue-300" : ""}>
									{template.displayName || template.name}
								</Text>
								{template.productType && (
									<Text size="1" color="gray" className="block">
										{template.productType}
									</Text>
								)}
							</div>
						</label>
					);
				})}
			</div>
		</div>
	);
};

export default function PostCreationComponent({ post, accountGroup }: PostCreationProps) {
	// State for post deletion
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	
	// Get account group's secure Gelato credentials
	const accountGroupGelatoCredentials = accountGroup?.gelatoCredentials;
	const isGelatoConfigured = accountGroupGelatoCredentials?.isConfigured || false;
	
	// Gelato state
	const [selectedTemplates, setSelectedTemplates] = useState<any[]>([]);
	const [showGelatoSection, setShowGelatoSection] = useState(false);
	
	// Get created products from Jazz object instead of local state
	const createdProducts = accountGroupGelatoCredentials?.createdProducts || [];
	
	// Get templates directly from Jazz collaborative data structure
	const gelatoTemplates = useMemo(() => {
		if (!accountGroupGelatoCredentials?.templates) {
			return [];
		}
		
		const filteredTemplates = accountGroupGelatoCredentials.templates
			.filter((template: any) => {
				return template && (template.gelatoTemplateId || template.name);
			});
		
		const mappedTemplates = filteredTemplates.map((template: any, index: number) => {
			const displayId = template.gelatoTemplateId || `template-${index}-${template.name?.replace(/[^a-zA-Z0-9]/g, '-')}`;
			
			return {
				id: displayId,
				gelatoTemplateId: template.gelatoTemplateId,
				name: template.name,
				displayName: template.displayName || template.name,
				productType: template.productType,
				description: template.description,
				details: template.details,
				fetchedAt: template.fetchedAt,
				isActive: template.isActive,
				tags: template.tags || [],
				availableSizes: template.availableSizes || [],
				availableColors: template.availableColors || [],
				shopifyData: template.shopifyData || {},
			};
		});
		
		return mappedTemplates;
	}, [accountGroupGelatoCredentials?.templates]);
	
	const templateError = gelatoTemplates.length === 0 && isGelatoConfigured ? 
		'No templates imported yet. Use the Settings tab to import templates by ID.' : null;

	// Set first template as default when templates are available
	useEffect(() => {
		if (gelatoTemplates.length > 0 && selectedTemplates.length === 0) {
			setSelectedTemplates([gelatoTemplates[0]]);
		}
	}, [gelatoTemplates.length, selectedTemplates.length]);

	// =============================================================================
	// 🎨 PRODIGI INTEGRATION
	// =============================================================================

	// Get account group's secure Prodigi credentials
	const accountGroupProdigiCredentials = accountGroup?.prodigiCredentials;
	const isProdigiConfigured = accountGroupProdigiCredentials?.isConfigured || false;
	
	// Prodigi state
	const [selectedProdigiTemplates, setSelectedProdigiTemplates] = useState<any[]>([]);
	const [showProdigiSection, setShowProdigiSection] = useState(false);
	
	// Get created products from Jazz object instead of local state
	const createdProdigiProducts = accountGroupProdigiCredentials?.createdProducts || [];
	
	// Get templates directly from Jazz collaborative data structure
	const prodigiTemplates = useMemo(() => {
		if (!accountGroupProdigiCredentials?.templates) {
			return [];
		}
		
		const filteredTemplates = accountGroupProdigiCredentials.templates
			.filter((template: any) => {
				return template && (template.id || template.name);
			});
		
		const mappedTemplates = filteredTemplates.map((template: any, index: number) => {
			const displayId = template.id || `template-${index}-${template.name?.replace(/[^a-zA-Z0-9]/g, '-')}`;
			
			return {
				id: displayId,
				prodigiTemplateId: template.id,
				name: template.name,
				displayName: template.displayName || template.name,
				productType: template.productType,
				description: template.description,
				details: template.details,
				variants: template.variants || [],
				printAreas: template.printAreas || [],
				fetchedAt: template.fetchedAt,
				isActive: template.isActive,
				tags: template.tags || [],
			};
		});
		
		return mappedTemplates;
	}, [accountGroupProdigiCredentials?.templates]);
	
	const prodigiTemplateError = prodigiTemplates.length === 0 && isProdigiConfigured ? 
		'No templates imported yet. Use the Settings tab to import templates from Prodigi.' : null;

	// Set first template as default when templates are available
	useEffect(() => {
		if (prodigiTemplates.length > 0 && selectedProdigiTemplates.length === 0) {
			setSelectedProdigiTemplates([prodigiTemplates[0]]);
		}
	}, [prodigiTemplates.length, selectedProdigiTemplates.length]);

	// Auto-create settings for Prodigi
	const [autoCreateProdigiOnPublish, setAutoCreateProdigiOnPublish] = useState(
		accountGroupProdigiCredentials?.autoCreateOnPublish ?? false
	);

	// Create real Prodigi products (multiple)
	const createRealProdigiProducts = async () => {
		if (!isProdigiConfigured || selectedProdigiTemplates.length === 0 || !accountGroupProdigiCredentials) {
			handleProdigiError('Missing Prodigi configuration or template selection');
			return;
		}

		try {
			// Extract media URLs using the same logic as post publishing
			const mediaArray = currentPost.variants[activeTab]?.media?.filter(Boolean) || [];
			const imageUrls = mediaArray?.map((item, index) => {
				console.log(`📷 Processing Prodigi media item ${index}:`, {
					type: item?.type,
					hasUrl: !!(item as any)?.url,
					hasImage: !!(item as any)?.image,
					hasVideo: !!(item as any)?.video
				});
				
				// Handle URL-based media from API posts
				if (item?.type === "url-image" || item?.type === "url-video") {
					const url = (item as any).url;
					console.log(`📷 Found URL media for Prodigi: ${url}`);
					return typeof url === 'string' ? url : null;
				}
				
				// Handle uploaded images - convert FileStream to proxy URL
				if (item?.type === "image" && (item as any).image) {
					const fileStream = (item as any).image;
					const fileStreamId = fileStream?.id;
					
					if (typeof fileStreamId === 'string' && fileStreamId.startsWith('co_')) {
						const proxyUrl = `https://app.succulent.social/api/media-proxy/${fileStreamId}`;
						console.log(`📷 Created proxy URL for Prodigi image: ${proxyUrl}`);
						return proxyUrl;
					} else {
						console.warn(`⚠️ Invalid FileStream ID for Prodigi image:`, fileStreamId);
						return null;
					}
				}
				
				console.log(`📷 No valid media URL for Prodigi item ${index}`);
				return null;
			}).filter((url): url is string => typeof url === 'string') || [];
			
			if (imageUrls.length === 0) {
				handleProdigiError('No images found in this post to create a product');
				return;
			}

			console.log(`📷 Final Prodigi image URLs (${imageUrls.length}):`, imageUrls);

			console.log(`📷 URLs being sent to Prodigi:`, imageUrls);

			const results = [];
			const errors = [];

			// Create products for each selected template
			for (const template of selectedProdigiTemplates) {
				try {
					const customName = customProdigiProductNames[template.id];
					const productData = {
						apiKey: accountGroupProdigiCredentials.apiKey,
						sandboxMode: accountGroupProdigiCredentials.sandboxMode,
						productId: template.prodigiTemplateId || template.id,
						template: template,
						imageUrls: imageUrls,
						post: {
							id: post.id,
							title: customName || (currentPost.variants[activeTab]?.text?.toString() || '').substring(0, 100) || `${template.displayName || template.name} Product`,
							content: currentPost.variants[activeTab]?.text?.toString() || '',
							createdAt: post._createdAt,
						},
					};

					const response = await fetch('/api/create-prodigi-product', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify(productData),
					});

					if (response.ok) {
						const result = await response.json();
						if (result.success) {
							results.push({
								...result,
								template: template,
							});
						} else {
							errors.push(`${template.displayName || template.name}: ${result.error || 'Failed to create product'}`);
						}
					} else {
						const errorData = await response.json();
						errors.push(`${template.displayName || template.name}: ${errorData.error || 'Failed to create product'}`);
					}
				} catch (templateError) {
					console.error(`Error creating Prodigi product for template ${template.id}:`, templateError);
					errors.push(`${template.displayName || template.name}: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`);
				}
			}

			// Handle results
			if (results.length > 0) {
				// Process successful results
				results.forEach(result => {
					handleProdigiProductCreated(result);
				});
				
				if (errors.length === 0) {
					// All products created successfully
					console.log(`✅ Successfully created ${results.length} Prodigi products`);
				} else {
					// Some products failed
					console.warn(`⚠️ Created ${results.length} products, but ${errors.length} failed`);
					handleProdigiError(`Some products failed to create:\n${errors.join('\n')}`);
				}
			} else {
				// All products failed
				handleProdigiError(`Failed to create any products:\n${errors.join('\n')}`);
			}
		} catch (error) {
			console.error('Error creating Prodigi product:', error);
			handleProdigiError(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	};

	// Initialize Prodigi created products if not already done
	const initializeProdigiCreatedProducts = () => {
		if (!accountGroupProdigiCredentials) return;

		if (!accountGroupProdigiCredentials.createdProducts) {
			// Initialize the createdProducts list if it doesn't exist
			accountGroupProdigiCredentials.createdProducts = co.list(ProdigiProduct).create([], {
				owner: accountGroupProdigiCredentials._owner
			});
		}
	};

	const addProdigiProductToJazz = (productData: any) => {  
		if (!accountGroupProdigiCredentials) return;

		// Ensure created products list exists
		initializeProdigiCreatedProducts();

		const prodigiProduct = ProdigiProduct.create({
			productId: productData.productId,
			title: productData.title,
			description: productData.description,
			tags: productData.tags || [],
			productType: productData.productType,
			sourcePost: {
				title: productData.sourcePost?.title || 'Untitled Post',
				variant: productData.sourcePost?.variant,
				postId: productData.sourcePost?.postId,
			},
			templateId: productData.template?.prodigiTemplateId,
			templateName: productData.template?.name,
			baseProductId: productData.baseProductId,
			status: 'created',
			createdAt: new Date(),
			lastUpdated: new Date(),
			selectedVariant: productData.selectedVariant,
			assets: productData.assets || [],
			baseCost: productData.baseCost,
			retailPrice: productData.retailPrice,
			currency: productData.currency,
		}, { owner: accountGroupProdigiCredentials.createdProducts._owner });

		accountGroupProdigiCredentials.createdProducts.push(prodigiProduct);
		return prodigiProduct;
	};

	const updateProdigiProductInJazz = (productId: string, updates: Partial<any>) => {
		const product = accountGroupProdigiCredentials?.createdProducts?.find((p: any) => p?.productId === productId);
		if (product) {
			Object.assign(product, updates);
		}
	};

	// Prodigi handlers
	const handleProdigiProductCreated = async (result: any) => {  
		try {
			// Add to Jazz collaborative object
			const prodigiProduct = addProdigiProductToJazz(result);
			
			console.log('Prodigi product created and added to Jazz:', prodigiProduct);
			
			// Handle external store integration if configured
			const externalStoreCredentials = accountGroup?.externalStore;
			if (externalStoreCredentials?.isConfigured) {
				const response = await fetch('/api/post-to-external-store', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						storeConfig: externalStoreCredentials,
						productData: {
							...result,
							prodigiProductId: result.productId,
						},
					}),
				});

				if (response.ok) {
					const storeResult = await response.json();
					if (storeResult.success) {
						updateProdigiProductInJazz(result.productId, {
							externalStoreStatus: 'synced',
							externalProductId: storeResult.productId,
							externalProductUrl: storeResult.productUrl,
							externalMessage: 'Successfully posted to external store',
						});
					} else {
						updateProdigiProductInJazz(result.productId, {
							externalStoreStatus: 'error',
							externalMessage: storeResult.error || 'Failed to post to external store',
						});
					}
				}
			}
		} catch (error) {
			console.error('Error in handleProdigiProductCreated:', error);
			handleProdigiError(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	};

	const handleProdigiError = (error: string) => {
		console.error('Prodigi product creation failed:', error);
		// You can add toast notifications here
	};

	// Update auto-create setting
	const handleAutoCreateProdigiToggle = useCallback((newValue: boolean) => {
		setAutoCreateProdigiOnPublish(newValue);
		if (accountGroupProdigiCredentials) {
			accountGroupProdigiCredentials.autoCreateOnPublish = newValue;
		}
	}, [autoCreateProdigiOnPublish, accountGroupProdigiCredentials]);

	// =============================================================================
	// 🖼️ IMAGE UTILITIES
	// =============================================================================
	
	// Note: We now use media proxy URLs directly instead of converting to data URLs
	// This is more reliable and avoids size limitations of data URLs

	// Create real Gelato products (multiple)
	const createRealGelatoProducts = async () => {
		if (!isGelatoConfigured || selectedTemplates.length === 0 || !accountGroupGelatoCredentials) {
			handleGelatoError('Missing Gelato configuration or template selection');
			return;
		}

		try {
			// Debug: Log the current post structure
			console.log(`🔍 GELATO IMAGE DEBUG - Current Post Structure:`, {
				hasVariants: !!currentPost.variants,
				activeTab,
				variantExists: !!currentPost.variants?.[activeTab],
				hasMedia: !!currentPost.variants?.[activeTab]?.media,
				mediaLength: currentPost.variants?.[activeTab]?.media?.length,
				fullVariant: currentPost.variants?.[activeTab]
			});
			
			// Extract media URLs using the same logic as post publishing
			const mediaArray = currentPost.variants[activeTab]?.media?.filter(Boolean) || [];
			console.log(`🔍 GELATO IMAGE DEBUG - Media Array:`, {
				mediaArrayLength: mediaArray.length,
				mediaArray: mediaArray.map((item, index) => ({
					index,
					type: item?.type,
					hasUrl: !!(item as any)?.url,
					hasImage: !!(item as any)?.image,
					hasVideo: !!(item as any)?.video,
					imageId: (item as any)?.image?.id,
					url: (item as any)?.url,
					fullItem: item
				}))
			});
			
			const imageUrls = mediaArray?.map((item, index) => {
				console.log(`📷 Processing Gelato media item ${index}:`, {
					type: item?.type,
					hasUrl: !!(item as any)?.url,
					hasImage: !!(item as any)?.image,
					hasVideo: !!(item as any)?.video,
					imageId: (item as any)?.image?.id,
					url: (item as any)?.url
				});
				
				// Handle URL-based media from API posts
				if (item?.type === "url-image" || item?.type === "url-video") {
					const url = (item as any).url;
					console.log(`📷 Found URL media for Gelato: ${url}`);
					return typeof url === 'string' ? url : null;
				}
				
				// Handle uploaded images - convert FileStream to proxy URL
				if (item?.type === "image" && (item as any).image) {
					const fileStream = (item as any).image;
					const fileStreamId = fileStream?.id;
					
					console.log(`📷 FileStream details:`, {
						hasFileStream: !!fileStream,
						fileStreamId,
						fileStreamType: typeof fileStreamId,
						startsWithCo: typeof fileStreamId === 'string' && fileStreamId.startsWith('co_')
					});
					
					if (typeof fileStreamId === 'string' && fileStreamId.startsWith('co_')) {
						const proxyUrl = `https://app.succulent.social/api/media-proxy/${fileStreamId}`;
						console.log(`📷 Created proxy URL for Gelato image: ${proxyUrl}`);
						return proxyUrl;
					} else {
						console.warn(`⚠️ Invalid FileStream ID for Gelato image:`, fileStreamId);
						return null;
					}
				}
				
				console.log(`📷 No valid media URL for Gelato item ${index} - type: ${item?.type}`);
				return null;
			}).filter((url): url is string => typeof url === 'string') || [];

			console.log(`🔍 GELATO IMAGE DEBUG - Extracted URLs:`, {
				imageUrlsLength: imageUrls.length,
				imageUrls: imageUrls
			});

			if (imageUrls.length === 0) {
				console.error(`❌ GELATO IMAGE DEBUG - No images found! Post structure:`, currentPost);
				handleGelatoError('No images found in this post to create products. Check that the post has uploaded images.');
				return;
			}

			console.log(`📷 Final Gelato image URLs (${imageUrls.length}):`, imageUrls);

			console.log(`🚀 Using direct URLs for Gelato: ${imageUrls.length} images`);

			const results = [];
			const errors = [];

			// Create products for each selected template
			for (const template of selectedTemplates) {
				try {
					const productTags = [
						...(template?.tags || []),
					];

					const customName = customProductNames[template.id];
					
					// Smart template suffix detection
					let templateSuffix = 'Print'; // Default
					const templateName = (template?.displayName || template?.name || '').toLowerCase();
					
					if (templateName.includes('canvas')) {
						templateSuffix = 'Canvas';
					} else if (templateName.includes('print')) {
						templateSuffix = 'Print';
					} else if (templateName.includes('poster')) {
						templateSuffix = 'Poster';
					} else if (templateName.includes('frame')) {
						templateSuffix = 'Framed Print';
					} else if (templateName.includes('mug')) {
						templateSuffix = 'Mug';
					} else if (templateName.includes('tshirt')) {
						templateSuffix = 'T-Shirt';
					} else if (templateName.includes('pillow') || templateName.includes('cushion')) {
						templateSuffix = 'Pillow';
					} else if (templateName.includes('bag')) {
						templateSuffix = 'Bag';
					} else if (templateName.includes('card')) {
						templateSuffix = 'Card';
					} else if (templateName.includes('sticker')) {
						templateSuffix = 'Sticker';
					}
					
					const finalProductTitle = customName || `${title} ${templateSuffix}` || `${template?.displayName || template?.name} - ${new Date().toLocaleDateString()}`;
					
					const productData = {
						title: finalProductTitle,
						description: template.description,
						tags: productTags,
						vendor: 'scape squared',
						productType: customProductType || template?.productType || 'Custom',
						shopifyData: {
							publishingChannels: selectedPublishingChannels,
						}
					};

					console.log(`🚀 Sending direct URLs to Gelato API for template ${template.id}:`, imageUrls);
					
					const response = await fetch('/api/create-gelato-product', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							apiKey: accountGroupGelatoCredentials.apiKey,
							storeId: accountGroupGelatoCredentials.storeId,
							templateId: template.gelatoTemplateId || template.id, // Use the real Gelato template ID
							productData: productData,
							imageUrls: imageUrls, // Use direct URLs
						}),
					});

					if (response.ok) {
						const result = await response.json();
						if (result.success) {
							results.push({
								productId: result.productId,
								product: result.product,
								template: template,
								sourcePost: {
									title: finalProductTitle, // Our custom title
									variant: activeTab
								},
								shopifyData: {
									publishingChannels: selectedPublishingChannels,
									needsShopifyManagement: isShopifyConfigured,
									// Store the actual title Gelato created for sync matching
									actualGelatoTitle: result.shopifyData?.actualGelatoTitle
								}
							});
						} else {
							errors.push(`${template.displayName || template.name}: ${result.error || 'Failed to create product'}`);
						}
					} else {
						const errorData = await response.json();
						errors.push(`${template.displayName || template.name}: ${errorData.error || 'Failed to create product'}`);
					}
				} catch (templateError) {
					console.error(`Error creating product for template ${template.id}:`, templateError);
					errors.push(`${template.displayName || template.name}: ${templateError instanceof Error ? templateError.message : 'Unknown error'}`);
				}
			}

			// Handle results
			if (results.length > 0) {
				// Process successful results
				results.forEach(result => {
					handleGelatoProductCreated(result);
				});
				
				if (errors.length === 0) {
					// All products created successfully
					console.log(`✅ Successfully created ${results.length} Gelato products`);
				} else {
					// Some products failed
					console.warn(`⚠️ Created ${results.length} products, but ${errors.length} failed`);
					handleGelatoError(`Some products failed to create:\n${errors.join('\n')}`);
				}
			} else {
				// All products failed
				handleGelatoError(`Failed to create any products:\n${errors.join('\n')}`);
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
		scheduledDate, setScheduledDate, handleScheduleDateChange,
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
		isImplicitThread,
		platformAuthErrors,
		showAuthErrorDialog,
		setShowAuthErrorDialog
	} = usePostCreation({ post, accountGroup });

	// =============================================================================
	// 📊 ANALYTICS & HASHTAG FEATURES
	// =============================================================================

	// State for hashtag suggestions
	const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
	const [showHashtagPanel, setShowHashtagPanel] = useState(false);
	
	// State for optimal timing
	const [optimalTimes, setOptimalTimes] = useState<any>(null);
	const [showOptimalTiming, setShowOptimalTiming] = useState(false);
	const [isLoadingTimes, setIsLoadingTimes] = useState(false);

	// Check if analytics features are available
	const analyticsAvailable = isFeatureAvailable('analytics');
	const profileKey = accountGroup?.ayrshareProfileKey;

	// Fetch optimal posting times
	const fetchOptimalTimes = useCallback(async () => {
		if (!analyticsAvailable || !activeTab) return;

		setIsLoadingTimes(true);
		try {
			const times = await getOptimalPostTimes(activeTab, profileKey);
			setOptimalTimes(times);
		} catch (error) {
			console.error('Failed to fetch optimal times:', error);
		} finally {
			setIsLoadingTimes(false);
		}
	}, [activeTab, profileKey, analyticsAvailable]);

	// Auto-fetch optimal times when switching platforms
	useEffect(() => {
		if (showOptimalTiming && analyticsAvailable) {
			fetchOptimalTimes();
		}
	}, [showOptimalTiming, fetchOptimalTimes, analyticsAvailable]);

	// Handle hashtag selection
	const handleHashtagsSelected = useCallback((hashtags: string[]) => {
		setSelectedHashtags(hashtags);
		
		// Auto-append hashtags to current content
		const currentText = currentPost.variants[activeTab]?.text?.toString() || '';
		const hashtagsText = hashtags.map(tag => `#${tag}`).join(' ');
		
		// Only append if not already present
		if (currentText && !currentText.includes(hashtagsText)) {
			const newContent = `${currentText}\n\n${hashtagsText}`;
			handleContentChange(newContent);
		}
	}, [activeTab, currentPost, handleContentChange]);

	// Helper function to initialize createdProducts list if it doesn't exist
	const initializeCreatedProducts = () => {
		if (!accountGroupGelatoCredentials) return;
		
		if (!accountGroupGelatoCredentials.createdProducts) {
			// Initialize the createdProducts list
			accountGroupGelatoCredentials.createdProducts = co.list(GelatoProduct).create([], {
				owner: accountGroupGelatoCredentials._owner
			});
		}
	};

	// Helper function to add a product to Jazz
	const addProductToJazz = (productData: any) => {  
		if (!accountGroupGelatoCredentials) return;
		
		// Initialize createdProducts if it doesn't exist
		initializeCreatedProducts();
		
		const gelatoProduct = GelatoProduct.create({
			productId: productData.productId,
			title: productData.sourcePost?.title || 'Untitled Product',
			description: productData.product?.description,
			tags: productData.product?.tags || [],
			productType: productData.product?.productType,
			vendor: productData.product?.vendor,
			sourcePost: {
				title: productData.sourcePost?.title || 'Untitled',
				variant: productData.sourcePost?.variant,
				postId: post.id,
			},
			templateId: productData.template?.gelatoTemplateId,
			templateName: productData.template?.name,
			status: 'created',
			createdAt: new Date(),
			lastUpdated: new Date(),
			shopifyStatus: 'pending',
			publishingChannels: productData.shopifyData?.publishingChannels || [],
			retryCount: 0,
		}, { owner: accountGroupGelatoCredentials.createdProducts._owner });
		
		accountGroupGelatoCredentials.createdProducts.push(gelatoProduct);
		return gelatoProduct;
	};

	// Helper function to update a product in Jazz
	const updateProductInJazz = (productId: string, updates: Partial<any>) => {
		const product = accountGroupGelatoCredentials?.createdProducts?.find((p: any) => p?.productId === productId);
		if (product) {
			Object.assign(product, updates);
		}
	};

	// Gelato handlers
	const handleGelatoProductCreated = async (result: any) => {  
		console.log(`🔍 SHOPIFY SYNC DEBUG - Product created:`, {
			productId: result.productId,
			hasShopifyData: !!result.shopifyData,
			needsShopifyManagement: result.shopifyData?.needsShopifyManagement,
			isShopifyConfigured,
			publishingChannels: result.shopifyData?.publishingChannels,
			willTriggerSync: !!(result.shopifyData?.needsShopifyManagement && isShopifyConfigured)
		});
		
		// Add product to Jazz object for persistence
		const createdProduct = addProductToJazz(result);
		
		// If Shopify management is needed, trigger it automatically
		if (result.shopifyData?.needsShopifyManagement && isShopifyConfigured && createdProduct) {
			console.log(`🚀 SHOPIFY SYNC DEBUG - Triggering automatic sync for product ${result.productId}`);
			handleShopifyManagement(result);
		} else {
			console.log(`⏭️ SHOPIFY SYNC DEBUG - Skipping sync:`, {
				needsManagement: result.shopifyData?.needsShopifyManagement,
				isConfigured: isShopifyConfigured,
				hasCreatedProduct: !!createdProduct
			});
		}
	};

	// Handle Shopify management for created products
			const handleShopifyManagement = async (productResult: any) => {  
		try {
			console.log(`🔄 SHOPIFY SYNC DEBUG - Starting sync for product:`, {
				productId: productResult.productId,
				productTitle: productResult.sourcePost?.title,
				publishingChannels: productResult.shopifyData?.publishingChannels
			});
			
			// Update status to syncing
			updateProductInJazz(productResult.productId, {
				shopifyStatus: 'syncing',
				shopifyMessage: 'Syncing to Shopify...',
				lastUpdated: new Date(), // Use Date object, not ISO string
			});

			const shopifyCredentials = accountGroupGelatoCredentials?.shopifyCredentials;
			const publishingChannels = productResult.shopifyData?.publishingChannels || [];

			// Validate channels
			const validChannels = publishingChannels.filter((channel: string) => 
				channel && typeof channel === 'string' && channel.trim() !== ''
			);

			console.log('Publishing channels to send:', validChannels);

			const response = await fetch('/api/manage-gelato-shopify-product', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					productId: productResult.productId,
					productTitle: productResult.shopifyData?.actualGelatoTitle || productResult.sourcePost?.title, // Use Gelato's actual title if available
					shopifyCredentials: shopifyCredentials,
					publishingChannels: validChannels,
				}),
			});

			const result = await response.json();
			
			console.log(`🔍 SHOPIFY SYNC DEBUG - API Response:`, {
				success: result.success,
				shopifyProductId: result.shopifyProductId,
				error: result.error,
				fullResult: result
			});
			
			if (result.success) {
				updateProductInJazz(productResult.productId, {
					shopifyStatus: 'synced',
					shopifyMessage: 'Successfully synced to Shopify!',
					shopifyProductId: result.shopifyProductId,
					shopifyProductUrl: `${shopifyCredentials?.storeUrl}/admin/products/${result.shopifyProductId}`,
					lastUpdated: new Date(), // Use Date object, not ISO string
				});
			} else {
				// Check if it's a partial success (product found but channels not updated)
				if (result.shopifyProductId) {
					updateProductInJazz(productResult.productId, {
						shopifyStatus: 'partial',
						shopifyMessage: result.error || 'Product synced but sales channels not updated - try retry in a few minutes',
						shopifyProductId: result.shopifyProductId,
						shopifyProductUrl: `${shopifyCredentials?.storeUrl}/admin/products/${result.shopifyProductId}`,
						lastUpdated: new Date(),
					});
				} else {
					updateProductInJazz(productResult.productId, {
						shopifyStatus: 'error',
						shopifyMessage: result.error || 'Failed to sync to Shopify',
						lastUpdated: new Date(),
					});
				}
			}
		} catch (error) {
			// Handle different types of errors
			let errorMessage = 'Sync failed: ';
			
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage += 'Network connection failed. Check your internet connection and try again.';
			} else if (error instanceof Error) {
				errorMessage += error.message;
			} else {
				errorMessage += 'Unknown error occurred';
			}
			
			updateProductInJazz(productResult.productId, {
				shopifyStatus: 'error',
				shopifyMessage: errorMessage,
				lastUpdated: new Date(),
			});
		}
	};

	const handleGelatoError = (error: string) => {
		// You can add error handling/toast notification here
		console.error('Gelato product creation failed:', error);
	};

	// Convert post to SucculentPost format for Gelato
	const convertToSucculentPost = (): any => { // Changed to any to avoid SucculentPost type conflict
		const variants: Record<string, any> = {};  
		
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
		(item: any) => item?.type === 'image'  
	) || false;

	// Enhanced Gelato product creation with Shopify integration
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	
	// Get Shopify configuration
	const shopifyConfig = accountGroupGelatoCredentials?.shopifyCredentials;
	const isShopifyConfigured = shopifyConfig?.isConfigured || false;
	const availableChannels = useMemo(() => 
		shopifyConfig?.availableChannels || [], 
		[shopifyConfig?.availableChannels]
	);
	const defaultChannels = useMemo(() => 
		shopifyConfig?.defaultPublishingChannels || ['online-store'], 
		[shopifyConfig?.defaultPublishingChannels]
	);
	
	// Initialize with saved default channels from Jazz object
	const [selectedPublishingChannels, setSelectedPublishingChannels] = useState<string[]>(defaultChannels);
	const [productTags, setProductTags] = useState<string[]>([]);
	const [customProductNames, setCustomProductNames] = useState<{[templateId: string]: string}>({});
	const [customProdigiProductNames, setCustomProdigiProductNames] = useState<{[templateId: string]: string}>({});
	const [customProductType, setCustomProductType] = useState('');
	
	// Auto-create product on publish toggle
	const [autoCreateOnPublish, setAutoCreateOnPublish] = useState(
		accountGroupGelatoCredentials?.autoCreateOnPublish ?? false
	);

	// Handle toggle with Jazz update
	const handleAutoCreateToggle = useCallback(() => {
		const newValue = !autoCreateOnPublish;
		setAutoCreateOnPublish(newValue);
		
		// Update Jazz object directly when toggling
		if (accountGroupGelatoCredentials) {
			accountGroupGelatoCredentials.autoCreateOnPublish = newValue;
		}
	}, [autoCreateOnPublish, accountGroupGelatoCredentials]);

	// Update product tags when templates change
	useEffect(() => {
		if (selectedTemplates.length > 0) {
			// Combine tags from all selected templates
			const allTags = selectedTemplates.flatMap(template => template?.tags || []);
			const uniqueTags = [...new Set(allTags)]; // Remove duplicates
			setProductTags(uniqueTags);
		} else {
			setProductTags([]); // Clear tags if no templates selected
		}
	}, [selectedTemplates]);

	// Update selected channels when default channels change
	useEffect(() => {
		setSelectedPublishingChannels(defaultChannels);
	}, [defaultChannels]);

	// Custom publish handler that includes auto-creation logic
	const handlePublishWithAutoCreate = useCallback(async () => {
		// First, publish the post using the original handler
		await handlePublishPost();
		
		// Then, if auto-create is enabled and conditions are met, create the Gelato products
		if (autoCreateOnPublish && hasImages && isGelatoConfigured && selectedTemplates.length > 0) {
			try {
				console.log('Auto-creating Gelato product after publish...');
				await createRealGelatoProducts();
			} catch (error) {
				console.error('Auto-creation failed:', error);
				// Don't fail the entire publish if auto-creation fails
			}
		}

		// Also check for Prodigi auto-creation
		if (autoCreateProdigiOnPublish && hasImages && isProdigiConfigured && selectedProdigiTemplates.length > 0) {
			try {
				console.log('Auto-creating Prodigi product after publish...');
				await createRealProdigiProducts();
			} catch (error) {
				console.error('Prodigi auto-creation failed:', error);
				// Don't fail the entire publish if auto-creation fails
			}
		}
	}, [
		handlePublishPost,
		autoCreateOnPublish,
		hasImages,
		isGelatoConfigured,
		selectedTemplates,
		createRealGelatoProducts,
		autoCreateProdigiOnPublish,
		isProdigiConfigured,
		selectedProdigiTemplates,
		createRealProdigiProducts
	]);

	// Handle post deletion
	const handleDeletePost = useCallback(async () => {
		if (!post || !accountGroup) return;
		
		setIsDeleting(true);
		try {
			// Find and remove the post from the account group's posts array
			if (accountGroup.posts) {
				const postIndex = accountGroup.posts.findIndex((p: any) => p?.id === post.id);
				if (postIndex >= 0) {
					// Remove from Jazz collaborative array
					accountGroup.posts.splice(postIndex, 1);
					console.log(`✅ Post ${post.id} deleted successfully`);
					
					// Navigate back to account group
					window.location.href = `/account-group/${accountGroup.id || 'demo'}`;
				} else {
					throw new Error('Post not found in account group');
				}
			} else {
				throw new Error('No posts array found in account group');
			}
		} catch (error) {
			console.error('❌ Failed to delete post:', error);
			alert('Failed to delete post. Please try again.');
		} finally {
			setIsDeleting(false);
			setShowDeleteDialog(false);
		}
	}, [post, accountGroup]);

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
				onDeletePost={() => setShowDeleteDialog(true)}
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
				selectedPlatforms={selectedPlatforms}
				scheduledDate={scheduledDate}
				setShowSettings={setShowSettings}
				showPublishButton={showPublishButton}
				handlePublishPost={handlePublishWithAutoCreate}
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

			{/* Created Products Management */}
			{createdProducts.length > 0 && (
				<Card>
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Package className="w-5 h-5 text-green-600 dark:text-green-400" />
								<Text weight="medium" size="3">Created Products ({createdProducts.length})</Text>
							</div>
						</div>
						
						<div className="space-y-3">
							{createdProducts.filter(Boolean).map((product: any, index: number) => (
								<div key={product?.productId || index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
												{product?.title || product?.sourcePost?.title || 'Untitled Product'}
											</div>
											<div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
												Product ID: {product?.productId || 'Unknown'}
											</div>
											<div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
												Created: {product?.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Unknown'} at {product?.createdAt ? new Date(product.createdAt).toLocaleTimeString() : 'Unknown'}
											</div>
											
											{/* Status Display */}
											<div className="flex items-center gap-2 mb-2">
												{product?.shopifyStatus === 'pending' && (
													<span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
														⏳ Gelato Created
													</span>
												)}
												{product?.shopifyStatus === 'syncing' && (
													<span className="inline-flex items-center gap-1 text-xs text-lime-600 dark:text-lime-400 bg-lime-100 dark:bg-lime-900/30 px-2 py-1 rounded-full">
														🔄 Syncing to Shopify...
													</span>
												)}
												{product?.shopifyStatus === 'synced' && (
													<span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
														✅ Shopify Synced
													</span>
												)}
												{product?.shopifyStatus === 'partial' && (
													<span className="inline-flex items-center gap-1 text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
														⚠️ Partial Sync
													</span>
												)}
												{product?.shopifyStatus === 'error' && (
													<span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
														❌ Sync Error
													</span>
												)}
											</div>
											
											{/* Status Message */}
											{product?.shopifyMessage && (
												<div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
													{product.shopifyMessage}
												</div>
											)}
											
											{/* Shopify Product Link */}
											{product?.shopifyProductId && shopifyConfig?.storeUrl && (
												<div className="mb-2">
													<a 
														href={`${shopifyConfig.storeUrl}/admin/products/${product.shopifyProductId}`}
														target="_blank"
														rel="noopener noreferrer"
														className="text-sm text-lime-600 dark:text-lime-400 hover:text-lime-800 dark:text-lime-300 underline"
													>
														View in Shopify Admin →
													</a>
												</div>
											)}
											
											{/* Template and Publishing Info */}
											<div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
												{product?.templateName && (
													<div>Template: {product.templateName}</div>
												)}
												{product?.publishingChannels?.length > 0 && (
													<div>Channels: {product.publishingChannels.join(', ')}</div>
												)}
												{product?.tags?.length > 0 && (
													<div>Tags: {product.tags.slice(0, 5).join(', ')}</div>
												)}
											</div>
										</div>
										
										{/* Action Buttons */}
										<div className="flex gap-2">
											{(product?.shopifyStatus === 'error' || product?.shopifyStatus === 'partial') && isShopifyConfigured && (
												<button
													onClick={() => {
														const productResult = {
															productId: product?.productId,
															product: {
																title: product?.title || 'Untitled Product'
															},
															title: product?.title || 'Untitled Product',
															shopifyData: {
																publishingChannels: product?.publishingChannels || defaultChannels
															}
														};
														console.log('Retry sync with channels:', product?.publishingChannels);
														handleShopifyManagement(productResult);
													}}
													className="text-xs bg-lime-500 hover:bg-lime-600 text-white px-3 py-1 rounded"
												>
													{product?.shopifyStatus === 'partial' ? 'Fix Channels' : 'Retry Sync'}
												</button>
											)}
											{product?.shopifyStatus === 'pending' && isShopifyConfigured && (
												<button
													onClick={() => {
														const productResult = {
															productId: product?.productId,
															product: {
																title: product?.title || 'Untitled Product'
															},
															title: product?.title || 'Untitled Product',
															shopifyData: {
																publishingChannels: product?.publishingChannels || defaultChannels
															}
														};
														console.log('Sync to Shopify with channels:', product?.publishingChannels);
														handleShopifyManagement(productResult);
													}}
													className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
												>
													Sync to Shopify
												</button>
											)}
											{product?.shopifyStatus === 'syncing' && (
												<button
													onClick={() => {
														updateProductInJazz(product?.productId, {
															shopifyStatus: 'error',
															shopifyMessage: 'Sync cancelled by user - product may take longer to appear in Shopify'
														});
													}}
													className="text-xs bg-gray-50 dark:bg-gray-8000 hover:bg-gray-600 text-white px-3 py-1 rounded"
												>
													Cancel Sync
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</Card>
			)}

			{/* Gelato Product Creation Section */}
			<Card>
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
																<Package className="w-5 h-5 text-lime-600 dark:text-lime-400" />
							<Text weight="medium" size="3">Auto-Create Gelato Product</Text>
							{hasImages && (
								<span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded-full">
									Images detected
								</span>
							)}
							{!hasImages && (
								<span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
									No images
								</span>
							)}
						</div>
						
						{/* Auto-Create Toggle Switch */}
						<div className="flex items-center gap-2">
							<Text size="1" color="gray">
								{autoCreateOnPublish ? 'On' : 'Off'}
							</Text>
							<button
								onClick={handleAutoCreateToggle}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${
									autoCreateOnPublish ? 'bg-lime-600' : 'bg-gray-200'
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
										autoCreateOnPublish ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
					</div>
					
					{/* Auto-Create Status */}
					<div className="space-y-3">
											<div className="text-sm text-gray-600 dark:text-gray-400">
						{autoCreateOnPublish ? (
							<div className="flex items-start gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
								<div>
									<div className="font-medium text-green-700 dark:text-green-300 mb-1">Auto-create enabled</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">
										Products will be created automatically when you publish this post
									</div>
									{hasImages && isGelatoConfigured && selectedTemplates.length > 0 && (
										<div className="text-xs text-green-600 dark:text-green-400 mt-1">
											✓ Ready - will auto-create {selectedTemplates.length} product{selectedTemplates.length > 1 ? 's' : ''}
										</div>
									)}
								</div>
							</div>
						) : (
							<div className="flex items-start gap-2">
								<div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
								<div>
									<div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-create disabled</div>
									<div className="text-xs text-gray-600 dark:text-gray-400">
										No products will be created automatically
									</div>
								</div>
							</div>
						)}
					</div>
						
						{/* Configuration Status */}
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div className="flex items-center justify-between">
								<span className="text-gray-600 dark:text-gray-400">Gelato:</span>
								<span className={`font-medium ${
									isGelatoConfigured ? 'text-green-600 dark:text-green-400' : 'text-orange-600'
								}`}>
									{isGelatoConfigured ? 'Connected' : 'Setup Required'}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-gray-600 dark:text-gray-400">Shopify:</span>
								<span className={`font-medium ${
									isShopifyConfigured ? 'text-green-600 dark:text-green-400' : 'text-orange-600'
								}`}>
									{isShopifyConfigured ? 'Connected' : 'Not Connected'}
								</span>
							</div>
						</div>
						
						{selectedTemplates.length > 0 && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-600 dark:text-gray-400">Templates:</span>
								<span className="font-medium text-gray-900 dark:text-gray-100">{selectedTemplates.length} selected</span>
							</div>
						)}
						
						{/* Warning/Setup Messages */}
						{autoCreateOnPublish && !isGelatoConfigured && (
							<div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg">
								<div className="text-sm text-orange-800">
									<strong>Setup Required:</strong> Configure Gelato credentials in Settings to enable auto-creation
								</div>
							</div>
						)}
						
						{autoCreateOnPublish && !hasImages && (
							<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
								<div className="text-sm text-yellow-800 dark:text-yellow-300">
									<strong>No Images:</strong> Add images to this post to create products automatically
								</div>
							</div>
						)}
						
						{/* Manual Create Button */}
						<div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
							<Text size="1" color="gray">
								Or create manually:
							</Text>
							<button
								onClick={() => setShowGelatoSection(!showGelatoSection)}
								className="text-sm text-lime-600 dark:text-lime-400 hover:text-lime-700 font-medium"
							>
								{showGelatoSection ? 'Hide Options' : 'Show Options'}
							</button>
						</div>
					</div>

					{showGelatoSection && (
						<div className="space-y-4">
							{/* Setup Instructions when credentials are missing */}
							{!isGelatoConfigured && (
															<div className="p-4 bg-lime-50 border border-lime-200 rounded-lg">
								<Text size="2" weight="medium" className="block mb-2 text-lime-800 dark:text-lime-300">
									🔧 Gelato Store Setup Required
								</Text>
								<Text size="2" className="block mb-3 text-lime-700">
									Connect your Gelato store to create print-on-demand products from your posts.
								</Text>
								<div className="space-y-2">
									<Text size="2" className="block text-lime-700">
										<strong>Step 1:</strong> Get your API credentials from{' '}
										<a href="https://gelato.com/developers" target="_blank" className="underline">
											gelato.com/developers
										</a>
									</Text>
									<Text size="2" className="block text-lime-700">
										<strong>Step 2:</strong> Go to the &quot;Settings&quot; tab in this account group
									</Text>
									<Text size="2" className="block text-lime-700">
										<strong>Step 3:</strong> Enter your credentials and test the connection
									</Text>
								</div>
									<div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
										<Text size="1" className="text-green-700 dark:text-green-300">
											🔐 <strong>Security:</strong> Your credentials are encrypted and stored securely in your profile
										</Text>
									</div>
								</div>
							)}

							{!hasImages && (
								<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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
										<GelatoTemplateSelector
											templates={gelatoTemplates}
											selectedTemplates={selectedTemplates}
											onSelect={setSelectedTemplates}
											className="w-full"
											error={templateError}
										/>

										{/* Enhanced Template Information */}
										{selectedTemplates.length > 0 && (
											<div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
												<Text size="2" weight="medium" className="block mb-2">
													Selected Templates ({selectedTemplates.length}):
												</Text>
												<div className="space-y-3">
													{selectedTemplates.map((template, index) => (
														<div key={template.id} className="p-2 bg-white dark:bg-gray-900 rounded border">
															<Text size="2" weight="medium" className="block mb-1">
																{template.displayName || template.name}
															</Text>
															<div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
																<div>
																	<strong>Type:</strong> {template.productType}
																</div>
																<div>
																	<strong>ID:</strong> {template.gelatoTemplateId?.substring(0, 8) || 'N/A'}...
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
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

									{/* Product Names - Individual for Each Template */}
									{selectedTemplates.length > 0 && (
										<div>
											<Text size="2" weight="medium" className="block mb-3">
												Product Names:
											</Text>
											<div className="space-y-3">
												{selectedTemplates.map((template) => (
													<div key={template.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
														<Text size="1" weight="medium" className="block mb-2">
															{template.displayName || template.name}:
														</Text>
														<input
															value={customProductNames[template.id] || ''}
															onChange={(e) => setCustomProductNames(prev => ({
																...prev,
																[template.id]: e.target.value
															}))}
															placeholder={`${template.displayName || template.name}`}
															className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
														/>
													</div>
												))}
											</div>
											<Text size="1" color="gray" className="mt-2 block">
												Leave empty to use default names based on template and date
											</Text>
										</div>
									)}

									{/* Shopify Integration Options */}
									{isShopifyConfigured && selectedTemplates.length > 0 && (
										<div className="p-3 bg-lime-50 border border-lime-200 rounded-lg">
											<div className="flex items-center justify-between mb-3">
												<Text size="2" weight="medium" className="text-lime-800 dark:text-lime-300">
													🛒 Shopify Publishing Options
												</Text>
												<button
													onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
													className="text-xs text-lime-600 dark:text-lime-400 hover:text-lime-800 dark:text-lime-300"
												>
													{showAdvancedOptions ? 'Simple' : 'Advanced'}
												</button>
											</div>

											{showAdvancedOptions && (
												<div className="space-y-3">
													{/* Publishing Channels */}
													<div>
														<Text size="1" weight="medium" className="block mb-2">
															Publishing Channels:
														</Text>
														<div className="grid grid-cols-2 gap-2">
															{availableChannels.map((channel: any) => (
																<label key={channel.id} className="flex items-center gap-2 text-xs">
																	<input
																		type="checkbox"
																		checked={selectedPublishingChannels.includes(channel.id)}
																		onChange={(e) => {
																			if (e.target.checked) {
																				setSelectedPublishingChannels(prev => [...prev, channel.id]);
																			} else {
																				setSelectedPublishingChannels(prev => prev.filter(id => id !== channel.id));
																			}
																		}}
																		className="w-3 h-3"
																	/>
																	{channel.name}
																</label>
															))}
														</div>
													</div>

													{/* Custom Product Type */}
													<div>
														<Text size="1" weight="medium" className="block mb-1">
															Product Type (Optional):
														</Text>
														<input
															value={customProductType}
															onChange={(e) => setCustomProductType(e.target.value)}
															placeholder="Custom Product"
															className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
														/>
													</div>

													{/* Additional Tags */}
													<div>
														<Text size="1" weight="medium" className="block mb-1">
															Additional Tags (comma-separated):
														</Text>
														<input
															value={productTags.join(', ')}
															onChange={(e) => setProductTags(e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
															placeholder="social-media, custom-design"
															className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
														/>
													</div>
												</div>
											)}

											{!showAdvancedOptions && (
												<div className="space-y-2">
													<Text size="1" className="text-lime-700">
														✅ Publishing to: {selectedPublishingChannels.map(id => 
															availableChannels.find((c: any) => c.id === id)?.name || id
														).join(', ') || 'Online Store'}
													</Text>
													<Text size="1" className="text-lime-700">
														🏷️ Using combined tags from selected templates
													</Text>
												</div>
											)}
										</div>
									)}

									{!isShopifyConfigured && selectedTemplates.length > 0 && (
										<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
											<Text size="2" className="text-yellow-800 dark:text-yellow-300 block mb-2">
												🔗 Shopify Integration Available
											</Text>
											<Text size="1" className="text-yellow-700 dark:text-yellow-300">
												Connect your Shopify store in Settings to automatically manage publishing channels and product metadata.
											</Text>
										</div>
									)}

									{/* Create Products Button */}
									<GelatoButton
										disabled={selectedTemplates.length === 0 || !hasImages}
										onClick={createRealGelatoProducts}
										className="w-full bg-lime-600 hover:bg-lime-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
									>
										<Package className="w-4 h-4" />
										Create {selectedTemplates.length === 1 ? selectedTemplates[0]?.displayName || selectedTemplates[0]?.name || 'Product' : `${selectedTemplates.length} Products`}
									</GelatoButton>


								</>
							)}

							{/* Demo/Test Button when not configured */}
							{!isGelatoConfigured && hasImages && (
								<GelatoButton
									disabled={false}
									onClick={() => {
																			const demoProduct = {
										id: `demo-${Date.now()}`,
										title: title || 'Demo Product',
										description: `Demo: Custom product created from social media post`,
										tags: productTags,
										vendor: 'scape squared',
										productType: 'Custom',
										status: 'demo',
										createdAt: new Date(), // Use Date object, not ISO string
										shopifyStatus: 'demo',
										shopifyMessage: 'Demo mode - product not actually created',
									};
										handleGelatoError('Please add your Gelato API credentials to create real products');
									}}
									className="w-full bg-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-8000 text-white py-3 px-4 rounded-lg font-medium"
								>
									Demo Mode - Add API Key to Create Real Products
								</GelatoButton>
							)}
						</div>
					)}
				</div>
			</Card>
			
			{/* Prodigi Product Creation Section */}
			<Card>
				<div className="p-4 space-y-4">
					<div className="flex items-center justify-between">
						<Text weight="medium" size="3">Auto-Create Prodigi Product</Text>
						<label className="flex items-center gap-2">
							<input
								type="checkbox"
								checked={autoCreateProdigiOnPublish}
								onChange={(e) => handleAutoCreateProdigiToggle(e.target.checked)}
								className="w-4 h-4"
							/>
							<Text size="2">Auto-create on publish</Text>
						</label>
					</div>

					{/* Integration Status */}
					<div className="grid grid-cols-2 gap-4">
						<div className="flex items-center gap-2">
							<div className={`w-2 h-2 rounded-full ${
								isProdigiConfigured ? 'bg-green-500' : 'bg-orange-500'
							}`}></div>
							<Text size="2" className={
								isProdigiConfigured ? 'text-green-600 dark:text-green-400' : 'text-orange-600'
							}>
								<span className="text-gray-600 dark:text-gray-400">Prodigi:</span>
							</Text>
							<Text size="2" className={
								isProdigiConfigured ? 'text-green-600 dark:text-green-400' : 'text-orange-600'
							}>
								{isProdigiConfigured ? 'Connected' : 'Setup Required'}
							</Text>
						</div>

						<div className="flex items-center gap-2">
							<div className={`w-2 h-2 rounded-full ${
								currentPost.variants[activeTab]?.media?.some((m: any) => m?.type === 'image') ? 'bg-green-500' : 'bg-gray-400'
							}`}></div>
							<Text size="2">
								<span className="text-gray-600 dark:text-gray-400">Images:</span>
							</Text>
							<Text size="2">
								{currentPost.variants[activeTab]?.media?.filter((m: any) => m?.type === 'image')?.length || 0} found
							</Text>
						</div>
					</div>

					{/* Warning Messages */}
					{autoCreateProdigiOnPublish && !isProdigiConfigured && (
						<div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg">
							<Text size="2" color="orange">
								<strong>Setup Required:</strong> Configure Prodigi credentials in Settings to enable auto-creation
							</Text>
						</div>
					)}

					{/* Prodigi Options */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Text size="2" weight="medium">Product Creation Options</Text>
							<button
								onClick={() => setShowProdigiSection(!showProdigiSection)}
								className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300"
							>
								{showProdigiSection ? 'Hide Options' : 'Show Options'}
							</button>
						</div>

						{showProdigiSection && (
							<div className="space-y-4">
								{!isProdigiConfigured && (
									<div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
										<Text size="2" weight="medium" className="block mb-2">
											🔧 Prodigi Store Setup Required
										</Text>
										<Text size="2" color="gray" className="block mb-3">
											Connect your Prodigi store to create print-on-demand products from your posts.
										</Text>
										<Text size="1" color="gray" className="block">
											Setup your Prodigi credentials in the Settings tab to get started.
										</Text>
									</div>
								)}

								{!hasImages && (
									<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
										<Text size="2" weight="medium" className="block mb-1">
											⚠️ This post doesn&apos;t have any images. Add images to create Prodigi products.
										</Text>
									</div>
								)}

								{/* Template Selection */}
								{isProdigiConfigured && (
									<>
										<div>
											<Text size="2" weight="medium" className="block mb-2">
												Choose Product Templates:
											</Text>
											<ProdigiTemplateSelector
												templates={prodigiTemplates}
												selectedTemplates={selectedProdigiTemplates}
												onSelect={setSelectedProdigiTemplates}
												className="w-full"
												loading={false}
												error={prodigiTemplateError}
												onRetry={() => {
													// You can add a retry mechanism here
												}}
											/>
										</div>

										{/* Template Details */}
										{selectedProdigiTemplates.length > 0 && (
											<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
												<Text size="2" weight="medium" className="block mb-2">
													Selected Templates ({selectedProdigiTemplates.length}):
												</Text>
												<div className="space-y-3">
													{selectedProdigiTemplates.map((template) => (
														<div key={template.id} className="p-2 bg-white dark:bg-gray-900 rounded border">
															<Text size="2" weight="medium" className="block mb-1">
																{template.displayName || template.name}
															</Text>
															<div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
																<div>
																	<strong>Type:</strong> {template.productType}
																</div>
																<div>
																	<strong>ID:</strong> {template.prodigiTemplateId?.substring(0, 8) || 'N/A'}...
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Product Names - Individual for Each Prodigi Template */}
										{selectedProdigiTemplates.length > 0 && (
											<div className="mt-3">
												<Text size="2" weight="medium" className="block mb-3">
													Product Names:
												</Text>
												<div className="space-y-3">
													{selectedProdigiTemplates.map((template) => (
														<div key={template.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
															<Text size="1" weight="medium" className="block mb-2">
																{template.displayName || template.name}:
															</Text>
															<input
																value={customProdigiProductNames[template.id] || ''}
																onChange={(e) => setCustomProdigiProductNames(prev => ({
																	...prev,
																	[template.id]: e.target.value
																}))}
																placeholder={`${template.displayName || template.name} - ${new Date().toLocaleDateString()}`}
																className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
													))}
												</div>
												<Text size="1" color="gray" className="mt-2 block">
													Leave empty to use default names based on template and date
												</Text>
											</div>
										)}

										{/* Platform Variant Selection */}
										<div>
											<Text size="2" weight="medium" className="block mb-2">
												Platform Variant:
											</Text>
											<Text size="2" color="gray" className="block mb-1">
												Using: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
											</Text>
										</div>

										{/* External Store Integration Options */}
										{accountGroup?.externalStore?.isConfigured && selectedProdigiTemplates.length > 0 && (
											<div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
												<Text size="2" weight="medium" className="text-purple-800 dark:text-purple-300">
													🛒 External Store Publishing
												</Text>
												<Text size="1" color="gray" className="block mt-1">
													Products will be automatically posted to your connected external store.
												</Text>
											</div>
										)}

										{/* Create Product Button */}
										<button
											disabled={selectedProdigiTemplates.length === 0 || !hasImages}
											onClick={createRealProdigiProducts}
											className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
										>
											<Package className="w-4 h-4" />
											Create {selectedProdigiTemplates.length === 1 ? selectedProdigiTemplates[0]?.displayName || selectedProdigiTemplates[0]?.name || 'Product' : `${selectedProdigiTemplates.length} Products`}
										</button>
									</>
								)}

								{/* Demo/Test Button when not configured */}
								{!isProdigiConfigured && hasImages && (
									<button
										onClick={() => {
											handleProdigiError('Please add your Prodigi API credentials to create real products');
										}}
										className="w-full bg-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-8000 text-white py-3 px-4 rounded-lg font-medium"
									>
										Demo Mode - Add API Key to Create Real Products
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</Card>

			{/* Analytics Features */}
			{analyticsAvailable && (
				<Card>
					<div className="p-4">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
								<Text weight="medium" size="3">Content Optimization</Text>
							</div>
						</div>

						<Tabs.Root defaultValue="hashtags">
							<Tabs.List>
								<Tabs.Trigger value="hashtags">
									<Hash className="w-4 h-4 mr-2" />
									Hashtag Suggestions
								</Tabs.Trigger>
								<Tabs.Trigger value="timing">
									<Clock className="w-4 h-4 mr-2" />
									Optimal Timing
								</Tabs.Trigger>
							</Tabs.List>

							<div className="mt-4">
								<Tabs.Content value="hashtags">
									<HashtagSuggestions
										content={currentPost.variants[activeTab]?.text?.toString() || ''}
										platform={activeTab}
										profileKey={profileKey}
										onHashtagsSelected={handleHashtagsSelected}
									/>
								</Tabs.Content>

								<Tabs.Content value="timing">
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<Text size="3" weight="medium">Optimal Posting Times</Text>
											<button
												onClick={fetchOptimalTimes}
												disabled={isLoadingTimes}
												className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm hover:bg-blue-100 dark:bg-blue-900/30 disabled:opacity-50"
											>
												{isLoadingTimes ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<TrendingUp className="w-4 h-4" />
												)}
												{isLoadingTimes ? 'Loading...' : 'Refresh'}
											</button>
										</div>

										{optimalTimes ? (
											<div className="space-y-3">
												<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
													<Text size="2" weight="medium" className="block mb-2">
														Best times for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
													</Text>
													<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
														{optimalTimes.times?.slice(0, 8).map((time: string, index: number) => (
															<div key={index} className="bg-white dark:bg-gray-900 p-2 rounded text-center border">
																<Text size="1" weight="medium">{time}</Text>
															</div>
														))}
													</div>
													<Text size="1" color="gray" className="block mt-2">
														Times shown in your local timezone
													</Text>
												</div>

												{optimalTimes.engagement && (
													<div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
														<Text size="2" weight="medium" className="block mb-1">
															Average Engagement
														</Text>
														<Text size="3" className="text-green-700 dark:text-green-300 font-bold">
															{optimalTimes.engagement.toFixed(1)}%
														</Text>
														<Text size="1" color="gray">
															Expected engagement rate for optimal times
														</Text>
													</div>
												)}
											</div>
										) : (
											<div className="text-center py-8">
												<Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
												<Text size="2" color="gray">
													{isLoadingTimes ? 'Analyzing your posting patterns...' : 'Click refresh to get optimal posting times'}
												</Text>
											</div>
										)}
									</div>
								</Tabs.Content>
							</div>
						</Tabs.Root>
					</div>
				</Card>
			)}

			{/* Analytics Upgrade Prompt */}
			{!analyticsAvailable && (
				<Card>
					<div className="p-4 text-center space-y-3">
						<BarChart3 className="w-8 h-8 text-gray-400 mx-auto" />
						<div>
							<Text size="3" weight="medium" className="block">Content Optimization Features</Text>
							<Text size="2" color="gray" className="block mt-1">
								Get AI-powered hashtag suggestions and optimal posting times
							</Text>
						</div>
						<button
							onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
						>
							Upgrade to Business Plan
						</button>
					</div>
				</Card>
			)}
			
			{/* Status Messages */}
			{errors.length > 0 && (
				<Card>
					<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						<div className="flex items-center gap-2 mb-2">
							<AlertCircle className="w-4 h-4 text-red-500" />
							<Text weight="medium" color="red">Errors</Text>
						</div>
						<ul className="space-y-1">
							{errors.map((error, index) => (
								<li key={index} className="text-sm text-red-600 dark:text-red-400">• {error}</li>
							))}
						</ul>
					</div>
				</Card>
			)}

			{success && (
				<Card>
					<div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
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
				setScheduledDate={handleScheduleDateChange}
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
				media={currentPost.variants[activeTab]?.media?.filter(Boolean) as any[] || []}  
				variants={currentPost.variants as Record<string, any>}
				isReply={seriesType === "reply"}
				isQuote={isQuoteTweet}
				replyTo={currentPost.variants[activeTab]?.replyTo}
				isThread={isThread}
				threadPosts={threadPosts}
				replyUrl={replyUrl}
			/>

			{/* Platform Authorization Error Dialog */}
			{showAuthErrorDialog && platformAuthErrors.length > 0 && (
				<PlatformAuthorizationError
					errors={platformAuthErrors}
					onClose={() => setShowAuthErrorDialog(false)}
					onRetry={handlePublishPost}
				/>
			)}

			{/* Delete Confirmation Dialog */}
			{showDeleteDialog && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-900 dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 dark:bg-red-900/20 rounded-full flex items-center justify-center">
								<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
							</div>
							<div>
								<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
									Delete Post
								</h3>
								<p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
									This action cannot be undone
								</p>
							</div>
						</div>
						
						<p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-6">
							Are you sure you want to delete &quot;{title || 'Untitled Post'}&quot;? This will permanently remove the post and all its content.
						</p>
						
						<div className="flex gap-3 justify-end">
							<Button
								variant="soft"
								onClick={() => setShowDeleteDialog(false)}
								disabled={isDeleting}
							>
								Cancel
							</Button>
							<Button
								onClick={handleDeletePost}
								disabled={isDeleting}
								className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
							>
								{isDeleting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Deleting...
									</>
								) : (
									<>
										<Trash2 className="w-4 h-4" />
										Delete Post
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
