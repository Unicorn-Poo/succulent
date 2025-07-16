import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { storeType, apiUrl, apiKey, webhookSecret } = await request.json();

		if (!storeType || !apiUrl || !apiKey) {
			return NextResponse.json(
				{ error: 'Store type, API URL, and API key are required' },
				{ status: 400 }
			);
		}

		// Normalize API URL
		const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
		
		let testEndpoint = '';
		let headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Configure test endpoint and headers based on store type
		switch (storeType) {
			case 'woocommerce':
				testEndpoint = `${baseUrl}/wp-json/wc/v3/products?per_page=1`;
				headers['Authorization'] = `Basic ${Buffer.from(apiKey).toString('base64')}`;
				break;
				
			case 'shopify':
				testEndpoint = `${baseUrl}/admin/api/2023-10/products.json?limit=1`;
				headers['X-Shopify-Access-Token'] = apiKey;
				break;
				
			case 'medusa':
				testEndpoint = `${baseUrl}/admin/products?limit=1`;
				headers['Authorization'] = `Bearer ${apiKey}`;
				break;
				
			case 'magento':
				testEndpoint = `${baseUrl}/rest/V1/products?searchCriteria[pageSize]=1`;
				headers['Authorization'] = `Bearer ${apiKey}`;
				break;
				
			case 'custom':
				// For custom stores, try a generic health check or products endpoint
				testEndpoint = `${baseUrl}/api/products?limit=1`;
				headers['Authorization'] = `Bearer ${apiKey}`;
				// Also try common API key header patterns
				headers['X-API-Key'] = apiKey;
				break;
				
			default:
				return NextResponse.json(
					{ error: 'Unsupported store type' },
					{ status: 400 }
				);
		}

		// Test the connection
		const response = await fetch(testEndpoint, {
			method: 'GET',
			headers,
		});

		if (!response.ok) {
			const errorText = await response.text();
			
			// Try alternative endpoints for custom stores
			if (storeType === 'custom') {
				const alternatives = [
					`${baseUrl}/api/health`,
					`${baseUrl}/health`,
					`${baseUrl}/status`,
					`${baseUrl}/api/status`,
				];
				
				for (const altEndpoint of alternatives) {
					try {
						const altResponse = await fetch(altEndpoint, {
							method: 'GET',
							headers,
						});
						
						if (altResponse.ok) {
							return NextResponse.json({
								success: true,
								message: 'Connection successful',
								storeType,
								endpoint: altEndpoint,
								timestamp: new Date().toISOString(),
								capabilities: {
									products: false, // We couldn't test products endpoint
									health: true,
								}
							});
						}
					} catch (altError) {
						// Continue to next alternative
					}
				}
			}
			
			return NextResponse.json(
				{ 
					success: false,
					error: `Connection failed: ${response.status} - ${errorText}`,
					status: response.status,
					endpoint: testEndpoint
				},
				{ status: response.status }
			);
		}

		const data = await response.json();
		
		// Validate response structure based on store type
		let isValidResponse = false;
		let productCount = 0;
		
		switch (storeType) {
			case 'woocommerce':
				isValidResponse = Array.isArray(data);
				productCount = data.length;
				break;
				
			case 'shopify':
				isValidResponse = data.products && Array.isArray(data.products);
				productCount = data.products?.length || 0;
				break;
				
			case 'medusa':
				isValidResponse = data.products && Array.isArray(data.products);
				productCount = data.products?.length || 0;
				break;
				
			case 'magento':
				isValidResponse = data.items && Array.isArray(data.items);
				productCount = data.items?.length || 0;
				break;
				
			case 'custom':
				// For custom stores, accept any JSON response as valid
				isValidResponse = typeof data === 'object';
				productCount = Array.isArray(data) ? data.length : (data.products?.length || 0);
				break;
		}

		if (!isValidResponse) {
			return NextResponse.json(
				{ 
					success: false,
					error: 'Invalid response format from store API',
					receivedData: data
				},
				{ status: 422 }
			);
		}

		return NextResponse.json({
			success: true,
			message: 'Connection successful',
			storeType,
			endpoint: testEndpoint,
			capabilities: {
				products: true,
				productCount,
				apiVersion: response.headers.get('X-API-Version') || 'unknown',
			},
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Error testing external store connection:', error);
		return NextResponse.json(
			{ 
				success: false,
				error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
} 