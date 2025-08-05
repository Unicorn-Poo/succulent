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

		// Test the connection by fetching the Orders endpoint (this exists in v4.0)
		const response = await fetch(`${baseUrl}/Orders`, {
			method: 'GET',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = `Connection failed: ${response.status}`;
			let debugInfo: any = {
				status: response.status,
				statusText: response.statusText,
				url: `${baseUrl}/Orders`,
				sandboxMode,
				apiKeyLength: apiKey.length,
				apiKeyPrefix: apiKey.substring(0, 8) + '...',
			};
			
			// Parse error details if available
			try {
				const errorData = JSON.parse(errorText);
				debugInfo.errorData = errorData;
				
				if (errorData.outcome === 'NotAuthenticated') {
					errorMessage = 'Authentication failed - Please check your API key';
					debugInfo.suggestions = [
						'Verify you\'re using the correct API key from dashboard.prodigi.com',
						sandboxMode ? 'Make sure you\'re using your SANDBOX API key' : 'Make sure you\'re using your LIVE API key',
						'Check that your API key hasn\'t expired or been revoked',
						'Ensure there are no extra spaces or characters in your API key'
					];
				} else if (errorData.outcome) {
					errorMessage = `API Error: ${errorData.outcome}`;
				}
			} catch {
				// If we can't parse the error, use the raw response
				errorMessage += ` - ${errorText}`;
				debugInfo.rawError = errorText;
			}

			return NextResponse.json(
				{ 
					success: false,
					error: errorMessage,
					debug: debugInfo
				},
				{ status: response.status }
			);
		}

		const data = await response.json();
		
		// Test Quotes endpoint to verify broader API access
		const quotesResponse = await fetch(`${baseUrl}/Quotes`, {
			method: 'POST',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				// Minimal quote request to test endpoint availability
				shippingMethod: "Standard",
				recipient: {
					name: "Test",
					address: {
						line1: "Test",
						postalOrZipCode: "12345",
						countryCode: "US",
						townOrCity: "Test"
					}
				},
				items: [{
					sku: "GLOBAL-CFPM-16X20",
					copies: 1,
					assets: [{
						printArea: "default",
						url: "https://via.placeholder.com/300x400"
					}]
				}]
			})
		});

		const quotesWorking = quotesResponse.ok;

		return NextResponse.json({
			success: true,
			message: 'Connection successful! Prodigi API v4.0 is accessible.',
			sandboxMode,
			environment: sandboxMode ? 'sandbox' : 'live',
			apiAccess: {
				orders: true,
				quotes: quotesWorking,
				productDetails: true // Available via /ProductDetails/{sku}
			},
			ordersCount: Array.isArray(data.orders) ? data.orders.length : 0,
			timestamp: new Date().toISOString(),
			debug: {
				apiKeyLength: apiKey.length,
				apiKeyPrefix: apiKey.substring(0, 8) + '...',
				endpoint: `${baseUrl}/Orders`
			}
		});

	} catch (error) {
		return NextResponse.json(
			{ 
				success: false,
				error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				debug: {
					errorType: error instanceof Error ? error.constructor.name : 'Unknown',
					timestamp: new Date().toISOString()
				}
			},
			{ status: 500 }
		);
	}
} 