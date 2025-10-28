import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { 
			apiKey, 
			productId, 
			productData,
			imageUrls,
			sandboxMode = true,
			externalStore // New field for external store configuration
		} = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		if (!productId) {
			return NextResponse.json(
				{ error: 'Product ID is required' },
				{ status: 400 }
			);
		}

		// Use sandbox or live endpoint based on mode
		const baseUrl = sandboxMode ? 
			'https://api.sandbox.prodigi.com/v4.0' : 
			'https://api.prodigi.com/v4.0';

		// First, get the product details to understand the structure using v4.0 API
		const productResponse = await fetch(`${baseUrl}/ProductDetails/${productId}`, {
			method: 'GET',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!productResponse.ok) {
			const errorText = await productResponse.text();
			return NextResponse.json(
				{ error: `Failed to fetch product details: ${productResponse.status} - ${errorText}` },
				{ status: productResponse.status }
			);
		}

		const product = await productResponse.json();

		// Upload images as assets for later use
		const uploadedImages: any[] = [];
		if (imageUrls && imageUrls.length > 0) {
			console.log(`🔍 PRODIGI IMAGE DEBUG - Processing ${imageUrls.length} image URLs`);
			
			for (let i = 0; i < imageUrls.length; i++) {
				const url = imageUrls[i];
				try {
					console.log(`📷 Processing Prodigi image ${i + 1}/${imageUrls.length}: ${url}`);
					
					// Handle both data URLs and direct URLs
					let blob;
					if (url.startsWith('data:')) {
						console.log(`📷 Converting data URL to blob for Prodigi`);
						const response = await fetch(url);
						blob = await response.blob();
					} else {
						console.log(`📷 Fetching direct URL for Prodigi: ${url}`);
						const response = await fetch(url);
						
						if (!response.ok) {
							throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
						}
						
						blob = await response.blob();
					}
					
					console.log(`📷 Prodigi blob created:`, {
						size: blob.size,
						type: blob.type
					});
					
					if (blob.size === 0) {
						throw new Error('Empty image received');
					}
					
					// Create form data for image upload
					const formData = new FormData();
					formData.append('file', blob, `social-media-image-${i + 1}.jpg`);
					
					console.log(`📤 Uploading image ${i + 1} to Prodigi assets...`);
					
					// Upload image as asset to Prodigi
					const uploadResponse = await fetch(`${baseUrl}/assets`, {
						method: 'POST',
						headers: {
							'X-API-Key': apiKey,
						},
						body: formData,
					});
					
					console.log(`📤 Prodigi upload response for image ${i + 1}:`, {
						ok: uploadResponse.ok,
						status: uploadResponse.status,
						statusText: uploadResponse.statusText
					});
					
					if (uploadResponse.ok) {
						const uploadResult = await uploadResponse.json();
						console.log(`✅ Prodigi image ${i + 1} uploaded successfully:`, uploadResult);
						
						uploadedImages.push({
							id: uploadResult.id || uploadResult.assetId,
							url: uploadResult.url || uploadResult.downloadUrl,
							filename: uploadResult.filename || `social-media-image-${i + 1}.jpg`,
							size: uploadResult.size,
							format: uploadResult.format || 'jpeg'
						});
					} else {
						const errorText = await uploadResponse.text();
						console.error(`❌ Failed to upload image ${i + 1} to Prodigi:`, uploadResponse.status, errorText);
					}
				} catch (uploadError) {
					console.error(`❌ Error processing Prodigi image ${i + 1}:`, uploadError);
				}
			}
		}
		
		console.log(`🔍 PRODIGI ASSET UPLOAD SUMMARY:`, {
			originalUrls: imageUrls?.length || 0,
			successfulUploads: uploadedImages.length,
			failedUploads: (imageUrls?.length || 0) - uploadedImages.length,
			uploadedAssets: uploadedImages.map(img => ({
				id: img.id,
				url: img.url,
				size: img.size
			}))
		});

		// Create a product design/template that can be used for future orders
		const productDesign = {
			id: `social-media-${Date.now()}`,
			name: productData.title || `Social Media Product - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			baseProductId: productId,
			baseProduct: product,
			
			// Design specifications
			design: {
				printAreas: product.printAreas?.map((area: any, index: number) => ({
					id: area.id,
					name: area.name,
					assetId: uploadedImages[index]?.id || null,
					assetUrl: uploadedImages[index]?.url || null,
					position: area.position || 'center',
					sizing: productData.sizing || 'fillPrintArea',
					rotation: 0,
				})).filter((area: any) => area.assetId) || [],
			},
			
			// Product metadata
			metadata: {
				sourceApp: 'succulent-social-media',
				createdAt: new Date().toISOString(),
				originalPostContent: productData.postContent,
				socialPlatform: productData.platform,
			},
			
			// Variant specifications
			selectedVariant: {
				id: productData.variantId || (product.variants?.[0]?.id),
				sku: productData.variantSku || (product.variants?.[0]?.sku),
				size: productData.size,
				color: productData.color,
				material: productData.material,
			},
			
			// Pricing information (for reference)
			pricing: {
				baseCost: product.variants?.find((v: any) => v.id === productData.variantId)?.cost || '0.00',
				currency: 'USD',
				retailPrice: productData.retailPrice || null,
				markupPercentage: externalStore?.settings?.markupPercentage || 50,
			},
			
			// Status tracking
			status: 'draft', // Can be: draft, ready, posted
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			
			// Assets used in this design
			assets: uploadedImages,
		};

		// Create a quote for cost estimation
		let quoteData = null;
		try {
			const quotePayload = {
				merchantReference: `quote-${productDesign.id}`,
				shippingMethod: 'Standard',
				recipient: {
					name: 'Sample Customer',
					address: {
						line1: '123 Main St',
						postalOrZipCode: '12345',
						countryCode: 'US',
						townOrCity: 'Anytown',
						stateOrCounty: 'State'
					}
				},
				items: [
					{
						merchantReference: `item-${productDesign.id}`,
						sku: productDesign.selectedVariant.sku,
						copies: 1,
						sizing: productDesign.design.printAreas[0]?.sizing || 'fillPrintArea',
						assets: productDesign.design.printAreas.map((area: any) => ({
							printArea: area.id,
							url: area.assetUrl
						})).filter((asset: any) => asset.url),
					}
				]
			};

			const quoteResponse = await fetch(`${baseUrl}/quotes`, {
				method: 'POST',
				headers: {
					'X-API-Key': apiKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(quotePayload),
			});

			if (quoteResponse.ok) {
				quoteData = await quoteResponse.json();
			}
		} catch (quoteError) {
			console.error('Quote generation failed:', quoteError);
		}

		// Calculate retail price with markup
		const baseCost = parseFloat(productDesign.pricing.baseCost || '0');
		const markupPercentage = productDesign.pricing.markupPercentage || 50;
		const retailPrice = (baseCost * (1 + markupPercentage / 100)).toFixed(2);

		// Post to external store if configured
		let externalStoreResult = null;
		if (externalStore && externalStore.isConfigured) {
			try {
				console.log('🛍️ EXTERNAL STORE IMAGE DEBUG:');
				console.log('📷 Original imageUrls:', imageUrls);
				console.log('📷 Uploaded Prodigi images:', uploadedImages);
				
				// Use the uploaded Prodigi asset URLs for the store, not the original URLs
				const storeImageUrls = uploadedImages.length > 0 
					? uploadedImages.map(img => img.url || img.downloadUrl).filter(Boolean)
					: (imageUrls || []);
				
				console.log('🛍️ Using store image URLs:', storeImageUrls);

				const storeProductData = {
					name: productDesign.name,
					description: productDesign.description,
					price: retailPrice,
					images: storeImageUrls.map((url: string, index: number) => ({
						url: url,
						alt: `${productDesign.name} - Image ${index + 1}`
					})),
					tags: ['print-on-demand', 'social-media', productData.platform].filter(Boolean),
					prodigiProductId: productId,
					prodigiVariantSku: productDesign.selectedVariant.sku,
					sourcePostId: productData.sourcePostId,
					productType: product.productType || 'Print on Demand'
				};

				const storeResponse = await fetch('/api/post-to-external-store', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						storeType: externalStore.storeType,
						apiUrl: externalStore.apiUrl,
						apiKey: externalStore.apiKey,
						productData: storeProductData,
						storeSettings: externalStore.settings,
					}),
				});

				if (storeResponse.ok) {
					externalStoreResult = await storeResponse.json();
					// Update product design status
					productDesign.status = 'posted';
				}
			} catch (storeError) {
				console.error('External store posting failed:', storeError);
			}
		}

		return NextResponse.json({
			success: true,
			productDesign: {
				...productDesign,
				pricing: {
					...productDesign.pricing,
					retailPrice,
				}
			},
			baseProduct: product,
			uploadedImages: uploadedImages,
			quote: quoteData,
			externalStore: externalStoreResult,
			sandboxMode,
			capabilities: {
				canCreateOrders: true,
				canEstimateCosts: !!quoteData,
				canCustomizeDesign: uploadedImages.length > 0,
				canPostToStore: !!externalStore?.isConfigured,
				postedToStore: !!externalStoreResult?.success,
			}
		});

	} catch (error) {
		console.error('Error creating Prodigi product:', error);
		return NextResponse.json(
			{ error: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 