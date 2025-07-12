import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const storeUrl = searchParams.get('storeUrl') || 'https://scape-squared.myshopify.com';
	const accessToken = searchParams.get('accessToken');
	const productTitle = searchParams.get('productTitle') || 'flowerscape demo 3';
	
	if (!accessToken) {
		return NextResponse.json(
			{ error: 'Access token is required' },
			{ status: 400 }
		);
	}

	try {
		// Get recent products from Shopify for debugging
		const searchUrl = `${storeUrl}/admin/api/2024-01/products.json?fields=id,title,vendor,handle,created_at,product_type,tags&limit=250`;
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
		
		// Apply our search logic
		let foundProduct = null;
		
		// Strategy 1: Look for products with matching title (most reliable)
		foundProduct = products.find((p: any) => {
			const title = p.title?.toLowerCase() || '';
			// Try exact title match first
			if (productTitle && title === productTitle.toLowerCase()) {
				return true;
			}
			// Try partial title match
			if (productTitle && title.includes(productTitle.toLowerCase())) {
				return true;
			}
			// Fallback to looking for key terms from the title
			if (title.includes('demo') && title.includes('flowerscape')) {
				return true;
			}
			return false;
		});

		// Strategy 2: Look for recent products from Gelato/scape squared vendor
		let vendorMatch = null;
		if (!foundProduct) {
			const recentThreshold = Date.now() - 10 * 60 * 1000; // 10 minutes ago
			const knownVendors = ['gelato', 'scape squared', 'print-on-demand', 'print studio'];
			
			vendorMatch = products.find((p: any) => {
				const vendor = p.vendor?.toLowerCase() || '';
				const productType = p.product_type?.toLowerCase() || '';
				const tags = (p.tags || '').toLowerCase();
				const isRecentProduct = p.created_at && 
					new Date(p.created_at).getTime() > recentThreshold;
				
				const isKnownVendor = knownVendors.some(v => vendor.includes(v));
				const isPrintProduct = productType.includes('print') || 
					productType.includes('custom') || 
					productType.includes('c-type') ||
					tags.includes('print') ||
					tags.includes('custom');
				
				return isRecentProduct && (isKnownVendor || isPrintProduct);
			});
		}

		return NextResponse.json({
			success: true,
			searchingFor: productTitle,
			totalProducts: products.length,
			foundByTitle: !!foundProduct,
			foundByVendor: !!vendorMatch,
			titleMatch: foundProduct || null,
			vendorMatch: vendorMatch || null,
			allRecentProducts: products.filter((p: any) => {
				const createdAt = new Date(p.created_at).getTime();
				const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
				return createdAt > tenMinutesAgo;
			}).map((p: any) => ({
				id: p.id,
				title: p.title,
				vendor: p.vendor,
				created_at: p.created_at,
				product_type: p.product_type,
				tags: p.tags
			}))
		});

	} catch (error) {
		return NextResponse.json(
			{ error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
} 