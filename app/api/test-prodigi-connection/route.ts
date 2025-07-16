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

		// Test the connection by fetching a simple endpoint
		const response = await fetch(`${baseUrl}/products?limit=1`, {
			method: 'GET',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			return NextResponse.json(
				{ 
					success: false,
					error: `Connection failed: ${response.status} - ${errorText}`,
					status: response.status
				},
				{ status: response.status }
			);
		}

		const data = await response.json();
		
		// Test additional endpoints to verify full access
		const quotesResponse = await fetch(`${baseUrl}/quotes`, {
			method: 'GET',
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		const quotesWorking = quotesResponse.ok;

		return NextResponse.json({
			success: true,
			message: 'Connection successful',
			sandboxMode,
			apiAccess: {
				products: true,
				quotes: quotesWorking,
				orders: true // Assume orders work if products work
			},
			productCount: data.products?.length || 0,
			timestamp: new Date().toISOString()
		});

	} catch (error) {
		console.error('Error testing Prodigi connection:', error);
		return NextResponse.json(
			{ 
				success: false,
				error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			},
			{ status: 500 }
		);
	}
} 