import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { apiKey, storeId } = await request.json();

		if (!apiKey) {
			return NextResponse.json(
				{ error: 'API key is required' },
				{ status: 400 }
			);
		}

		// Validate API key format
		const hasValidFormat = apiKey.startsWith('gelato_') && apiKey.length >= 50;
		
		if (!hasValidFormat) {
			return NextResponse.json({ 
				error: 'Invalid API key format. Gelato API keys should start with "gelato_" and be at least 50 characters long.',
				isConnected: false 
			}, { status: 400 });
		}

		// Test the Gelato API connection by making a simple API call
		// Try the URL that appeared in the redirect logs
		const testUrl = 'https://ecommerce.gelatoapis.com/v1/stores';
		const response = await fetch(testUrl, {
			method: 'GET',
			headers: {
				'X-API-KEY': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Gelato API error:', response.status, errorText);
			
			let errorMessage = 'Invalid Gelato API key';
			if (response.status === 401) {
				errorMessage = 'Invalid or missing API key. Please check your Gelato API credentials.';
			} else if (response.status === 403) {
				errorMessage = 'Access denied. Please check your API key permissions.';
			} else if (response.status === 404) {
				errorMessage = 'API endpoint not found. Please contact support.';
			}
			
			return NextResponse.json(
				{ error: errorMessage },
				{ status: 401 }
			);
		}

		const responseData = await response.json();
		
		return NextResponse.json({
			success: true,
			storeName: 'Your Gelato Store', // No specific store info needed
			message: 'Connection successful! Gelato API is working.',
			apiResponse: responseData ? 'Valid API response received' : 'API connected',
		});

	} catch (error) {
		console.error('Gelato connection test failed:', error);
		return NextResponse.json(
			{ error: 'Failed to connect to Gelato API' },
			{ status: 500 }
		);
	}
} 