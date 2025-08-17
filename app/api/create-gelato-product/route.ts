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
		let uploadedFileUrls: string[] = [];
		if (imageUrls && imageUrls.length > 0) {
			
			for (const dataUrl of imageUrls) {
				try {
					// Convert data URL to blob
					const response = await fetch(dataUrl);
					const blob = await response.blob();

          // TODO: handle multiple variants and multiple image placeholders (print areas) per variant
          const printArea = template.variants[0].imagePlaceholders[0];

          const mmToInches = 0.0393701;
          const dpi = 300;

          const rescaled = await sharp(await blob.arrayBuffer()).resize(
            printArea.width * mmToInches * dpi,
            printArea.height * mmToInches * dpi, {
            fit: "cover"
          }).toFormat("png").toBuffer();
					
					// Upload to Gelato
					const formData = new FormData();
					formData.append('file', new Blob([rescaled]), 'image.png');
					
					const uploadResponse = await fetch('https://ecommerce.gelatoapis.com/v1/files', {
						method: 'POST',
						headers: {
							'X-API-KEY': apiKey,
						},
						body: formData,
					});
					
					if (uploadResponse.ok) {
						const uploadResult = await uploadResponse.json();
						uploadedFileUrls.push(uploadResult.url);
					}
				} catch (uploadError) {
					// Skip failed uploads
				}
			}
		}

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
				variants: template.variants.slice(0, 1).map((variant: any) => ({
					templateVariantId: variant.id,
					imagePlaceholders: uploadedFileUrls.slice(0, variant.imagePlaceholders?.length || 1).map((url: string, index: number) => ({
						name: variant.imagePlaceholders?.[index]?.name || 'ImageFront',
						fileUrl: url
					}))
				}))
			})
		};

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