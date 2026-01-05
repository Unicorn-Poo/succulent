import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  validateAPIKey,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import {
  getPreferredMediaFormatForPlatform,
  resolvePublicBaseUrl,
} from "@/utils/mediaProxy";
import { handleStandardPost } from "@/utils/apiHandlers";
import {
  INTERNAL_TO_AYRSHARE_PLATFORM,
  isBusinessPlanMode,
} from "@/utils/ayrshareIntegration";
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from "@/utils/postConstants";

export const dynamic = "force-dynamic";

const LUNARY_OG_IDENTIFIER = "lunary.app/api/og/";

type ReplacementResult = {
  url: string;
  status: "cached" | "cache_failed";
  fileStreamId?: string;
  proxyUrl?: string;
};

type RepairEntry = {
  postId: string;
  postTitle: string;
  platform: string;
  status?: string;
  scheduledFor?: string;
  lunaryUrls: string[];
  replacements: ReplacementResult[];
  updated: boolean;
  reschedule?: {
    skipped: boolean;
    reason?: string;
    deletedOld?: boolean;
    newPostId?: string;
    error?: string;
  };
};

type CachedMedia = {
  fileStream: any;
  fileStreamId: string;
  proxyUrl: string;
  contentType: string;
};

function isScheduledVariant(variant: any): boolean {
  if (!variant) return false;
  return variant.status === "scheduled" || !!variant.scheduledFor;
}

function parsePlatformOptions(options: any): Record<string, any> {
  if (!options) return {};
  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof options === "object") {
    return { ...options };
  }
  return {};
}

