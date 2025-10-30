import { NextRequest, NextResponse } from 'next/server';

/**
 * Production-ready Gelato product creation from template
 * 
 * This endpoint:
 * 1. Fetches template details to understand placeholder structure
 * 2. Uploads images to Gelato's file service to ensure accessibility
 * 3. Creates products with proper image placeholder mapping
 * 
 * Based on official Gelato API docs:
 * https://dashboard.gelato.com/docs/ecommerce/products/create-from-template/
 */

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

		if (!storeId) {
			return NextResponse.json(
				{ error: 'Store ID is required' },
				{ status: 400 }
			);
		}

		if (!templateId) {
			return NextResponse.json(
				{ error: 'Template ID is required' },
				{ status: 400 }
			);
		}

		if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
			return NextResponse.json(
				{ error: 'At least one image URL is required' },
				{ status: 400 }
			);
		}

		// Step 1: Fetch template details to understand structure
		console.log('📋 Fetching template details...', { templateId, storeId });
		const templateResponse = await fetch(`https://ecommerce.gelatoapis.com/v1/templates/${templateId}`, {
			method: 'GET',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!templateResponse.ok) {
			const errorText = await templateResponse.text();
			console.error('❌ Failed to fetch template:', templateResponse.status, errorText);
			return NextResponse.json(
				{ error: `Failed to fetch template: ${templateResponse.status} - ${errorText}` },
				{ status: templateResponse.status }
			);
		}

		const template = await templateResponse.json();
		
		console.log('🔍 Template structure:', {
			templateId,
			templateName: template.displayName || template.title || template.name,
			hasVariants: !!template.variants,
			variantCount: template.variants?.length || 0,
			totalPlaceholders: template.variants?.reduce((sum: number, v: any) => 
				sum + (v.imagePlaceholders?.length || 0), 0) || 0
		});

		// Step 2: Upload images to Gelato to ensure they're accessible
		// This ensures Gelato can access the images even if they're from our proxy
		console.log('📤 Uploading post images to Gelato file service...', { 
			imageCount: imageUrls.length,
			imageUrls: imageUrls.map((url: string) => url.substring(0, 100)) // Log first 100 chars for debugging
		});
		const uploadedImages: Array<{ url: string; fileId: string; originalUrl: string }> = [];

		for (let i = 0; i < imageUrls.length; i++) {
			const imageUrl = imageUrls[i];
			
			try {
				console.log(`📥 Fetching image ${i + 1}/${imageUrls.length} from: ${imageUrl.substring(0, 100)}...`);
				
				// Fetch the image from the source URL (could be proxy URL or direct URL)
				// For proxy URLs like /api/media-proxy/co_xxx, this will work from server-side
				const imageResponse = await fetch(imageUrl, {
					// Add headers to ensure proper handling
					headers: {
						'Accept': 'image/*',
						'User-Agent': 'Succulent-App/1.0'
					}
				});
				
				if (!imageResponse.ok) {
					console.error(`⚠️ Could not fetch image ${i + 1} from ${imageUrl}:`, {
						status: imageResponse.status,
						statusText: imageResponse.statusText,
						headers: Object.fromEntries(imageResponse.headers.entries())
					});
					continue;
				}

				// Verify we got an image
				const contentType = imageResponse.headers.get('content-type');
				if (!contentType || !contentType.startsWith('image/')) {
					console.warn(`⚠️ Image ${i + 1} does not have image content-type: ${contentType}`);
					// Continue anyway, Gelato might accept it
				}

				const imageBlob = await imageResponse.blob();
				
				// Validate blob
				if (imageBlob.size === 0) {
					console.error(`❌ Image ${i + 1} is empty (0 bytes)`);
					continue;
				}

				console.log(`📤 Uploading image ${i + 1} to Gelato...`, {
					size: imageBlob.size,
					type: imageBlob.type || contentType
				});
				
				// Determine file extension from content type or URL
				let extension = 'jpg';
				if (contentType?.includes('png')) extension = 'png';
				else if (contentType?.includes('gif')) extension = 'gif';
				else if (contentType?.includes('webp')) extension = 'webp';
				else if (imageUrl.includes('.png')) extension = 'png';
				else if (imageUrl.includes('.gif')) extension = 'gif';
				
				// Create FormData for Gelato upload
				const gelatoFormData = new FormData();
				gelatoFormData.append('file', imageBlob, `post-image-${i + 1}.${extension}`);

				// Upload to Gelato's file service
				const uploadResponse = await fetch('https://ecommerce.gelatoapis.com/v1/files', {
					method: 'POST',
					headers: {
						'X-API-KEY': apiKey,
					},
					body: gelatoFormData,
				});

				if (!uploadResponse.ok) {
					const errorText = await uploadResponse.text();
					console.error(`❌ Failed to upload image ${i + 1} to Gelato:`, {
						status: uploadResponse.status,
						error: errorText,
						imageUrl: imageUrl.substring(0, 100)
					});
					// Continue with next image instead of failing completely
					continue;
				}

				const uploadResult = await uploadResponse.json();
				
				// Verify we got a valid URL back
				if (!uploadResult.url) {
					console.error(`❌ Gelato upload succeeded but no URL returned for image ${i + 1}:`, uploadResult);
					continue;
				}

				uploadedImages.push({
					url: uploadResult.url,
					fileId: uploadResult.id,
					originalUrl: imageUrl
				});

				console.log(`✅ Successfully uploaded post image ${i + 1}/${imageUrls.length} to Gelato:`, {
					gelatoUrl: uploadResult.url,
					fileId: uploadResult.id,
					size: imageBlob.size
				});
			} catch (uploadError) {
				console.error(`❌ Error processing image ${i + 1}:`, {
					error: uploadError instanceof Error ? uploadError.message : String(uploadError),
					imageUrl: imageUrl.substring(0, 100),
					stack: uploadError instanceof Error ? uploadError.stack : undefined
				});
				// Continue with other images
			}
		}

		if (uploadedImages.length === 0) {
			return NextResponse.json(
				{ error: 'Failed to upload any images to Gelato. Please ensure image URLs are accessible.' },
				{ status: 500 }
			);
		}

		console.log('✅ Successfully uploaded images:', {
			uploadedCount: uploadedImages.length,
			totalCount: imageUrls.length,
			gelatoUrls: uploadedImages.map(img => img.url)
		});

		// Step 3: Map images to placeholders
		// Strategy: Cycle through uploaded images for placeholders, or use first image for all if only one
		const gelatoImageUrls = uploadedImages.map(img => img.url);

		// Build variants with proper image placeholder mapping
		const variants = template.variants.map((variant: any) => {
			// Map each placeholder to an image
			// If there are multiple images, cycle through them
			// If there's only one image, use it for all placeholders
			const imagePlaceholders = variant.imagePlaceholders?.map((placeholder: any, index: number) => {
				// Use the first image for all placeholders if only one image provided
				// Otherwise, cycle through images
				const imageIndex = gelatoImageUrls.length > 1 
					? (index % gelatoImageUrls.length) 
					: 0;
				const fileUrl = gelatoImageUrls[imageIndex];

				return {
					name: placeholder.name, // Must match template layer name exactly
					fileUrl: fileUrl // Use Gelato-hosted URL
				};
			}) || [];

			return {
				templateVariantId: variant.id,
				imagePlaceholders: imagePlaceholders
			};
		});

		// Step 4: Create product payload according to Gelato API docs
		const productPayload = {
			templateId: templateId,
			title: productData.title || `${template.displayName || template.title || template.name || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			isVisibleInTheOnlineStore: true,
			salesChannels: ["web"],
			tags: productData.tags && productData.tags.length > 0 
				? productData.tags.filter(Boolean) 
				: (template.tags || []).filter(Boolean),
			variants: variants,
			productType: productData.productType || template.productType || "Printable Material",
			vendor: productData.vendor || template.vendor || "Gelato"
		};

		console.log('📦 Creating product with payload:', {
			templateId,
			title: productPayload.title,
			variantCount: variants.length,
			totalPlaceholders: variants.reduce((sum: number, v: any) => sum + v.imagePlaceholders.length, 0),
			imageUrlsUsed: gelatoImageUrls.length
		});

		// Step 5: Create product using Gelato API
		const createResponse = await fetch(
			`https://ecommerce.gelatoapis.com/v1/stores/${storeId}/products:create-from-template`,
			{
				method: 'POST',
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(productPayload),
			}
		);

		if (!createResponse.ok) {
			const errorText = await createResponse.text();
			console.error('❌ Failed to create product:', createResponse.status, errorText);
			
			// Try to parse error for better messaging
			let errorMessage = errorText;
			try {
				const errorJson = JSON.parse(errorText);
				errorMessage = errorJson.message || errorJson.error || errorText;
			} catch {
				// Use raw error text if not JSON
			}

			return NextResponse.json(
				{ 
					error: `Failed to create product: ${createResponse.status}`,
					details: errorMessage,
					uploadedImages: uploadedImages.length // Inform client that images were uploaded successfully
				},
				{ status: createResponse.status }
			);
		}

		const createdProduct = await createResponse.json();

		console.log('✅ Product created successfully:', {
			productId: createdProduct.id,
			title: createdProduct.title || createdProduct.name
		});

		return NextResponse.json({
			success: true,
			productId: createdProduct.id,
			product: createdProduct,
			templateUsed: {
				id: template.id || templateId,
				name: template.displayName || template.title || template.name,
				variantCount: template.variants?.length || 0
			},
			uploadedImages: {
				count: uploadedImages.length,
				urls: gelatoImageUrls
			},
			shopifyData: {
				publishingChannels: productData.shopifyData?.publishingChannels || [],
				needsShopifyManagement: !!(productData.shopifyData && productData.shopifyData.publishingChannels?.length > 0),
				estimatedPublishTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
			}
		});

	} catch (error) {
		console.error('❌ Unexpected error creating Gelato product:', error);
		return NextResponse.json(
			{ 
				error: 'Failed to create product',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}