import { NextRequest, NextResponse } from 'next/server';

// Function to import a specific template by ID
async function importTemplate(apiKey: string, templateId: string, saveToJazzAccount?: boolean, jazzAccountId?: string) {
	console.log(`Importing template with ID: ${templateId}`);
	
	try {
		// Updated endpoints based on official Gelato API documentation
		// https://dashboard.gelato.com/docs/ecommerce/templates/get/
		const templateEndpoints = [
			// Official endpoint from docs
			`https://ecommerce.gelatoapis.com/v1/templates/${templateId}`,
			// Backup endpoints (in case the official one has issues)
			`https://order.gelatoapis.com/v4/ecommerce/templates/${templateId}`,
			`https://order.gelatoapis.com/v3/ecommerce/templates/${templateId}`,
		];

		let templateData = null;
		let successfulEndpoint = null;

		for (const endpoint of templateEndpoints) {
			console.log(`Trying template endpoint: ${endpoint}`);
			
			try {
				const response = await fetch(endpoint, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'X-API-KEY': apiKey,
					},
				});

				console.log(`${endpoint} -> Status: ${response.status}`);

				if (response.ok) {
					templateData = await response.json();
					successfulEndpoint = endpoint;
					console.log(`✅ Successfully fetched template from: ${endpoint}`);
					break;
				} else {
					const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
					console.log(`${endpoint} -> Error:`, errorData);
				}
			} catch (error) {
				console.log(`${endpoint} -> Network Error:`, error);
			}
		}

		if (!templateData) {
			return NextResponse.json(
				{ 
					error: 'Template not found',
					details: `Template with ID "${templateId}" could not be found.`,
					troubleshooting: {
						possibleCauses: [
							'Template ID is incorrect or does not exist',
							'Template belongs to a different account',
							'Template has been deleted',
							'API key does not have access to this template'
						],
						suggestions: [
							'Double-check the template ID',
							'Verify the template exists in your Gelato dashboard',
							'Ensure your API key has the correct permissions'
						]
					}
				},
				{ status: 404 }
			);
		}

		// Process the template data according to the official API response structure
		console.log('Processing template data from official API...');
		console.log('Template data:', JSON.stringify(templateData, null, 2));
		
		// Extract template details from the official API response structure
		const processedTemplate = {
			// Basic template info
			gelatoTemplateId: templateData.id,
			name: templateData.templateName || templateData.title || 'Unnamed Template',
			title: templateData.title || templateData.templateName || 'Untitled',
			description: templateData.description || 'No description available',
			previewUrl: templateData.previewUrl || null,
			productType: templateData.productType || 'Unknown',
			vendor: templateData.vendor || 'Gelato',
			
			// Enhanced product metadata for Shopify
			tags: templateData.tags || [],
			categories: templateData.categories || [],
			keywords: templateData.keywords || [],
			seoTitle: templateData.seoTitle || templateData.title,
			seoDescription: templateData.seoDescription || templateData.description,
			
			// Pricing information if available
			pricing: {
				currency: templateData.currency || 'USD',
				basePrice: templateData.basePrice || null,
				priceRange: templateData.priceRange || null,
				retailPrice: templateData.retailPrice || null,
			},
			
			// Product specifications
			specifications: {
				material: templateData.material || null,
				weight: templateData.weight || null,
				dimensions: templateData.dimensions || null,
				features: templateData.features || [],
				careInstructions: templateData.careInstructions || null,
			},
			
			// Variant information
			variants: templateData.variants || [],
			variantCount: templateData.variants?.length || 0,
			
			// Extract available sizes from variants
			availableSizes: templateData.variants 
				? [...new Set(templateData.variants.flatMap((v: any) => 
					v.variantOptions?.filter((opt: any) => opt.name === 'Size')?.map((opt: any) => opt.value) || []
				))]
				: [],
			
			// Extract available colors from variants
			availableColors: templateData.variants 
				? [...new Set(templateData.variants.flatMap((v: any) => 
					v.variantOptions?.filter((opt: any) => opt.name === 'Color')?.map((opt: any) => opt.value) || []
				))]
				: [],
			
			// Extract product UIDs
			productUids: templateData.variants 
				? templateData.variants.map((v: any) => v.productUid).filter(Boolean)
				: [],
			
			// Print areas from image placeholders
			printAreas: templateData.variants 
				? [...new Set(templateData.variants.flatMap((v: any) => 
					v.imagePlaceholders?.map((ip: any) => ip.printArea) || []
				))]
				: [],
			
			// Shopify-specific fields
			shopifyData: {
				productType: templateData.productType || 'Custom Product',
				vendor: templateData.vendor || 'Gelato',
				tags: [
					...(templateData.tags || []),
					'Print on Demand',
					'Custom',
					templateData.productType || 'Product'
				].filter(Boolean),
				handle: templateData.handle || null,
				status: 'draft', // Start as draft
				publishedScope: 'web', // Default publishing scope
			},
			
			// Metadata
			createdAt: templateData.createdAt,
			updatedAt: templateData.updatedAt,
			importedAt: new Date().toISOString(),
			
			// Jazz-specific fields
			details: {
				endpoint: successfulEndpoint,
				apiVersion: successfulEndpoint?.includes('v1') ? 'v1' : 'legacy'
			}
		};

		// Save to Jazz account if requested
		let jazzSaveResult = null;
		if (saveToJazzAccount && jazzAccountId) {
			jazzSaveResult = await saveTemplateToJazzAccount(processedTemplate, jazzAccountId);
		}

		console.log(`✅ Template import successful: "${processedTemplate.name}"`);
		console.log(`Template has ${processedTemplate.variantCount} variants and ${processedTemplate.availableSizes.length} different sizes`);

		return NextResponse.json({
			success: true,
			message: 'Template imported successfully from Gelato API',
			template: processedTemplate,
			jazzSave: jazzSaveResult,
			source: 'gelato_ecommerce_api',
			endpoint: successfulEndpoint,
			stats: {
				variants: processedTemplate.variantCount,
				sizes: processedTemplate.availableSizes.length,
				printAreas: processedTemplate.printAreas.length,
				productUids: processedTemplate.productUids.length
			}
		});

	} catch (error) {
		console.error('Error importing template:', error);
		return NextResponse.json({
			error: 'Failed to import template',
			details: error instanceof Error ? error.message : 'Unknown error occurred'
		}, { status: 500 });
	}
}

