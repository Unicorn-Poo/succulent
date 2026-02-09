import { NextRequest, NextResponse } from "next/server";
import {
	validateAPIKey,
	validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import { resolvePublicBaseUrl } from "@/utils/mediaProxy";

export const dynamic = "force-dynamic";

function parseCsvParam(param: string | null): string[] {
	return param
		? param
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean)
		: [];
}

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

		const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
		const extractFileStreamId = (value: any): string | undefined => {
			if (!value) return undefined;
			if (typeof value === "string" && value.startsWith("co_")) {
				return value;
			}
			const fileStreamString =
				typeof value?.toString === "function" ? value.toString() : undefined;
			const stringMatch =
				typeof fileStreamString === "string"
					? fileStreamString.match(/co_[A-Za-z0-9]+/)
					: null;

			if (
				value &&
				typeof value === "object" &&
				typeof value.id === "string" &&
				value.id.startsWith("co_")
			) {
				return value.id;
			}

			const symbols =
				value && typeof value === "object" ? Object.getOwnPropertySymbols(value) : [];
			for (const symbol of symbols) {
				const symbolValue = (value as any)[symbol];
				if (
					typeof symbolValue === "string" &&
					symbolValue.startsWith("co_")
				) {
					return symbolValue;
				}
				if (
					symbolValue &&
					typeof symbolValue === "object" &&
					typeof symbolValue.id === "string" &&
					symbolValue.id.startsWith("co_")
				) {
					return symbolValue.id;
				}
			}

			return (
				value?.id ||
				value?._id ||
				value?.coId ||
				value?.refId ||
				value?._refId ||
				value?._raw?.id ||
				value?._raw?.refId ||
				value?.ref ||
				value?._ref?.id ||
				(stringMatch ? stringMatch[0] : undefined)
			);
		};

		const getMediaFileStreamCandidate = (mediaItem: any) =>
			mediaItem?.image ||
			mediaItem?.video ||
			mediaItem?._refs?.image ||
			mediaItem?._refs?.video ||
			mediaItem?.fileStream ||
			mediaItem?.source ||
			mediaItem;

		const buildProxyUrl = (fileStreamId?: string) =>
			fileStreamId ? `${baseUrl}/api/media-proxy/${fileStreamId}` : undefined;

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
					? Array.from(post.variants.base.media).map((item: any) => {
							const url =
								typeof item?.url === "string" ? item.url : undefined;
							const alt = item.alt?.toString() || "";
							const filename = item.filename;
							let fileStreamId: string | undefined = undefined;
							if (item?.type === "image" || item?.type === "video") {
								fileStreamId = extractFileStreamId(
									getMediaFileStreamCandidate(item)
								);
							}
							const proxyUrl = buildProxyUrl(fileStreamId);
							return {
								type: item.type,
								url,
								alt,
								filename,
								fileStreamId,
								proxyUrl,
							};
					  })
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
		const limit = Math.min(
			Math.max(parseInt(url.searchParams.get("limit") || "50"), 1),
			100
		);
		const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
		const statusFilters = parseCsvParam(url.searchParams.get("status"));
		const platformFilters = parseCsvParam(
			url.searchParams.get("platforms")
		);

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
		const filteredPosts = sortedPosts.filter((post: any) => {
			if (
				statusFilters.length > 0 &&
				!statusFilters.includes(post.status || "draft")
			) {
				return false;
			}

			if (
				platformFilters.length > 0 &&
				!post.platforms.some((platform: string) =>
					platformFilters.includes(platform)
				)
			) {
				return false;
			}

			return true;
		});

		const paginatedPosts = filteredPosts.slice(offset, offset + limit);

		return NextResponse.json({
			success: true,
			data: {
				posts: paginatedPosts,
				pagination: {
					total: filteredPosts.length,
					limit,
					offset,
					hasMore: offset + limit < filteredPosts.length,
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
