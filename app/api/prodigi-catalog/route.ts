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

		// Fetch products from Prodigi API
		const response = await fetch(`${baseUrl}/products`, {
			method: 'GET',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ error: `Failed to fetch products: ${response.status} - ${errorText}` },
				{ status: response.status }
			);
		}

		const productsData = await response.json();
		const products = productsData.products || [];

		// Transform Prodigi products into our template format
		const templates = products.map((product: any) => {
			const variants = product.variants || [];
			const printAreas = product.printAreas || [];
			
			return {
				id: product.id,
				name: product.name,
				displayName: product.displayName || product.name,
				productType: product.productType || 'print-on-demand',
				description: product.description || `${product.name} - Print on demand template`,
				details: {
					sizes: variants.map((v: any) => v.size?.name || v.size).filter(Boolean),
					materials: variants.map((v: any) => v.material || v.substrate).filter(Boolean),
					colors: variants.map((v: any) => v.color?.name || v.color).filter(Boolean),
					orientation: printAreas.length > 0 ? printAreas[0].orientation || 'Various' : 'Various',
					printAreas: printAreas.map((area: any) => area.name || area.id).filter(Boolean),
					minDpi: product.minDpi || 150,
					maxDpi: product.maxDpi || 300,
					category: product.category || 'apparel'
				},
				variants: variants.map((variant: any) => ({
					id: variant.id,
					sku: variant.sku,
					size: variant.size?.name || variant.size,
					material: variant.material || variant.substrate,
					color: variant.color?.name || variant.color,
					price: variant.price || variant.cost,
					currency: variant.currency || 'USD',
					printAreas: variant.printAreas || []
				})),
				printAreas: printAreas.map((area: any) => ({
					id: area.id,
					name: area.name,
					width: area.width,
					height: area.height,
					dpi: area.dpi,
					position: area.position
				})),
				shippingCosts: product.shippingCosts || [],
				attributes: product.attributes || {}
			};
		});

		return NextResponse.json({
			success: true,
			templates: templates,
			source: 'prodigi-catalog',
			count: templates.length,
			sandboxMode
		});

	} catch (error) {
		console.error('Error fetching Prodigi catalog:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch catalog' },
			{ status: 500 }
		);
	}
} 