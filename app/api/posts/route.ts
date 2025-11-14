import { NextRequest, NextResponse } from "next/server";
import { z } from "jazz-tools";
import { z as zod } from "zod";
import { PlatformNames } from "@/app/schema";
import {
  handleStandardPost,
  handleReplyPost,
  handleMultiPosts,
} from "@/utils/apiHandlers";
import {
  isBusinessPlanMode,
  INTERNAL_TO_AYRSHARE_PLATFORM,
} from "@/utils/ayrshareIntegration";
import {
  validateAPIKey,
  logAPIKeyUsage,
  checkRateLimit,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
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

const CreatePostSchema = z.object({
  // Required fields
  accountGroupId: z.string().min(1, "Account group ID is required"),
  content: z.string().min(1, "Post content is required"),
  platforms: z
    .array(z.enum(PlatformNames))
    .min(1, "At least one platform is required"),

  // Optional fields
  title: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),

  // Media attachments - URL-based only
  media: z
    .array(
      z.object({
        type: z.enum(["image", "video"]),
        url: z.string().url(),
        alt: z.string().optional(),
        filename: z.string().optional(),
      })
    )
    .optional(),

  // Legacy support: imageUrls and alt (for backward compatibility)
  imageUrls: z.array(z.string().url()).optional(),
  alt: z.string().optional(),

  // Platform-specific variants
  variants: zod
    .record(
      zod.string(),
      zod.object({
        content: zod.string().optional(), // Override base content for this platform
        media: zod.array(zod.string().url()).optional(), // Override base media for this platform
      })
    )
    .optional(),

  // Platform-specific options (twitterOptions, instagramOptions, etc.)
  twitterOptions: z
    .object({
      thread: z.boolean().optional(),
      threadNumber: z.boolean().optional(),
      replyToTweetId: z.string().optional(),
      mediaUrls: z.array(z.string().url()).optional(),
    })
    .optional(),

  // Reply configuration
  replyTo: z
    .object({
      url: z.string().url(),
      platform: z.enum(PlatformNames).optional(),
    })
    .optional(),

  // Thread/multi-post configuration
  isThread: z.boolean().optional(),
  threadPosts: z
    .array(
      z.object({
        content: z.string(),
        media: z
          .array(
            z.object({
              type: z.enum(["image", "video"]),
              url: z.string().url(),
              alt: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),

  // Publishing options
  publishImmediately: z.boolean().default(false),
  saveAsDraft: z.boolean().default(true),

  // Business plan options
  profileKey: z.string().optional(), // For Ayrshare Business Plan integration
});

type CreatePostRequest = z.infer<typeof CreatePostSchema>;

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
    if (baseMediaUrls.length > 0) {
      const { URLImageMedia, URLVideoMedia } = await import("@/app/schema");

      for (const mediaUrl of baseMediaUrls) {
        try {
          // Try to find matching media item for alt text
          const mediaItem = request.media?.find((m) => m.url === mediaUrl);
          const altText = co
            .plainText()
            .create(mediaItem?.alt || request.alt || "", { owner: groupOwner });

          // Determine type from mediaItem or default to image
          const isVideo = mediaItem?.type === "video";

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
      altText?: string
    ) => {
      const mediaList = co.list(MediaItem).create([], { owner: groupOwner });
      if (urls.length === 0) return mediaList;

      const { URLImageMedia } = await import("@/app/schema");
      for (const mediaUrl of urls) {
        try {
          const alt = co
            .plainText()
            .create(altText || request.alt || "", { owner: groupOwner });
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
        } catch (mediaError) {
          console.error("❌ Failed to create URL media item:", mediaError);
        }
      }
      return mediaList;
    };

    // Create platform variants - use variant overrides if provided
    for (const platform of request.platforms) {
      // Check if this platform has variant overrides
      const variantOverride = request.variants?.[platform];

      // Use variant content if provided, otherwise use base content
      const variantText = variantOverride?.content
        ? co.plainText().create(variantOverride.content, { owner: groupOwner })
        : baseVariant.text;

      // Use variant media if provided, otherwise use base media
      let variantMediaList = baseMediaList;
      if (variantOverride?.media && variantOverride.media.length > 0) {
        variantMediaList = await createMediaListFromUrls(
          variantOverride.media,
          request.alt
        );
      }

      // Prepare platform options for this variant
      // Inherit from base, but can be overridden per-platform in the future
      const variantPlatformOptions: Record<string, any> = {};
      if (baseVariant.platformOptions) {
        try {
          Object.assign(
            variantPlatformOptions,
            JSON.parse(baseVariant.platformOptions)
          );
        } catch (e) {
          // If parsing fails, treat as empty
        }
      }
      // If twitterOptions provided and this is x platform, save it
      if (request.twitterOptions && platform === "x") {
        variantPlatformOptions.twitterOptions = request.twitterOptions;
      }

      const platformVariant = PostVariant.create(
        {
          text: variantText,
          postDate: baseVariant.postDate,
          media: variantMediaList,
          replyTo: baseVariant.replyTo,
          status: baseVariant.status,
          scheduledFor: baseVariant.scheduledFor,
          publishedAt: baseVariant.publishedAt,
          edited: variantOverride?.content ? true : false,
          lastModified: variantOverride?.content
            ? new Date().toISOString()
            : undefined,
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
      variants[platform] = platformVariant;
    }

    // Also create variants for platforms specified in variants but not in platforms array
    if (request.variants) {
      for (const [platform, variantData] of Object.entries(request.variants)) {
        const typedVariantData = variantData as {
          content?: string;
          media?: string[];
        };
        if (
          !request.platforms.includes(platform as any) &&
          PlatformNames.includes(platform as any)
        ) {
          // Add this platform to the platforms list
          request.platforms.push(platform as any);

          // Create variant with overrides
          const variantText = typedVariantData.content
            ? co
                .plainText()
                .create(typedVariantData.content, { owner: groupOwner })
            : baseVariant.text;

          let variantMediaList = baseMediaList;
          if (typedVariantData.media && typedVariantData.media.length > 0) {
            variantMediaList = await createMediaListFromUrls(
              typedVariantData.media,
              request.alt
            );
          }

          // Prepare platform options for this variant
          const variantPlatformOptions: Record<string, any> = {};
          if (baseVariant.platformOptions) {
            Object.assign(variantPlatformOptions, baseVariant.platformOptions);
          }
          if (request.twitterOptions && platform === "x") {
            variantPlatformOptions.twitterOptions = request.twitterOptions;
          }

          const platformVariant = PostVariant.create(
            {
              text: variantText,
              postDate: baseVariant.postDate,
              media: variantMediaList,
              replyTo: baseVariant.replyTo,
              status: baseVariant.status,
              scheduledFor: baseVariant.scheduledFor,
              publishedAt: baseVariant.publishedAt,
              edited: typedVariantData.content ? true : false,
              lastModified: typedVariantData.content
                ? new Date().toISOString()
                : undefined,
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
          variants[platform] = platformVariant;
        }
      }
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
    // Filter out null entries that might exist in the list
    const existingPost = accountGroup.posts.find((p: any) => p && p.id === post.id);
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

  for (const item of mediaArray) {
    const mediaItem = item as any;
    if (mediaItem?.type === "url-image" || mediaItem?.type === "url-video") {
      const url = mediaItem.url;
      if (
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://"))
      ) {
        mediaUrls.push(url);
      }
    }
  }

  return mediaUrls;
}

/**
 * Prepare publish requests for Ayrshare API
 * Handles platform-specific variants by creating separate requests per platform when variants exist
 */
async function preparePublishRequests(
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
  const baseContent = requestData.content;
  const baseMediaUrls =
    (requestData.media?.map((m) => m.url).filter(Boolean) as string[]) ||
    requestData.imageUrls ||
    [];

  // Process each platform
  for (const platform of requestData.platforms) {
    if (!PlatformNames.includes(platform as any)) continue;

    const variantOverride = requestData.variants?.[platform];
    const variant = post?.variants?.[platform];

    // Determine content: variant override > saved variant > base
    let content = baseContent;
    if (variantOverride?.content) {
      content = variantOverride.content;
    } else if (variant?.text) {
      content = variant.text.toString();
    }

    // Determine media: variant override > saved variant > base
    let mediaUrls: string[] = baseMediaUrls;
    if (variantOverride?.media && variantOverride.media.length > 0) {
      mediaUrls = variantOverride.media;
    } else if (variant) {
      const variantMediaUrls = extractMediaUrlsFromVariant(variant);
      if (variantMediaUrls.length > 0) {
        mediaUrls = variantMediaUrls;
      }
    }

    // Determine platform options: request > saved variant > defaults
    let twitterOptions: any = undefined;
    if (platform === "x") {
      // Check request first
      if (requestData.twitterOptions) {
        twitterOptions = requestData.twitterOptions;
      } else if (variant?.platformOptions) {
        // Check saved variant (parse JSON string)
        try {
          const parsedOptions = JSON.parse(variant.platformOptions);
          if (parsedOptions?.twitterOptions) {
            twitterOptions = parsedOptions.twitterOptions;
          }
        } catch (e) {
          // If parsing fails, ignore
        }
      } else {
        // Default: enable threading for long posts
        const contentLength = content.length;
        if (contentLength > 280) {
          twitterOptions = { thread: true, threadNumber: true };
        }
      }
    }

    // If variant exists (override or saved), create separate request for this platform
    if (variantOverride || variant) {
      const ayrsharePlatform =
        INTERNAL_TO_AYRSHARE_PLATFORM[platform] || platform;
      requests.push({
        postData: {
          post: content,
          platforms: [ayrsharePlatform],
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          scheduleDate: requestData.scheduledDate,
          profileKey: profileKey,
          twitterOptions: twitterOptions,
        },
        platforms: [platform],
      });
    } else {
      // No variant - group with other platforms without variants
      platformsWithoutVariants.push(platform);
    }
  }

  // Create single request for platforms without variants
  if (platformsWithoutVariants.length > 0) {
    const mappedPlatforms = platformsWithoutVariants.map(
      (p) => INTERNAL_TO_AYRSHARE_PLATFORM[p] || p
    );

    // Determine twitter options for grouped request
    const hasTwitter = platformsWithoutVariants.includes("x");
    let twitterOptions: any = undefined;
    if (hasTwitter) {
      if (requestData.twitterOptions) {
        twitterOptions = requestData.twitterOptions;
      } else if (baseContent.length > 280) {
        twitterOptions = { thread: true, threadNumber: true };
      }
    }

    requests.push({
      postData: {
        post: baseContent,
        platforms: mappedPlatforms,
        mediaUrls: baseMediaUrls.length > 0 ? baseMediaUrls : undefined,
        scheduleDate: requestData.scheduledDate,
        profileKey: profileKey,
        twitterOptions: twitterOptions,
      },
      platforms: platformsWithoutVariants,
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
  platforms: string[]
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
    try {
      const body = await request.json();
      // Normalize platform names: 'twitter' -> 'x' for internal consistency
      if (body.platforms && Array.isArray(body.platforms)) {
        body.platforms = body.platforms.map((p: string) =>
          p === "twitter" ? "x" : p
        );
      }
      requestData = CreatePostSchema.parse(body);
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

    // 🚀 Create the post (ONLY ONE POST, even with variants)
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

    const result = await createPost(requestData, user);

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

    // 🚀 Publish the post (if immediate or scheduled)
    let publishResult = null;
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
        // Prepare publish requests - handles variants by creating separate requests per platform
        const publishRequests = await preparePublishRequests(
          requestData,
          result.post,
          finalProfileKey
        );

        console.log(
          `📦 Prepared ${publishRequests.length} publish request(s) for ${requestData.platforms.length} platform(s)`
        );

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
                const ayrsharePlatform = INTERNAL_TO_AYRSHARE_PLATFORM[p] || p;
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

            console.log(`✅ Successfully published to ${platforms.join(", ")}`);
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
                requestData.platforms
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
              requestData.platforms
            );
          }
        }

        publishResult = { success: true, results: ayrshareResults };
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
          message: "Post created successfully",
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
            publishingResult: publishResult
              ? {
                  success: publishResult.success,
                  error: publishResult.error,
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