function extractOptionFields(
  source?: Record<string, any>
): Record<string, any> {
  if (!source || typeof source !== "object") return {};
  return Object.entries(source).reduce<Record<string, any>>(
    (acc, [key, value]) => {
      if (key.endsWith("Options") && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );
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

  return urls.filter((url) => url.includes(LUNARY_OG_IDENTIFIER));
}

async function extractFileStreamId(fileStream: any): Promise<string | undefined> {
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

async function deleteAyrsharePostById(
  postId: string,
  profileKey: string | undefined
): Promise<void> {
  if (!postId) return;
  const apiKey = process.env.AYRSHARE_API_KEY || AYRSHARE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing AYRSHARE_API_KEY for delete operation");
  }
  if (!profileKey && isBusinessPlanMode()) {
    throw new Error("Missing Profile-Key for delete operation");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (isBusinessPlanMode() && profileKey) {
    headers["Profile-Key"] = profileKey;
  }

  const response = await fetch(`${AYRSHARE_API_URL}/post`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ id: postId }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Ayrshare delete failed (${response.status}): ${text || "Unknown error"}`
    );
  }
}

function normalizeAltText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value?.toString === "function") {
    return value.toString();
  }
  return "";
}

async function cacheMediaUrl(
  url: string,
  format: "png" | "jpg",
  owner: any,
  cache: Map<string, CachedMedia>
): Promise<CachedMedia | null> {
  if (cache.has(url)) {
    return cache.get(url) || null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Succulent/1.0)",
      Accept: "image/png, image/jpeg, image/webp, image/*",
    },
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    return null;
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());
  let outputBuffer: Buffer = inputBuffer;
  let outputType = contentType;

  if (format === "jpg") {
    outputBuffer = await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer();
    outputType = "image/jpeg";
  }

  const { co } = await import("jazz-tools");
  const blob = new Blob([outputBuffer], { type: outputType });
  const fileStream = await co.fileStream().createFromBlob(blob, {
    owner,
  });

  const fileStreamId =
    (fileStream as any)?.id ||
    (typeof (fileStream as any)?.toString === "function"
      ? (fileStream as any).toString()
      : undefined);

  if (!fileStreamId || typeof fileStreamId !== "string") {
    return null;
  }

  const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
  const proxyUrl = `${baseUrl}/api/media-proxy/${fileStreamId}`;

  const cached: CachedMedia = {
    fileStream,
    fileStreamId,
    proxyUrl,
    contentType: outputType,
  };
  cache.set(url, cached);
  return cached;
}

function getVariantContent(post: any, variant: any): string {
  if (variant?.text) {
    return variant.text.toString();
  }
  const baseVariant = post?.variants?.base;
  if (baseVariant?.text) {
    return baseVariant.text.toString();
  }
  return "";
}

function getScheduleDate(variant: any): string | undefined {
  if (!variant?.scheduledFor) return undefined;
  const scheduledAt = new Date(variant.scheduledFor);
  if (Number.isNaN(scheduledAt.getTime())) return undefined;
  return scheduledAt.toISOString();
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
      "posts:update",
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
    const postIds = Array.isArray(body?.postIds)
      ? body.postIds.filter((value: any) => typeof value === "string")
      : undefined;
    const applyAll = body?.applyAll === true;
    const platform = body?.platform as string | undefined;
    const platforms = Array.isArray(body?.platforms)
      ? body.platforms.filter((value: any) => typeof value === "string")
      : undefined;
    const onlyScheduled = body?.onlyScheduled !== false;
    const dryRun = body?.dryRun !== false;
    const reschedule = body?.reschedule !== false;
    const limitPosts = Number(body?.limitPosts ?? 100);
    const limitVariants = Number(body?.limitVariants ?? 500);

    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: "accountGroupId is required" },
        { status: 400 }
      );
    }

    if (
      !dryRun &&
      !postId &&
      !applyAll &&
      (!postIds || postIds.length === 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "postId is required when dryRun is false unless applyAll is true",
        },
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
    const { AccountGroup, Post, MediaItem, ImageMedia } = await import(
      "@/app/schema"
    );
    const { co } = await import("jazz-tools");
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
                text: true,
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

    let posts = Array.from(accountGroup.posts).filter(Boolean);
    if (postId) {
      const filtered = posts.filter((post) => post.id === postId);
      if (filtered.length > 0) {
        posts = filtered;
      } else {
        const loadedPost = await Post.load(postId, {
          loadAs: worker,
          resolve: {
            variants: {
              $each: {
                media: { $each: true },
                text: true,
              },
            },
          },
        });
        posts = loadedPost ? [loadedPost] : [];
      }
    } else if (postIds && postIds.length > 0) {
      const postIdSet = new Set(postIds);
      const filtered = posts.filter((post) => postIdSet.has(post.id));
      posts = filtered;
      const foundIds = new Set(filtered.map((post) => post.id));
      const missingIds = postIds.filter(
        (candidate: string) => !foundIds.has(candidate)
      );
      for (const missingId of missingIds) {
        const loadedPost = await Post.load(missingId, {
          loadAs: worker,
          resolve: {
            variants: {
              $each: {
                media: { $each: true },
                text: true,
              },
            },
          },
        });
        if (loadedPost) {
          posts.push(loadedPost);
        }
      }
    }

    posts = posts.slice(0, limitPosts);

    const cache = new Map<string, CachedMedia>();
    const entries: RepairEntry[] = [];
    const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
    const profileKey = accountGroup.ayrshareProfileKey;
    let variantsChecked = 0;
    let variantsUpdated = 0;

    let limitReached = false;
    for (const post of posts) {
      if (limitReached) break;
      const variants = post?.variants
        ? Object.entries(post.variants)
        : [];

      for (const [variantPlatform, variant] of variants) {
        if (!variant) continue;
        if (platform && variantPlatform !== platform) continue;
        if (
          platforms &&
          platforms.length > 0 &&
          !platforms.includes(variantPlatform)
        ) {
          continue;
        }
        if (onlyScheduled && !isScheduledVariant(variant)) continue;

        if (variantsChecked >= limitVariants) {
          limitReached = true;
          break;
        }

        variantsChecked += 1;
        const lunaryUrls = extractLunaryUrlsFromVariant(variant);
        if (lunaryUrls.length === 0) continue;

        const replacements: ReplacementResult[] = [];
        let updated = false;

        if (!dryRun) {
          const format = getPreferredMediaFormatForPlatform(variantPlatform);
          const mediaItems = Array.from(variant.media || []);
          const updatedMedia = co.list(MediaItem).create([], {
            owner: accountGroup._owner,
          });

          for (const item of mediaItems) {
            const mediaItem = item as any;
            let lunaryUrl: string | undefined;

            if (
              mediaItem?.type === "url-image" ||
              mediaItem?.type === "url-video"
            ) {
              lunaryUrl =
                typeof mediaItem.url === "string" ? mediaItem.url : undefined;
            } else if (
              (mediaItem?.type === "image" || mediaItem?.type === "video") &&
              !mediaItem?.image &&
              !mediaItem?.video &&
              typeof mediaItem.sourceUrl === "string"
            ) {
              lunaryUrl = mediaItem.sourceUrl;
            }

            if (lunaryUrl && lunaryUrl.includes(LUNARY_OG_IDENTIFIER)) {
              const cached = await cacheMediaUrl(
                lunaryUrl,
                format,
                accountGroup._owner,
                cache
              );
              if (cached) {
                const altText = normalizeAltText(mediaItem?.alt);
                const alt =
                  altText.trim().length > 0
                    ? co.plainText().create(altText, {
                        owner: accountGroup._owner,
                      })
                    : undefined;
                const imageMedia = ImageMedia.create(
                  {
                    type: "image" as const,
                    image: cached.fileStream,
                    alt,
                    sourceUrl: lunaryUrl,
                  },
                  { owner: accountGroup._owner }
                );
                updatedMedia.push(imageMedia);
                replacements.push({
                  url: lunaryUrl,
                  status: "cached",
                  fileStreamId: cached.fileStreamId,
                  proxyUrl: cached.proxyUrl,
                });
                updated = true;
                continue;
              }

              replacements.push({ url: lunaryUrl, status: "cache_failed" });
            }

            updatedMedia.push(mediaItem);
          }

          if (updated) {
            variant.media = updatedMedia;
            variant.status = "scheduled";
            variantsUpdated += 1;
          }
        }

        const entry: RepairEntry = {
          postId: post.id,
          postTitle: post.title?.toString?.() || "Untitled",
          platform: variantPlatform,
          status: variant?.status,
          scheduledFor: variant?.scheduledFor
            ? new Date(variant.scheduledFor).toISOString()
            : undefined,
          lunaryUrls,
          replacements,
          updated,
          reschedule: {
            skipped: true,
          },
        };

        if (!dryRun && reschedule && variantPlatform !== "base") {
          const scheduleDate = getScheduleDate(variant);
          const scheduleMs = scheduleDate
            ? new Date(scheduleDate).getTime()
            : 0;
          if (!scheduleDate) {
            entry.reschedule = {
              skipped: true,
              reason: "missing_schedule_date",
            };
          } else if (scheduleMs - Date.now() < 5 * 60 * 1000) {
            entry.reschedule = {
              skipped: true,
              reason: "schedule_too_soon",
            };
          } else {
            try {
              const oldAyrsharePostId = variant.ayrsharePostId;
              if (oldAyrsharePostId) {
                await deleteAyrsharePostById(oldAyrsharePostId, profileKey);
                variant.ayrsharePostId = undefined;
              }

              const mediaUrls = await extractMediaUrlsFromVariant(
                variant,
                baseUrl
              );
              const platformOptions = extractOptionFields(
                parsePlatformOptions(variant?.platformOptions)
              );
              const postData = {
                post: getVariantContent(post, variant),
                platforms: [variantPlatform],
                mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
                scheduleDate,
                ...platformOptions,
              } as Record<string, any>;

              if (isBusinessPlanMode() && profileKey) {
                postData.profileKey = profileKey;
              }

              const result = await handleStandardPost(postData);
              const ayrsharePlatform =
                INTERNAL_TO_AYRSHARE_PLATFORM[variantPlatform] ||
                variantPlatform;
              const newPostId =
                result?.id ||
                result?.postIds?.[ayrsharePlatform] ||
                result?.posts?.[0]?.id;

              if (newPostId) {
                variant.ayrsharePostId = newPostId;
              }

              entry.reschedule = {
                skipped: false,
                deletedOld: !!oldAyrsharePostId,
                newPostId,
              };
            } catch (rescheduleError) {
              entry.reschedule = {
                skipped: false,
                error:
                  rescheduleError instanceof Error
                    ? rescheduleError.message
                    : "Reschedule failed",
              };
            }
          }
        }

        entries.push(entry);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        postsChecked: posts.length,
        variantsChecked,
        variantsUpdated,
        entries: entries.length,
        limitVariants,
        limitReached,
      },
      applyAll,
      postIdsProvided: postIds ? postIds.length : 0,
      platformFilter: platform || null,
      platformsFilter: platforms || null,
      entries,
    });
  } catch (error) {
    console.error("❌ Lunary media repair failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Lunary media repair failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
