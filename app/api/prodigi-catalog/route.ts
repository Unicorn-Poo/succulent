import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { apiKey, sandboxMode = true } = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		// Use sandbox or live endpoint based on mode
		const baseUrl = sandboxMode ? 
			'https://api.sandbox.prodigi.com/v4.0' : 
			'https://api.prodigi.com/v4.0';

		// Since v4.0 doesn't have a /products endpoint, we'll use known popular SKUs
		// These are some of the most common Prodigi products based on their documentation
		const popularSkus = [
			'GLOBAL-CFPM-16X20', // Canvas Frame Print
			'GLOBAL-EMA-A4', // Enhanced Matte Art A4
			'GLOBAL-EMA-A3', // Enhanced Matte Art A3
			'GLOBAL-HPR-A4', // Hahnemühle Photo Rag A4
			'GLOBAL-STR-16X20', // Stretched Canvas
			'CLASSIC-GRE-FEDR-7X5-BLA', // Classic Greeting Card
			'SNAP-IPHONE13-CLR', // iPhone Snap Case
			'CUSHION-COVER-18X18', // Cushion Cover
			'MUG-11OZ-WHI', // Photo Mug
			'TSHIRT-GILDAN-M-BLK' // T-Shirt
		];

		const products = [];
		const errors = [];

		// Fetch details for each known SKU
		for (const sku of popularSkus) {
			try {
				const response = await fetch(`${baseUrl}/ProductDetails/${sku}`, {
					method: 'GET',
					headers: {
						'X-API-Key': apiKey,
						'Content-Type': 'application/json',
					},
				});

				if (response.ok) {
					const productData = await response.json();
					
					// Transform Prodigi product data into our template format
					const template = {
						id: productData.sku || sku,
						name: productData.title || productData.name || sku,
						displayName: productData.title || productData.name || sku,
						productType: productData.category || 'Print Product',
						description: productData.description || `Professional quality ${productData.title || sku}`,
						variants: productData.variants?.map((variant: any) => ({
							id: variant.sku || variant.id,
							sku: variant.sku,
							size: variant.size || variant.dimensions,
							material: variant.material,
							color: variant.color,
							price: variant.price?.amount,
							currency: variant.price?.currency,
						})) || [],
						printAreas: productData.printAreas?.map((area: any) => ({
							id: area.id || area.name,
							name: area.name || 'default',
							width: area.width,
							height: area.height,
							dpi: area.dpi || 300,
						})) || [{
							id: 'default',
							name: 'default',
							width: 1200,
							height: 1600,
							dpi: 300,
						}],
						details: {
							category: productData.category || 'Print Product',
							minDpi: 150,
							maxDpi: 600,
							sizes: productData.availableSizes || [],
							materials: productData.availableMaterials || [],
							colors: productData.availableColors || [],
						},
					};

					products.push(template);
				} else if (response.status !== 404) {
					// Only log non-404 errors (404 means SKU doesn't exist, which is expected)
					errors.push(`${sku}: ${response.status}`);
				}
			} catch (error) {
				errors.push(`${sku}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		if (products.length === 0) {
			return NextResponse.json(
				{ 
					error: 'No products found. This may indicate an authentication issue or API changes.',
					details: errors.length > 0 ? errors : 'No specific errors recorded'
				},
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			message: `Retrieved ${products.length} product templates from Prodigi API v4.0`,
			products,
			totalCount: products.length,
			note: 'Product catalog is based on popular SKUs. For complete catalog, please use the Prodigi dashboard.',
			errors: errors.length > 0 ? errors : undefined,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Failed to fetch catalog: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 