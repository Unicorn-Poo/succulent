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
			'https://order.gelatoapis.com/v4/products/catalogs',
			'https://order.gelatoapis.com/v3/products/catalogs',
		];

		let catalogData = null;
		let lastError = null;

		for (const endpoint of endpoints) {
			try {
				console.log(`Trying endpoint: ${endpoint}`);
				const response = await fetch(endpoint, {
					method: 'GET',
					headers: {
						'X-API-KEY': apiKey,
						'Content-Type': 'application/json',
					},
				});

				console.log(`${endpoint} -> Status: ${response.status}`);

				if (response.ok) {
					catalogData = await response.json();
					console.log(`${endpoint} -> Success`);
					break;
				} else {
					const errorText = await response.text();
					console.log(`${endpoint} -> Error: ${errorText}`);
					lastError = errorText;
				}
			} catch (error) {
				console.log(`${endpoint} -> Exception:`, error);
				lastError = error;
			}
		}

		if (!catalogData) {
			// Provide fallback templates
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
				},
				{
					id: 'template-poster-print',
					name: 'Poster Print',
					displayName: 'Premium Poster',
					productType: 'poster',
					description: 'High-quality poster print on premium paper',
					details: {
						sizes: ['11x17 inches', '18x24 inches', '24x36 inches'],
						materials: ['Matte Paper', 'Glossy Paper', 'Semi-Gloss'],
						colors: ['Full Color CMYK'],
						orientation: 'Both Portrait and Landscape',
						printAreas: ['Full Poster']
					}
				}
			];

			return NextResponse.json({
				success: true,
				templates: fallbackTemplates,
				source: 'fallback',
				note: 'Using fallback templates. Configure your Gelato store for more options.',
				lastError: lastError
			});
		}

		// Process catalog data to extract usable templates with proper data extraction
		let templates: any[] = [];
		
		console.log('Processing catalog response:', JSON.stringify(catalogData, null, 2));
		
		// Extract available catalogs from the response
		const catalogs = catalogData.data || catalogData.catalogs || [];
		const allTemplates = [];
		
		if (Array.isArray(catalogs) && catalogs.length > 0) {
			// Take the first few catalogs to get sample templates
			const catalogsToFetch = catalogs.slice(0, 3); // Limit to first 3 catalogs
			
			for (const catalog of catalogsToFetch) {
				try {
					const catalogId = catalog.uid || catalog.id || catalog.name;
					if (!catalogId) continue;
					
					console.log(`Fetching products from catalog: ${catalogId}`);
					
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
							allTemplates.push(...products.slice(0, 5));
						}
					}
				} catch (error) {
					console.log(`Error fetching products from catalog: ${error}`);
				}
			}
		}
		
		if (allTemplates.length > 0) {
			templates = allTemplates.map((item: any) => {
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

	} catch (error) {
		console.error('Error fetching Gelato catalog:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch catalog' },
			{ status: 500 }
		);
	}
} 