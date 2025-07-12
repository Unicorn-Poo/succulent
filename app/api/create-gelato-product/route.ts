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
		console.log(`Fetching template from: https://ecommerce.gelatoapis.com/v1/templates/${templateId}`);
		console.log(`Using API key: ${apiKey ? '***' : 'missing'}`);
		
		const templateResponse = await fetch(`https://ecommerce.gelatoapis.com/v1/templates/${templateId}`, {
			method: 'GET',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		console.log(`Template fetch response status: ${templateResponse.status}`);

		if (!templateResponse.ok) {
			const errorText = await templateResponse.text();
			console.error('Failed to fetch template:', templateResponse.status, errorText);
			console.error('Template ID used:', templateId);
			console.error('Full error response:', errorText);
			return NextResponse.json(
				{ error: `Failed to fetch template: ${templateResponse.status} - ${errorText}` },
				{ status: templateResponse.status }
			);
		}

		const template = await templateResponse.json();
		console.log('Template structure:', JSON.stringify(template, null, 2));

		// Upload data URLs to Gelato first if provided
		let uploadedFileUrls: string[] = [];
		if (imageUrls && imageUrls.length > 0) {
			console.log('Uploading images to Gelato...');
			
			for (const dataUrl of imageUrls) {
				try {
					// Convert data URL to blob
					const response = await fetch(dataUrl);
					const blob = await response.blob();
					
					// Upload to Gelato
					const formData = new FormData();
					formData.append('file', blob, 'image.jpg');
					
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
						console.log('Successfully uploaded image to Gelato:', uploadResult.url);
					} else {
						const errorText = await uploadResponse.text();
						console.error('Failed to upload image to Gelato:', uploadResponse.status, errorText);
					}
				} catch (uploadError) {
					console.error('Error uploading image:', uploadError);
				}
			}
		}

		// Create product from template using the correct endpoint
		const productPayload = {
			templateId: templateId,
			title: productData.title || `${template.displayName || template.title || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			// Add enhanced metadata for Shopify
			tags: [
				...(template.tags || []),
				'Print on Demand',
				'Custom',
				'Social Media',
				template.productType || 'Product'
			].filter(Boolean),
			vendor: template.vendor || 'Gelato',
			productType: template.productType || 'Custom Product',
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

		console.log('Creating product from template with payload:', JSON.stringify(productPayload, null, 2));

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
			console.error('Failed to create product:', createResponse.status, errorText);
			return NextResponse.json(
				{ error: `Failed to create product: ${createResponse.status} - ${errorText}` },
				{ status: createResponse.status }
			);
		}

		const createdProduct = await createResponse.json();
		console.log('Product created successfully:', createdProduct);

		return NextResponse.json({
			success: true,
			productId: createdProduct.id,
			product: createdProduct,
			templateUsed: template,
		});

	} catch (error) {
		console.error('Error creating Gelato product:', error);
		return NextResponse.json(
			{ error: `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 