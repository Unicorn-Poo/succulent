import { NextRequest, NextResponse } from "next/server";
import { z } from "jazz-tools";
import { z as zod } from "zod";
import { PlatformNames } from "@/app/schema";
import {
  handleStandardPost,
  handleReplyPost,
  handleMultiPosts,
} from "@/utils/apiHandlers";
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from "@/utils/postConstants";
import {
  isBusinessPlanMode,
  INTERNAL_TO_AYRSHARE_PLATFORM,
} from "@/utils/ayrshareIntegration";
import { OptimalTimingEngine } from "@/utils/optimalTimingEngine";
import {
  validateAPIKey,
  logAPIKeyUsage,
  checkRateLimit,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import { findExistingPost } from "@/utils/postListHelpers";
import type { PostLike } from "@/utils/postListHelpers";
import {
  MediaFormat,
  DEFAULT_MEDIA_FORMAT,
  getPreferredMediaFormatForPlatform,
  needsJpgConversion,
  proxyMediaUrlIfNeeded,
  resolvePublicBaseUrl,
} from "@/utils/mediaProxy";
// Removed workaround storage imports - using proper Jazz integration

// Force dynamic rendering to prevent build-time static analysis issues
export const dynamic = "force-dynamic";

// =============================================================================
// 🔐 AUTHENTICATION & VALIDATION
// =============================================================================

interface AuthenticatedUser {
  accountId: string;
  account?: any; // MyAppAccount type from Jazz (optional for API-only users)
  keyData: any; // APIKey data
  clientIP?: string;
  userAgent?: string;
}

async function authenticateAPIKey(request: NextRequest): Promise<{
  isValid: boolean;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  user?: AuthenticatedUser;
}> {
  try {
    // Get client information
    const clientIP =
      request.headers.get("X-Forwarded-For") ||
      request.headers.get("X-Real-IP") ||
      "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";

    // Extract API key from headers
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return {
        isValid: false,
        error:
          "API key is required. Please provide a valid API key in the X-API-Key header.",
        errorCode: "MISSING_API_KEY",
        statusCode: 401,
      };
    }

    // Validate the API key with detailed error handling
    const validation = await validateAPIKey(
      apiKey,
      "posts:create",
      clientIP,
      userAgent
    );

    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.error || "Invalid API key",
        errorCode: validation.errorCode || "INVALID_API_KEY",
        statusCode: validation.statusCode || 401,
      };
    }

    // Return authenticated user data
    return {
      isValid: true,
      user: {
        accountId: validation.accountId!,
        keyData: validation.keyData!,
        clientIP,
        userAgent,
      },
    };
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return {
      isValid: false,
      error:
        "Internal server error during authentication. Please try again later.",
      errorCode: "AUTH_ERROR",
      statusCode: 500,
    };
  }
}

// =============================================================================
// 📝 REQUEST VALIDATION
// =============================================================================

const TwitterOptionsSchema = zod.object({
  thread: zod.boolean().optional(),
  threadNumber: zod.boolean().optional(),
  replyToTweetId: zod.string().optional(),
  mediaUrls: zod.array(zod.string().url()).optional(),
});

const RedditOptionsSchema = zod
  .object({
    title: zod.string().optional(),
    subreddit: zod.string().optional(),
    flairId: zod.string().optional(),
    flairText: zod.string().optional(),
  })
  .passthrough();

const PinterestOptionsSchema = zod.object({
  boardId: zod.string().optional(),
  boardName: zod.string().optional(),
});

const InstagramOptionsSchema = zod
  .object({
    isStory: zod.boolean().optional(),
    isReel: zod.boolean().optional(),
    shareToFeed: zod.boolean().optional(),
    coverImageUrl: zod.string().url().optional(),
  })
  .passthrough();

const TikTokOptionsSchema = zod
  .object({
    privacyLevel: zod
      .enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "SELF_ONLY"])
      .optional(),
    disableComment: zod.boolean().optional(),
    disableDuet: zod.boolean().optional(),
    disableStitch: zod.boolean().optional(),
  })
  .passthrough();

const VariantDetailsSchema = zod
  .object({
    content: zod.string().optional(),
    media: zod.array(zod.string().url()).nullable().optional(),
    noImage: zod.boolean().optional(),
    twitterOptions: TwitterOptionsSchema.optional(),
    redditOptions: RedditOptionsSchema.optional(),
    pinterestOptions: PinterestOptionsSchema.optional(),
    instagramOptions: InstagramOptionsSchema.optional(),
    tiktokOptions: TikTokOptionsSchema.optional(),
  })
  .passthrough();

