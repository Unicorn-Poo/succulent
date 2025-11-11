import { NextRequest, NextResponse } from "next/server";
import {
	validateAPIKey,
	validateAccountGroupAccess,
} from "@/utils/apiKeyManager";

export const dynamic = "force-dynamic";

/**
 * Retrieve posts from account group using Jazz server worker
 */
async function getAccountGroupPosts(
	accountGroupId?: string | null
): Promise<any[]> {
	try {
		const { jazzServerWorker } = await import("@/utils/jazzServer");
		const { AccountGroup } = await import("@/app/schema");
		const worker = await jazzServerWorker;

		if (!worker) {
			return [];
		}

		if (!accountGroupId) {
			return [];
		}

		const accountGroup = await AccountGroup.load(accountGroupId, {
			loadAs: worker,
			resolve: {
				posts: {
					$each: {
						variants: {
							$each: {
								text: true,
								media: { $each: true },
								replyTo: true,
							},
						},
					},
				},
			},
		});

		if (!accountGroup || !accountGroup.posts) {
			return [];
		}

		return Array.from(accountGroup.posts)
			.filter((post) => post != null)
			.map((post) => ({
				id: post.id,
				title: post.title?.toString() || "Untitled Post",
				content: post.variants?.base?.text?.toString() || "",
				platforms: Object.keys(post.variants || {}).filter(
					(key) => key !== "base"
				),
				createdAt: post.variants?.base?.postDate || new Date(),
				postDate: post.variants?.base?.postDate,
				status: post.variants?.base?.status || "draft",
				scheduledFor: post.variants?.base?.scheduledFor,
				publishedAt: post.variants?.base?.publishedAt,
				hasMedia:
					post.variants?.base?.media &&
					Array.from(post.variants.base.media).length > 0,
				mediaCount: post.variants?.base?.media
					? Array.from(post.variants.base.media).length
					: 0,
				media: post.variants?.base?.media
					? Array.from(post.variants.base.media).map((item: any) => ({
							type: item.type,
							url: item.url,
							alt: item.alt?.toString() || "",
							filename: item.filename,
					  }))
					: [],
				accountGroupId: accountGroupId,
				source: "jazz-account-group",
			}));
	} catch (error) {
		console.error("❌ Error fetching account group posts:", error);
		return [];
	}
}

/**
 * GET /api/posts/list - Get posts for an account group
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const accountGroupId = url.searchParams.get("accountGroupId");
		const limit = parseInt(url.searchParams.get("limit") || "20");
		const offset = parseInt(url.searchParams.get("offset") || "0");

		const clientIP = request.headers.get("X-Forwarded-For") || "unknown";
		const userAgent = request.headers.get("User-Agent") || "unknown";

		const apiKey = request.headers.get("X-API-Key");
		let validationResult = null;

		if (apiKey) {
			const validation = await validateAPIKey(
				apiKey,
				"posts:read",
				clientIP,
				userAgent
			);
			if (!validation.isValid) {
				return NextResponse.json(
					{ success: false, error: validation.error || "Invalid API key" },
					{ status: 401 }
				);
			}
			validationResult = validation;

			if (accountGroupId) {
				const groupAccess = validateAccountGroupAccess(
					validation.keyData,
					accountGroupId
				);
				if (!groupAccess.hasAccess) {
					return NextResponse.json(
						{
							success: false,
							error: groupAccess.error || "Access denied to account group",
							code: groupAccess.errorCode || "ACCOUNT_GROUP_ACCESS_DENIED",
						},
						{ status: groupAccess.statusCode || 403 }
					);
				}
			}
		}

		const posts = await getAccountGroupPosts(accountGroupId);
		const sortedPosts = posts.sort(
			(a: any, b: any) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		);
		const paginatedPosts = sortedPosts.slice(offset, offset + limit);

		return NextResponse.json({
			success: true,
			data: {
				posts: paginatedPosts,
				pagination: {
					total: posts.length,
					limit,
					offset,
					hasMore: offset + limit < posts.length,
				},
			},
		});
	} catch (error) {
		console.error("❌ Error listing posts:", error);
		return NextResponse.json(
			{ success: false, error: "Failed to fetch posts" },
			{ status: 500 }
		);
	}
}
