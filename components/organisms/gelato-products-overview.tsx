"use client";

import { Card, Text } from "@radix-ui/themes";
import { Package, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { useState } from "react";

interface GelatoProductsOverviewProps {
	accountGroup: any; // Account group with Gelato credentials
}

export default function GelatoProductsOverview({ accountGroup }: GelatoProductsOverviewProps) {
	const [retryingProducts, setRetryingProducts] = useState<Set<string>>(new Set());
	
	const gelatoCredentials = accountGroup?.gelatoCredentials;
	const createdProducts = gelatoCredentials?.createdProducts || [];
	const shopifyConfig = gelatoCredentials?.shopifyCredentials;
	const isShopifyConfigured = shopifyConfig?.isConfigured || false;

	// Helper function to retry Shopify sync
	const retryShopifySync = async (productId: string, publishingChannels: string[]) => {
		setRetryingProducts(prev => new Set(prev).add(productId));
		
		try {
			const response = await fetch('/api/manage-gelato-shopify-product', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					productId,
					shopifyCredentials: {
						storeUrl: shopifyConfig?.storeUrl,
						accessToken: shopifyConfig?.accessToken,
					},
					publishingChannels: publishingChannels || [],
					maxRetries: 5,
					retryDelay: 30000,
				}),
			});

			const result = await response.json();
			
			if (result.success) {
				// Update the product in Jazz object
				const product = createdProducts.find((p: any) => p?.productId === productId);
				if (product) {
					product.shopifyStatus = 'synced';
					product.shopifyProductId = result.shopifyProductId;
					product.shopifyMessage = result.message;
					product.channelsUpdated = result.channelsUpdated;
					product.lastUpdated = new Date();
				}
			} else {
				// Update with error
				const product = createdProducts.find((p: any) => p?.productId === productId);
				if (product) {
					product.shopifyStatus = 'error';
					product.shopifyMessage = result.error || 'Failed to sync';
					product.lastUpdated = new Date();
				}
			}
		} catch (error) {
			console.error('Error retrying Shopify sync:', error);
			const product = createdProducts.find((p: any) => p?.productId === productId);
			if (product) {
				product.shopifyStatus = 'error';
				product.shopifyMessage = 'Failed to connect to sync service';
				product.lastUpdated = new Date();
			}
		} finally {
			setRetryingProducts(prev => {
				const next = new Set(prev);
				next.delete(productId);
				return next;
			});
		}
	};

	// Helper function to get status icon and color
	const getStatusDisplay = (status: string) => {
		switch (status) {
			case 'pending':
				return {
					icon: <Clock className="w-4 h-4" />,
					label: 'Gelato Created',
					color: 'text-gray-600 bg-gray-100'
				};
			case 'syncing':
				return {
					icon: <RefreshCw className="w-4 h-4 animate-spin" />,
					label: 'Syncing...',
					color: 'text-lime-600 bg-lime-100'
				};
			case 'synced':
				return {
					icon: <CheckCircle className="w-4 h-4" />,
					label: 'Shopify Synced',
					color: 'text-green-600 bg-green-100'
				};
			case 'error':
				return {
					icon: <AlertCircle className="w-4 h-4" />,
					label: 'Sync Error',
					color: 'text-red-600 bg-red-100'
				};
			default:
				return {
					icon: <Package className="w-4 h-4" />,
					label: 'Unknown',
					color: 'text-gray-600 bg-gray-100'
				};
		}
	};

	if (!gelatoCredentials || !gelatoCredentials.isConfigured) {
		return (
			<Card>
				<div className="p-6">
					<div className="flex items-center gap-2 mb-4">
						<Package className="w-5 h-5 text-gray-400" />
						<Text weight="medium" size="3">Gelato Products</Text>
					</div>
					<div className="text-center py-6">
						<Text size="2" color="gray">
							Configure your Gelato integration to track created products
						</Text>
					</div>
				</div>
			</Card>
		);
	}

	if (createdProducts.length === 0) {
		return (
			<Card>
				<div className="p-6">
					<div className="flex items-center gap-2 mb-4">
						<Package className="w-5 h-5 text-green-600" />
						<Text weight="medium" size="3">Gelato Products</Text>
					</div>
					<div className="text-center py-6">
						<Text size="2" color="gray">
							No products created yet. Create your first product from a post!
						</Text>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<Card>
			<div className="p-6">
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2">
						<Package className="w-5 h-5 text-green-600" />
						<Text weight="medium" size="3">Gelato Products ({createdProducts.length})</Text>
					</div>
					<div className="flex items-center gap-2">
						{isShopifyConfigured && (
							<div className="flex items-center gap-1 text-xs text-green-600">
								<CheckCircle className="w-3 h-3" />
								Shopify Connected
							</div>
						)}
					</div>
				</div>

				<div className="space-y-4">
					{createdProducts.map((product: any, index: number) => {
						const statusDisplay = getStatusDisplay(product?.shopifyStatus || 'pending');
						const isRetrying = retryingProducts.has(product?.productId);

						return (
							<div key={product?.productId || index} className="bg-gray-50 p-4 rounded-lg border">
								<div className="flex items-start justify-between">
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-2">
											<Text weight="medium" size="2">
												{product?.title || product?.sourcePost?.title || 'Untitled Product'}
											</Text>
											<span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusDisplay.color}`}>
												{statusDisplay.icon}
												{statusDisplay.label}
											</span>
										</div>
										
										<div className="text-sm text-gray-600 space-y-1">
											<div>Product ID: {product?.productId || 'Unknown'}</div>
											<div>
												Created: {product?.createdAt ? new Date(product.createdAt).toLocaleString() : 'Unknown'}
											</div>
											{product?.templateName && (
												<div>Template: {product.templateName}</div>
											)}
											{product?.tags && product.tags.length > 0 && (
												<div>Tags: {product.tags.join(', ')}</div>
											)}
										</div>

										{/* Status Message */}
										{product?.shopifyMessage && (
											<div className="mt-2 text-sm text-gray-600 bg-white p-2 rounded border">
												{product.shopifyMessage}
											</div>
										)}

										{/* Shopify Product Link */}
										{product?.shopifyProductId && shopifyConfig?.storeUrl && (
											<div className="mt-2">
												<a 
													href={`${shopifyConfig.storeUrl}/admin/products/${product.shopifyProductId}`}
													target="_blank"
													rel="noopener noreferrer"
													className="text-sm text-lime-600 hover:text-lime-800 underline"
												>
													View in Shopify Admin →
												</a>
											</div>
										)}
									</div>

									{/* Action Button */}
									{((product?.shopifyStatus === 'error' || product?.shopifyStatus === 'pending') && isShopifyConfigured) && (
										<button
											onClick={() => retryShopifySync(product?.productId, product?.publishingChannels || [])}
											disabled={isRetrying}
											className="ml-4 flex items-center gap-1 text-xs bg-lime-500 hover:bg-lime-600 disabled:bg-gray-400 text-white px-3 py-1 rounded"
										>
											{isRetrying ? (
												<RefreshCw className="w-3 h-3 animate-spin" />
											) : (
												<RefreshCw className="w-3 h-3" />
											)}
											{product?.shopifyStatus === 'error' ? 'Retry' : 'Sync'}
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Summary Stats */}
				<div className="mt-6 pt-4 border-t border-gray-200">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
						<div>
							<Text weight="medium" size="2" className="block text-gray-900">
								{createdProducts.length}
							</Text>
							<Text size="1" color="gray">Total Products</Text>
						</div>
						<div>
							<Text weight="medium" size="2" className="block text-green-600">
								{createdProducts.filter((p: any) => p?.shopifyStatus === 'synced').length}
							</Text>
							<Text size="1" color="gray">Synced</Text>
						</div>
						<div>
							<Text weight="medium" size="2" className="block text-lime-600">
								{createdProducts.filter((p: any) => p?.shopifyStatus === 'syncing').length}
							</Text>
							<Text size="1" color="gray">Syncing</Text>
						</div>
						<div>
							<Text weight="medium" size="2" className="block text-red-600">
								{createdProducts.filter((p: any) => p?.shopifyStatus === 'error').length}
							</Text>
							<Text size="1" color="gray">Errors</Text>
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
} 