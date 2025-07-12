import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const apiKey = formData.get('apiKey') as string;
		const file = formData.get('file') as File;

		if (!apiKey || !file) {
			return NextResponse.json(
				{ error: 'API key and file are required' },
				{ status: 400 }
			);
		}

		// Upload to Gelato
		const gelatoFormData = new FormData();
		gelatoFormData.append('file', file);

		const response = await fetch('https://ecommerce.gelatoapis.com/v1/files', {
			method: 'POST',
			headers: {
				'X-API-KEY': apiKey,
			},
			body: gelatoFormData,
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Gelato upload error:', response.status, errorText);
			return NextResponse.json(
				{ error: `Failed to upload to Gelato: ${response.status}` },
				{ status: response.status }
			);
		}

		const result = await response.json();
		
		return NextResponse.json({
			success: true,
			url: result.url,
			fileId: result.id,
		});

	} catch (error) {
		console.error('Error uploading to Gelato:', error);
		return NextResponse.json(
			{ error: 'Failed to upload file' },
			{ status: 500 }
		);
	}
} 