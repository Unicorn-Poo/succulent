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
		
		console.log(`🔍 TEMPLATE DEBUG - Template structure:`, {
			templateId,
			hasVariants: !!template.variants,
			variantCount: template.variants?.length || 0,
			firstVariant: template.variants?.[0],
			imagePlaceholders: template.variants?.[0]?.imagePlaceholders
		});

		// Use direct URLs - no upload needed!
		console.log(`🔍 Using ${imageUrls?.length || 0} direct image URLs for Gelato`);
		if (imageUrls && imageUrls.length > 0) {
			console.log(`📷 Direct image URLs for Gelato:`, imageUrls);
		}

		console.log(`🏗️ Creating product with ${imageUrls?.length || 0} direct image URLs`);
		console.log(`🏗️ Template has ${template.variants?.length || 0} variants`);
		
		// Create product from template
		const productPayload = {
			templateId: templateId,
			title: productData.title || `${template.displayName || template.title || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			// Gelato-specific publishing settings
			isVisibleInTheOnlineStore: true, // Ensure product is visible in Shopify
			salesChannels: ['web'], // For Shopify stores, Gelato expects just 'web' channel
			// Use only template tags from productData (no default tags)
			tags: productData.tags && productData.tags.length > 0 ? 
				productData.tags.filter(Boolean) : 
				(template.tags || []).filter(Boolean),
			vendor: productData.vendor || template.vendor || 'Gelato',
			productType: productData.productType || template.productType || 'Custom Product',
			// Include ALL template variants (required for Gelato)
			...(template.variants && {
				variants: template.variants.map((variant: any) => {
					console.log(`🏗️ Processing variant ${variant.id} with ${variant.imagePlaceholders?.length || 0} image placeholders`);
					
					const variantData: any = {
						templateVariantId: variant.id
					};
					
					// Only add imagePlaceholders if this variant has them AND we have images
					if (variant.imagePlaceholders && variant.imagePlaceholders.length > 0 && imageUrls && imageUrls.length > 0) {
						const imagePlaceholders = [];
						
						for (let i = 0; i < Math.min(imageUrls.length, variant.imagePlaceholders.length); i++) {
							const templatePlaceholder = variant.imagePlaceholders[i];
							const imageUrl = imageUrls[i];
							
							console.log(`🔍 IMAGE MAPPING DEBUG - Template placeholder ${i}:`, templatePlaceholder);
							
							const placeholder = {
								name: templatePlaceholder.name,
								fileUrl: imageUrl
							};
							
							console.log(`🏗️ Image placeholder ${i + 1} FINAL:`, placeholder);
							imagePlaceholders.push(placeholder);
						}
						
						if (imagePlaceholders.length > 0) {
							variantData.imagePlaceholders = imagePlaceholders;
						}
					}
					
					return variantData;
				})
			})
		};
		
		console.log(`🔍 SHOPIFY CHANNELS DEBUG - Sales channels being used:`, {
			selectedChannels: productData.shopifyData?.publishingChannels,
			gelatoChannels: productPayload.salesChannels,
			isVisible: productPayload.isVisibleInTheOnlineStore,
			note: 'Gelato uses its own channel format - Shopify channels will be applied after sync'
		});
		
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