import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type VariantAudit = {
  platform: string;
  status: string | undefined;
  scheduledFor: Date | undefined;
  ayrsharePostId?: string;
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
): Promise<{
  urls: string[];
  fileStreamIds: string[];
  urlMediaCount: number;
}> {
  if (!variant?.media) {
    return { urls: [], fileStreamIds: [], urlMediaCount: 0 };
  }

  const mediaUrls: string[] = [];
  const fileStreamIds: string[] = [];
  let urlMediaCount = 0;

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
        urlMediaCount += 1;
      }
      continue;
    }

    if (mediaItem?.type === "image" || mediaItem?.type === "video") {
      const fileStream =
        mediaItem.image ||
        mediaItem.video ||
        mediaItem?._refs?.image ||
        mediaItem?._refs?.video;
      const fileStreamId = await extractFileStreamId(fileStream);
      if (fileStreamId && fileStreamId.startsWith("co_")) {
        fileStreamIds.push(fileStreamId);
        const resolvedUrl = await resolveFileStreamUrl(fileStream, baseUrl);
        if (resolvedUrl) {
          mediaUrls.push(resolvedUrl);
          continue;
        }
      } else {
        const resolvedUrl = await resolveFileStreamUrl(fileStream, baseUrl);
        if (resolvedUrl) {
          mediaUrls.push(resolvedUrl);
          continue;
        }
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
              media: { $each: { type: true, url: true, image: true, video: true } },
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
          await extractMediaUrlsFromVariant(variant, baseUrl);

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
          ? await Promise.all(
              mediaItems.map(async (mediaItem: any) => ({
                type: mediaItem?.type,
                url: mediaItem?.url,
                sourceUrl: mediaItem?.sourceUrl,
                hasImage: !!(mediaItem?.image || mediaItem?._refs?.image),
                hasVideo: !!(mediaItem?.video || mediaItem?._refs?.video),
                fileStreamId:
                  (await extractFileStreamId(
                    mediaItem?.image ||
                      mediaItem?.video ||
                      mediaItem?._refs?.image ||
                      mediaItem?._refs?.video
                  )) || undefined,
              }))
            )
          : undefined;

        scheduledVariants.push({
          platform,
          status,
          scheduledFor,
          ayrsharePostId: variant.ayrsharePostId,
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
