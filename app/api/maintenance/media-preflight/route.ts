import { NextRequest, NextResponse } from "next/server";
import {
  validateAPIKey,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import { resolvePublicBaseUrl } from "@/utils/mediaProxy";

export const dynamic = "force-dynamic";

type PreflightResult = {
  url: string;
  ok: boolean;
  status?: number;
  contentType?: string;
  error?: string;
};

type VariantPreflight = {
  postId: string;
  postTitle: string;
  platform: string;
  status?: string;
  scheduledFor?: string;
  urls: string[];
  results: PreflightResult[];
};

function isScheduledVariant(variant: any): boolean {
  if (!variant) return false;
  return variant.status === "scheduled" || !!variant.scheduledFor;
}

async function extractFileStreamId(
  fileStream: any
): Promise<string | undefined> {
  if (!fileStream) return undefined;
  if (typeof fileStream === "string" && fileStream.startsWith("co_")) {
    return fileStream;
  }

  const extractCoId = (value: any) => {
    if (!value || typeof value !== "object") return undefined;
    const symbols = Object.getOwnPropertySymbols(value);
    for (const symbol of symbols) {
      const symbolValue = (value as any)[symbol];
      if (typeof symbolValue === "string" && symbolValue.startsWith("co_")) {
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
    return undefined;
  };

  let stream = fileStream;
  try {
    if (typeof stream.load === "function") {
      const loadedStream = await stream.load();
      if (loadedStream) {
        stream = loadedStream;
      }
    }
  } catch (error) {
    console.warn("⚠️ Failed to load FileStream ref:", error);
  }

  const fileStreamString =
    typeof stream?.toString === "function" ? stream.toString() : undefined;
  const stringMatch =
    typeof fileStreamString === "string"
      ? fileStreamString.match(/co_[A-Za-z0-9]+/)
      : null;

  const fileStreamId =
    stream?.id ||
    stream?._id ||
    stream?.coId ||
    stream?.refId ||
    stream?._refId ||
    stream?._raw?.id ||
    stream?._raw?.refId ||
    stream?.ref ||
    stream?._ref?.id ||
    (stringMatch ? stringMatch[0] : undefined) ||
    extractCoId(stream) ||
    extractCoId(fileStream);

  return typeof fileStreamId === "string" ? fileStreamId : undefined;
}

async function resolveFileStreamUrl(
  fileStream: any,
  baseUrl: string
): Promise<string | undefined> {
  if (!fileStream) return undefined;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const fileStreamId = await extractFileStreamId(fileStream);
  if (fileStreamId && fileStreamId.startsWith("co_")) {
    return `${normalizedBase}/api/media-proxy/${fileStreamId}`;
  }

  const publicUrlValue =
    typeof fileStream?.publicUrl === "function"
      ? fileStream.publicUrl()
      : fileStream?.publicUrl;
  const urlValue =
    typeof fileStream?.url === "function" ? fileStream.url() : fileStream?.url;
  const publicUrl = publicUrlValue || urlValue;
  if (typeof publicUrl === "string" && publicUrl.startsWith("http")) {
    return publicUrl;
  }

  return undefined;
}

async function extractMediaUrlsFromVariant(
  variant: any,
  baseUrl: string
): Promise<string[]> {
  if (!variant?.media) return [];
  const mediaUrls: string[] = [];
  const mediaArray = Array.from(variant.media);

  for (const item of mediaArray) {
    const mediaItem = item as any;
    if (mediaItem?.type === "url-image" || mediaItem?.type === "url-video") {
      const url = mediaItem.url;
      if (
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://")) &&
        !url.startsWith("blob:")
      ) {
        mediaUrls.push(url);
      }
      continue;
    }

    if (mediaItem?.type === "image" || mediaItem?.type === "video") {
      const fileStream =
        mediaItem.image ||
        mediaItem.video ||
        mediaItem?._refs?.image ||
        mediaItem?._refs?.video;
      const resolvedUrl = await resolveFileStreamUrl(fileStream, baseUrl);
      if (resolvedUrl) {
        mediaUrls.push(resolvedUrl);
        continue;
      }

      const sourceUrl = mediaItem?.sourceUrl;
      if (
        typeof sourceUrl === "string" &&
        (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://"))
      ) {
        mediaUrls.push(sourceUrl);
        continue;
      }
    }
  }

  return mediaUrls;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  method: "HEAD" | "GET"
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      headers: { "User-Agent": "Succulent-Preflight/1.0" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
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
      "posts:read",
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
    const postId = body?.postId as string | undefined;
    const platform = body?.platform as string | undefined;
    const onlyScheduled = body?.onlyScheduled !== false;
    const limitPosts = Number(body?.limitPosts ?? 50);
    const limitVariants = Number(body?.limitVariants ?? 200);
    const timeoutMs = Number(body?.timeoutMs ?? 8000);

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
    const { AccountGroup, Post } = await import("@/app/schema");
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

    let posts = Array.from(accountGroup.posts)?.filter(Boolean) || [];
    if (postId) {
      const filtered = posts?.filter((post) => post?.id === postId) || [];
      if (filtered.length > 0) {
        posts = filtered;
      } else {
        const loadedPost = await Post.load(postId, {
          loadAs: worker,
          resolve: {
            variants: {
              $each: {
                media: { $each: true },
              },
            },
          },
        });
        posts = loadedPost ? [loadedPost] : [];
      }
    }

    posts = posts.slice(0, limitPosts);

    const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
    const entries: VariantPreflight[] = [];
    let variantsChecked = 0;
    let urlChecks = 0;

    for (const post of posts) {
      const variants = post?.variants ? Object.entries(post.variants) : [];

      for (const [variantPlatform, variant] of variants) {
        if (!variant) continue;
        if (platform && variantPlatform !== platform) continue;
        if (onlyScheduled && !isScheduledVariant(variant)) continue;
        if (variantsChecked >= limitVariants) break;

        variantsChecked += 1;
        const urls = await extractMediaUrlsFromVariant(variant, baseUrl);
        const results: PreflightResult[] = [];

        for (const url of urls) {
          try {
            urlChecks += 1;
            let response = await fetchWithTimeout(url, timeoutMs, "HEAD");
            if (!response.ok) {
              response = await fetchWithTimeout(url, timeoutMs, "GET");
            }
            results.push({
              url,
              ok: response.ok,
              status: response.status,
              contentType: response.headers.get("content-type") || undefined,
              error: response.ok ? undefined : response.statusText,
            });
          } catch (error) {
            results.push({
              url,
              ok: false,
              error: error instanceof Error ? error.message : "Fetch failed",
            });
          }
        }

        entries.push({
          postId: post?.id || "",
          postTitle: post?.title?.toString?.() || "Untitled",
          platform: variantPlatform,
          status: variant?.status,
          scheduledFor: variant?.scheduledFor
            ? new Date(variant.scheduledFor).toISOString()
            : undefined,
          urls,
          results,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        postsChecked: posts.length,
        variantsChecked,
        urlChecks,
        entries: entries.length,
      },
      entries,
    });
  } catch (error) {
    console.error("❌ Media preflight failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Media preflight failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
