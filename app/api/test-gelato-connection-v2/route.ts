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

		// Try multiple endpoint patterns to find which one works
		const endpointsToTry = [
			'https://order.gelatoapis.com/v4/products/catalogs',
			'https://order.gelatoapis.com/v3/orders',
			'https://order.gelatoapis.com/v4/orders',
			'https://order.gelatoapis.com/orders',
			'https://api.gelato.com/v1/products',
		];

		for (const url of endpointsToTry) {
			console.log(`Trying endpoint: ${url}`);
			
			try {
				const response = await fetch(url, {
					method: 'GET',
					headers: {
						'X-API-KEY': apiKey.trim(),
						'Content-Type': 'application/json',
					},
				});

				console.log(`${url} -> Status: ${response.status}`);
				
				if (response.ok) {
					const data = await response.json();
					return NextResponse.json({
						success: true,
						message: `Connection successful! Working endpoint: ${url}`,
						endpoint: url,
						status: response.status,
					});
				} else {
					const errorText = await response.text();
					console.log(`${url} -> Error: ${errorText}`);
				}
			} catch (err) {
				console.log(`${url} -> Exception:`, err);
			}
		}

		return NextResponse.json(
			{ error: 'All endpoints failed. Please check your API key or contact Gelato support.' },
			{ status: 401 }
		);

	} catch (error) {
		console.error('Connection test failed:', error);
		return NextResponse.json(
			{ error: 'Failed to test connection' },
			{ status: 500 }
		);
	}
} 