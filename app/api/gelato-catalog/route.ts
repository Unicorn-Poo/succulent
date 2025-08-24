import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { apiKey } = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		// Try Gelato's product catalog endpoints to get available templates
		const endpoints = [
			'https://ecommerce.gelatoapis.com/v1/catalog/products',
			'https://ecommerce.gelatoapis.com/v1/products',
			'https://ecommerce.gelatoapis.com/v1/catalog/templates',
			'https://ecommerce.gelatoapis.com/v1/templates',
		];

		let catalogData;
		let foundEndpoint = '';

		for (const endpoint of endpoints) {
			try {
				const response = await fetch(endpoint, {
					method: 'GET',
					headers: {
						'X-API-KEY': apiKey,
						'Content-Type': 'application/json',
					},
				});

				if (response.ok) {
					catalogData = await response.json();
					foundEndpoint = endpoint;
					break;
				}
			} catch (error) {
				// Continue to next endpoint
			}
		}

		if (!catalogData) {
			return NextResponse.json({ error: 'Unable to fetch catalog data from any endpoint' }, { status: 500 });
		}

		// Handle different response structures
		if (catalogData.catalogs && Array.isArray(catalogData.catalogs)) {
			const catalogsWithProducts = [];
			
			for (const catalog of catalogData.catalogs) {
				try {
					const productsResponse = await fetch(`${foundEndpoint}/${catalog.id}/products`, {
						method: 'GET',
						headers: {
							'X-API-KEY': apiKey,
							'Content-Type': 'application/json',
						},
					});

					if (productsResponse.ok) {
						const products = await productsResponse.json();
						catalogsWithProducts.push({
							...catalog,
							products: products.products || products
						});
					}
				} catch (error) {
					// Skip catalogs that fail to load products
				}
			}

			// Process catalog data to extract usable templates with proper data extraction
			let templates: any[] = [];
			
			if (catalogsWithProducts.length > 0) {
				// Take the first few catalogs to get sample templates
				const catalogsToFetch = catalogsWithProducts.slice(0, 3); // Limit to first 3 catalogs
				
				for (const catalog of catalogsToFetch) {
					try {
						const catalogId = catalog.uid || catalog.id || catalog.name;
						if (!catalogId) continue;
						
						// Fetch products from this specific catalog
						const productsUrl = `https://order.gelatoapis.com/v4/products/catalogs/${catalogId}/products`;
						const productsResponse = await fetch(productsUrl, {
							method: 'GET',
							headers: {
								'X-API-KEY': apiKey,
								'Content-Type': 'application/json',
							},
						});
						
						if (productsResponse.ok) {
							const productsData = await productsResponse.json();
							const products = productsData.data || productsData.products || [];
							
							if (Array.isArray(products)) {
								// Take first few products as templates
								templates.push(...products.slice(0, 5));
							}
						}
					} catch (error) {
				
					}
				}
			}
			
			if (templates.length > 0) {
				templates = templates.map((item: any) => {
					// Extract the actual display name from Gelato's response
					const displayName = item.displayName || item.productDisplayName || item.title || item.name;
					const name = item.name || item.productName || displayName;
					const productType = item.productType || item.category || item.type || 'template';
					
					// Extract size and details from variants or specifications
					const variants = item.variants || item.options || item.sizes || [];
					const sizes = variants.map((v: any) => v.size || v.dimensions || v.name).filter(Boolean);
					const materials = variants.map((v: any) => v.material || v.substrate || v.type).filter(Boolean);
					const colors = variants.map((v: any) => v.color || v.colorName || v.colorOption).filter(Boolean);
					
					return {
						id: item.uid || item.id || item.templateId || `template-${Date.now()}`,
						name,
						displayName,
						productType,
						description: item.description || `${displayName} template`,
						details: {
							sizes: sizes.length > 0 ? sizes : ['Various sizes'],
							materials: materials.length > 0 ? materials : ['Standard materials'],
							colors: colors.length > 0 ? colors : ['Multiple colors'],
							orientation: item.orientation || 'Various orientations',
							printAreas: item.printAreas || item.printOptions || ['Default print area']
						},
						variants: variants.map((v: any) => ({
							id: v.id || v.uid,
							size: v.size || v.dimensions,
							material: v.material || v.substrate,
							color: v.color || v.colorName,
							price: v.price || v.cost
						}))
					};
				});
			}

			if (templates.length === 0) {
				// If no templates found in catalog, use fallback
				const fallbackTemplates = [
					{
						id: 'template-xscape-print',
						name: 'X-Scape Print',
						displayName: 'X-Scape No. Print',
						productType: 'apparel',
						description: 'Premium custom t-shirt with X-Scape print design',
						details: {
							sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
							materials: ['100% Cotton', 'Cotton Blend'],
							colors: ['Black', 'White', 'Navy', 'Gray'],
							orientation: 'Portrait',
							printAreas: ['Front', 'Back', 'Chest']
						}
					},
					{
						id: 'template-canvas-print',
						name: 'Canvas Print',
						displayName: 'Canvas',
						productType: 'wall-art',
						description: 'High-quality canvas print for wall art',
						details: {
							sizes: ['8x10 inches', '12x16 inches', '16x20 inches', '24x36 inches'],
							materials: ['Premium Canvas', 'Gallery Wrap'],
							colors: ['Natural Canvas', 'White Base'],
							orientation: 'Both Portrait and Landscape',
							printAreas: ['Full Canvas']
						}
					}
				];

				return NextResponse.json({
					success: true,
					templates: fallbackTemplates,
					source: 'fallback',
					note: 'No templates found in catalog. Using default options.'
				});
			}

			return NextResponse.json({
				success: true,
				templates: templates,
				source: 'catalog',
				count: templates.length
			});

		} else {
			// If no catalogs found, provide fallback templates
			const fallbackTemplates = [
				{
					id: 'template-xscape-print',
					name: 'X-Scape Print',
					displayName: 'X-Scape No. Print',
					productType: 'apparel',
					description: 'Premium custom t-shirt with X-Scape print design',
					details: {
						sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
						materials: ['100% Cotton', 'Cotton Blend'],
						colors: ['Black', 'White', 'Navy', 'Gray'],
						orientation: 'Portrait',
						printAreas: ['Front', 'Back', 'Chest']
					}
				},
				{
					id: 'template-canvas-print',
					name: 'Canvas Print',
					displayName: 'Canvas',
					productType: 'wall-art',
					description: 'High-quality canvas print for wall art',
					details: {
						sizes: ['8x10 inches', '12x16 inches', '16x20 inches', '24x36 inches'],
						materials: ['Premium Canvas', 'Gallery Wrap'],
						colors: ['Natural Canvas', 'White Base'],
						orientation: 'Both Portrait and Landscape',
						printAreas: ['Full Canvas']
					}
				}
			];

			return NextResponse.json({
				success: true,
				templates: fallbackTemplates,
				source: 'fallback',
				note: 'No catalog data found. Using default options.'
			});
		}

	} catch (error) {
		console.error('Error fetching Gelato catalog:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch catalog' },
			{ status: 500 }
		);
	}
} 