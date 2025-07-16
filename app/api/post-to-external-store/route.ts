import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { 
			storeType, 
			apiUrl, 
			apiKey, 
			productData, 
			storeSettings 
		} = await request.json();

		if (!storeType || !apiUrl || !apiKey || !productData) {
			return NextResponse.json(
				{ error: 'Store configuration and product data are required' },
				{ status: 400 }
			);
		}

		// Normalize API URL
		const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
		
		let createEndpoint = '';
		let headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		let payload: any = {};

		// Configure endpoint, headers, and payload based on store type
		switch (storeType) {
			case 'woocommerce':
				createEndpoint = `${baseUrl}/wp-json/wc/v3/products`;
				headers['Authorization'] = `Basic ${Buffer.from(apiKey).toString('base64')}`;
				
				payload = {
					name: productData.name,
					description: productData.description || '',
					short_description: productData.shortDescription || productData.description || '',
					regular_price: productData.price || '0',
					status: storeSettings?.autoPublish ? 'publish' : 'draft',
					catalog_visibility: 'visible',
					images: productData.images?.map((img: any) => ({
						src: img.url,
						alt: img.alt || productData.name
					})) || [],
					categories: storeSettings?.defaultCategory ? [{ name: storeSettings.defaultCategory }] : [],
					tags: productData.tags?.map((tag: string) => ({ name: tag })) || [],
					meta_data: [
						{ key: '_prodigi_product_id', value: productData.prodigiProductId || '' },
						{ key: '_prodigi_variant_sku', value: productData.prodigiVariantSku || '' },
						{ key: '_source_post_id', value: productData.sourcePostId || '' },
						{ key: '_created_via', value: 'succulent-app' }
					]
				};
				break;
				
			case 'shopify':
				createEndpoint = `${baseUrl}/admin/api/2023-10/products.json`;
				headers['X-Shopify-Access-Token'] = apiKey;
				
				payload = {
					product: {
						title: productData.name,
						body_html: productData.description || '',
						vendor: 'Succulent App',
						product_type: productData.productType || 'Print on Demand',
						status: storeSettings?.autoPublish ? 'active' : 'draft',
						images: productData.images?.map((img: any) => ({
							src: img.url,
							alt: img.alt || productData.name
						})) || [],
						tags: productData.tags?.join(', ') || '',
						metafields: [
							{
								namespace: 'succulent',
								key: 'prodigi_product_id',
								value: productData.prodigiProductId || '',
								type: 'single_line_text_field'
							},
							{
								namespace: 'succulent',
								key: 'prodigi_variant_sku',
								value: productData.prodigiVariantSku || '',
								type: 'single_line_text_field'
							},
							{
								namespace: 'succulent',
								key: 'source_post_id',
								value: productData.sourcePostId || '',
								type: 'single_line_text_field'
							}
						],
						variants: [
							{
								title: 'Default',
								price: productData.price || '0.00',
								inventory_management: null,
								fulfillment_service: 'manual'
							}
						]
					}
				};
				break;
				
			case 'medusa':
				createEndpoint = `${baseUrl}/admin/products`;
				headers['Authorization'] = `Bearer ${apiKey}`;
				
				payload = {
					title: productData.name,
					description: productData.description || '',
					status: storeSettings?.autoPublish ? 'published' : 'draft',
					images: productData.images?.map((img: any) => ({
						url: img.url
					})) || [],
					tags: productData.tags?.map((tag: string) => ({ value: tag })) || [],
					metadata: {
						prodigi_product_id: productData.prodigiProductId || '',
						prodigi_variant_sku: productData.prodigiVariantSku || '',
						source_post_id: productData.sourcePostId || '',
						created_via: 'succulent-app'
					},
					variants: [
						{
							title: 'Default',
							prices: [
								{
									amount: Math.round((parseFloat(productData.price || '0') * 100)),
									currency_code: storeSettings?.currency || 'USD'
								}
							]
						}
					]
				};
				break;
				
			case 'custom':
				createEndpoint = `${baseUrl}/api/products`;
				headers['Authorization'] = `Bearer ${apiKey}`;
				headers['X-API-Key'] = apiKey;
				
				// Generic payload for custom stores
				payload = {
					name: productData.name,
					title: productData.name,
					description: productData.description || '',
					price: productData.price || '0',
					status: storeSettings?.autoPublish ? 'published' : 'draft',
					images: productData.images || [],
					tags: productData.tags || [],
					metadata: {
						prodigi_product_id: productData.prodigiProductId || '',
						prodigi_variant_sku: productData.prodigiVariantSku || '',
						source_post_id: productData.sourcePostId || '',
						created_via: 'succulent-app'
					}
				};
				break;
				
			default:
				return NextResponse.json(
					{ error: 'Unsupported store type' },
					{ status: 400 }
				);
		}

		// Create the product
		const response = await fetch(createEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ 
					success: false,
					error: `Failed to create product: ${response.status} - ${errorText}`,
					status: response.status 
				},
				{ status: response.status }
			);
		}

		const createdProduct = await response.json();
		
		// Extract product ID and URL based on store type
		let externalProductId = '';
		let externalProductUrl = '';
		
		switch (storeType) {
			case 'woocommerce':
				externalProductId = createdProduct.id?.toString() || '';
				externalProductUrl = createdProduct.permalink || `${baseUrl}/product/${createdProduct.slug || createdProduct.id}`;
				break;
				
			case 'shopify':
				externalProductId = createdProduct.product?.id?.toString() || '';
				const shopDomain = new URL(baseUrl).hostname;
				externalProductUrl = `https://${shopDomain}/products/${createdProduct.product?.handle || createdProduct.product?.id}`;
				break;
				
			case 'medusa':
				externalProductId = createdProduct.product?.id || '';
				externalProductUrl = `${baseUrl}/products/${createdProduct.product?.handle || createdProduct.product?.id}`;
				break;
				
			case 'custom':
				externalProductId = createdProduct.id?.toString() || createdProduct.product_id?.toString() || '';
				externalProductUrl = createdProduct.url || createdProduct.product_url || `${baseUrl}/products/${externalProductId}`;
				break;
		}

		return NextResponse.json({
			success: true,
			externalProductId,
			externalProductUrl,
			storeType,
			createdProduct,
			message: 'Product created successfully in external store'
		});

	} catch (error) {
		console.error('Error posting to external store:', error);
		return NextResponse.json(
			{ 
				success: false,
				error: `Failed to post product: ${error instanceof Error ? error.message : 'Unknown error'}` 
			},
			{ status: 500 }
		);
	}
} 