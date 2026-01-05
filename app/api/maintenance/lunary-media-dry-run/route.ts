import { NextRequest, NextResponse } from "next/server";
import {
  validateAPIKey,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import { getPreferredMediaFormatForPlatform } from "@/utils/mediaProxy";

export const dynamic = "force-dynamic";

type DryRunEntry = {
  postId: string;
  postTitle: string;
  platform: string;
  status?: string;
  scheduledFor?: string;
  format: "png" | "jpg";
  lunaryUrls: string[];
};

function isScheduledVariant(variant: any): boolean {
  if (!variant) return false;
  return variant.status === "scheduled" || !!variant.scheduledFor;
}

function extractLunaryUrlsFromVariant(variant: any): string[] {
  if (!variant?.media) return [];
  const urls: string[] = [];
  const mediaItems = Array.from(variant.media || []);

  for (const item of mediaItems) {
    if (!item) continue;
    if (item.type === "url-image" || item.type === "url-video") {
      if (typeof item.url === "string") {
        urls.push(item.url);
      }
      continue;
    }
    if (
      (item.type === "image" || item.type === "video") &&
      typeof item.sourceUrl === "string"
    ) {
      urls.push(item.sourceUrl);
      continue;
    }
  }

  return urls.filter((url) => url.includes("lunary.app/api/og/"));
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get("X-Forwarded-For") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Missing API key" },
        { status: 401 }
      );
    }

    const validation = await validateAPIKey(
      apiKey,
      "posts:create",
      clientIP,
      userAgent
    );
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid API key" },
        { status: validation.statusCode || 401 }
      );
    }

    const body = await request.json();
    const accountGroupId = body?.accountGroupId as string | undefined;
    const limitPosts = Number(body?.limitPosts ?? 100);
    const onlyScheduled = body?.onlyScheduled !== false;

    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: "accountGroupId is required" },
        { status: 400 }
      );
    }

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

    const { jazzServerWorker } = await import("@/utils/jazzServer");
    const { AccountGroup } = await import("@/app/schema");
    const worker = await jazzServerWorker;

    if (!worker) {
      return NextResponse.json(
        { success: false, error: "Server worker not available" },
        { status: 500 }
      );
    }

    const accountGroup = await AccountGroup.load(accountGroupId, {
      loadAs: worker,
      resolve: {
        posts: {
          $each: {
            variants: {
              $each: {
                media: { $each: true },
              },
            },
          },
        },
      },
    });

    if (!accountGroup?.posts) {
      return NextResponse.json(
        { success: false, error: "Account group not found" },
        { status: 404 }
      );
    }

    const entries: DryRunEntry[] = [];
    const posts = Array.from(accountGroup.posts).slice(0, limitPosts);
    let scheduledVariantsChecked = 0;

    for (const post of posts) {
      const variants = post?.variants
        ? Object.entries(post.variants)
        : [];
      for (const [platform, variant] of variants) {
        if (onlyScheduled && !isScheduledVariant(variant)) continue;
        scheduledVariantsChecked += 1;

        const lunaryUrls = extractLunaryUrlsFromVariant(variant);
        if (lunaryUrls.length === 0) continue;

        entries.push({
          postId: post.id,
          postTitle: post.title?.toString?.() || "Untitled",
          platform,
          status: variant?.status,
          scheduledFor: variant?.scheduledFor
            ? new Date(variant.scheduledFor).toISOString()
            : undefined,
          format: getPreferredMediaFormatForPlatform(platform),
          lunaryUrls,
        });
      }
    }

    const firstEntry = entries[0];
    const sampleRequest = firstEntry
      ? {
          endpoint: "/api/cache-lunary-media",
          body: {
            accountGroupId,
            url: firstEntry.lunaryUrls[0],
            format: firstEntry.format,
          },
        }
      : null;

    return NextResponse.json({
      success: true,
      dryRun: true,
      summary: {
        postsChecked: posts.length,
        scheduledVariantsChecked,
        entries: entries.length,
      },
      entries,
      sampleRequest,
    });
  } catch (error) {
    console.error("❌ Dry run failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Dry run failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
