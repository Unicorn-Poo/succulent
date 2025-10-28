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

		// Get template details first
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

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'No image URLs provided' },
        { status: 400 }
      );
    }

		// Product payload with ALL variants and images (based on Gelato docs)
		const productPayload = {
			templateId: templateId,
			title: productData.title || `${template.displayName || template.title || 'Product'} - ${new Date().toLocaleDateString()}`,
			description: productData.description || `Custom product created from social media post`,
			isVisibleInTheOnlineStore: true,
			salesChannels: ["web"],
			tags: productData.tags && productData.tags.length > 0 ? 
				productData.tags.filter(Boolean) : 
				(template.tags || []).filter(Boolean),
			variants: template.variants.map((variant: any) => ({
				templateVariantId: variant.id,
				imagePlaceholders: variant.imagePlaceholders?.map((placeholder: any) => ({
					name: placeholder.name,
					fileUrl: imageUrls?.[0]
				})) || []
			})),
			productType: productData.productType || template.productType || "Printable Material",
			vendor: productData.vendor || template.vendor || "Gelato"
		};

		console.log('📦 Simple Gelato payload (no variants):', JSON.stringify(productPayload, null, 2));

		// Create product using the basic endpoint
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

		return NextResponse.json({
			success: true,
			productId: createdProduct.id,
			product: createdProduct,
			templateUsed: template,
			shopifyData: {
				publishingChannels: productData.shopifyData?.publishingChannels || [],
				needsShopifyManagement: !!(productData.shopifyData && productData.shopifyData.publishingChannels?.length > 0),
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