const CreatePostSchema = zod.object({
  // Required fields
  accountGroupId: zod.string().min(1, "Account group ID is required"),
  // Content is required for new posts, but optional when publishing an existing post
  content: zod.string().optional(),
  platforms: zod
    .array(zod.enum(PlatformNames))
    .min(1, "At least one platform is required"),

  // Optional: existing post ID (for publishing an already-created post with variants)
  postId: zod.string().optional(),

  // Optional fields
  title: zod.string().optional(),
  scheduledDate: zod
    .union([zod.string().datetime(), zod.literal("auto")])
    .optional(),

  // Auto-schedule: let the system determine optimal posting time
  autoSchedule: zod.boolean().optional(),

  // Media attachments - URL-based only
  media: zod
    .array(
      zod.object({
        type: zod.enum(["image", "video"]),
        url: zod.string().url(),
        alt: zod.string().optional(),
        filename: zod.string().optional(),
      })
    )
    .optional(),

  // Legacy support: imageUrls and alt (for backward compatibility)
  imageUrls: zod.array(zod.string().url()).optional(),
  alt: zod.string().optional(),

  // Platform-specific variants
  variants: zod.record(zod.string(), VariantDetailsSchema).optional(),

  // Platform-specific options (twitterOptions, redditOptions, etc.)
  twitterOptions: TwitterOptionsSchema.optional(),
  redditOptions: RedditOptionsSchema.optional(),
  reddit: RedditOptionsSchema.optional(),
  pinterestOptions: PinterestOptionsSchema.optional(),
  instagramOptions: InstagramOptionsSchema.optional(),
  tiktokOptions: TikTokOptionsSchema.optional(),

  // Reply configuration
  replyTo: zod
    .object({
      url: zod.string().url(),
      platform: zod.enum(PlatformNames).optional(),
    })
    .optional(),

  // Thread/multi-post configuration
  isThread: zod.boolean().optional(),
  threadPosts: zod
    .array(
      zod.object({
        content: zod.string(),
        media: zod
          .array(
            zod.object({
              type: zod.enum(["image", "video"]),
              url: zod.string().url(),
              alt: zod.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  // Publishing options
  publishImmediately: zod.boolean().default(false),
  // Dry-run publish: build Ayrshare payloads but do not call the API
  dryRunPublish: zod.boolean().optional(),
  // Omit platform lists from dry-run payloads
  omitPlatforms: zod.boolean().optional(),
  // Limit publish to explicit platforms (skip inferred variants)
  limitToPlatforms: zod.boolean().optional(),
  // Delete existing scheduled post(s) in Ayrshare before rescheduling
  deleteExistingScheduled: zod.boolean().optional(),
  saveAsDraft: zod.boolean().default(true),
  cacheLunaryMedia: zod.boolean().optional(),

  // Business plan options
  profileKey: zod.string().optional(), // For Ayrshare Business Plan integration
});

type CreatePostRequest = zod.infer<typeof CreatePostSchema>;
type VariantOverride = zod.infer<typeof VariantDetailsSchema>;

const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"];
const isVideoUrl = (url: string) => {
  const cleanedUrl = url.split("?")[0]?.split("#")[0]?.toLowerCase() || "";
  return VIDEO_EXTENSIONS.some((ext) => cleanedUrl.endsWith(ext));
};

const PLATFORM_OPTION_KEYS: Record<string, string> = {
  x: "twitterOptions",
  twitter: "twitterOptions",
  reddit: "redditOptions",
  pinterest: "pinterestOptions",
  instagram: "instagramOptions",
  tiktok: "tiktokOptions",
};

export function getPlatformOptionsKey(platform: string): string {
  if (!platform) return "platformOptions";
  const normalized = platform.toLowerCase();
  return PLATFORM_OPTION_KEYS[normalized] || `${normalized}Options`;
}

const PLATFORM_MEDIA_LIMITS: Record<string, number> = {
  reddit: 1,
  pinterest: 1,
  x: 4,
  twitter: 4,
  bluesky: 4,
  instagram: 10,
  threads: 10,
  facebook: 10,
  linkedin: 9,
  default: Number.POSITIVE_INFINITY,
};

const LUNARY_OG_IDENTIFIER = "lunary.app/api/og/";

/**
 * Download and cache Lunary OG images to prevent different images being generated
 * at publish time vs schedule time. Returns a FileStream for re-use.
 */
async function downloadAndCacheLunaryImageStream(
  lunaryUrl: string,
  owner: any
): Promise<any | null> {
  try {
    console.log("📥 [LUNARY CACHE] Downloading Lunary OG image:", lunaryUrl);

    // Download the image from Lunary
    const response = await fetch(lunaryUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Succulent/1.0)",
        Accept: "image/png, image/jpeg, image/webp, image/*",
      },
    });

    if (!response.ok) {
      console.error(
        "❌ [LUNARY CACHE] Failed to fetch image:",
        response.status,
        response.statusText
      );
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    if (!contentType.startsWith("image/")) {
      console.error("❌ [LUNARY CACHE] Invalid content type:", contentType);
      return null;
    }

    console.log(
      "✅ [LUNARY CACHE] Downloaded image:",
      buffer.byteLength,
      "bytes, type:",
      contentType
    );

    // Convert to blob
    const blob = new Blob([buffer], { type: contentType });

    // Import required modules
    const { co } = await import("jazz-tools");

    // Create FileStream from blob
    const imageStream = await co.fileStream().createFromBlob(blob, {
      owner,
      onProgress: (progress) => {
        if (progress === 1) {
          console.log("✅ [LUNARY CACHE] Image upload completed");
        }
      },
    });

    console.log(
      "✅ [LUNARY CACHE] Created cached FileStream:",
      (imageStream as any)?.publicUrl || "PENDING"
    );

    return imageStream;
  } catch (error) {
    console.error(
      "❌ [LUNARY CACHE] Error downloading/caching Lunary image:",
      error
    );
    return null;
  }
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
  if (!profileKey) {
    throw new Error("Missing Profile-Key for delete operation");
  }

  const response = await fetch(`${AYRSHARE_API_URL}/post`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Profile-Key": profileKey,
    },
    body: JSON.stringify({ id: postId }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Ayrshare delete failed (${response.status}): ${text || "Unknown error"}`
    );
  }
}

function normalizeMediaUrls(
  urls?: string[],
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): string[] {
  if (!urls || urls.length === 0) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawUrl of urls) {
    if (typeof rawUrl !== "string") continue;
    const trimmed = rawUrl.trim();
    if (!trimmed) continue;
    const proxied = proxyMediaUrlIfNeeded(trimmed, format);
    if (seen.has(proxied)) continue;
    seen.add(proxied);
    normalized.push(proxied);
  }

  return normalized;
}

function getMediaLimitForPlatform(platform: string): number {
  if (!platform) return PLATFORM_MEDIA_LIMITS.default;
  const normalized = platform.toLowerCase();
  const limit = PLATFORM_MEDIA_LIMITS[normalized];
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    return limit;
  }
  return PLATFORM_MEDIA_LIMITS.default;
}

function clampMediaUrlsForPlatform(
  platform: string,
  urls: string[],
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): string[] {
  const normalizedUrls = normalizeMediaUrls(urls, format);
  const limit = getMediaLimitForPlatform(platform);
  if (!Number.isFinite(limit)) {
    return normalizedUrls;
  }
  if (normalizedUrls.length > limit) {
    console.warn(
      `⚠️ Truncating media for ${platform} from ${normalizedUrls.length} to ${limit}`
    );
  }
  return normalizedUrls.slice(0, limit);
}

function clampMediaUrlsForPlatforms(
  platforms: string[],
  urls: string[],
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): string[] {
  const normalizedUrls = normalizeMediaUrls(urls, format);
  if (platforms.length === 0) {
    return normalizedUrls;
  }

  const finiteLimits = platforms
    .map(getMediaLimitForPlatform)
    .filter((limit) => Number.isFinite(limit)) as number[];

  if (finiteLimits.length === 0) {
    return normalizedUrls;
  }

  const minLimit = Math.min(...finiteLimits);
  if (normalizedUrls.length > minLimit) {
    console.warn(
      `⚠️ Truncating media for grouped platforms (${platforms.join(
        ", "
      )}) from ${normalizedUrls.length} to ${minLimit}`
    );
  }
  return normalizedUrls.slice(0, minLimit);
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

export function normalizeVariantOptionAliases(
  target: Record<string, any> | undefined
) {
  if (!target || typeof target !== "object") return;
  if (target.reddit && !target.redditOptions) {
    target.redditOptions = target.reddit;
  }
  if ("reddit" in target) {
    delete target.reddit;
  }
}

export function normalizeRequestOptionAliases(
  requestData: CreatePostRequest & Record<string, any>
) {
  if (requestData.reddit && !requestData.redditOptions) {
    requestData.redditOptions = requestData.reddit;
  }
  if ("reddit" in requestData) {
    delete requestData.reddit;
  }
  if (requestData.variants) {
    Object.values(requestData.variants).forEach((variant) => {
      normalizeVariantOptionAliases(variant as Record<string, any>);
    });
  }
}

// =============================================================================
// 🎯 POST CREATION LOGIC
// =============================================================================

/**
 * Add a server-created post to the user's account group
 */
async function addPostToUserAccountGroup(
  post: any,
  accountGroupId: string
): Promise<void> {
  const { jazzServerWorker } = await import("@/utils/jazzServer");
  const { MyAppAccount, AccountGroup } = await import("@/app/schema");
  const worker = await jazzServerWorker;

  if (!worker) {
    throw new Error("Server worker not available");
  }

  const accountGroup = await AccountGroup.load(accountGroupId, {
    loadAs: worker,
  });

  if (!accountGroup) {
    throw new Error(`Account group ${accountGroupId} not found`);
  }

  if (!accountGroup.posts) {
    const { co } = await import("jazz-tools");
    const { Post } = await import("@/app/schema");
    accountGroup.posts = co
      .list(Post)
      .create([], { owner: accountGroup._owner });
  }

  accountGroup.posts.push(post);
}

/**
 * Create post directly in user's account group using server worker credentials
 */
async function createPostInAccountGroup(
  postData: any,
  request: CreatePostRequest,
  user: AuthenticatedUser
): Promise<any | null> {
  // Content is required for creating new posts
  if (!request.content) {
    throw new Error("Content is required when creating a new post");
  }

  try {
    const { jazzServerWorker } = await import("@/utils/jazzServer");
    const worker = await jazzServerWorker;

    if (!worker) {
      throw new Error(
        "Server worker not available - check credentials in .env.local"
      );
    }

    const { AccountGroup, Post, PostVariant, MediaItem, ReplyTo } =
      await import("@/app/schema");
    const { co, z, Group } = await import("jazz-tools");

    const accountGroup = await AccountGroup.load(request.accountGroupId, {
      loadAs: worker,
      resolve: {
        posts: true, // Load existing posts list
      },
    });
    if (!accountGroup) {
      throw new Error(`Account group ${request.accountGroupId} not found`);
    }

    // Ensure server worker has proper permissions on account group
    if (accountGroup._owner instanceof Group) {
      try {
        // Try to add worker - will handle if already a member
        console.log(
          "🔧 Adding server worker to account group permissions:",
          worker.id
        );
        accountGroup._owner.addMember(worker, "writer");
        console.log(
          "✅ Server worker added to account group with writer permissions"
        );
      } catch (permError) {
        console.error("❌ Failed to add worker to account group:", permError);
        console.log("🔍 Permission error details:", {
          workerID: worker.id,
          accountGroupID: request.accountGroupId,
          accountGroupOwner: accountGroup._owner?.id,
          errorMessage:
            permError instanceof Error ? permError.message : "Unknown error",
        });

        // This is a critical error - without permissions, we can't create posts
        throw new Error(
          `Server worker does not have permissions to access account group ${request.accountGroupId}. Please ensure the account group was created with proper server worker permissions.`
        );
      }
    } else {
      console.error(
        "❌ Account group owner is not a Group - cannot add server worker permissions"
      );
      throw new Error(
        `Account group ${request.accountGroupId} has invalid ownership structure. Account groups must be owned by a Group to allow server worker access.`
      );
    }

    // Create all objects owned by the account group (not server worker)
    const groupOwner = accountGroup._owner;
    const lunaryStreamCache = new Map<string, any>();
    const getCachedLunaryStream = async (mediaUrl: string) => {
      if (lunaryStreamCache.has(mediaUrl)) {
        return lunaryStreamCache.get(mediaUrl);
      }
      const imageStream = await downloadAndCacheLunaryImageStream(
        mediaUrl,
        groupOwner
      );
      if (imageStream) {
        lunaryStreamCache.set(mediaUrl, imageStream);
      }
      return imageStream;
    };

    const shouldCacheLunary =
      request.cacheLunaryMedia !== undefined ? request.cacheLunaryMedia : true;
    const titleText = co
      .plainText()
      .create(postData.title || `API Post ${new Date().toISOString()}`, {
        owner: groupOwner,
      });

    const baseText = co
      .plainText()
      .create(request.content, { owner: groupOwner });
    const baseMediaList = co.list(MediaItem).create([], { owner: groupOwner });

    // Handle base media (from request.media or request.imageUrls for backward compat)
    const baseMediaUrls =
      request.media?.map((m) => m.url) || request.imageUrls || [];

    console.log("📷 [CREATE POST] Base media from request:", {
      hasRequestMedia: !!request.media,
      requestMediaCount: request.media?.length || 0,
      hasImageUrls: !!request.imageUrls,
      imageUrlsCount: request.imageUrls?.length || 0,
      baseMediaUrls,
      baseMediaUrlsCount: baseMediaUrls.length,
    });

    if (baseMediaUrls.length > 0) {
      const { ImageMedia, URLImageMedia, URLVideoMedia } = await import(
        "@/app/schema"
      );

      for (const mediaUrl of baseMediaUrls) {
        try {
          // Try to find matching media item for alt text
          const mediaItem = request.media?.find((m) => m.url === mediaUrl);
          const altText = co
            .plainText()
            .create(mediaItem?.alt || request.alt || "", { owner: groupOwner });

          // Determine type from mediaItem or default to image
          const isVideo = mediaItem?.type === "video" || isVideoUrl(mediaUrl);

          // CRITICAL FIX: Download and cache Lunary OG images to prevent different images
          // being generated at publish time vs schedule time
          if (
            !isVideo &&
            shouldCacheLunary &&
            mediaUrl.includes(LUNARY_OG_IDENTIFIER)
          ) {
            console.log(
              "🔍 [LUNARY DETECTED] Found Lunary OG image, downloading and caching:",
              mediaUrl
            );
            const cachedStream = await getCachedLunaryStream(mediaUrl);
            if (cachedStream) {
              const imageMedia = ImageMedia.create(
                {
                  type: "image" as const,
                  image: cachedStream,
                  alt: altText,
                  sourceUrl: mediaUrl,
                },
                { owner: groupOwner }
              );
              baseMediaList.push(imageMedia);
              console.log(
                "✅ [LUNARY CACHED] Successfully cached Lunary image as FileStream"
              );
              continue; // Skip creating URL-based media item
            } else {
              console.warn(
                "⚠️ [LUNARY CACHE FAILED] Falling back to URL-based media for:",
                mediaUrl
              );
              // Fall through to create URL-based media as fallback
            }
          }

          if (isVideo) {
            const urlVideoMedia = URLVideoMedia.create(
              {
                type: "url-video",
                url: mediaUrl,
                alt: altText,
                filename: mediaItem?.filename,
              },
              { owner: groupOwner }
            );
            baseMediaList.push(urlVideoMedia);
          } else {
            const urlImageMedia = URLImageMedia.create(
              {
                type: "url-image",
                url: mediaUrl,
                alt: altText,
                filename: mediaItem?.filename,
              },
              { owner: groupOwner }
            );
            baseMediaList.push(urlImageMedia);
          }
        } catch (mediaError) {
          console.error("❌ Failed to create URL media item:", mediaError);
        }
      }
    }

    const replyToObj = ReplyTo.create(
      {
        url: request.replyTo?.url,
        platform: request.replyTo?.platform,
        author: undefined,
        authorUsername: undefined,
        authorPostContent: undefined,
        authorAvatar: undefined,
        likesCount: undefined,
      },
      { owner: groupOwner }
    );

    // Prepare platform options for base variant (if provided at top level)
    const basePlatformOptions: Record<string, any> = {};
    if (request.twitterOptions) {
      basePlatformOptions.twitterOptions = request.twitterOptions;
    }

    const baseVariant = PostVariant.create(
      {
        text: baseText,
        postDate: new Date(),
        media: baseMediaList,
        replyTo: replyToObj,
        status: request.publishImmediately
          ? "published"
          : request.scheduledDate
          ? "scheduled"
          : "draft",
        // Only set scheduledFor if we're actually scheduling (not publishing immediately)
        scheduledFor:
          request.scheduledDate && !request.publishImmediately
            ? new Date(request.scheduledDate)
            : undefined,
        publishedAt: request.publishImmediately ? new Date() : undefined,
        edited: false,
        lastModified: undefined,
        performance: undefined,
        ayrsharePostId: undefined,
        socialPostUrl: undefined,
        platformOptions:
          Object.keys(basePlatformOptions).length > 0
            ? JSON.stringify(basePlatformOptions)
            : undefined,
      },
      { owner: groupOwner }
    );

    const variants = co
      .record(z.string(), PostVariant)
      .create({ base: baseVariant }, { owner: groupOwner });

    // Helper function to create media list from URLs
    const createMediaListFromUrls = async (
      urls: string[],
      altText?: string,
      mediaTypeHints?: CreatePostRequest["media"]
    ) => {
      const mediaList = co.list(MediaItem).create([], { owner: groupOwner });
      if (urls.length === 0) return mediaList;

      const { ImageMedia, URLImageMedia, URLVideoMedia } = await import(
        "@/app/schema"
      );
      for (const mediaUrl of urls) {
        try {
          const typeHint = mediaTypeHints?.find(
            (item) => item.url === mediaUrl
          )?.type;
          const isVideo = typeHint === "video" || isVideoUrl(mediaUrl);
          const alt = co
            .plainText()
            .create(altText || request.alt || "", { owner: groupOwner });

          // CRITICAL FIX: Download and cache Lunary OG images to prevent different images
          // being generated at publish time vs schedule time
          if (
            !isVideo &&
            shouldCacheLunary &&
            mediaUrl.includes(LUNARY_OG_IDENTIFIER)
          ) {
            console.log(
              "🔍 [LUNARY DETECTED] Found Lunary OG image in variant, downloading and caching:",
              mediaUrl
            );
            const cachedStream = await getCachedLunaryStream(mediaUrl);
            if (cachedStream) {
              const imageMedia = ImageMedia.create(
                {
                  type: "image" as const,
                  image: cachedStream,
                  alt: alt,
                  sourceUrl: mediaUrl,
                },
                { owner: groupOwner }
              );
              mediaList.push(imageMedia);
              console.log(
                "✅ [LUNARY CACHED] Successfully cached Lunary image as FileStream"
              );
              continue; // Skip creating URL-based media item
            } else {
              console.warn(
                "⚠️ [LUNARY CACHE FAILED] Falling back to URL-based media for:",
                mediaUrl
              );
              // Fall through to create URL-based media as fallback
            }
          }

          if (isVideo) {
            const urlVideoMedia = URLVideoMedia.create(
              {
                type: "url-video",
                url: mediaUrl,
                alt: alt,
                filename: undefined,
              },
              { owner: groupOwner }
            );
            mediaList.push(urlVideoMedia);
          } else {
            const urlImageMedia = URLImageMedia.create(
              {
                type: "url-image",
                url: mediaUrl,
                alt: alt,
                filename: undefined,
              },
              { owner: groupOwner }
            );
            mediaList.push(urlImageMedia);
          }
        } catch (mediaError) {
          console.error("❌ Failed to create URL media item:", mediaError);
        }
      }
      return mediaList;
    };

    // CRITICAL: Create platform variants for ALL platforms in request.platforms AND request.variants
    // This ensures each platform has its own variant properly connected to the post
    // For platforms with explicit variant data in request.variants, use that custom content/media (overwrites base)
    // For platforms without explicit variant data, create variants copying from base variant

    // Collect all platforms: from request.platforms AND from request.variants keys
    const allPlatforms = new Set<string>(request.platforms);
    if (request.variants) {
      for (const platform of Object.keys(request.variants)) {
        if (PlatformNames.includes(platform as any)) {
          allPlatforms.add(platform);
          // Ensure platform is in platforms list for publishing
          if (!request.platforms.includes(platform as any)) {
            request.platforms.push(platform as any);
          }
        }
      }
    }

    for (const platform of allPlatforms) {
      // Skip invalid platforms
      if (!PlatformNames.includes(platform as any)) {
        console.warn(`⚠️ Skipping invalid platform: ${platform}`);
        continue;
      }

      // Check if this platform has explicit variant data
      const variantOverride = request.variants?.[platform];
      const typedVariantData = variantOverride as VariantOverride | undefined;

      // CRITICAL: Always create SEPARATE Jazz objects for each platform variant
      // DO NOT share references with base variant - this causes Jazz sync issues
      // and results in only the first item being saved or "unavailable" errors
      let variantText: any;
      let variantMediaList: any;
      const variantPlatformOptions: Record<string, any> = parsePlatformOptions(
        baseVariant.platformOptions
      );
      let edited = false;
      let lastModified: string | undefined = undefined;

      // If platform has explicit variant data, use it
      if (typedVariantData) {
        const variantNoImage =
          typedVariantData.noImage === true || typedVariantData.media === null;
        // Create variant text: use override content if provided, otherwise copy from base
        if (typedVariantData.content) {
          variantText = co
            .plainText()
            .create(typedVariantData.content, { owner: groupOwner });
          edited = true;
          lastModified = new Date().toISOString();
        } else {
          // Create a fresh copy of base text for this variant
          variantText = co
            .plainText()
            .create(baseVariant.text?.toString() || request.content, {
              owner: groupOwner,
            });
        }

        // Create variant media: use override media if provided, otherwise copy from base
        if (variantNoImage) {
          variantMediaList = co
            .list(MediaItem)
            .create([], { owner: groupOwner });
        } else if (
          typedVariantData.media &&
          typedVariantData.media.length > 0
        ) {
          variantMediaList = await createMediaListFromUrls(
            typedVariantData.media,
            request.alt
          );
        } else {
          // Create a fresh media list with NEW media items from base URLs
          // Don't just push references - create new items so each variant has its own
          variantMediaList = await createMediaListFromUrls(
            baseMediaUrls,
            request.alt,
            request.media
          );
        }

        // Merge platform options from variant override
        Object.assign(
          variantPlatformOptions,
          extractOptionFields(typedVariantData)
        );
      } else {
        // No explicit variant data - create fresh copies of base content
        variantText = co
          .plainText()
          .create(baseVariant.text?.toString() || request.content, {
            owner: groupOwner,
          });
        // Create NEW media items from base URLs - don't just push references
        variantMediaList = await createMediaListFromUrls(
          baseMediaUrls,
          request.alt,
          request.media
        );
      }

      // Apply platform-specific options from request level if not already set
      const optionKey = getPlatformOptionsKey(platform);
      if (
        variantPlatformOptions[optionKey] === undefined &&
        (request as Record<string, any>)[optionKey]
      ) {
        variantPlatformOptions[optionKey] = (request as Record<string, any>)[
          optionKey
        ];
      }

      // Create the platform variant
      const platformVariant = PostVariant.create(
        {
          text: variantText,
          postDate: baseVariant.postDate,
          media: variantMediaList,
          replyTo: baseVariant.replyTo,
          status: baseVariant.status,
          scheduledFor: baseVariant.scheduledFor,
          publishedAt: baseVariant.publishedAt,
          edited: edited,
          lastModified: lastModified,
          performance: baseVariant.performance,
          ayrsharePostId: baseVariant.ayrsharePostId,
          socialPostUrl: baseVariant.socialPostUrl,
          platformOptions:
            Object.keys(variantPlatformOptions).length > 0
              ? JSON.stringify(variantPlatformOptions)
              : undefined,
        },
        { owner: groupOwner }
      );

      // Add variant to the variants record
      variants[platform] = platformVariant;
    }

    // CRITICAL: Create ONLY ONE post with all variants
    const variantKeys = Object.keys(variants);
    console.log("📝 [CREATE POST] Creating SINGLE post with variants:", {
      variantCount: variantKeys.length,
      variantPlatforms: variantKeys,
      title: postData.title,
      platformsInRequest: request.platforms.length,
      hasVariantsInRequest: !!request.variants,
    });

    const post = Post.create(
      {
        title: titleText,
        variants: variants, // All variants go into ONE post
      },
      { owner: groupOwner }
    );

    console.log("📝 [POST CREATED] Post object created:", {
      postId: post.id,
      variantCount: Object.keys(post.variants || {}).length,
      variantKeys: Object.keys(post.variants || {}),
    });

    // Ensure posts list exists and add the post ONCE
    if (!accountGroup.posts) {
      const { co } = await import("jazz-tools");
      accountGroup.posts = co.list(Post).create([], { owner: groupOwner });
      console.log("📝 [POSTS LIST CREATED] New posts list created");
    }

    const postsBeforeAdd = accountGroup.posts.length;
    console.log("📝 [BEFORE ADD] Posts in group before add:", postsBeforeAdd);

    // CRITICAL: Check if post already exists to prevent duplicates
    const postsSnapshot = Array.from(accountGroup.posts) as PostLike[];
    const existingPost = findExistingPost(postsSnapshot, post.id);
    if (existingPost) {
      console.warn(
        "⚠️ [DUPLICATE DETECTED] Post already exists in account group, skipping duplicate add:",
        post.id
      );
      return existingPost;
    }

    // Add post ONCE - this should be the only place we add it
    accountGroup.posts.push(post);
    const postsAfterAdd = accountGroup.posts.length;
    console.log("✅ [POST ADDED] Added SINGLE post to account group:", {
      postId: post.id,
      variantCount: Object.keys(post.variants || {}).length,
      variantPlatforms: Object.keys(post.variants || {}),
      postsBeforeAdd,
      postsAfterAdd,
      postsAdded: postsAfterAdd - postsBeforeAdd,
    });

    return post;
  } catch (error) {
    console.error("❌ Failed to create post in account group:", error);
    throw error;
  }
}

async function createPost(
  request: CreatePostRequest,
  user: AuthenticatedUser
): Promise<{ success: boolean; postId?: string; post?: any; error?: string }> {
  try {
    const now = new Date();
    const postData = {
      title: request.title || `API Post ${now.toISOString()}`,
      content: request.content,
      platforms: request.platforms,
      createdAt: now,
      accountGroupId: request.accountGroupId,
      createdViaAPI: true,
      apiKeyId: user.keyData.keyId,
      userId: user.accountId,
    };

    const post = await createPostInAccountGroup(postData, request, user);

    if (post) {
      return { success: true, postId: post.id, post: post };
    } else {
      throw new Error("Post creation failed");
    }
  } catch (error) {
    console.error("❌ Error creating post:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create post",
    };
  }
}

/**
 * Extract media URLs from a variant
 */
function extractMediaUrlsFromVariant(variant: any): string[] {
  if (!variant?.media) return [];

  const mediaUrls: string[] = [];
  const mediaArray = Array.from(variant.media);
  const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
  const extractFileStreamId = (value: any) => {
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

    const symbols =
      value && typeof value === "object"
        ? Object.getOwnPropertySymbols(value)
        : [];
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
      const fileStreamId = extractFileStreamId(fileStream);
      if (typeof fileStreamId === "string" && fileStreamId.startsWith("co_")) {
        const proxyUrl = `${baseUrl}/api/media-proxy/${fileStreamId}`;
        mediaUrls.push(proxyUrl);
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

/**
 * Prepare publish requests for Ayrshare API
 * Handles platform-specific variants by creating separate requests per platform when variants exist
 */
export async function preparePublishRequests(
  requestData: CreatePostRequest,
  post: any,
  profileKey: string | undefined
): Promise<
  Array<{
    postData: import("@/utils/apiHandlers").PostData;
    platforms: string[];
  }>
> {
  type PostData = import("@/utils/apiHandlers").PostData;
  const requests: Array<{ postData: PostData; platforms: string[] }> = [];
  const platformsWithoutVariants: string[] = [];

  // Get base content and media
  // When publishing an existing post, content may come from the saved variant
  const baseContent =
    requestData.content || post?.variants?.base?.text?.toString() || "";

  // Prioritize requestData.media if it has items, otherwise fall back to imageUrls, then saved base variant
  const mediaUrlsFromMedia = requestData.media
    ?.map((m) => m.url)
    .filter(Boolean) as string[] | undefined;

  // Try to extract from saved base variant if requestData doesn't have media
  const savedBaseMediaUrls = post?.variants?.base
    ? extractMediaUrlsFromVariant(post.variants.base)
    : [];

  const baseMediaUrls =
    mediaUrlsFromMedia && mediaUrlsFromMedia.length > 0
      ? mediaUrlsFromMedia
      : requestData.imageUrls && requestData.imageUrls.length > 0
      ? requestData.imageUrls
      : savedBaseMediaUrls;

  console.log("📷 [BASE MEDIA RESOLUTION]", {
    fromRequestMedia: mediaUrlsFromMedia?.length || 0,
    fromImageUrls: requestData.imageUrls?.length || 0,
    fromSavedBase: savedBaseMediaUrls.length,
    finalBaseMediaUrls: baseMediaUrls.length,
    baseMediaUrls,
  });

  // Collect all platforms to process: from requestData.platforms AND post.variants
  // This ensures variant-only platforms (like Instagram) are included unless limited
  const allPlatformsToProcess = new Set<string>(requestData.platforms);
  if (!requestData.limitToPlatforms && post?.variants) {
    for (const platform of Object.keys(post.variants)) {
      if (platform !== "base" && PlatformNames.includes(platform as any)) {
        allPlatformsToProcess.add(platform);
      }
    }
  }

  // Process each platform
  for (const platform of allPlatformsToProcess) {
    if (!PlatformNames.includes(platform as any)) continue;

    const variantOverride = requestData.variants?.[platform];
    const variant = post?.variants?.[platform];
    const parsedVariantOptions = parsePlatformOptions(variant?.platformOptions);

    // Determine content: variant override > saved variant > base
    // CRITICAL: If variant override has content, use ONLY that content (don't fall back to base)
    let content = baseContent;
    if (variantOverride?.content) {
      // Variant override explicitly specifies content - use ONLY that
      content = variantOverride.content;
    } else if (variant?.text) {
      // Extract from saved variant - this should only contain variant-specific content
      content = variant.text.toString();
    }
    // Otherwise use baseContent (already set above)

    // Determine media: variant override > saved variant > base > requestData.imageUrls fallback
    // CRITICAL: If variant override has media, use ONLY that media (don't fall back to base)
    let mediaUrls: string[] = [];
    const variantNoImage =
      variantOverride?.noImage === true || variantOverride?.media === null;
    if (variantNoImage) {
      mediaUrls = [];
    } else if (variantOverride?.media && variantOverride.media.length > 0) {
      // Variant override explicitly specifies media - use ONLY that
      // Handle both string URLs and media objects with url property
      mediaUrls = variantOverride.media
        .map((m: any) => (typeof m === "string" ? m : m?.url))
        .filter(
          (url: any): url is string =>
            typeof url === "string" &&
            (url.startsWith("http://") || url.startsWith("https://"))
        );
    } else if (variant) {
      // Extract from saved variant - this should only contain variant-specific media
      const variantMediaUrls = extractMediaUrlsFromVariant(variant);
      if (variantMediaUrls.length > 0) {
        mediaUrls = variantMediaUrls;
      } else if (variant.media && Array.from(variant.media).length > 0) {
        // Variant has media but none could be resolved; avoid falling back to base.
        mediaUrls = [];
      } else {
        // No variant media found, fall back to base
        mediaUrls = baseMediaUrls;
      }
    } else {
      // No variant at all, use base media
      mediaUrls = baseMediaUrls;
    }

    // Final fallback: if still no media and requestData.imageUrls exists, use it
    if (
      !variantNoImage &&
      mediaUrls.length === 0 &&
      requestData.imageUrls &&
      requestData.imageUrls.length > 0
    ) {
      mediaUrls = requestData.imageUrls.filter(
        (url: string) =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      );
    }

    if (variantNoImage) {
      mediaUrls = [];
    } else if (variantOverride?.media?.length && mediaUrls.length === 0) {
      throw new Error(
        `Missing variant media URLs for ${platform}. Refusing to fall back to base media.`
      );
    }
    if (
      !variantNoImage &&
      variant?.media &&
      Array.from(variant.media).length > 0 &&
      mediaUrls.length === 0
    ) {
      throw new Error(
        `Variant media present but unresolved for ${platform}. Refusing to fall back to base media.`
      );
    }

    if (variantOverride?.media?.length && mediaUrls.length === 0) {
      throw new Error(
        `Missing variant media URLs for ${platform}. Refusing to fall back to base media.`
      );
    }
    if (
      variant?.media &&
      Array.from(variant.media).length > 0 &&
      mediaUrls.length === 0
    ) {
      throw new Error(
        `Variant media present but unresolved for ${platform}. Refusing to fall back to base media.`
      );
    }

    // Log media collection for debugging
    console.log(`📷 [MEDIA COLLECTION] Platform: ${platform}`, {
      hasVariantOverride: !!variantOverride,
      hasVariantOverrideMedia: !!variantOverride?.media,
      variantOverrideMediaCount: variantOverride?.media?.length || 0,
      variantOverrideMedia: variantOverride?.media,
      hasSavedVariant: !!variant,
      extractedVariantCount: variant
        ? extractMediaUrlsFromVariant(variant).length
        : 0,
      baseMediaCount: baseMediaUrls.length,
      baseMediaUrls: baseMediaUrls,
      collectedMediaCount: mediaUrls.length,
      collectedMediaUrls: mediaUrls,
      mediaSource: variantOverride?.media
        ? "variantOverride"
        : variant && extractMediaUrlsFromVariant(variant).length > 0
        ? "savedVariant"
        : "base",
    });

    // Normalize (proxy) media URLs first, then clamp
    const preferredFormat = getPreferredMediaFormatForPlatform(platform);
    const normalizedMediaUrls = normalizeMediaUrls(mediaUrls, preferredFormat);
    const beforeClamp = normalizedMediaUrls.length;
    mediaUrls = clampMediaUrlsForPlatform(
      platform,
      normalizedMediaUrls,
      preferredFormat
    );
    if (beforeClamp !== mediaUrls.length) {
      console.log(
        `⚠️ [MEDIA CLAMP] Platform: ${platform}, clamped from ${beforeClamp} to ${mediaUrls.length}`
      );
    }

    // Determine platform options: request > saved variant > defaults
    let twitterOptions: any = undefined;
    let redditOptions: any = undefined;
    let pinterestOptions: any = undefined;
    let instagramOptions: any = undefined;
    let tiktokOptions: any = undefined;

    if (platform === "x") {
      const overrideTwitterOptions = variantOverride?.twitterOptions;
      const savedTwitterOptions = parsedVariantOptions.twitterOptions;
      if (overrideTwitterOptions) {
        twitterOptions = overrideTwitterOptions;
      } else if (savedTwitterOptions) {
        twitterOptions = savedTwitterOptions;
      } else if (requestData.twitterOptions) {
        twitterOptions = requestData.twitterOptions;
      } else if (content.length > 280) {
        twitterOptions = { thread: true, threadNumber: true };
      }
    }

    if (platform === "reddit") {
      redditOptions =
        variantOverride?.redditOptions ??
        parsedVariantOptions.redditOptions ??
        requestData.redditOptions;

      // Fallback: Use request title if redditOptions not provided
      if (!redditOptions && requestData.title) {
        redditOptions = { title: requestData.title };
      }

      // Final fallback: Use first line of content as title if no title/subreddit provided
      if (
        !redditOptions ||
        (!redditOptions.title && !redditOptions.subreddit)
      ) {
        const firstLine = content.split("\n")[0].trim();
        if (firstLine) {
          redditOptions = { title: firstLine.substring(0, 300) }; // Reddit title limit
        } else {
          redditOptions = { title: "Post" }; // Absolute fallback
        }
      }

      // Ensure subreddit is clean (remove r/ prefix if included)
      if (redditOptions.subreddit) {
        redditOptions.subreddit = redditOptions.subreddit.replace(/^r\//, "");
        console.log(`📢 Reddit: Posting to r/${redditOptions.subreddit}`);
      } else {
        // Only use env var as fallback, don't hardcode any default
        const defaultSubreddit = process.env.REDDIT_DEFAULT_SUBREDDIT;
        if (defaultSubreddit) {
          redditOptions.subreddit = defaultSubreddit;
          console.log(`📢 Reddit: Using env fallback r/${defaultSubreddit}`);
        } else {
          console.warn(`⚠️ Reddit: No subreddit specified in request!`);
        }
      }
    }

    if (platform === "pinterest") {
      pinterestOptions =
        variantOverride?.pinterestOptions ??
        parsedVariantOptions.pinterestOptions ??
        requestData.pinterestOptions;

      // Fallback to environment variable if not provided
      if (!pinterestOptions) {
        const envBoardId = process.env.PINTEREST_BOARD_ID;
        const envBoardName = process.env.PINTEREST_BOARD_NAME;
        if (envBoardId || envBoardName) {
          // If boardId is provided but not numeric, treat it as boardName
          if (envBoardId && !/^\d+$/.test(envBoardId)) {
            console.warn(
              "⚠️ PINTEREST_BOARD_ID is not numeric, using as boardName:",
              envBoardId
            );
            // Use the envBoardId directly if it looks like username/boardname format
            pinterestOptions = {
              boardName: envBoardId,
            };
          } else {
            pinterestOptions = {
              boardId: envBoardId,
              boardName: envBoardName,
            };
          }
        }
      }

      // If boardId exists but is not numeric, convert it to boardName
      if (
        pinterestOptions?.boardId &&
        !/^\d+$/.test(pinterestOptions.boardId)
      ) {
        console.warn(
          "⚠️ Pinterest boardId is not numeric, converting to boardName:",
          pinterestOptions.boardId
        );
        const fallbackBoardName = pinterestOptions.boardId;
        delete pinterestOptions.boardId;
        if (
          !pinterestOptions.boardName ||
          (!pinterestOptions.boardName.includes("/") &&
            fallbackBoardName.includes("/"))
        ) {
          pinterestOptions.boardName = fallbackBoardName;
        }
      }
    }

    if (platform === "instagram") {
      instagramOptions =
        variantOverride?.instagramOptions ??
        parsedVariantOptions.instagramOptions ??
        requestData.instagramOptions;
    }

    if (platform === "tiktok") {
      tiktokOptions =
        variantOverride?.tiktokOptions ??
        parsedVariantOptions.tiktokOptions ??
        requestData.tiktokOptions;
    }

    // If variant exists (override or saved), create separate request for this platform
    // CRITICAL: variantOverride should always create a separate request, even without saved variant
    if (variantOverride || variant) {
      const ayrsharePlatform =
        INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform;

      // mediaUrls is already clamped at line 945, no need to clamp again
      // But ensure it's normalized (deduplicated)
      const cleanedMediaUrls = normalizeMediaUrls(mediaUrls);

      // Log content being sent for debugging
      console.log(
        `📝 [FINAL CONTENT] Platform: ${platform}, content length: ${
          content.length
        }, hasVariantOverride: ${!!variantOverride}, hasSavedVariant: ${!!variant}`,
        {
          contentPreview: content.substring(0, 100),
          variantOverrideContent: variantOverride?.content?.substring(0, 100),
        }
      );

      // Log media URLs being sent for debugging
      console.log(
        `📷 [FINAL MEDIA] Platform: ${platform}, sending ${cleanedMediaUrls.length} URLs:`,
        {
          mediaUrls: cleanedMediaUrls,
          originalMediaSource: variantOverride?.media
            ? "variantOverride"
            : variant && extractMediaUrlsFromVariant(variant).length > 0
            ? "savedVariant"
            : "base",
          variantOverrideMedia: variantOverride?.media,
        }
      );

      requests.push({
        postData: {
          post: content,
          platforms: [ayrsharePlatform],
          mediaUrls: cleanedMediaUrls.length > 0 ? cleanedMediaUrls : undefined,
          scheduleDate: requestData.scheduledDate,
          profileKey: profileKey,
          twitterOptions: twitterOptions,
          redditOptions: redditOptions,
          pinterestOptions: pinterestOptions,
          instagramOptions: instagramOptions,
          tiktokOptions: tiktokOptions,
        },
        platforms: [platform],
      });
    } else {
      // No variant - group with other platforms without variants
      platformsWithoutVariants.push(platform);
    }
  }

  // Create requests for platforms without variants
  // CRITICAL: Check for variant overrides even in platformsWithoutVariants
  // Platforms with variant overrides should be separated out
  const trulyWithoutVariants: string[] = [];
  const platformsWithOverrides: string[] = [];

  for (const platform of platformsWithoutVariants) {
    const variantOverride = requestData.variants?.[platform];
    if (variantOverride) {
      // This platform has a variant override - create separate request
      platformsWithOverrides.push(platform);
    } else {
      // Truly no variant - can be grouped
      trulyWithoutVariants.push(platform);
    }
  }

  // Create separate requests for platforms with variant overrides
  for (const platform of platformsWithOverrides) {
    const variantOverride = requestData.variants?.[platform];
    const variant = post?.variants?.[platform];

    // Determine content: variant override > saved variant > base
    let content = baseContent;
    if (variantOverride?.content) {
      content = variantOverride.content;
    } else if (variant?.text) {
      content = variant.text.toString();
    }

    // Determine media: variant override > saved variant > base > requestData.imageUrls fallback
    // CRITICAL: If variant override has media, use ONLY that media (don't fall back to base)
    let mediaUrls: string[] = [];
    const variantOverrideNoImage =
      variantOverride?.noImage === true || variantOverride?.media === null;
    if (variantOverrideNoImage) {
      mediaUrls = [];
    } else if (variantOverride?.media && variantOverride.media.length > 0) {
      // Variant override explicitly specifies media - use ONLY that
      // Handle both string URLs and media objects with url property
      mediaUrls = variantOverride.media
        .map((m: any) => (typeof m === "string" ? m : m?.url))
        .filter(
          (url: any): url is string =>
            typeof url === "string" &&
            (url.startsWith("http://") || url.startsWith("https://"))
        );
    } else if (variant) {
      // Extract from saved variant - this should only contain variant-specific media
      const variantMediaUrls = extractMediaUrlsFromVariant(variant);
      if (variantMediaUrls.length > 0) {
        mediaUrls = variantMediaUrls;
      } else if (variant.media && Array.from(variant.media).length > 0) {
        // Variant has media but none could be resolved; avoid falling back to base.
        mediaUrls = [];
      } else {
        // No variant media found, fall back to base
        mediaUrls = baseMediaUrls;
      }
    } else {
      // No variant at all, use base media
      mediaUrls = baseMediaUrls;
    }

    // Final fallback: if still no media and requestData.imageUrls exists, use it
    if (
      !variantOverrideNoImage &&
      mediaUrls.length === 0 &&
      requestData.imageUrls &&
      requestData.imageUrls.length > 0
    ) {
      mediaUrls = requestData.imageUrls.filter(
        (url: string) =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      );
    }

    if (variantOverrideNoImage) {
      mediaUrls = [];
    } else if (variantOverride?.media?.length && mediaUrls.length === 0) {
      throw new Error(
        `Missing variant media URLs for ${platform}. Refusing to fall back to base media.`
      );
    }
    if (
      !variantOverrideNoImage &&
      variant?.media &&
      Array.from(variant.media).length > 0 &&
      mediaUrls.length === 0
    ) {
      throw new Error(
        `Variant media present but unresolved for ${platform}. Refusing to fall back to base media.`
      );
    }

    // Normalize (proxy) media URLs first, then clamp
    const preferredFormat = getPreferredMediaFormatForPlatform(platform);
    const cleanedMediaUrls = normalizeMediaUrls(mediaUrls, preferredFormat);
    const beforeClamp = cleanedMediaUrls.length;
    const clampedMediaUrls = clampMediaUrlsForPlatform(
      platform,
      cleanedMediaUrls,
      preferredFormat
    );
    if (beforeClamp !== clampedMediaUrls.length) {
      console.log(
        `⚠️ [MEDIA CLAMP] Platform: ${platform}, clamped from ${beforeClamp} to ${clampedMediaUrls.length}`
      );
    }

    const ayrsharePlatform =
      INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform;

    // Extract platform options for variant override
    const parsedVariantOptions = parsePlatformOptions(variant?.platformOptions);
    let instagramOptions: any = undefined;
    let tiktokOptions: any = undefined;

    if (platform === "instagram") {
      instagramOptions =
        variantOverride?.instagramOptions ??
        parsedVariantOptions.instagramOptions ??
        requestData.instagramOptions;
    }

    if (platform === "tiktok") {
      tiktokOptions =
        variantOverride?.tiktokOptions ??
        parsedVariantOptions.tiktokOptions ??
        requestData.tiktokOptions;
    }

    // Log media collection for debugging
    console.log(`📷 [VARIANT OVERRIDE MEDIA] Platform: ${platform}`, {
      hasVariantOverride: !!variantOverride,
      variantOverrideMediaCount: variantOverride?.media?.length || 0,
      variantOverrideMedia: variantOverride?.media,
      hasSavedVariant: !!variant,
      extractedVariantCount: variant
        ? extractMediaUrlsFromVariant(variant).length
        : 0,
      baseMediaCount: baseMediaUrls.length,
      collectedMediaCount: clampedMediaUrls.length,
      collectedMediaUrls: clampedMediaUrls,
    });

    console.log(
      `📝 [VARIANT OVERRIDE REQUEST] Platform: ${platform}, content length: ${content.length}`,
      {
        contentPreview: content.substring(0, 100),
        hasVariantOverride: !!variantOverride,
        variantOverrideContent: variantOverride?.content?.substring(0, 100),
      }
    );

    requests.push({
      postData: {
        post: content,
        platforms: [ayrsharePlatform],
        mediaUrls: clampedMediaUrls.length > 0 ? clampedMediaUrls : undefined,
        scheduleDate: requestData.scheduledDate,
        profileKey: profileKey,
        instagramOptions: instagramOptions,
        tiktokOptions: tiktokOptions,
      },
      platforms: [platform],
    });
  }

  const specialFormatPlatforms =
    trulyWithoutVariants.filter(needsJpgConversion);
  const groupedPlatforms = trulyWithoutVariants.filter(
    (platform) => !needsJpgConversion(platform)
  );

  for (const platform of specialFormatPlatforms) {
    const preferredFormat = getPreferredMediaFormatForPlatform(platform);
    const normalized = normalizeMediaUrls(baseMediaUrls, preferredFormat);
    const clamped = clampMediaUrlsForPlatform(
      platform,
      normalized,
      preferredFormat
    );
    const ayrsharePlatform =
      INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform;

    const postData: PostData = {
      post: baseContent,
      platforms: [ayrsharePlatform],
      scheduleDate: requestData.scheduledDate,
      profileKey,
    };
    if (clamped.length > 0) {
      postData.mediaUrls = clamped;
    }
    if (platform === "tiktok" && requestData.tiktokOptions) {
      postData.tiktokOptions = requestData.tiktokOptions;
    }

    console.log(
      `📷 [SPECIAL FORMAT] Platform: ${platform} requires ${preferredFormat}, sending ${clamped.length} URLs`,
      clamped
    );

    requests.push({
      postData,
      platforms: [platform],
    });
  }

  // Create single request for platforms truly without variants (excluding special formats)
  if (groupedPlatforms.length > 0) {
    const mappedPlatforms = groupedPlatforms.map(
      (p) => INTERNAL_TO_AYRSHARE_PLATFORM[p] || p
    );

    // Determine platform options for grouped request
    const hasTwitter = groupedPlatforms.includes("x");
    const hasReddit = groupedPlatforms.includes("reddit");
    const hasPinterest = groupedPlatforms.includes("pinterest");
    const hasInstagram = groupedPlatforms.includes("instagram");

    let twitterOptions: any = undefined;
    let redditOptions: any = undefined;
    let pinterestOptions: any = undefined;
    let instagramOptions: any = undefined;

    if (hasTwitter) {
      if (requestData.twitterOptions) {
        twitterOptions = requestData.twitterOptions;
      } else if (baseContent.length > 280) {
        twitterOptions = { thread: true, threadNumber: true };
      }
    }

    if (hasReddit) {
      if (requestData.redditOptions) {
        redditOptions = requestData.redditOptions;
      } else if (requestData.title) {
        // Fallback: Use request title if redditOptions not provided
        redditOptions = { title: requestData.title };
      } else {
        // Final fallback: Use first line of content as title
        const firstLine = baseContent.split("\n")[0].trim();
        if (firstLine) {
          redditOptions = { title: firstLine.substring(0, 300) }; // Reddit title limit
        } else {
          redditOptions = { title: "Post" }; // Absolute fallback
        }
      }

      // Ensure subreddit is clean (remove r/ prefix if included)
      if (redditOptions.subreddit) {
        redditOptions.subreddit = redditOptions.subreddit.replace(/^r\//, "");
        console.log(
          `📢 Reddit (grouped): Posting to r/${redditOptions.subreddit}`
        );
      } else {
        // Only use env var as fallback, don't hardcode any default
        const defaultSubreddit = process.env.REDDIT_DEFAULT_SUBREDDIT;
        if (defaultSubreddit) {
          redditOptions.subreddit = defaultSubreddit;
          console.log(
            `📢 Reddit (grouped): Using env fallback r/${defaultSubreddit}`
          );
        } else {
          console.warn(
            `⚠️ Reddit (grouped): No subreddit specified in request!`
          );
        }
      }
    }

    if (hasPinterest) {
      if (requestData.pinterestOptions) {
        pinterestOptions = requestData.pinterestOptions;
      } else {
        // Fallback to environment variable if not provided
        const envBoardId = process.env.PINTEREST_BOARD_ID;
        const envBoardName = process.env.PINTEREST_BOARD_NAME;
        if (envBoardId || envBoardName) {
          // If boardId is provided but not numeric, treat it as boardName
          if (envBoardId && !/^\d+$/.test(envBoardId)) {
            console.warn(
              "⚠️ PINTEREST_BOARD_ID is not numeric, using as boardName:",
              envBoardId
            );
            // Use the envBoardId directly if it looks like username/boardname format
            pinterestOptions = {
              boardName: envBoardId,
            };
          } else {
            pinterestOptions = {
              boardId: envBoardId,
              boardName: envBoardName,
            };
          }
        }
      }

      // If boardId exists but is not numeric, convert it to boardName
      if (
        pinterestOptions?.boardId &&
        !/^\d+$/.test(pinterestOptions.boardId)
      ) {
        console.warn(
          "⚠️ Pinterest boardId is not numeric, converting to boardName:",
          pinterestOptions.boardId
        );
        const fallbackBoardName = pinterestOptions.boardId;
        delete pinterestOptions.boardId;
        if (
          !pinterestOptions.boardName ||
          (!pinterestOptions.boardName.includes("/") &&
            fallbackBoardName.includes("/"))
        ) {
          pinterestOptions.boardName = fallbackBoardName;
        }
      }
    }

    if (hasInstagram) {
      instagramOptions = requestData.instagramOptions;
    }

    // Clamp media for platforms without variants (use minimum limit of all platforms)
    const aggregatedMediaUrls = clampMediaUrlsForPlatforms(
      groupedPlatforms,
      baseMediaUrls
    );

    console.log(
      `📷 [GROUPED MEDIA] Platforms: ${groupedPlatforms.join(", ")}, sending ${
        aggregatedMediaUrls.length
      } URLs:`,
      aggregatedMediaUrls
    );

    requests.push({
      postData: {
        post: baseContent,
        platforms: mappedPlatforms,
        mediaUrls:
          aggregatedMediaUrls.length > 0 ? aggregatedMediaUrls : undefined,
        scheduleDate: requestData.scheduledDate,
        profileKey: profileKey,
        twitterOptions: twitterOptions,
        redditOptions: redditOptions,
        pinterestOptions: pinterestOptions,
        instagramOptions: instagramOptions,
      },
      platforms: groupedPlatforms,
    });
  }

  return requests;
}

/**
 * Update post variants with ayrsharePostId from publishing results
 */
async function updatePostWithAyrshareIds(
  post: any,
  publishResults: any,
  platforms: string[],
  scheduledDate?: string
) {
  try {
    console.log("🔄 Updating post with Ayrshare IDs:", publishResults);

    // Extract post IDs from different result formats
    let postIds: Record<string, string> = {};

    if (publishResults.postIds) {
      // Standard single post result
      postIds = publishResults.postIds;
    } else if (publishResults.id) {
      // Single post with single ID
      // Map to all platforms that were requested
      platforms.forEach((platform) => {
        postIds[platform] = publishResults.id;
      });
    } else if (Array.isArray(publishResults)) {
      // Multi-post/thread results - use the first post's IDs
      if (publishResults[0]?.postIds) {
        postIds = publishResults[0].postIds;
      } else if (publishResults[0]?.id) {
        platforms.forEach((platform) => {
          postIds[platform] = publishResults[0].id;
        });
      }
    }

    console.log("📍 Extracted post IDs:", postIds);

    // Update each platform variant with its ayrsharePostId
    if (post.variants && Object.keys(postIds).length > 0) {
      // Determine if post is scheduled based on Ayrshare response
      // Check if any result indicates scheduled status
      const isScheduled =
        publishResults?.status === "scheduled" ||
        (publishResults?.posts &&
          Array.isArray(publishResults.posts) &&
          publishResults.posts[0]?.status === "scheduled");

      // Update base variant status
      const baseVariant = post.variants.base;
      if (baseVariant) {
        baseVariant.status = isScheduled ? "scheduled" : "published";
        if (isScheduled && scheduledDate) {
          const scheduledAt = new Date(scheduledDate);
          if (!Number.isNaN(scheduledAt.getTime())) {
            baseVariant.scheduledFor = scheduledAt;
          }
        }
        if (!isScheduled) {
          baseVariant.publishedAt = new Date();
          // Clear scheduledFor if published immediately
          baseVariant.scheduledFor = undefined;
        }
      }

      for (const [platform, ayrsharePostId] of Object.entries(postIds)) {
        // Map Ayrshare platform names back to our internal names
        const internalPlatform = platform === "twitter" ? "x" : platform;

        const variant = post.variants[internalPlatform];
        if (variant && ayrsharePostId) {
          variant.ayrsharePostId = ayrsharePostId;
          console.log(
            `✅ Updated ${internalPlatform} variant with ayrsharePostId: ${ayrsharePostId}`
          );

          // Update status based on Ayrshare response
          variant.status = isScheduled ? "scheduled" : "published";
          if (isScheduled && scheduledDate) {
            const scheduledAt = new Date(scheduledDate);
            if (!Number.isNaN(scheduledAt.getTime())) {
              variant.scheduledFor = scheduledAt;
            }
          }
          if (!isScheduled) {
            variant.publishedAt = new Date();
            // Clear scheduledFor if published immediately
            variant.scheduledFor = undefined;
          }
        }
      }
    }

    console.log("🔄 Successfully updated post with Ayrshare IDs");
  } catch (error) {
    console.error("❌ Error updating post with Ayrshare IDs:", error);
  }
}

// Removed old publishPost function - logic moved inline for better control

// =============================================================================
// ⏰ AUTO-SCHEDULING LOGIC
// =============================================================================

interface AutoScheduleResult {
  scheduledFor: string;
  schedulingMethod: "auto-optimal";
  reason: string;
  platform: string;
}

/**
 * Calculate optimal posting time using the timing engine
 */
async function calculateOptimalScheduleTime(
  platforms: string[],
  profileKey?: string,
  existingScheduledPosts?: any[]
): Promise<AutoScheduleResult> {
  // Use the first platform for timing (most platforms have similar optimal times)
  const primaryPlatform = platforms[0] || "instagram";
  const engine = new OptimalTimingEngine(primaryPlatform, profileKey);

  try {
    const analysis = await engine.getOptimalTiming();

    // Get the best time slot
    const bestTime = analysis.bestTimes[0];

    if (!bestTime) {
      // Fallback to a reasonable default (tomorrow at optimal hours based on platform)
      const defaultHours: Record<string, number> = {
        instagram: 18, // 6 PM
        twitter: 12, // 12 PM
        x: 12,
        linkedin: 9, // 9 AM
        facebook: 15, // 3 PM
        tiktok: 19, // 7 PM
      };

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(defaultHours[primaryPlatform] || 12, 0, 0, 0);

      return {
        scheduledFor: tomorrow.toISOString(),
        schedulingMethod: "auto-optimal",
        reason: `Default optimal time for ${primaryPlatform}`,
        platform: primaryPlatform,
      };
    }

    // Calculate the next occurrence of the best time slot
    const now = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const currentDayIndex = now.getDay();
    const targetDayIndex = days.indexOf(bestTime.day);

    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0) {
      // Same day - check if the hour has passed
      if (now.getHours() >= bestTime.hour) {
        daysUntilTarget = 7; // Next week
      }
    }

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysUntilTarget);
    targetDate.setHours(bestTime.hour, 0, 0, 0);

    // Avoid conflicts with existing scheduled posts (add 30 min buffer)
    if (existingScheduledPosts && existingScheduledPosts.length > 0) {
      const conflictingPost = existingScheduledPosts.find((post: any) => {
        const postDate = post.scheduledFor ? new Date(post.scheduledFor) : null;
        if (!postDate) return false;
        const timeDiff = Math.abs(targetDate.getTime() - postDate.getTime());
        return timeDiff < 30 * 60 * 1000; // 30 minutes
      });

      if (conflictingPost) {
        // Move to 30 minutes after the conflicting post
        targetDate.setMinutes(targetDate.getMinutes() + 30);
      }
    }

    return {
      scheduledFor: targetDate.toISOString(),
      schedulingMethod: "auto-optimal",
      reason: `Best engagement time for ${primaryPlatform} on ${
        bestTime.day
      } at ${bestTime.hour}:00 (score: ${(bestTime.score * 100).toFixed(0)}%)`,
      platform: primaryPlatform,
    };
  } catch (error) {
    console.error("❌ Error calculating optimal schedule time:", error);

    // Fallback to tomorrow at noon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    return {
      scheduledFor: tomorrow.toISOString(),
      schedulingMethod: "auto-optimal",
      reason: "Fallback to default time (timing analysis unavailable)",
      platform: primaryPlatform,
    };
  }
}

// =============================================================================
// 🌐 API ENDPOINTS
// =============================================================================

/**
 * POST /api/posts - Create a new post
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substring(7)}`;
  console.log(`🆔 [API REQUEST START] ${requestId} - POST /api/posts`);
  let authResult:
    | {
        isValid: boolean;
        error?: string;
        errorCode?: string;
        statusCode?: number;
        user?: AuthenticatedUser;
      }
    | undefined;

  try {
    // 🔐 Authenticate API key
    authResult = await authenticateAPIKey(request);
    if (!authResult.isValid) {
      // Log failed authentication attempt
      await logAPIKeyUsage(
        null, // No account for failed auth
        "unknown",
        "/api/posts",
        "POST",
        authResult.statusCode || 401,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
          userAgent: request.headers.get("User-Agent") || "unknown",
          errorMessage: authResult.error,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          code: authResult.errorCode || "AUTHENTICATION_FAILED",
        },
        {
          status: authResult.statusCode || 401,
          headers: {
            "X-RateLimit-Limit": "1000",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": (
              Math.ceil(Date.now() / 1000) + 3600
            ).toString(),
          },
        }
      );
    }

    const user = authResult.user!;

    // Check permissions
    if (!user.keyData.permissions.includes("posts:create")) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        "/api/posts",
        "POST",
        403,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
          userAgent: request.headers.get("User-Agent") || "unknown",
          errorMessage: "Insufficient permissions",
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: "API key does not have posts:create permission",
          code: "INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 }
      );
    }

    // 📝 Parse and validate request
    let requestData: CreatePostRequest;
    let dryRunPublish = false;
    let omitPlatformsInDryRun = true;
    try {
      const body = await request.json();
      // Normalize platform names: 'twitter' -> 'x' for internal consistency
      if (body.platforms && Array.isArray(body.platforms)) {
        body.platforms = body.platforms.map((p: string) =>
          p === "twitter" ? "x" : p
        );
      }
      requestData = CreatePostSchema.parse(body);
      normalizeRequestOptionAliases(
        requestData as CreatePostRequest & Record<string, any>
      );
      dryRunPublish = requestData.dryRunPublish === true;
      omitPlatformsInDryRun = requestData.omitPlatforms !== false;

      // Debug: Log publishImmediately value
      console.log("🔍 [DEBUG] Parsed requestData.publishImmediately:", {
        publishImmediately: requestData.publishImmediately,
        scheduledDate: requestData.scheduledDate,
        autoSchedule: requestData.autoSchedule,
        platforms: requestData.platforms,
      });
    } catch (error) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        "/api/posts",
        "POST",
        400,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
          userAgent: request.headers.get("User-Agent") || "unknown",
          errorMessage: "Invalid request data",
        }
      );

      // Handle Zod validation errors
      if (error && typeof error === "object" && "issues" in error) {
        const zodError = error as zod.ZodError;
        return NextResponse.json(
          {
            success: false,
            error: "Invalid request data",
            code: "VALIDATION_ERROR",
            details: zodError.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
              code: issue.code,
            })),
          },
          { status: 400 }
        );
      }

      // Handle JSON parse errors or other errors
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Invalid JSON",
          code: "INVALID_JSON",
        },
        { status: 400 }
      );
    }

    // 🎯 Validate account group access
    const groupAccess = validateAccountGroupAccess(
      user.keyData,
      requestData.accountGroupId
    );
    if (!groupAccess.hasAccess) {
      await logAPIKeyUsage(
        user.account,
        user.keyData.keyId,
        "/api/posts",
        "POST",
        groupAccess.statusCode || 403,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
          userAgent: request.headers.get("User-Agent") || "unknown",
          errorMessage: "Account group access denied",
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: groupAccess.error || "Access denied to account group",
          code: groupAccess.errorCode || "ACCOUNT_GROUP_ACCESS_DENIED",
        },
        { status: groupAccess.statusCode || 403 }
      );
    }

    // ⏰ Handle auto-scheduling
    let autoScheduleResult: AutoScheduleResult | null = null;
    const shouldAutoSchedule =
      requestData.autoSchedule || requestData.scheduledDate === "auto";

    if (shouldAutoSchedule) {
      console.log("⏰ [AUTO-SCHEDULE] Calculating optimal posting time...");

      // Get profile key for timing analysis
      let profileKeyForTiming: string | undefined;
      try {
        const { jazzServerWorker } = await import("@/utils/jazzServer");
        const { AccountGroup } = await import("@/app/schema");
        const worker = await jazzServerWorker;

        if (worker) {
          const accountGroup = await AccountGroup.load(
            requestData.accountGroupId,
            {
              loadAs: worker,
              resolve: { posts: { $each: { variants: { $each: true } } } },
            }
          );
          if (accountGroup?.ayrshareProfileKey) {
            profileKeyForTiming = accountGroup.ayrshareProfileKey;
          }

          // Get existing scheduled posts to avoid conflicts
          const existingPosts = accountGroup?.posts
            ? Array.from(accountGroup.posts)
                .filter((p: any) => p?.variants?.base?.status === "scheduled")
                .map((p: any) => ({
                  scheduledFor: p?.variants?.base?.scheduledFor,
                }))
            : [];

          autoScheduleResult = await calculateOptimalScheduleTime(
            requestData.platforms,
            profileKeyForTiming,
            existingPosts
          );
        }
      } catch (error) {
        console.warn(
          "⚠️ Error loading account group for auto-scheduling:",
          error
        );
        autoScheduleResult = await calculateOptimalScheduleTime(
          requestData.platforms,
          undefined,
          []
        );
      }

      if (autoScheduleResult) {
        // Replace the "auto" scheduledDate with the calculated time
        requestData.scheduledDate = autoScheduleResult.scheduledFor;
        // Don't publish immediately - we're scheduling (unless explicitly set to true)
        // Only override if publishImmediately wasn't explicitly set to true
        if (!requestData.publishImmediately) {
          requestData.publishImmediately = false;
        }

        console.log("✅ [AUTO-SCHEDULE] Optimal time calculated:", {
          scheduledFor: autoScheduleResult.scheduledFor,
          reason: autoScheduleResult.reason,
        });

        // Log the auto-schedule action to automation logs
        try {
          const { jazzServerWorker } = await import("@/utils/jazzServer");
          const { AccountGroup, AutomationLog } = await import("@/app/schema");
          const { co } = await import("jazz-tools");
          const worker = await jazzServerWorker;

          if (worker) {
            const accountGroup = await AccountGroup.load(
              requestData.accountGroupId,
              {
                loadAs: worker,
                resolve: { automationLogs: true },
              }
            );

            if (accountGroup) {
              // Initialize automationLogs if not present
              if (!accountGroup.automationLogs) {
                accountGroup.automationLogs = co
                  .list(AutomationLog)
                  .create([], {
                    owner: accountGroup._owner,
                  });
              }

              // Add automation log entry
              const logEntry = AutomationLog.create(
                {
                  type: "schedule",
                  action: `Post auto-scheduled for optimal engagement`,
                  platform: autoScheduleResult.platform,
                  status: "success",
                  timestamp: new Date(),
                  completedAt: new Date(),
                  details: JSON.stringify({
                    scheduledFor: autoScheduleResult.scheduledFor,
                    reason: autoScheduleResult.reason,
                    schedulingMethod: autoScheduleResult.schedulingMethod,
                    platforms: requestData.platforms,
                  }),
                },
                { owner: accountGroup._owner }
              );

              accountGroup.automationLogs.push(logEntry);
              console.log("📝 [AUTO-SCHEDULE] Logged to automation logs");
            }
          }
        } catch (logError) {
          // Don't fail the request if logging fails
          console.warn("⚠️ Failed to log auto-schedule action:", logError);
        }
      }
    }

    // 🚀 Create or Load the post
    let result: {
      success: boolean;
      postId?: string;
      post?: any;
      error?: string;
    };

    if (requestData.postId) {
      // EXISTING POST: Load the post by ID (for publishing existing posts with variants)
      try {
        const { jazzServerWorker } = await import("@/utils/jazzServer");
        const { Post } = await import("@/app/schema");
        const worker = await jazzServerWorker;

        if (!worker) {
          throw new Error("Server worker not available");
        }

        const existingPost = await Post.load(requestData.postId, {
          loadAs: worker,
          resolve: {
            variants: { $each: true },
          },
        });

        if (!existingPost) {
          throw new Error(`Post ${requestData.postId} not found`);
        }

        // Extract base content from the post's base variant (for preparePublishRequests)
        const baseVariant = existingPost.variants?.base;
        if (!requestData.content && baseVariant?.text) {
          requestData.content = baseVariant.text.toString();
        }

        result = {
          success: true,
          postId: requestData.postId,
          post: existingPost,
        };
      } catch (loadError) {
        console.error(`❌ [POST LOAD FAILED] ${requestId}:`, loadError);
        result = {
          success: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Failed to load post",
        };
      }
    } else {
      // NEW POST: Create the post (requires content)
      if (!requestData.content) {
        return NextResponse.json(
          {
            success: false,
            error: "Content is required when creating a new post",
          },
          { status: 400 }
        );
      }

      console.log(
        `📝 [POST CREATION START] ${requestId} - Creating SINGLE post with variants:`,
        {
          platforms: requestData.platforms,
          platformCount: requestData.platforms.length,
          hasVariants: !!requestData.variants,
          variantPlatforms: requestData.variants
            ? Object.keys(requestData.variants)
            : [],
        }
      );

      result = await createPost(requestData, user);

      if (result.success && result.post) {
        console.log(
          `✅ [POST CREATION SUCCESS] ${requestId} - SINGLE post created:`,
          {
            postId: result.postId,
            variantCount: Object.keys(result.post.variants || {}).length,
            variantPlatforms: Object.keys(result.post.variants || {}),
            totalVariantsInPost: Object.keys(result.post.variants || {}).length,
          }
        );
      } else {
        console.error(`❌ [POST CREATION FAILED] ${requestId}:`, result.error);
      }
    }

    // 🚀 Publish the post (if immediate or scheduled)
    let publishResult = null;
    console.log("🔍 [DEBUG] Publishing check:", {
      resultSuccess: result.success,
      publishImmediately: requestData.publishImmediately,
      scheduledDate: requestData.scheduledDate,
      willPublish:
        result.success &&
        (requestData.publishImmediately || requestData.scheduledDate),
    });
    if (
      result.success &&
      (requestData.publishImmediately || requestData.scheduledDate)
    ) {
      console.log("📝 Post created successfully, now attempting to publish...");

      // CRITICAL: Get the account group's profile key to ensure posts go to the right account
      let profileKey: string | undefined;
      try {
        const { jazzServerWorker } = await import("@/utils/jazzServer");
        const { AccountGroup } = await import("@/app/schema");
        const worker = await jazzServerWorker;

        if (worker) {
          const accountGroup = await AccountGroup.load(
            requestData.accountGroupId,
            { loadAs: worker }
          );
          if (accountGroup?.ayrshareProfileKey) {
            profileKey = accountGroup.ayrshareProfileKey;
            console.log(
              `🔑 Using account group profile key: ${profileKey?.substring(
                0,
                8
              )}...`
            );
          } else {
            console.warn(
              `⚠️ No Ayrshare profile key found for account group: ${requestData.accountGroupId}`
            );
          }
        }
      } catch (error) {
        console.error("❌ Failed to get account group profile key:", error);
      }

      // Use request profileKey as fallback, but prioritize account group's profile key
      const finalProfileKey = profileKey || requestData.profileKey;

      console.log("🔑 Profile Key Debug:", {
        accountGroupId: requestData.accountGroupId,
        accountGroupProfileKey: profileKey
          ? `${profileKey.substring(0, 8)}...`
          : "none",
        requestProfileKey: requestData.profileKey
          ? `${requestData.profileKey.substring(0, 8)}...`
          : "none",
        finalProfileKey: finalProfileKey
          ? `${finalProfileKey.substring(0, 8)}...`
          : "none",
        willUseBusinessPlan: !!(finalProfileKey && isBusinessPlanMode()),
      });

      try {
        if (!dryRunPublish && requestData.deleteExistingScheduled) {
          if (!finalProfileKey) {
            throw new Error(
              "deleteExistingScheduled requires a valid Profile-Key"
            );
          }

          const targetPlatforms = requestData.platforms;
          const deleteErrors: Array<{ platform: string; error: string }> = [];

          for (const platform of targetPlatforms) {
            const variant = result.post?.variants?.[platform];
            const postId = variant?.ayrsharePostId;
            const isScheduled =
              variant?.status === "scheduled" || !!variant?.scheduledFor;

            if (!postId || !isScheduled) continue;

            try {
              await deleteAyrsharePostById(postId, finalProfileKey);
              console.log(
                `🗑️ Deleted scheduled Ayrshare post ${postId} for ${platform}`
              );
            } catch (deleteError) {
              deleteErrors.push({
                platform,
                error:
                  deleteError instanceof Error
                    ? deleteError.message
                    : "Unknown delete error",
              });
            }
          }

          if (deleteErrors.length > 0) {
            throw new Error(
              `Failed to delete scheduled posts: ${deleteErrors
                .map((e) => `${e.platform} (${e.error})`)
                .join(", ")}`
            );
          }
        }

        // Prepare publish requests - handles variants by creating separate requests per platform
        const publishRequests = await preparePublishRequests(
          requestData,
          result.post,
          finalProfileKey
        );

        console.log(
          `📦 Prepared ${publishRequests.length} publish request(s) for ${requestData.platforms.length} platform(s)`
        );

        if (dryRunPublish) {
          const previewRequests = publishRequests.map(
            ({ postData, platforms }) => {
              if (!omitPlatformsInDryRun) {
                return { postData, platforms };
              }
              const { platforms: _omit, ...rest } = postData;
              return {
                postData: rest,
                platformCount: platforms.length,
              };
            }
          );

          publishResult = {
            success: true,
            dryRunPublish: true,
            results: {
              requestCount: publishRequests.length,
              platformsOmitted: omitPlatformsInDryRun,
              requests: previewRequests,
            },
          };
        } else {
          // Aggregate results from all requests
          const allPostIds: Record<string, string> = {};
          const allPlatforms: string[] = [];
          let aggregatedResults: any = null;
          const errors: Array<{ platform: string; error: string }> = [];

          // Process each publish request
          for (const { postData, platforms } of publishRequests) {
            try {
              console.log(`🚀 Publishing to platforms: ${platforms.join(", ")}`);

              let ayrshareResults: any;

              // Handle special cases (reply, thread) - these should be rare with variants
              if (requestData.replyTo?.url && platforms.length === 1) {
                ayrshareResults = await handleReplyPost(
                  postData,
                  requestData.replyTo.url
                );
              } else if (
                requestData.isThread &&
                requestData.threadPosts &&
                platforms.length === 1
              ) {
                const threadPosts = requestData.threadPosts.map(
                  (tp: { content: string; media?: any[] }, index: number) => ({
                    content: tp.content,
                    media: tp.media || [],
                    characterCount: tp.content.length,
                    index,
                    total: requestData.threadPosts!.length,
                  })
                );
                ayrshareResults = await handleMultiPosts(postData, threadPosts);
              } else {
                // Standard post
                ayrshareResults = await handleStandardPost(postData);
              }

              // Aggregate post IDs from response
              if (ayrshareResults?.postIds) {
                Object.assign(allPostIds, ayrshareResults.postIds);
              } else if (ayrshareResults?.id) {
                // Single ID for scheduled posts - assign to all platforms in this request
                platforms.forEach((p) => {
                  const ayrsharePlatform =
                    INTERNAL_TO_AYRSHARE_PLATFORM[p] || p;
                  allPostIds[ayrsharePlatform] = ayrshareResults.id;
                });
              } else if (
                ayrshareResults?.posts &&
                Array.isArray(ayrshareResults.posts)
              ) {
                // Posts array format
                const post = ayrshareResults.posts[0];
                if (post?.id) {
                  platforms.forEach((p) => {
                    const ayrsharePlatform =
                      INTERNAL_TO_AYRSHARE_PLATFORM[p] || p;
                    allPostIds[ayrsharePlatform] = post.id;
                  });
                }
              }

              allPlatforms.push(...platforms);

              // Store first result as aggregated (for status checking)
              if (!aggregatedResults) {
                aggregatedResults = ayrshareResults;
              }

              console.log(
                `✅ Successfully published to ${platforms.join(", ")}`
              );
            } catch (platformError) {
              const errorMessage =
                platformError instanceof Error
                  ? platformError.message
                  : "Unknown error";
              console.error(
                `❌ Failed to publish to ${platforms.join(", ")}:`,
                errorMessage
              );
              errors.push({
                platform: platforms.join(", "),
                error: errorMessage,
              });
              // Continue with other platforms
            }
          }

          // Create aggregated result structure
          const ayrshareResults = {
            ...aggregatedResults,
            postIds: allPostIds,
            platforms: allPlatforms,
            errors: errors.length > 0 ? errors : undefined,
          };

          console.log("✅ Post publishing complete:", {
            totalPlatforms: allPlatforms.length,
            successfulPlatforms: Object.keys(allPostIds).length,
            errors: errors.length,
            postIds: allPostIds,
          });

          // Update post with ayrsharePostId from publishing results using reliable updater
          if (ayrshareResults && result.post) {
            try {
              const { updatePostWithResults } = await import(
                "@/utils/reliablePostUpdater"
              );

              // Get account group for notifications
              let accountGroup = null;
              try {
                const { jazzServerWorker } = await import("@/utils/jazzServer");
                const { AccountGroup } = await import("@/app/schema");
                const worker = await jazzServerWorker;

                if (worker) {
                  accountGroup = await AccountGroup.load(
                    requestData.accountGroupId,
                    {
                      loadAs: worker,
                      resolve: {
                        accounts: { $each: true },
                      },
                    }
                  );
                }
              } catch (groupError) {
                console.warn(
                  "⚠️ Could not load account group for notifications:",
                  groupError
                );
              }

              // Determine if post is scheduled: true only if scheduledDate exists AND publishImmediately is false
              const isScheduled =
                !!requestData.scheduledDate && !requestData.publishImmediately;

              const updateResult = await updatePostWithResults({
                jazzPost: result.post,
                publishResults: ayrshareResults,
                platforms: requestData.platforms,
                isScheduled: isScheduled,
                scheduledDate: requestData.scheduledDate,
                postTitle: requestData.title || "API Post",
                accountGroup: accountGroup,
              });

              if (updateResult.success) {
                console.log("✅ Successfully updated post with reliable updater");
                if (updateResult.notificationSent) {
                  console.log("📱 Notification sent for post");
                }
              } else {
                console.error("⚠️ Reliable updater failed:", updateResult.error);
                // Fallback to old method
                await updatePostWithAyrshareIds(
                  result.post,
                  ayrshareResults,
                  requestData.platforms,
                  requestData.scheduledDate
                );
              }
            } catch (updateError) {
              console.error(
                "❌ Reliable updater error, falling back to old method:",
                updateError
              );
              await updatePostWithAyrshareIds(
                result.post,
                ayrshareResults,
                requestData.platforms,
                requestData.scheduledDate
              );
            }
          }

          publishResult = { success: true, results: ayrshareResults };
        }
      } catch (publishError) {
        console.error(
          "❌ Post created but publishing to Ayrshare failed:",
          publishError
        );
        publishResult = {
          success: false,
          error:
            publishError instanceof Error
              ? publishError.message
              : "Publishing failed",
        };
      }
    } else {
      console.log("📝 Post saved as draft - no publishing attempted");
      publishResult = {
        success: true,
        results: { message: "Post saved as draft" },
      };
    }

    // Get rate limit info for headers
    const rateLimit = checkRateLimit(user.keyData);

    // ✅ Log successful usage
    const responseTime = Date.now() - startTime;
    await logAPIKeyUsage(
      user.account,
      user.keyData.keyId,
      "/api/posts",
      "POST",
      result.success ? 201 : 400,
      {
        responseTime,
        ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
        userAgent: request.headers.get("User-Agent") || "unknown",
        requestSize: JSON.stringify(requestData).length,
        responseSize: JSON.stringify(result).length,
        errorMessage: result.success ? undefined : result.error,
      }
    );

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: autoScheduleResult
            ? "Post created and auto-scheduled successfully"
            : "Post created successfully",
          data: {
            postId: result.postId,
            accountGroupId: requestData.accountGroupId,
            platforms: [
              ...new Set([
                ...requestData.platforms,
                ...(requestData.variants
                  ? Object.keys(requestData.variants)
                  : []),
              ]),
            ].filter((p) => PlatformNames.includes(p as any)),
            scheduledDate: requestData.scheduledDate,
            publishedImmediately: requestData.publishImmediately,
            // Include auto-schedule details if applicable
            autoSchedule: autoScheduleResult
              ? {
                  scheduledFor: autoScheduleResult.scheduledFor,
                  schedulingMethod: autoScheduleResult.schedulingMethod,
                  reason: autoScheduleResult.reason,
                  platform: autoScheduleResult.platform,
                }
              : undefined,
            publishingResult: publishResult
              ? {
                  success: publishResult.success,
                  error: publishResult.error,
                  dryRunPublish: publishResult.dryRunPublish === true,
                  results: publishResult.results,
                }
              : null,
          },
        },
        {
          status: 201,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              rateLimit.resetTime / 1000
            ).toString(),
            "X-Response-Time": `${responseTime}ms`,
          },
        }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Post creation failed",
          code: "POST_CREATION_FAILED",
        },
        {
          status: 400,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(
              rateLimit.resetTime / 1000
            ).toString(),
            "X-Response-Time": `${responseTime}ms`,
          },
        }
      );
    }
  } catch (error) {
    console.error("❌ Unexpected error in posts API:", error);

    // Log error if we have user context
    if (authResult?.user) {
      await logAPIKeyUsage(
        authResult.user.account,
        authResult.user.keyData.keyId,
        "/api/posts",
        "POST",
        500,
        {
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get("X-Forwarded-For") || "unknown",
          userAgent: request.headers.get("User-Agent") || "unknown",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
        headers: {
          "X-Response-Time": `${Date.now() - startTime}ms`,
        },
      }
    );
  }
}

// =============================================================================
// 📖 GET POSTS (OPTIONAL - for retrieving posts)
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAPIKey(request);
    if (!authResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error,
          code: authResult.errorCode || "AUTHENTICATION_FAILED",
        },
        { status: authResult.statusCode || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountGroupId = searchParams.get("accountGroupId");

    if (!accountGroupId) {
      return NextResponse.json(
        {
          success: false,
          error: "accountGroupId parameter is required",
          code: "MISSING_PARAMETER",
        },
        { status: 400 }
      );
    }

    const redirectUrl = new URL("/api/posts/list", request.url);
    redirectUrl.searchParams.set("accountGroupId", accountGroupId);

    return NextResponse.redirect(redirectUrl, 301);
  } catch (error) {
    console.error("❌ Error redirecting to posts list:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
