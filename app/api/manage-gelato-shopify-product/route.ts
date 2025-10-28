import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { 
			productId,
			productTitle, // Product title with template suffix (e.g. "Flowerscape No.65 Canvas")
			shopifyCredentials,
			publishingChannels,
			maxRetries = 3, // Reduced to 3 for faster feedback  
			retryDelay = 10000 // Reduced to 10s for faster feedback
		} = await request.json();

		console.log('Received API call with:', {
			productId,
			productTitle,
			publishingChannels,
			shopifyCredentials: shopifyCredentials ? 'present' : 'missing'
		});
	

		if (!productId || !shopifyCredentials) {
			return NextResponse.json(
				{ error: 'Product ID and Shopify credentials are required' },
				{ status: 400 }
			);
		}

		const { storeUrl, accessToken } = shopifyCredentials;

		// Helper function to wait
		const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

		// Helper function to find product on Shopify by external ID
		const findShopifyProduct = async (externalId: string, productTitle?: string) => {
			try {
				console.log(`Searching for product: Gelato ID ${externalId}, Title: "${productTitle}"`);
				
				// Search for products with multiple criteria - get very recent products first
				const now = new Date();
				const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
				const searchUrl = `${storeUrl}/admin/api/2024-01/products.json?fields=id,title,vendor,handle,created_at,product_type,tags&limit=250&created_at_min=${thirtyMinutesAgo.toISOString()}`;
				
				const response = await fetch(searchUrl, {
					headers: {
						'X-Shopify-Access-Token': accessToken,
						'Content-Type': 'application/json',
					},
				});

				if (!response.ok) {
					console.error(`Shopify search failed: ${response.status}`);
					return null;
				}

				const data = await response.json();
				const products = data.products || [];
				
				console.log(`Found ${products.length} recent products to search through`);
				
				// Debug: Log all product titles to see what we're searching against
				console.log('Available product titles:', products.map((p: any) => p.title));
				
				// Strategy 1: Exact title match (most reliable)
				if (productTitle) {
					let product = products.find((p: any) => {
						const title = p.title?.toLowerCase().trim() || '';
						const searchTitleLower = productTitle.toLowerCase().trim();
						console.log(`Comparing "${title}" with "${searchTitleLower}"`);
						return title === searchTitleLower;
					});
					
					if (product) {
						console.log(`Found exact title match: ${product.title} (ID: ${product.id})`);
						return product;
					}
					
					// Strategy 2: Partial title match - but only if it's a close match
					product = products.find((p: any) => {
						const title = p.title?.toLowerCase().trim() || '';
						const searchTitleLower = productTitle.toLowerCase().trim();
						// Only match if the titles are very similar (at least 80% overlap)
						const titleWords = title.split(' ');
						const searchWords = searchTitleLower.split(' ');
						const commonWords = titleWords.filter((word: string) => searchWords.includes(word));
						const similarity = commonWords.length / Math.max(titleWords.length, searchWords.length);
						console.log(`Similarity between "${title}" and "${searchTitleLower}": ${similarity}`);
						return similarity > 0.8;
					});
					
					if (product) {
						console.log(`Found partial title match: ${product.title} (ID: ${product.id})`);
						return product;
					}
					
					// Strategy 2.5: Try searching with different time ranges in case the product is very new
					console.log('No exact or partial match found, trying extended search...');
					const extendedSearchUrl = `${storeUrl}/admin/api/2024-01/products.json?fields=id,title,vendor,handle,created_at,product_type,tags&limit=250&created_at_min=${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()}`; // 2 hours
					
					const extendedResponse = await fetch(extendedSearchUrl, {
						headers: {
							'X-Shopify-Access-Token': accessToken,
							'Content-Type': 'application/json',
						},
					});
					
					if (extendedResponse.ok) {
						const extendedData = await extendedResponse.json();
						const extendedProducts = extendedData.products || [];
						console.log(`Extended search found ${extendedProducts.length} products`);
						
						// Try exact match again with extended results
						product = extendedProducts.find((p: any) => {
							const title = p.title?.toLowerCase().trim() || '';
							const searchTitleLower = productTitle.toLowerCase().trim();
							return title === searchTitleLower;
						});
						
						if (product) {
							console.log(`Found exact title match in extended search: ${product.title} (ID: ${product.id})`);
							return product;
						}
					}
				}

				// Strategy 3: Look for most recent product from known vendors - but only if no title was provided
				// or if the product is very recent (within last 5 minutes) to avoid picking wrong products
				if (!productTitle) {
					const knownVendors = ['gelato', 'scape squared', 'print-on-demand', 'print studio'];
					const vendorProducts = products.filter((p: any) => {
						const vendor = p.vendor?.toLowerCase() || '';
						const productType = p.product_type?.toLowerCase() || '';
						const tags = (p.tags || '').toLowerCase();
						
						const isKnownVendor = knownVendors.some(v => vendor.includes(v));
						const isPrintProduct = productType.includes('print') || 
							productType.includes('custom') || 
							productType.includes('c-type') ||
							tags.includes('print') ||
							tags.includes('custom');
						
						return isKnownVendor || isPrintProduct;
					});
					
					if (vendorProducts.length > 0) {
						// Sort by creation date (most recent first)
						vendorProducts.sort((a: any, b: any) => 
							new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
						);
						
						const product = vendorProducts[0];
						console.log(`Found most recent vendor product: ${product.title} (ID: ${product.id})`);
						return product;
					}
				} else {
					console.log(`No exact match found for "${productTitle}". Skipping vendor-based fallback to avoid wrong product selection.`);
				}

				console.log('No matching products found');
				return null;
			} catch (error) {
				console.error('Error searching for Shopify product:', error);
				return null;
			}
		};

		// Helper function to get available publications
		const getAvailablePublications = async () => {
			try {
				const graphqlEndpoint = `${storeUrl}/admin/api/2024-01/graphql.json`;
				const query = `
					query {
						publications(first: 50) {
							edges {
								node {
									id
									name
									supportsFuturePublishing
								}
							}
						}
					}
				`;

				const response = await fetch(graphqlEndpoint, {
					method: 'POST',
					headers: {
						'X-Shopify-Access-Token': accessToken,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ query })
				});

				if (!response.ok) {
					console.error('Failed to fetch publications:', response.status);
					return [];
				}

				const result = await response.json();
				const publications = result.data?.publications?.edges?.map((edge: any) => ({
					id: edge.node.id.split('/').pop(), // Extract just the ID part
					name: edge.node.name,
					supportsFuturePublishing: edge.node.supportsFuturePublishing
				})) || [];

				console.log('Available publications:', publications);
				return publications;
			} catch (error) {
				console.error('Error fetching publications:', error);
				return [];
			}
		};

		// Helper function to manage product publications using GraphQL
		const manageProductPublications = async (shopifyProductId: string, channelIds: string[]) => {
			try {
				console.log(`Managing publications for product ${shopifyProductId} with channels:`, channelIds);

				// First, get available publications to validate our channel IDs
				const availablePublications = await getAvailablePublications();
				
				// Map channel identifiers to actual publication IDs
				const validChannelIds = channelIds.map(channelId => {
					// Handle string identifiers
					if (channelId === 'online-store') {
						const onlineStore = availablePublications.find((pub: any) => 
							pub.name.toLowerCase().includes('online') && pub.name.toLowerCase().includes('store')
						);
						if (onlineStore) {
							console.log(`Mapped 'online-store' to publication ID: ${onlineStore.id}`);
							return onlineStore.id;
						}
					}
					
					// Check if it's a direct publication ID match
					const directMatch = availablePublications.find((pub: any) => pub.id === channelId);
					if (directMatch) {
						console.log(`Found direct match for channel ID: ${channelId} (${directMatch.name})`);
						return channelId;
					}
					
					// Handle common channel mapping issues - try to match by partial name
					const channelMappings = {
						'113175658634': 'scape squared headless', // This is the old/incorrect ID
						'headless': 'scape squared headless',
						'scape': 'scape squared headless'
					};
					
					const mappingKey = channelMappings[channelId as keyof typeof channelMappings];
					if (mappingKey) {
						const mappedChannel = availablePublications.find((pub: any) => 
							pub.name.toLowerCase().includes(mappingKey.toLowerCase())
						);
						if (mappedChannel) {
							console.log(`Mapped legacy channel ID ${channelId} to: ${mappedChannel.id} (${mappedChannel.name})`);
							return mappedChannel.id;
						}
					}
					
					console.warn(`Channel ID ${channelId} not found in available publications`);
					return null;
				}).filter(id => id !== null);

				// If no valid channels, try to find the Online Store by default
				if (validChannelIds.length === 0) {
					const onlineStore = availablePublications.find((pub: any) => 
						pub.name.toLowerCase().includes('online') && pub.name.toLowerCase().includes('store')
					);
					if (onlineStore) {
						validChannelIds.push(onlineStore.id);
						console.log('Using default Online Store publication:', onlineStore);
					}
				}

				if (validChannelIds.length === 0) {
					console.error('No valid publication channels found');
					return false;
				}

				// Use GraphQL to publish the product to specified channels
				const graphqlEndpoint = `${storeUrl}/admin/api/2024-01/graphql.json`;
				
				// Simplified GraphQL mutation to publish product to channels
				// Just focus on making the mutation work without complex response parsing
				const mutation = `
					mutation productPublish($input: ProductPublishInput!) {
						productPublish(input: $input) {
							product {
								id
								title
							}
							userErrors {
								field
								message
							}
						}
					}
				`;

				const variables = {
					input: {
						id: `gid://shopify/Product/${shopifyProductId}`,
						productPublications: validChannelIds.map(channelId => ({
							publicationId: `gid://shopify/Publication/${channelId}`
						}))
					}
				};

				let retryCount = 0;
				const maxRetries = 3;
				
				while (retryCount < maxRetries) {
					try {
						console.log(`Attempting to publish product using GraphQL (attempt ${retryCount + 1}/${maxRetries})`);
						
						const response = await fetch(graphqlEndpoint, {
							method: 'POST',
							headers: {
								'X-Shopify-Access-Token': accessToken,
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								query: mutation,
								variables
							})
						});

						if (!response.ok) {
							if (response.status === 404) {
								console.log(`Product not ready for publishing yet (attempt ${retryCount + 1}/${maxRetries})`);
								retryCount++;
								if (retryCount < maxRetries) {
									await wait(5000);
									continue;
								}
								return false;
							}
							
							const errorText = await response.text();
							console.error(`GraphQL request failed: ${response.status}`, errorText);
							throw new Error(`GraphQL request failed: ${response.status}`);
						}

						const result = await response.json();
						
						if (result.errors) {
							console.error('GraphQL errors:', result.errors);
							throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
						}

						if (result.data?.productPublish?.userErrors && result.data.productPublish.userErrors.length > 0) {
							console.error('User errors:', result.data.productPublish.userErrors);
							throw new Error(`User errors: ${JSON.stringify(result.data.productPublish.userErrors)}`);
						}

						console.log('Product published successfully using GraphQL');
						console.log('Product result:', result.data?.productPublish?.product);
						
						return true;

					} catch (error) {
						console.error(`Error publishing product (attempt ${retryCount + 1}/${maxRetries}):`, error);
						retryCount++;
						if (retryCount < maxRetries) {
							await wait(5000);
						} else {
							throw error;
						}
					}
				}

				return false;
			} catch (error) {
				console.error('Error managing product publications:', error);
				return false;
			}
		};

		// Retry logic to wait for product to appear on Shopify
		let shopifyProduct = null;
		let retryCount = 0;

		while (!shopifyProduct && retryCount < maxRetries) {
			shopifyProduct = await findShopifyProduct(productId, productTitle);
			
			if (!shopifyProduct) {
				await wait(retryDelay);
				retryCount++;
			}
		}

		if (!shopifyProduct) {
			return NextResponse.json({
				success: false,
				error: `Product "${productTitle || productId}" not found on Shopify after ${maxRetries * retryDelay / 1000} seconds. This could mean:\n• The Gelato-Shopify integration isn't properly configured\n• The product is taking longer than usual to sync\n• There may be an issue with the product creation`,
				productId,
				productTitle,
				suggestion: 'Check your Gelato store settings and Shopify integration. The product may appear later - try the "Retry Sync" button in a few minutes.',
				troubleshooting: {
					checkShopifyIntegration: 'Verify your Gelato store is connected to Shopify in your Gelato dashboard',
					checkProductStatus: 'Check if the product appears in your Gelato store dashboard',
					waitTime: 'Products typically sync within 1-5 minutes, but can take up to 15 minutes during high traffic'
				}
			});
		}

		// Manage publishing channels if specified
		if (publishingChannels && publishingChannels.length > 0) {
			// Add a longer delay to ensure the product is fully ready for publication management
			console.log('Waiting 15 seconds before managing publications...');
			await wait(15000);
			
			try {
				const publishSuccess = await manageProductPublications(shopifyProduct.id, publishingChannels);
				
				if (publishSuccess) {
					return NextResponse.json({
						success: true,
						shopifyProductId: shopifyProduct.id,
						shopifyProduct,
						publishingChannels,
						channelsUpdated: true,
						message: 'Product found and publishing channels updated successfully'
					});
				} else {
					// If channel management failed, report partial success
					return NextResponse.json({
						success: false,  // Changed to false since channels weren't updated
						shopifyProductId: shopifyProduct.id,
						shopifyProduct,
						publishingChannels,
						channelsUpdated: false,
						error: 'Product found on Shopify but failed to update publishing channels. The product may need more time to be ready for publication management.',
						suggestion: 'Wait 2-3 minutes then use "Fix Channels" button, or manually publish the product in your Shopify admin.',
						troubleshooting: {
							productUrl: `${storeUrl}/admin/products/${shopifyProduct.id}`,
							retryIn: 'Wait 2-3 minutes then retry - newly created products may need time to be ready for publication management',
							manualSteps: 'You can manually set sales channels in Shopify admin: Product → Availability → Sales channels'
						}
					});
				}
			} catch (networkError) {
				// Handle network/fetch errors specifically
				console.error('Network error during channel management:', networkError);
				return NextResponse.json({
					success: false,
					shopifyProductId: shopifyProduct.id,
					shopifyProduct,
					publishingChannels,
					channelsUpdated: false,
					error: 'Network error while updating publishing channels. Please check your internet connection and try again.',
					suggestion: 'Check your internet connection and use "Fix Channels" button to retry.',
					troubleshooting: {
						productUrl: `${storeUrl}/admin/products/${shopifyProduct.id}`,
						networkError: true,
						retryIn: 'Try again in a few moments when network connection is stable'
					}
				});
			}
		}

		// If no channels to manage, just return the found product
		return NextResponse.json({
			success: true,
			shopifyProductId: shopifyProduct.id,
			shopifyProduct,
			message: 'Product found on Shopify'
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Failed to manage product: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
}

// Add a new GET endpoint for debugging Shopify products
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const storeUrl = searchParams.get('storeUrl');
		const accessToken = searchParams.get('accessToken');
		const productId = searchParams.get('productId');
		
		if (!storeUrl || !accessToken) {
			return NextResponse.json(
				{ error: 'Store URL and access token are required' },
				{ status: 400 }
			);
		}

		// Get recent products from Shopify for debugging
		const searchUrl = `${storeUrl}/admin/api/2024-01/products.json?fields=id,title,vendor,handle,created_at,product_type,tags&limit=50&created_at_min=${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`;
		const response = await fetch(searchUrl, {
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Failed to fetch Shopify products: ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		const products = data.products || [];
		
		// Filter products to show what might match our search
		const recentProducts = products.filter((p: any) => {
			const createdAt = new Date(p.created_at).getTime();
			const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
			return createdAt > thirtyMinutesAgo;
		});

		const potentialMatches = productId ? products.filter((p: any) => {
			const title = p.title?.toLowerCase() || '';
			const handle = p.handle?.toLowerCase() || '';
			const tags = (p.tags || '').toLowerCase();
			const vendor = p.vendor?.toLowerCase() || '';
			const productType = p.product_type?.toLowerCase() || '';
			const productIdLower = productId.toLowerCase();
			
			// Check if this product could match our search criteria
			const hasIdMatch = title.includes(productIdLower) || 
							   handle.includes(productIdLower) || 
							   tags.includes(productIdLower);
			
			const hasPartialMatch = [8, 12, 16, 20].some(length => {
				const shortId = productId.substring(0, length).toLowerCase();
				return title.includes(shortId) || handle.includes(shortId) || tags.includes(shortId);
			});
			
			const hasVendorMatch = ['gelato', 'scape squared', 'print-on-demand', 'print studio'].some(v => vendor.includes(v));
			const hasTypeMatch = productType.includes('print') || productType.includes('custom') || productType.includes('c-type');
			const hasTagMatch = tags.includes('print') || tags.includes('custom');
			
			return hasIdMatch || hasPartialMatch || hasVendorMatch || hasTypeMatch || hasTagMatch;
		}) : [];

		return NextResponse.json({
			success: true,
			debug: {
				totalProducts: products.length,
				recentProductsCount: recentProducts.length,
				potentialMatchesCount: potentialMatches.length,
				searchingFor: productId,
				allProducts: products.map((p: any) => ({
					id: p.id,
					title: p.title,
					vendor: p.vendor,
					handle: p.handle,
					created_at: p.created_at,
					product_type: p.product_type,
					tags: p.tags
				})),
				recentProducts: recentProducts.map((p: any) => ({
					id: p.id,
					title: p.title,
					vendor: p.vendor,
					handle: p.handle,
					created_at: p.created_at,
					product_type: p.product_type,
					tags: p.tags
				})),
				potentialMatches: potentialMatches.map((p: any) => ({
					id: p.id,
					title: p.title,
					vendor: p.vendor,
					handle: p.handle,
					created_at: p.created_at,
					product_type: p.product_type,
					tags: p.tags
				}))
			}
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 