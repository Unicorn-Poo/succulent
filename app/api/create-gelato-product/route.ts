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
			console.error('Failed to fetch template:', templateResponse.status, errorText);
			return NextResponse.json(
				{ error: `Failed to fetch template: ${templateResponse.status}` },
				{ status: templateResponse.status }
			);
		}

		const template = await templateResponse.json();
		console.log('Template structure:', JSON.stringify(template, null, 2));

		// Create product from template
		const productPayload = {
			title: productData.title || `${template.displayName || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			currency: productData.currency || 'USD',
			templateId: templateId,
			// Add images if provided
			...(imageUrls && imageUrls.length > 0 && {
				files: imageUrls.map((url: string, index: number) => ({
					url: url,
					layer: `image_${index + 1}` // This will need to match the template's expected layers
				}))
			})
		};

		console.log('Creating product with payload:', JSON.stringify(productPayload, null, 2));

		// Create the product
		const createResponse = await fetch(`https://ecommerce.gelatoapis.com/v1/stores/${storeId}/products`, {
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