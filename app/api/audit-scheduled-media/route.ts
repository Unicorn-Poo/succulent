import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VariantAudit = {
  platform: string;
  status: string | undefined;
  scheduledFor: Date | undefined;
  mediaItemCount: number;
  resolvedMediaUrls: string[];
  fileStreamIds: string[];
  urlMediaCount: number;
  mediaDetails?: Array<{
    type: string;
    url?: string;
    hasImage: boolean;
    hasVideo: boolean;
    fileStreamId?: string;
  }>;
};

function resolveBaseUrl(request: NextRequest): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return "http://localhost:3000";
  }
}

function extractMediaUrlsFromVariant(variant: any, baseUrl: string): {
  urls: string[];
  fileStreamIds: string[];
  urlMediaCount: number;
} {
  if (!variant?.media) {
    return { urls: [], fileStreamIds: [], urlMediaCount: 0 };
  }

  const mediaUrls: string[] = [];
  const fileStreamIds: string[] = [];
  let urlMediaCount = 0;

  const mediaArray = Array.from(variant.media);
  const normalizedBase = baseUrl.replace(/\/$/, "");

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
        urlMediaCount += 1;
      }
      continue;
    }

    if (mediaItem?.type === "image" || mediaItem?.type === "video") {
      const fileStream = mediaItem.image || mediaItem.video;
      const fileStreamId = fileStream?.id;
      if (
        typeof fileStreamId === "string" &&
        fileStreamId.startsWith("co_")
      ) {
        fileStreamIds.push(fileStreamId);
        mediaUrls.push(`${normalizedBase}/api/media-proxy/${fileStreamId}`);
      }
    }
  }

  return { urls: mediaUrls, fileStreamIds, urlMediaCount };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountGroupId = searchParams.get("accountGroupId");
    const includePlatformVariants =
      searchParams.get("includePlatformVariants") === "true";
    const postIdFilter = searchParams.get("postId");
    const includeAllStatuses = searchParams.get("includeAllStatuses") === "true";
    const includeMediaDetails =
      searchParams.get("includeMediaDetails") === "true";

    if (!accountGroupId) {
      return NextResponse.json(
        { success: false, error: "accountGroupId is required" },
        { status: 400 }
      );
    }

    const { jazzServerWorker } = await import("@/utils/jazzServer");
    const { AccountGroup } = await import("@/app/schema");
    const worker = await jazzServerWorker;

    if (!worker) {
      return NextResponse.json(
        { success: false, error: "Jazz server worker not available" },
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
      return NextResponse.json(
        { success: true, data: { posts: [], summary: {} } },
        { status: 200 }
      );
    }

    const baseUrl = resolveBaseUrl(request);
    let posts = Array.from(accountGroup.posts)
      .filter(Boolean)
      .filter((post) => (postIdFilter ? post.id === postIdFilter : true));

    if (postIdFilter && posts.length === 0) {
      const { Post } = await import("@/app/schema");
      const loadedPost = await Post.load(postIdFilter, {
        loadAs: worker,
        resolve: {
          variants: {
            $each: {
              text: true,
              media: { $each: true },
              replyTo: true,
            },
          },
        },
      });
      if (loadedPost) {
        posts = [loadedPost];
      }
    }

    const results: {
      summary: {
        totalPosts: number;
        scheduledVariants: number;
        variantsWithMedia: number;
        variantsWithResolvedMedia: number;
        variantsMissingResolvedMedia: number;
      };
      posts: Array<{
        id: string;
        title: string;
        scheduledVariants: VariantAudit[];
      }>;
    } = {
      summary: {
        totalPosts: posts.length,
        scheduledVariants: 0,
        variantsWithMedia: 0,
        variantsWithResolvedMedia: 0,
        variantsMissingResolvedMedia: 0,
      },
      posts: [],
    };

    for (const post of posts) {
      const variants = post?.variants ? Object.entries(post.variants) : [];
      if (variants.length === 0) continue;

      const scheduledVariants: VariantAudit[] = [];

      for (const [platform, variant] of variants) {
        if (!variant) continue;
        if (platform !== "base" && !includePlatformVariants) continue;

        const status = variant.status?.toString?.() || variant.status;
        const scheduledFor = variant.scheduledFor;
        const isScheduled = status === "scheduled" || !!scheduledFor;
        if (!includeAllStatuses && !isScheduled) continue;

        const mediaItems = variant.media ? Array.from(variant.media) : [];
        const { urls, fileStreamIds, urlMediaCount } =
          extractMediaUrlsFromVariant(variant, baseUrl);

        results.summary.scheduledVariants += 1;
        if (mediaItems.length > 0) {
          results.summary.variantsWithMedia += 1;
        }
        if (urls.length > 0) {
          results.summary.variantsWithResolvedMedia += 1;
        } else if (mediaItems.length > 0) {
          results.summary.variantsMissingResolvedMedia += 1;
        }

        const mediaDetails = includeMediaDetails
          ? mediaItems.map((mediaItem: any) => ({
              type: mediaItem?.type,
              url: mediaItem?.url,
              hasImage: !!mediaItem?.image,
              hasVideo: !!mediaItem?.video,
              fileStreamId:
                mediaItem?.image?.id ||
                mediaItem?.video?.id ||
                mediaItem?.image?._id ||
                mediaItem?.video?._id,
            }))
          : undefined;

        scheduledVariants.push({
          platform,
          status,
          scheduledFor,
          mediaItemCount: mediaItems.length,
          resolvedMediaUrls: urls,
          fileStreamIds,
          urlMediaCount,
          mediaDetails,
        });
      }

      if (scheduledVariants.length > 0) {
        results.posts.push({
          id: post.id,
          title: post.title?.toString() || "Untitled Post",
          scheduledVariants,
        });
      }
    }

    return NextResponse.json(
      { success: true, data: results },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error auditing scheduled media:", error);
    return NextResponse.json(
      { success: false, error: "Failed to audit scheduled media" },
      { status: 500 }
    );
  }
}
