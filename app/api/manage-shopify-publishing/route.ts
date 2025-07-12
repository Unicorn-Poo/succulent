import { NextRequest, NextResponse } from 'next/server';

// Helper function to format Shopify store URL properly
function formatShopifyStoreUrl(storeUrl: string): string {
	if (!storeUrl || storeUrl.trim() === '') {
		throw new Error('Store URL is required');
	}
	
	let formattedStoreUrl = storeUrl.trim();
	
	// Remove protocol if present
	formattedStoreUrl = formattedStoreUrl.replace(/^https?:\/\//, '');
	
	// Remove trailing slash if present
	formattedStoreUrl = formattedStoreUrl.replace(/\/$/, '');
	
	// Check if this is already a full myshopify.com URL
	if (formattedStoreUrl.endsWith('.myshopify.com')) {
		return `https://${formattedStoreUrl}`;
	}
	
	// Check if this looks like a custom domain (has dots but not .myshopify.com)
	if (formattedStoreUrl.includes('.') && !formattedStoreUrl.endsWith('.myshopify.com')) {
		throw new Error(`Invalid store URL format. "${formattedStoreUrl}" appears to be a custom domain. Please use your Shopify store name (e.g., "mystore") or the full myshopify.com URL (e.g., "mystore.myshopify.com").`);
	}
	
	// Validate that we have a valid store name (only letters, numbers, hyphens)
	if (!formattedStoreUrl || formattedStoreUrl.length < 3) {
		throw new Error('Invalid store URL format. Please provide a valid Shopify store name.');
	}
	
	// Check for invalid characters in store name
	if (!/^[a-zA-Z0-9-]+$/.test(formattedStoreUrl)) {
		throw new Error('Invalid store name format. Store names can only contain letters, numbers, and hyphens.');
	}
	
	// Add .myshopify.com domain
	formattedStoreUrl = `${formattedStoreUrl}.myshopify.com`;
	
	// Add https protocol
	return `https://${formattedStoreUrl}`;
}

export async function POST(request: NextRequest) {
	try {
		const { 
			action, 
			gelatoProductId, 
			shopifyProductId,
			publishingChannels,
			shopifyApiKey,
			shopifyStoreUrl,
			shopifyAccessToken 
		} = await request.json();

		if (!action) {
			return NextResponse.json(
				{ error: 'Action is required' },
				{ status: 400 }
			);
		}

		// Handle different actions
		switch (action) {
			case 'list-channels':
				return await listPublishingChannels(shopifyApiKey, shopifyStoreUrl, shopifyAccessToken);
			
			case 'update-publishing':
				return await updateProductPublishing(
					shopifyProductId, 
					publishingChannels, 
					shopifyApiKey, 
					shopifyStoreUrl, 
					shopifyAccessToken
				);
			
			case 'sync-gelato-to-shopify':
				return await syncGelatoToShopify(
					gelatoProductId, 
					shopifyProductId, 
					publishingChannels,
					shopifyApiKey, 
					shopifyStoreUrl, 
					shopifyAccessToken
				);
			
			default:
				return NextResponse.json(
					{ error: 'Invalid action' },
					{ status: 400 }
				);
		}

	} catch (error) {
		console.error('Error managing Shopify publishing:', error);
		return NextResponse.json(
			{ error: `Failed to manage publishing: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
}

// List available publishing channels in Shopify
async function listPublishingChannels(apiKey: string, storeUrl: string, accessToken: string) {
	try {
		// Validate access token
		if (!accessToken || accessToken.trim() === '') {
			throw new Error('Access token is required');
		}
		
		// Check if access token looks like a valid Shopify access token
		const trimmedToken = accessToken.trim();
		if (!trimmedToken.startsWith('shpat_') && !trimmedToken.startsWith('shpca_')) {
			console.warn('Access token may not be in the correct format. Shopify Admin API access tokens typically start with "shpat_"');
		}
		
		// Format store URL properly
		const formattedStoreUrl = formatShopifyStoreUrl(storeUrl);
		console.log('Formatted store URL:', formattedStoreUrl);
		
		// For testing, let's try a simpler endpoint first - shop info
		const testResponse = await fetch(`${formattedStoreUrl}/admin/api/2023-10/shop.json`, {
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
		});

		console.log('Shopify test response status:', testResponse.status);

		if (!testResponse.ok) {
			const errorText = await testResponse.text();
			console.log('Shopify API error details:', errorText);
			
			// Provide more specific error messages
			if (testResponse.status === 401) {
				throw new Error('Authentication failed. Please check your Shopify Access Token and ensure it has the correct permissions.');
			} else if (testResponse.status === 404) {
				throw new Error(`Store not found. Please check your store URL: ${formattedStoreUrl}`);
			} else if (testResponse.status === 403) {
				throw new Error('Access forbidden. Your access token may not have the required permissions.');
			} else {
				throw new Error(`Shopify API error: ${testResponse.status} - ${errorText}`);
			}
		}

		// If shop endpoint works, try publications
		const response = await fetch(`${formattedStoreUrl}/admin/api/2023-10/publications.json`, {
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.log('Publications API error:', errorText);
			
			// If publications fail, return default channels
			console.log('Publications endpoint failed, returning default channels');
			return NextResponse.json({
				success: true,
				channels: [
					{ id: 'online-store', name: 'Online Store', enabled: true, supportsTags: true },
					{ id: 'pos', name: 'Point of Sale', enabled: false, supportsTags: false },
					{ id: 'facebook', name: 'Facebook', enabled: false, supportsTags: true },
					{ id: 'google', name: 'Google', enabled: false, supportsTags: true },
				],
				totalChannels: 4,
				note: 'Using default channels - publications endpoint not accessible with current permissions'
			});
		}

		const data = await response.json();
		
		// Extract and format channel information
		const channels = data.publications?.map((pub: any) => ({
			id: pub.id,
			name: pub.name,
			enabled: pub.published,
			supportsTags: pub.supports_future_publishing,
		})) || [];

		// Add common default channels
		const defaultChannels = [
			{ id: 'online-store', name: 'Online Store', enabled: true, supportsTags: true },
			{ id: 'pos', name: 'Point of Sale', enabled: false, supportsTags: false },
			{ id: 'facebook', name: 'Facebook', enabled: false, supportsTags: true },
			{ id: 'google', name: 'Google', enabled: false, supportsTags: true },
		];

		return NextResponse.json({
			success: true,
			channels: [...defaultChannels, ...channels],
			totalChannels: channels.length,
		});

	} catch (error) {
		console.error('Error fetching Shopify channels:', error);
		
		// Handle specific error types
		if (error instanceof Error) {
			// URL format errors
			if (error.message.includes('Invalid store URL format') || 
			    error.message.includes('Invalid store name format') ||
			    error.message.includes('appears to be a custom domain')) {
				return NextResponse.json(
					{ error: error.message },
					{ status: 400 }
				);
			}
			
			// TLS certificate errors
			if (error.message.includes('certificate') || error.message.includes('TLS') || error.message.includes('altnames')) {
				return NextResponse.json(
					{ error: 'SSL certificate error. Please check your store URL format. Use your Shopify store name (e.g., "mystore") or the full myshopify.com URL.' },
					{ status: 400 }
				);
			}
		}
		
		return NextResponse.json(
			{ error: 'Failed to fetch publishing channels' },
			{ status: 500 }
		);
	}
}

// Update product publishing settings
async function updateProductPublishing(
	productId: string, 
	publishingChannels: string[], 
	apiKey: string, 
	storeUrl: string, 
	accessToken: string
) {
	try {
		// Format store URL properly
		const formattedStoreUrl = formatShopifyStoreUrl(storeUrl);
		
		// First, get current product data
		const productResponse = await fetch(`${formattedStoreUrl}/admin/api/2023-10/products/${productId}.json`, {
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
		});

		if (!productResponse.ok) {
			throw new Error(`Failed to fetch product: ${productResponse.status}`);
		}

		const productData = await productResponse.json();
		
		// Update product publishing settings
		const updatePayload = {
			product: {
				id: productId,
				published: publishingChannels.includes('online-store'),
				published_scope: publishingChannels.includes('online-store') ? 'web' : 'null',
				// Add tags to control publishing
				tags: [
					...(productData.product.tags?.split(',') || []),
					...publishingChannels.map(channel => `channel:${channel}`)
				].filter(Boolean).join(','),
			}
		};

		const updateResponse = await fetch(`${formattedStoreUrl}/admin/api/2023-10/products/${productId}.json`, {
			method: 'PUT',
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(updatePayload),
		});

		if (!updateResponse.ok) {
			throw new Error(`Failed to update product: ${updateResponse.status}`);
		}

		const updatedProduct = await updateResponse.json();

		return NextResponse.json({
			success: true,
			message: 'Publishing settings updated successfully',
			product: updatedProduct.product,
			publishingChannels: publishingChannels,
		});

	} catch (error) {
		console.error('Error updating product publishing:', error);
		return NextResponse.json(
			{ error: 'Failed to update publishing settings' },
			{ status: 500 }
		);
	}
}

// Sync Gelato product to Shopify with publishing settings
async function syncGelatoToShopify(
	gelatoProductId: string,
	shopifyProductId: string,
	publishingChannels: string[],
	apiKey: string,
	storeUrl: string,
	accessToken: string
) {
	try {
		// This would involve:
		// 1. Fetching the product from Gelato
		// 2. Creating/updating the product in Shopify
		// 3. Setting the publishing channels
		
		// For now, return a placeholder response
		return NextResponse.json({
			success: true,
			message: 'Sync functionality is ready for implementation',
			gelatoProductId,
			shopifyProductId,
			publishingChannels,
			note: 'This would sync product data from Gelato to Shopify and set publishing channels'
		});

	} catch (error) {
		console.error('Error syncing Gelato to Shopify:', error);
		return NextResponse.json(
			{ error: 'Failed to sync products' },
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	// Handle GET requests for fetching publishing channel options
	const { searchParams } = new URL(request.url);
	const storeUrl = searchParams.get('storeUrl');
	const accessToken = searchParams.get('accessToken');

	if (!storeUrl || !accessToken) {
		return NextResponse.json(
			{ error: 'Store URL and access token are required' },
			{ status: 400 }
		);
	}

	return await listPublishingChannels('', storeUrl, accessToken);
} 