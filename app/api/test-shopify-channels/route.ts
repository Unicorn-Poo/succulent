import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const storeUrl = searchParams.get('storeUrl');
		const accessToken = searchParams.get('accessToken');
		
		if (!storeUrl || !accessToken) {
			return NextResponse.json(
				{ error: 'Store URL and access token are required' },
				{ status: 400 }
			);
		}

		// Get available publications (channels)
		const publicationsUrl = `${storeUrl}/admin/api/2024-01/publications.json`;
		const response = await fetch(publicationsUrl, {
			headers: {
				'X-Shopify-Access-Token': accessToken,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			return NextResponse.json(
				{ error: `Failed to fetch publications: ${response.status}` },
				{ status: response.status }
			);
		}

		const data = await response.json();
		const publications = data.publications || [];

		// Common channel mappings for validation
		const commonChannels = [
			'online-store',
			'point-of-sale',
			'facebook',
			'google',
			'facebook-marketplace',
			'instagram'
		];

		const availableChannels = publications.map((pub: any) => ({
			id: pub.id.toString(),
			name: pub.name,
			type: pub.publication_type,
			isActive: pub.published_at !== null
		}));

		return NextResponse.json({
			success: true,
			channels: availableChannels,
			commonChannels,
			totalChannels: availableChannels.length,
			activeChannels: availableChannels.filter((c: any) => c.isActive).length,
			debug: {
				storeUrl,
				hasAccessToken: !!accessToken,
				rawPublications: publications.map((p: any) => ({
					id: p.id,
					name: p.name,
					type: p.publication_type,
					published_at: p.published_at
				}))
			}
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 