import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

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

		// Upload data URLs to Gelato first if provided
		const uploadedFileUrls: string[] = [];
		if (imageUrls && imageUrls.length > 0) {
			console.log(`🔍 Processing ${imageUrls.length} images for Gelato upload`);
			
			for (let i = 0; i < imageUrls.length; i++) {
				const dataUrl = imageUrls[i];
				try {
					console.log(`📷 Processing image ${i + 1}/${imageUrls.length}`);
					console.log(`📷 Data URL preview: ${dataUrl.substring(0, 100)}...`);
					
					// Convert data URL to blob
					const response = await fetch(dataUrl);
					const blob = await response.blob();
					console.log(`📷 Original blob size: ${blob.size} bytes, type: ${blob.type}`);

					// TODO: handle multiple variants and multiple image placeholders (print areas) per variant
					const printArea = template.variants[0].imagePlaceholders[0];
					console.log(`📷 Print area dimensions: ${printArea.width}mm x ${printArea.height}mm`);

					const mmToInches = 0.0393701;
					const dpi = 300;
					
					const targetWidth = Math.round(printArea.width * mmToInches * dpi);
					const targetHeight = Math.round(printArea.height * mmToInches * dpi);
					console.log(`📷 Target dimensions: ${targetWidth}px x ${targetHeight}px at ${dpi}DPI`);

					const rescaled = await sharp(await blob.arrayBuffer())
						.resize(targetWidth, targetHeight, {
							fit: "cover",
							position: "center"
						})
						.png({ quality: 90 })
						.toBuffer();
					
					console.log(`📷 Processed image size: ${rescaled.length} bytes`);
					
					// Upload to Gelato
					const formData = new FormData();
					formData.append('file', new Blob([Buffer.from(rescaled)], { type: 'image/png' }), `image-${i + 1}.png`);
					
					console.log(`📤 Uploading image ${i + 1} to Gelato...`);
					const uploadResponse = await fetch('https://ecommerce.gelatoapis.com/v1/files', {
						method: 'POST',
						headers: {
							'X-API-KEY': apiKey,
						},
						body: formData,
					});
					
					if (uploadResponse.ok) {
						const uploadResult = await uploadResponse.json();
						console.log(`✅ Image ${i + 1} uploaded successfully: ${uploadResult.url}`);
						uploadedFileUrls.push(uploadResult.url);
					} else {
						const errorText = await uploadResponse.text();
						console.error(`❌ Failed to upload image ${i + 1} to Gelato:`, uploadResponse.status, errorText);
					}
				} catch (uploadError) {
					console.error(`❌ Error processing image ${i + 1}:`, uploadError);
					// Skip failed uploads but continue with others
				}
			}
		}

		console.log(`🏗️ Creating product with ${uploadedFileUrls.length} uploaded images`);
		console.log(`🏗️ Template has ${template.variants?.length || 0} variants`);
		
		// Create product from template using the correct endpoint
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
			// Add variants with image placeholders if images were uploaded
			...(uploadedFileUrls.length > 0 && template.variants && {
				variants: template.variants.slice(0, 1).map((variant: any) => {
					console.log(`🏗️ Processing variant ${variant.id} with ${variant.imagePlaceholders?.length || 0} image placeholders`);
					
					const imagePlaceholders = uploadedFileUrls.slice(0, variant.imagePlaceholders?.length || 1).map((url: string, index: number) => {
						const placeholder = {
							name: variant.imagePlaceholders?.[index]?.name || 'ImageFront',
							fileUrl: url
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
		
		console.log(`🏗️ Final product payload:`, JSON.stringify(productPayload, null, 2));

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
			}
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 