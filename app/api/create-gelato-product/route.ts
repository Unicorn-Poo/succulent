import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { 
			apiKey, 
			storeId, 
			templateId, 
			productData,
			imageUrls
		} = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		if (!templateId) {
			return NextResponse.json(
				{ error: 'Template ID is required' },
				{ status: 400 }
			);
		}

		// First, get the template details to understand the structure
		const templateResponse = await fetch(`https://ecommerce.gelatoapis.com/v1/templates/${templateId}`, {
			method: 'GET',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!templateResponse.ok) {
			const errorText = await templateResponse.text();
			return NextResponse.json(
				{ error: `Failed to fetch template: ${templateResponse.status} - ${errorText}` },
				{ status: templateResponse.status }
			);
		}

		const template = await templateResponse.json();

		if (imageUrls && imageUrls.length > 0) {
			console.log(`📷 Direct image URLs for Gelato:`, imageUrls);
		}

		console.log(`🏗️ Creating product with ${imageUrls?.length || 0} direct image URLs`);
		console.log(`🏗️ Template has ${template.variants?.length || 0} variants`);
		
		// Create product from template using the correct endpoint with direct URLs
		const productPayload = {
			templateId: templateId,
			title: productData.title || `${template.displayName || template.title || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			// Use only template tags from productData (no default tags)
			tags: productData.tags && productData.tags.length > 0 ? 
				productData.tags.filter(Boolean) : 
				(template.tags || []).filter(Boolean),
			vendor: productData.vendor || template.vendor || 'Gelato',
			productType: productData.productType || template.productType || 'Custom Product',
			// Add variants with direct image URLs (no upload needed!)
			...(imageUrls && imageUrls.length > 0 && template.variants && {
				variants: template.variants.slice(0, 1).map((variant: any) => {
					console.log(`🏗️ Processing variant ${variant.id} with ${variant.imagePlaceholders?.length || 0} image placeholders`);
					
					const imagePlaceholders = imageUrls.slice(0, variant.imagePlaceholders?.length || 1).map((url: string, index: number) => {
						const placeholder = {
							name: variant.imagePlaceholders?.[index]?.name || 'ImageFront',
							fileUrl: url // Use direct URL - Gelato will fetch it!
						};
						console.log(`🏗️ Image placeholder ${index + 1}: ${placeholder.name} -> ${url}`);
						return placeholder;
					});
					
					return {
						templateVariantId: variant.id,
						imagePlaceholders
					};
				})
			})
		};
		
		console.log(`🏗️ Final product payload (using direct URLs):`, JSON.stringify(productPayload, null, 2));
		console.log(`🔍 SHOPIFY TITLE DEBUG - Title being sent to Gelato: "${productPayload.title}"`);

		// Use the correct "create from template" endpoint
		const createResponse = await fetch(`https://ecommerce.gelatoapis.com/v1/stores/${storeId}/products:create-from-template`, {
			method: 'POST',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(productPayload),
		});

		if (!createResponse.ok) {
			const errorText = await createResponse.text();
			return NextResponse.json(
				{ error: `Failed to create product: ${createResponse.status} - ${errorText}` },
				{ status: createResponse.status }
			);
		}

		const createdProduct = await createResponse.json();
		
		console.log(`✅ GELATO PRODUCT CREATED:`, {
			gelatoProductId: createdProduct.id,
			titleSent: productPayload.title,
			titleReturned: createdProduct.title,
			titleMatch: productPayload.title === createdProduct.title,
			storeId: storeId,
			hasShopifyIntegration: !!createdProduct.shopifyIntegration,
			shopifyStatus: createdProduct.shopifyStatus,
			fullProduct: createdProduct
		});
		
		// Check if Gelato is supposed to auto-sync to Shopify
		if (!createdProduct.shopifyIntegration && !createdProduct.shopifyStatus) {
			console.warn(`⚠️ GELATO-SHOPIFY INTEGRATION WARNING: No Shopify integration detected in Gelato response`);
			console.warn(`💡 This means Gelato products won't automatically appear in Shopify`);
			console.warn(`🔧 Check your Gelato dashboard to ensure Shopify integration is properly configured`);
		}

		// Return product info including Shopify management data
		return NextResponse.json({
			success: true,
			productId: createdProduct.id,
			product: createdProduct,
			templateUsed: template,
			shopifyData: {
				// Include original shopify settings for later management
				publishingChannels: productData.shopifyData?.publishingChannels || [],
				needsShopifyManagement: !!(productData.shopifyData && productData.shopifyData.publishingChannels?.length > 0),
				// Estimated time for Shopify publication (typically 1-3 minutes)
				estimatedPublishTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
				// Pass the actual title that Gelato created for sync matching
				actualGelatoTitle: createdProduct.title,
			}
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 