// Function to save a processed template to a Jazz account
async function saveTemplateToJazzAccount(processedTemplate: any, jazzAccountId: string) {
	console.log(`Saving template "${processedTemplate.name}" to Jazz account with ID: ${jazzAccountId}`);
	
	try {
		// TODO: Implement proper Jazz integration
		// For now, we'll simulate the save and return success
		// In a real implementation, this would use the Jazz client/SDK
		
		console.log('Jazz account integration not yet implemented - simulating save');
		console.log('Template data to save:', JSON.stringify(processedTemplate, null, 2));
		
		// Simulate successful save
		return {
			success: true,
			message: 'Template saved successfully (simulated)',
			templateId: processedTemplate.gelatoTemplateId,
			jazzAccountId: jazzAccountId,
			savedAt: new Date().toISOString()
		};
		
		/* 
		// Future implementation would look like:
		import { JazzClient } from 'jazz-sdk';
		const jazzClient = new JazzClient();
		const result = await jazzClient.saveTemplate(jazzAccountId, processedTemplate);
		return result;
		*/
		
	} catch (error) {
		console.error('Error in Jazz account save simulation:', error);
		return {
			success: false,
			error: 'Jazz account save failed',
			details: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// Function to process template data for Jazz account storage
function processTemplateForJazz(templateData: any, templateId: string, endpoint: string | null) {
	console.log('Processing template data for Jazz account...');
	
	// Extract key information from the Gelato template
	const template = {
		// Core template info
		id: templateData.id || templateId,
		gelatoTemplateId: templateId,
		name: templateData.title || templateData.name || `Template ${templateId}`,
		description: templateData.description || 'Imported from Gelato',
		
		// Template details
		productType: templateData.productType || 'unknown',
		productNameUid: templateData.productNameUid,
		previewUrl: templateData.previewUrl,
		
		// Variants and options
		variants: templateData.variants?.map((variant: any) => ({
			id: variant.id,
			title: variant.title,
			productUid: variant.productUid,
			variantOptions: variant.variantOptions || [],
			imagePlaceholders: variant.imagePlaceholders || [],
			textPlaceholders: variant.textPlaceholders || []
		})) || [],
		
		// Product variant options (sizes, colors, etc.)
		productVariantOptions: templateData.productVariantOptions || [],
		
		// Import metadata
		importedAt: new Date().toISOString(),
		importedFrom: endpoint,
		originalData: templateData, // Keep full original data
		
		// Jazz-specific fields (to be customized based on Jazz data structure)
		jazzMetadata: {
			imported: true,
			source: 'gelato',
			templateType: 'ecommerce',
			customizable: true,
			variants: templateData.variants?.length || 0
		}
	};

	console.log(`Processed template: ${template.name} with ${template.variants.length} variants`);
	return template;
}

export async function POST(request: NextRequest) {
	try {
		const { apiKey, storeId, templateId, action, saveToJazzAccount, jazzAccountId } = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		// Handle template import action
		if (action === 'import' && templateId) {
			return await importTemplate(apiKey, templateId, saveToJazzAccount, jazzAccountId);
		}

		// Original functionality - fetch product catalog
		console.log('Fetching available products from Gelato API...');
		console.log('Note: Gelato does not provide a "list all templates" endpoint. Templates work differently.');
		
		// Updated endpoints based on official Gelato API documentation
		// Note: Template list endpoints don't exist in Gelato API
		const productEndpoints = [
			// Store-specific products (if store ID provided)
			...(storeId ? [
				`https://order.gelatoapis.com/v4/ecommerce/stores/${storeId}/products`,
				`https://order.gelatoapis.com/v3/ecommerce/stores/${storeId}/products`
			] : []),
			// General ecommerce products (this works and returns the product catalog)
			`https://order.gelatoapis.com/v4/ecommerce/products`,
			`https://order.gelatoapis.com/v3/ecommerce/products`,
			// Product catalog endpoints
			`https://order.gelatoapis.com/v4/products`,
			`https://order.gelatoapis.com/v3/products`,
			// Catalog endpoints
			`https://order.gelatoapis.com/v4/catalogs`,
			`https://order.gelatoapis.com/v3/catalogs`,
		];

		let productsData = null;
		let successfulEndpoint = null;

		for (const endpoint of productEndpoints) {
			console.log(`Trying endpoint: ${endpoint}`);
			try {
				const response = await fetch(endpoint, {
					method: 'GET',
					headers: {
						'X-API-KEY': apiKey,
						'Content-Type': 'application/json',
						'Accept': 'application/json',
					},
				});

				console.log(`${endpoint} -> Status: ${response.status}`);

				if (response.ok) {
					const responseData = await response.json();
					productsData = responseData;
					successfulEndpoint = endpoint;
					console.log(`✅ Successfully fetched data from: ${endpoint}`);
					console.log(`Response contains: ${Array.isArray(responseData) ? responseData.length : 'object'} items`);
					
					// Check if this looks like template data vs general product catalog
					if (endpoint.includes('/stores/')) {
						console.log('🏪 This appears to be store-specific product data');
					} else {
						console.log('📦 This appears to be general product catalog data');
					}
					
					break;
				} else {
					let errorResponse;
					try {
						errorResponse = await response.json();
					} catch {
						errorResponse = await response.text();
					}
					console.log(`${endpoint} -> Error: ${JSON.stringify(errorResponse)}`);
				}
			} catch (error) {
				console.log(`${endpoint} -> Network error: ${error}`);
			}
		}

		if (!productsData) {
			console.log('All endpoints failed, providing template guidance');
			
			return NextResponse.json({
				success: false,
				error: 'Could not fetch product data from Gelato API',
				explanation: {
					title: 'How Gelato Templates Actually Work',
					message: 'Gelato does not provide a "list all templates" endpoint. Here\'s how templates work in Gelato:',
					workflow: [
						'1. Browse the general product catalog (what we tried to fetch)',
						'2. Find products you want to use as templates',
						'3. Use "Create product from template" with specific template IDs',
						'4. Get individual templates by ID when you know the specific template ID'
					],
					apiEndpoints: {
						'List Products': '/v4/ecommerce/products (working)',
						'Get Template by ID': '/v4/ecommerce/templates/{templateId}',
						'Create from Template': '/v4/ecommerce/products (POST with templateId)'
					}
				},
				fallbackProducts: [
					{
						id: 'product-apparel-tshirt',
						name: 'T-Shirt Template Base',
						displayName: 'Custom T-Shirt',
						productType: 'apparel',
						description: 'Create custom t-shirts using Gelato\'s product catalog',
						gelatoProductUid: 'apparel_product_gca_t-shirt_gsc_crewneck_gcu_unisex',
						howToUse: 'Use this productUid to create custom products via the Gelato API'
					},
					{
						id: 'product-wall-art-poster',
						name: 'Poster Template Base', 
						displayName: 'Custom Poster',
						productType: 'wall-art',
						description: 'Create custom posters using Gelato\'s product catalog',
						gelatoProductUid: 'poster_product_pf_210x297-mm',
						howToUse: 'Use this productUid to create custom products via the Gelato API'
					}
				]
			});
		}

		// Process data from Gelato API
		console.log('Processing API response...');
		
		// The response contains products from Gelato's catalog
		let rawItems = [];
		let dataSource = 'unknown';
		
		// Try to extract items from different possible response structures
		if (productsData.data && Array.isArray(productsData.data)) {
			rawItems = productsData.data;
			dataSource = 'product-data';
		} else if (productsData.products && Array.isArray(productsData.products)) {
			rawItems = productsData.products;
			dataSource = successfulEndpoint?.includes('stores/') ? 'store-products' : 'general-products';
		} else if (productsData.items && Array.isArray(productsData.items)) {
			rawItems = productsData.items;
			dataSource = 'items';
		} else if (productsData.catalogs && Array.isArray(productsData.catalogs)) {
			rawItems = productsData.catalogs;
			dataSource = 'catalogs';
		} else if (Array.isArray(productsData)) {
			rawItems = productsData;
			dataSource = 'direct-array';
		}
		
		console.log(`Found ${rawItems.length} products from data source: ${dataSource}`);
		
		const processedProducts = [];
		
		if (rawItems.length > 0) {
			console.log(`Processing ${Math.min(rawItems.length, 25)} products as template bases`);
			
			// Process first 25 items as potential template bases
			const itemsToProcess = rawItems.slice(0, 25);
			
			for (const item of itemsToProcess) {
				try {
					// Extract the actual display name from Gelato's response
					const displayName = item.displayName || item.name || item.title || item.productNameUid || item.id || 'Unknown Product';
					const name = item.name || item.productName || item.productNameUid || displayName;
					const productType = item.productTypeUid || item.productType || item.category || item.type || 'template';
					const productUid = item.productUid || item.uid || item.id;
					
					// Extract size and details from dimensions or specifications
					const dimensions = item.dimensions || [];
					const variants = item.variants || item.options || item.sizes || [];
					
					// Extract details with fallbacks
					const sizes = dimensions
						.filter((d: any) => d.name === 'size')
						.map((d: any) => d.valueFormatted || d.value)
						.filter(Boolean);
					
					const colors = dimensions
						.filter((d: any) => d.name === 'color')
						.map((d: any) => d.valueFormatted || d.value)
						.filter(Boolean);
					
					const printOptions = dimensions
						.filter((d: any) => d.name === 'sidesWithPrint')
						.map((d: any) => d.valueFormatted || d.value)
						.filter(Boolean);
					
					// Build processed template base
					const processedProduct = {
						id: productUid || `product-${Date.now()}-${Math.random()}`,
						name,
						displayName,
						productType,
						productUid: productUid, // This is what you use to create products
						description: `Template base for ${displayName}. Use the productUid to create custom products via Gelato API.`,
						originalData: item, // Keep original data for debugging
						details: {
							sizes: sizes.length > 0 ? sizes : ['Various sizes available'],
							colors: colors.length > 0 ? colors : ['Multiple colors available'],
							printOptions: printOptions.length > 0 ? printOptions : ['Custom print options'],
							dimensions: dimensions.map((d: any) => ({
								name: d.nameFormatted || d.name,
								value: d.valueFormatted || d.value
							}))
						},
						howToUse: `Use productUid "${productUid}" in Gelato's "Create product from template" API to make custom products.`
					};

					processedProducts.push(processedProduct);
				} catch (itemError) {
					console.warn('Error processing item:', itemError, 'Item:', item);
				}
			}
		}

		// Group products by type for better organization
		const productsByType = processedProducts.reduce((acc: any, product: any) => {
			const type = product.productType || 'other';
			if (!acc[type]) acc[type] = [];
			acc[type].push(product);
			return acc;
		}, {});

		console.log(`Successfully processed ${processedProducts.length} products`);
		console.log(`Product types found: ${Object.keys(productsByType).join(', ')}`);
		
		return NextResponse.json({
			success: true,
			explanation: {
				title: 'Gelato Product Catalog (Template Bases)',
				message: 'These are products from Gelato\'s catalog that can be used as template bases.',
				howTemplatesWork: [
					'Gelato doesn\'t provide a "list templates" endpoint',
					'Instead, you use products from the catalog as template bases',
					'Use the productUid to create custom products via the API',
					'Templates are created by customizing these base products'
				],
				apiUsage: {
					createProduct: 'POST /v4/ecommerce/products with productUid and customization',
					getTemplate: 'GET /v4/ecommerce/templates/{templateId} for specific templates',
					documentation: 'https://dashboard.gelato.com/docs/'
				}
			},
			products: processedProducts,
			productsByType: productsByType,
			source: 'gelato_api',
			dataSource: dataSource,
			endpoint: successfulEndpoint,
			totalFound: processedProducts.length,
			isProductCatalog: true,
			rawApiResponse: productsData // Include for debugging
		});

	} catch (error) {
		console.error('Error fetching Gelato products:', error);
		return NextResponse.json(
			{ 
				error: 'Failed to fetch product data',
				details: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
} 