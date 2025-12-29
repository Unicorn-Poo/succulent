import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import * as React from "react";
import {
  MessageCircle,
  CheckSquare,
  Square,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { getPostDisplayStatus, getPostStatus } from "@/utils/postValidation";
import { platformIcons } from "@/utils/postConstants";

interface PostViewsProps {
  posts: any[];
  accountGroupId: string;
  accountGroupName: string;
  postsFilter: "all" | "draft" | "scheduled" | "published";
  platformFilter?: string[];
  listQuery?: string;
  selectedPosts: Set<string>;
  onPostSelect: (postId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  connectedPlatforms?: string[];
}

const normalizePlatformKey = (platform: string) =>
  platform?.toString().toLowerCase().trim();

const resolvePlatformIcon = (platform: string) => {
  const normalized = normalizePlatformKey(platform);
  return (
    platformIcons[normalized as keyof typeof platformIcons] ||
    platformIcons.base
  );
};

const resolvePostPlatforms = (post: any, connectedPlatforms: string[]) => {
  const normalizeList = (items: string[]) =>
    items
      .map((platform) => normalizePlatformKey(platform))
      .filter((platform) => platform && platform !== "unknown");
  const variantPlatforms = post?.variants
    ? Object.keys(post.variants).filter((key) => key !== "base")
    : [];
  const normalizedVariants = normalizeList(variantPlatforms);
  const normalizedConnected = normalizeList(connectedPlatforms);
  return normalizedVariants.length > 0 ? normalizedVariants : normalizedConnected;
};

// Helper function to render media thumbnail
function MediaThumbnail({ mediaItem }: { mediaItem: any }) {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [resolvedImageUrl, setResolvedImageUrl] = React.useState<string | null>(
    null
  );
  const [resolvedVideoUrl, setResolvedVideoUrl] = React.useState<string | null>(
    null
  );
  const [videoPosterUrl, setVideoPosterUrl] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (!resolvedImageUrl) return;
    let isActive = true;
    const ImageCtor =
      typeof window !== "undefined" && window.Image ? window.Image : null;
    if (!ImageCtor) return;
    const img = new ImageCtor();
    img.onload = () => {
      if (isActive) setIsLoading(false);
    };
    img.onerror = () => {
      if (isActive) {
        setIsLoading(false);
        setImageError(true);
      }
    };
    img.src = resolvedImageUrl;
    return () => {
      isActive = false;
    };
  }, [resolvedImageUrl]);

  React.useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;
    let videoElement: HTMLVideoElement | null = null;

    const extractCoId = (value: any) => {
      if (typeof value === "string" && value.startsWith("co_")) {
        return value;
      }
      if (value && typeof value === "object") {
        const props = Object.getOwnPropertyNames(value);
        for (const prop of props) {
          const propValue = value[prop];
          if (typeof propValue === "string" && propValue.startsWith("co_")) {
            return propValue;
          }
          if (
            propValue &&
            typeof propValue === "object" &&
            typeof propValue.id === "string" &&
            propValue.id.startsWith("co_")
          ) {
            return propValue.id;
          }
        }

        const symbols = Object.getOwnPropertySymbols(value);
        for (const sym of symbols) {
          const symValue = (value as any)[sym];
          if (typeof symValue === "string" && symValue.startsWith("co_")) {
            return symValue;
          }
          if (
            symValue &&
            typeof symValue === "object" &&
            typeof symValue.id === "string" &&
            symValue.id.startsWith("co_")
          ) {
            return symValue.id;
          }
        }
      }
      return undefined;
    };

    const resolveFileStreamUrl = async (fileStream: any) => {
      let stream = fileStream;
      try {
        if (stream && typeof stream.load === "function") {
          const loadedStream = await stream.load();
          if (loadedStream) {
            stream = loadedStream;
          }
        }
      } catch (error) {
        console.warn("⚠️ Failed to load FileStream ref:", error);
      }

      const fileStreamString =
        typeof stream === "string"
          ? stream
          : typeof stream?.toString === "function"
          ? stream.toString()
          : undefined;
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
        (typeof stream === "string" ? stream : undefined);

      if (
        fileStreamId &&
        typeof fileStreamId === "string" &&
        fileStreamId.startsWith("co_")
      ) {
        return `/api/media-proxy/${fileStreamId}`;
      }

      const publicUrlValue =
        typeof stream?.publicUrl === "function"
          ? stream.publicUrl()
          : stream?.publicUrl;
      const urlValue =
        typeof stream?.url === "function" ? stream.url() : stream?.url;
      const publicUrl = publicUrlValue || urlValue;
      if (typeof publicUrl === "string" && publicUrl.startsWith("http")) {
        return publicUrl;
      }

      try {
        if (typeof stream.getBlobURL === "function") {
          return await stream.getBlobURL();
        }
        if (typeof stream.createObjectURL === "function") {
          return stream.createObjectURL();
        }

        let blob: Blob | null = null;
        if (typeof stream.getBlob === "function") {
          blob = await stream.getBlob();
        } else if (typeof stream.toBlob === "function") {
          blob = await stream.toBlob();
        } else if (typeof stream.asBlob === "function") {
          blob = await stream.asBlob();
        } else if (stream._raw && (stream._raw.blob || stream._raw.data)) {
          blob = stream._raw.blob || stream._raw.data;
        } else if (stream.blob) {
          blob = stream.blob;
        }

        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          return objectUrl;
        }
      } catch (error) {
        console.error("❌ Failed to resolve FileStream media URL:", error);
      }

      return null;
    };

    const capturePoster = (videoUrl: string) =>
      new Promise<string | null>((resolve) => {
        if (typeof document === "undefined") {
          resolve(null);
          return;
        }
        const video = document.createElement("video");
        videoElement = video;
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
          if (videoElement) {
            videoElement.src = "";
            videoElement.load();
            videoElement = null;
          }
        };

        const onError = () => {
          cleanup();
          resolve(null);
        };

        const onSeeked = () => {
          try {
            const canvas = document.createElement("canvas");
            const width = video.videoWidth || 320;
            const height = video.videoHeight || 180;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              cleanup();
              resolve(null);
              return;
            }
            ctx.drawImage(video, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            cleanup();
            resolve(dataUrl);
          } catch (error) {
            cleanup();
            resolve(null);
          }
        };

        const onLoaded = () => {
          try {
            if (video.readyState >= 2) {
              video.currentTime = 0;
            }
          } catch (error) {
            onError();
          }
        };

        video.addEventListener("loadeddata", onLoaded, { once: true });
        video.addEventListener("seeked", onSeeked, { once: true });
        video.addEventListener("error", onError, { once: true });
        video.src = videoUrl;
        video.load();
      });

    const resolveVideo = async () => {
      if (!mediaItem) return;
      const isVideoType =
        mediaItem.type === "url-video" || mediaItem.type === "video";
      if (!isVideoType) return;

      if (mediaItem.url && typeof mediaItem.url === "string") {
        setResolvedVideoUrl(mediaItem.url);
        const poster = await capturePoster(mediaItem.url);
        if (isActive && poster) setVideoPosterUrl(poster);
        return;
      }

      if (mediaItem.video) {
        const videoUrl = await resolveFileStreamUrl(mediaItem.video);
        if (videoUrl) {
          if (isActive) setResolvedVideoUrl(videoUrl);
          const poster = await capturePoster(videoUrl);
          if (isActive && poster) setVideoPosterUrl(poster);
        }
      }
    };

    setResolvedVideoUrl(null);
    setVideoPosterUrl(null);
    resolveVideo();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      if (videoElement) {
        videoElement.src = "";
        videoElement.load();
        videoElement = null;
      }
    };
  }, [mediaItem]);

  React.useEffect(() => {
    let isActive = true;
    let objectUrl: string | null = null;

    const resolveImageUrl = async () => {
      if (!mediaItem) return;

      if (
        (mediaItem.type === "url-image" || mediaItem.type === "image") &&
        mediaItem.url
      ) {
        if (mediaItem.url.includes("lunary.app/api/og/")) {
          if (isActive) setResolvedImageUrl(mediaItem.url);
          return;
        }

        const isExternalUrl =
          mediaItem.url.startsWith("http") &&
          (typeof window === "undefined" ||
            !mediaItem.url.includes(window.location.hostname));
        const imageUrl = isExternalUrl
          ? `/api/image-proxy?url=${encodeURIComponent(mediaItem.url)}`
          : mediaItem.url;
        if (isActive) setResolvedImageUrl(imageUrl);
        return;
      }

      if (mediaItem.type === "image" && mediaItem.image) {
        let fileStream = mediaItem.image;
        try {
          if (fileStream && typeof fileStream.load === "function") {
            const loadedStream = await fileStream.load();
            if (loadedStream) {
              fileStream = loadedStream;
            }
          }
        } catch (error) {
          console.warn("⚠️ Failed to load FileStream ref:", error);
        }

        const extractCoId = (value: any) => {
          if (typeof value === "string" && value.startsWith("co_")) {
            return value;
          }
          if (value && typeof value === "object") {
            const props = Object.getOwnPropertyNames(value);
            for (const prop of props) {
              const propValue = value[prop];
              if (
                typeof propValue === "string" &&
                propValue.startsWith("co_")
              ) {
                return propValue;
              }
              if (
                propValue &&
                typeof propValue === "object" &&
                typeof propValue.id === "string" &&
                propValue.id.startsWith("co_")
              ) {
                return propValue.id;
              }
            }

            const symbols = Object.getOwnPropertySymbols(value);
            for (const sym of symbols) {
              const symValue = (value as any)[sym];
              if (typeof symValue === "string" && symValue.startsWith("co_")) {
                return symValue;
              }
              if (
                symValue &&
                typeof symValue === "object" &&
                typeof symValue.id === "string" &&
                symValue.id.startsWith("co_")
              ) {
                return symValue.id;
              }
            }
          }
          return undefined;
        };

        const fileStreamString =
          typeof fileStream === "string"
            ? fileStream
            : typeof fileStream?.toString === "function"
            ? fileStream.toString()
            : undefined;
        const stringMatch =
          typeof fileStreamString === "string"
            ? fileStreamString.match(/co_[A-Za-z0-9]+/)
            : null;
        const fileStreamId =
          fileStream?.id ||
          fileStream?._id ||
          fileStream?.coId ||
          fileStream?.refId ||
          fileStream?._refId ||
          fileStream?._raw?.id ||
          fileStream?._raw?.refId ||
          fileStream?.ref ||
          fileStream?._ref?.id ||
          (stringMatch ? stringMatch[0] : undefined) ||
          extractCoId(fileStream) ||
          (typeof fileStream === "string" ? fileStream : undefined);
        if (
          fileStreamId &&
          typeof fileStreamId === "string" &&
          fileStreamId.startsWith("co_")
        ) {
          if (isActive) {
            setResolvedImageUrl(`/api/media-proxy/${fileStreamId}`);
          }
          return;
        }

        const publicUrlValue =
          typeof fileStream?.publicUrl === "function"
            ? fileStream.publicUrl()
            : fileStream?.publicUrl;
        const urlValue =
          typeof fileStream?.url === "function"
            ? fileStream.url()
            : fileStream?.url;
        const publicUrl = publicUrlValue || urlValue;
        if (typeof publicUrl === "string" && publicUrl.startsWith("http")) {
          if (isActive) setResolvedImageUrl(publicUrl);
          return;
        }

        try {
          if (typeof fileStream.getBlobURL === "function") {
            const blobUrl = await fileStream.getBlobURL();
            if (isActive) setResolvedImageUrl(blobUrl);
            return;
          }

          if (typeof fileStream.createObjectURL === "function") {
            const blobUrl = fileStream.createObjectURL();
            if (isActive) setResolvedImageUrl(blobUrl);
            return;
          }

          let blob: Blob | null = null;
          if (typeof fileStream.getBlob === "function") {
            blob = await fileStream.getBlob();
          } else if (typeof fileStream.toBlob === "function") {
            blob = await fileStream.toBlob();
          } else if (typeof fileStream.asBlob === "function") {
            blob = await fileStream.asBlob();
          } else if (
            fileStream._raw &&
            (fileStream._raw.blob || fileStream._raw.data)
          ) {
            blob = fileStream._raw.blob || fileStream._raw.data;
          } else if (fileStream.blob) {
            blob = fileStream.blob;
          }

          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            if (isActive) setResolvedImageUrl(objectUrl);
          }
        } catch (error) {
          console.error("❌ Failed to resolve FileStream image URL:", error);
        }
      }

      if (
        (mediaItem.type === "image" || mediaItem.type === "url-image") &&
        mediaItem.url &&
        typeof mediaItem.url === "string"
      ) {
        if (isActive) setResolvedImageUrl(mediaItem.url);
        return;
      }
    };

    setImageError(false);
    setIsLoading(true);
    setResolvedImageUrl(null);
    resolveImageUrl();

    return () => {
      isActive = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [mediaItem]);

  if (!mediaItem) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-xs">No media</span>
      </div>
    );
  }

  if (resolvedImageUrl) {
    if (imageError) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center p-2">
            <span className="text-muted-foreground text-2xl block mb-1">
              📷
            </span>
            <span className="text-muted-foreground text-xs block">
              Image unavailable
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-muted">
        <img
          src={resolvedImageUrl}
          alt={mediaItem.alt?.toString() || mediaItem.alt || "Post media"}
          className="w-full h-full object-cover relative z-10"
          onLoad={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setIsLoading(false);
            setImageError(true);
          }}
        />
      </div>
    );
  }

  if (videoPosterUrl) {
    return (
      <div className="relative w-full h-full">
        <img
          src={videoPosterUrl}
          alt={
            mediaItem?.alt?.toString() || mediaItem?.alt || "Video thumbnail"
          }
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-card/90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Handle URL-based videos (API posts use 'url-video' type)
  if (
    (mediaItem.type === "url-video" || mediaItem.type === "video") &&
    (mediaItem.url || resolvedVideoUrl)
  ) {
    const videoUrl = mediaItem.url || resolvedVideoUrl;
    return (
      <div className="relative w-full h-full">
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-card bg-opacity-90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Handle video with thumbnail
  if (mediaItem.type === "video" && mediaItem.thumbnail) {
    return (
      <div className="relative w-full h-full">
        <Image
          src={mediaItem.thumbnail}
          alt="Video thumbnail"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-card bg-opacity-90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  if (mediaItem.type === "image" && mediaItem.image) {
    console.warn("⚠️ Media thumbnail missing image URL:", {
      mediaType: mediaItem.type,
      hasFileStream: !!mediaItem.image,
      fileStreamKeys:
        mediaItem.image && typeof mediaItem.image === "object"
          ? Object.keys(mediaItem.image)
          : undefined,
      fileStreamOwnKeys:
        mediaItem.image && typeof mediaItem.image === "object"
          ? Object.getOwnPropertyNames(mediaItem.image)
          : undefined,
      fileStreamSymbols:
        mediaItem.image && typeof mediaItem.image === "object"
          ? Object.getOwnPropertySymbols(mediaItem.image).map((sym) =>
              sym.toString()
            )
          : undefined,
      fileStreamConstructor:
        mediaItem.image && typeof mediaItem.image === "object"
          ? mediaItem.image.constructor?.name
          : undefined,
      fileStreamString:
        mediaItem.image?.toString &&
        typeof mediaItem.image.toString === "function"
          ? mediaItem.image.toString()
          : undefined,
    });
  }

  // Fallback for unknown media types
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <span className="text-muted-foreground text-xs">📎 Media</span>
    </div>
  );
}

// Helper function to check if post matches platform filter
function postMatchesPlatformFilter(
  post: any,
  platformFilter: string[],
  connectedPlatforms: string[]
): boolean {
  // Empty array means "all platforms"
  if (platformFilter.length === 0) return true;

  const postPlatforms = resolvePostPlatforms(post, connectedPlatforms);
  const normalizedFilters = platformFilter
    .map((platform) => normalizePlatformKey(platform))
    .filter((platform) => platform && platform !== "unknown");

  // Check if post has any of the selected platforms
  return normalizedFilters.some((platform) => postPlatforms.includes(platform));
}

// Grid View (existing default view)
export function PostGridView({
  posts,
  accountGroupId,
  accountGroupName,
  postsFilter,
  platformFilter = [],
  listQuery,
  selectedPosts,
  onPostSelect,
  connectedPlatforms = [],
}: PostViewsProps) {
  const safeArrayAccess = (collaborativeArray: any) => {
    try {
      if (!collaborativeArray) return [];
      if (Array.isArray(collaborativeArray)) {
        return collaborativeArray.filter((item) => item != null);
      }
      const array = Array.from(collaborativeArray || []);
      return array.filter((item) => item != null);
    } catch (error) {
      console.error("Error accessing media array:", error);
      return [];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300";
      case "scheduled":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300";
      case "processing":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300";
      case "draft":
        return "bg-muted text-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return "✓";
      case "scheduled":
        return "⏰";
      case "processing":
        return "⏳";
      case "draft":
        return "📝";
      default:
        return "📝";
    }
  };

  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    const getPostDate = (post: any) => {
      if (post.variants?.base?.publishedAt)
        return new Date(post.variants.base.publishedAt);
      if (post.variants?.base?.scheduledFor)
        return new Date(post.variants.base.scheduledFor);
      if (post.variants?.base?.postDate)
        return new Date(post.variants.base.postDate);
      if (post.publishedAt) return new Date(post.publishedAt);
      if (post.scheduledFor) return new Date(post.scheduledFor);
      if (post.createdAt) return new Date(post.createdAt);
      return new Date(0);
    };
    return getPostDate(b).getTime() - getPostDate(a).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedPosts
        .filter((post) => {
          // Status filter
          if (postsFilter !== "all") {
            const postStatus = getPostStatus(post);
            if (postStatus !== postsFilter) return false;
          }
          // Platform filter
          if (
            !postMatchesPlatformFilter(post, platformFilter, connectedPlatforms)
          )
            return false;
          return true;
        })
        .map((post: any, index: number) => {
          const postId = post.id || post.variants?.base?.id || index;
          const postTitle =
            post.title?.toString() || post.title || "Untitled Post";
          const postContent =
            post.variants?.base?.text?.toString() ||
            post.variants?.base?.text ||
            post.content ||
            "";
          const postStatus = getPostDisplayStatus(post);
          // Prioritize scheduled date, then published date, then created date
          const postDate =
            post.variants?.base?.scheduledFor ||
            post.variants?.base?.publishedAt ||
            post.variants?.base?.postDate ||
            post.scheduledFor ||
            post.publishedAt ||
            post.createdAt ||
            new Date();
          let mediaItems: any[] = [];
          if (post.variants?.base?.media) {
            mediaItems = safeArrayAccess(post.variants.base.media);
          }
          if (mediaItems.length === 0 && post.variants) {
            for (const variant of Object.values(post.variants)) {
              const v = variant as any;
              if (v?.media) {
                const variantMedia = safeArrayAccess(v.media);
                if (variantMedia.length > 0) {
                  mediaItems = variantMedia;
                  break;
                }
              }
            }
          }
          const hasMedia = mediaItems.length > 0;
          const firstMediaItem = mediaItems[0];
          const isSelected = selectedPosts.has(postId);
          const postPlatforms = resolvePostPlatforms(post, connectedPlatforms);

          return (
            <div
              key={postId}
              className={`bg-card border-2 rounded-lg p-4 hover:shadow-md transition-all duration-200 group relative ${
                isSelected
                  ? "border-brand-mint bg-brand-mint/10"
                  : "border-border hover:border-brand-mint"
              }`}
              style={{ minHeight: "200px" }}
            >
              {/* Selection Checkbox */}
              <div
                className="absolute top-3 right-3 z-10 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPostSelect(postId, !isSelected);
                }}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-brand-seafoam dark:text-brand-mint" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground hover:text-muted-foreground" />
                )}
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}${
                  listQuery ? `?${listQuery}` : ""
                }`}
                className="block"
              >
                {/* Header with status and date */}
                <div className="flex items-center justify-between mb-3 pr-8">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      postStatus
                    )}`}
                  >
                    {getStatusIcon(postStatus)}{" "}
                    {postStatus.charAt(0).toUpperCase() + postStatus.slice(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(postDate).toLocaleDateString()}
                  </div>
                </div>

                {/* Title */}
                {/* <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-brand-seafoam dark:text-brand-mint transition-colors">
                  {postTitle}
                </h3> */}

                {/* Media preview */}
                {hasMedia && firstMediaItem && (
                  <div className="mb-3 w-16 h-16 rounded-md overflow-hidden bg-muted">
                    <MediaThumbnail mediaItem={firstMediaItem} />
                  </div>
                )}

                {/* Content Preview */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {postContent || "No content"}
                </p>

                {/* Footer with media indicator and platforms */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    {hasMedia && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>📎</span>
                        <span>{mediaItems.length} media</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Platform icons */}
                    {postPlatforms.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {postPlatforms.map((platform: string) => {
                          const iconPath = resolvePlatformIcon(platform);
                          return (
                            <Image
                              key={platform}
                              src={iconPath}
                              alt={platform}
                              width={16}
                              height={16}
                              className="opacity-70 hover:opacity-100 transition-opacity dark:invert"
                              title={platform}
                            />
                          );
                        })}
                      </div>
                    )}
                    <MessageCircle className="w-3 h-3 text-muted-foreground group-hover:text-brand-seafoam transition-colors" />
                    <span className="text-xs text-muted-foreground group-hover:text-brand-seafoam dark:text-brand-mint">
                      Edit
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
    </div>
  );
}

// Image Carousel Component for individual posts
function ImageCarousel({
  mediaItems,
  postId,
}: {
  mediaItems: any[];
  postId: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!mediaItems || mediaItems.length === 0) return null;
  if (mediaItems.length === 1) {
    return <MediaThumbnail mediaItem={mediaItems[0]} />;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex(index);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) =>
        prev === mediaItems.length - 1 ? 0 : prev + 1
      );
    }
    if (isRightSwipe) {
      setCurrentIndex((prev) =>
        prev === 0 ? mediaItems.length - 1 : prev - 1
      );
    }
  };

  return (
    <div className="relative w-full h-full group bg-transparent">
      {/* Carousel container */}
      <div
        className="overflow-hidden w-full h-full bg-transparent"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out h-full bg-transparent"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {mediaItems.map((item, index) => (
            <div
              key={`${postId}-${index}`}
              className="flex-shrink-0 w-full h-full bg-transparent"
            >
              <MediaThumbnail mediaItem={item} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - Always visible but more prominent on hover */}
      {mediaItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute top-1/2 left-2 transform -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-lg hover:scale-110"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute top-1/2 right-2 transform -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-lg hover:scale-110"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots indicator - Always visible */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 z-30 pointer-events-auto">
          {mediaItems.map((_, index) => (
            <button
              key={index}
              onClick={(e) => handleDotClick(index, e)}
              className={`rounded-full transition-all shadow-lg ${
                currentIndex === index
                  ? "bg-card w-3 h-3"
                  : "bg-card/60 hover:bg-card/80 w-2 h-2"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image count badge - Always visible, positioned to not conflict with selection */}
      {mediaItems.length > 1 && (
        <div className="absolute top-12 right-2 z-30 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md backdrop-blur-sm shadow-lg">
          {currentIndex + 1} / {mediaItems.length}
        </div>
      )}
    </div>
  );
}

// Image View - Focus on media content with carousel
export function PostImageView({
  posts,
  accountGroupId,
  accountGroupName,
  postsFilter,
  platformFilter = [],
  listQuery,
  selectedPosts,
  onPostSelect,
  connectedPlatforms = [],
}: PostViewsProps) {
  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    const getPostDate = (post: any) => {
      if (post.variants?.base?.publishedAt)
        return new Date(post.variants.base.publishedAt);
      if (post.variants?.base?.scheduledFor)
        return new Date(post.variants.base.scheduledFor);
      if (post.variants?.base?.postDate)
        return new Date(post.variants.base.postDate);
      if (post.publishedAt) return new Date(post.publishedAt);
      if (post.scheduledFor) return new Date(post.scheduledFor);
      if (post.createdAt) return new Date(post.createdAt);
      return new Date(0);
    };
    return getPostDate(b).getTime() - getPostDate(a).getTime();
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {sortedPosts
        .filter((post) => {
          // Status filter
          if (postsFilter !== "all") {
            const postStatus = getPostStatus(post);
            if (postStatus !== postsFilter) return false;
          }
          // Platform filter
          if (
            !postMatchesPlatformFilter(post, platformFilter, connectedPlatforms)
          )
            return false;
          return true;
        })
        .map((post: any, index: number) => {
          const postId = post.id || post.variants?.base?.id || index;
          const postTitle =
            post.title?.toString() || post.title || "Untitled Post";
          const postContent =
            post.variants?.base?.text?.toString() ||
            post.variants?.base?.text ||
            post.content ||
            "";
          const postStatus = getPostDisplayStatus(post);
          const postPlatforms = resolvePostPlatforms(post, connectedPlatforms);
          // Get all media items from base variant or check all variants
          // Handle Jazz collaborative lists properly
          let mediaItems: any[] = [];
          const safeArrayAccess = (collaborativeArray: any) => {
            try {
              if (!collaborativeArray) return [];
              if (Array.isArray(collaborativeArray)) {
                return collaborativeArray.filter((item) => item != null);
              }
              const array = Array.from(collaborativeArray || []);
              return array.filter((item) => item != null);
            } catch (error) {
              console.error("Error accessing media array:", error);
              return [];
            }
          };

          if (post.variants?.base?.media) {
            mediaItems = safeArrayAccess(post.variants.base.media);
          }
          // Also check platform variants for media
          if (mediaItems.length === 0 && post.variants) {
            for (const variant of Object.values(post.variants)) {
              const v = variant as any;
              if (v?.media) {
                const variantMedia = safeArrayAccess(v.media);
                if (variantMedia.length > 0) {
                  mediaItems = variantMedia;
                  break;
                }
              }
            }
          }
          const hasMedia = mediaItems.length > 0;
          const isSelected = selectedPosts.has(postId);

          return (
            <div
              key={postId}
              className={`aspect-square relative group cursor-pointer rounded-lg overflow-hidden ${
                isSelected
                  ? "ring-2 ring-brand-mint ring-offset-2"
                  : "hover:ring-2 hover:ring-brand-mint/60"
              }`}
            >
              {/* Selection Checkbox */}
              <div
                className="absolute top-2 right-2 z-30 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPostSelect(postId, !isSelected);
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${
                    isSelected
                      ? "bg-brand-seafoam border-2 border-white"
                      : "bg-black bg-opacity-70 border-2 border-white"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Square className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Status Badge and Platform Icons */}
              <div className="absolute top-2 left-2 z-30 flex items-center gap-2">
                <div
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    postStatus === "published"
                      ? "bg-green-500 text-white"
                      : postStatus === "scheduled"
                      ? "bg-yellow-500 text-white"
                      : "bg-muted0 text-white"
                  }`}
                >
                  {postStatus === "published"
                    ? "✓"
                    : postStatus === "scheduled"
                    ? "⏰"
                    : "📝"}
                </div>
                {/* Platform icons */}
                {postPlatforms.length > 0 && (
                  <div className="flex items-center gap-1 bg-black bg-opacity-70 rounded-full px-2 py-1">
                    {postPlatforms.map((platform: string) => {
                      const iconPath = resolvePlatformIcon(platform);
                      return (
                        <Image
                          key={platform}
                          src={iconPath}
                          alt={platform}
                          width={14}
                          height={14}
                          className="opacity-90 invert"
                          title={platform}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}${
                  listQuery ? `?${listQuery}` : ""
                }`}
                className="block w-full h-full relative"
              >
                {/* Media content - behind overlay */}
                <div className="w-full h-full bg-transparent relative z-0 overflow-hidden">
                  {hasMedia ? (
                    <ImageCarousel mediaItems={mediaItems} postId={postId} />
                  ) : (
                    // Text preview when no media
                    <div className="text-center text-muted-foreground p-3 flex flex-col items-center justify-center h-full">
                      <div className="text-2xl mb-2">📝</div>
                      <div className="text-xs leading-tight line-clamp-4 max-w-full px-2">
                        {postTitle}
                      </div>
                      {postContent && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-full px-2">
                          {postContent.substring(0, 60)}...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover overlay with post info - Only show on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-end pointer-events-none z-20">
                  <div className="w-full p-3 text-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">
                      {postTitle}
                    </h4>
                    {postContent && (
                      <p className="text-xs text-gray-200 line-clamp-2">
                        {postContent.substring(0, 80)}...
                      </p>
                    )}
                    {hasMedia && mediaItems.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {mediaItems.length} image
                        {mediaItems.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
    </div>
  );
}

// Succinct View - Compact list format
export function PostSuccinctView({
  posts,
  accountGroupId,
  accountGroupName,
  postsFilter,
  platformFilter = [],
  listQuery,
  selectedPosts,
  onPostSelect,
  onSelectAll,
  connectedPlatforms = [],
}: PostViewsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "text-green-600 dark:text-green-400";
      case "scheduled":
        return "text-yellow-600 dark:text-yellow-400";
      case "draft":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return <Eye className="w-3 h-3" />;
      case "scheduled":
        return <Calendar className="w-3 h-3" />;
      case "draft":
        return <MessageCircle className="w-3 h-3" />;
      default:
        return <MessageCircle className="w-3 h-3" />;
    }
  };

  // Sort posts by date (newest first)
  const sortedPosts = [...posts].sort((a: any, b: any) => {
    const getPostDate = (post: any) => {
      if (post.variants?.base?.publishedAt)
        return new Date(post.variants.base.publishedAt);
      if (post.variants?.base?.scheduledFor)
        return new Date(post.variants.base.scheduledFor);
      if (post.variants?.base?.postDate)
        return new Date(post.variants.base.postDate);
      if (post.publishedAt) return new Date(post.publishedAt);
      if (post.scheduledFor) return new Date(post.scheduledFor);
      if (post.createdAt) return new Date(post.createdAt);
      return new Date(0);
    };
    return getPostDate(b).getTime() - getPostDate(a).getTime();
  });

  const filteredPosts = sortedPosts.filter((post) => {
    // Status filter
    if (postsFilter !== "all") {
          const postStatus = getPostDisplayStatus(post);
      if (postStatus !== postsFilter) return false;
    }
    // Platform filter
    if (!postMatchesPlatformFilter(post, platformFilter, connectedPlatforms))
      return false;
    return true;
  });

  return (
    <div className="space-y-2">
      {/* Select All Button */}
      {filteredPosts.length > 0 && onSelectAll && (
        <div className="mb-3 flex items-center justify-between">
          <Button
            onClick={onSelectAll}
            variant="outline"
            intent="secondary"
            size="1"
            className="text-xs"
          >
            <CheckSquare className="w-3 h-3 mr-1" />
            Select All ({filteredPosts.length})
          </Button>
        </div>
      )}
      {filteredPosts.map((post: any, index: number) => {
        const postId = post.id || post.variants?.base?.id || index;
        const postTitle =
          post.title?.toString() || post.title || "Untitled Post";
        const postContent =
          post.variants?.base?.text?.toString() ||
          post.variants?.base?.text ||
          post.content ||
          "";
        const postStatus = getPostDisplayStatus(post);
        // Prioritize scheduled date, then published date, then created date
        const postDate =
          post.variants?.base?.scheduledFor ||
          post.variants?.base?.publishedAt ||
          post.variants?.base?.postDate ||
          post.scheduledFor ||
          post.publishedAt ||
          post.createdAt ||
          new Date();
        const postPlatforms = resolvePostPlatforms(post, connectedPlatforms);

        // Get media items properly using safeArrayAccess
        const safeArrayAccess = (collaborativeArray: any) => {
          try {
            if (!collaborativeArray) return [];
            if (Array.isArray(collaborativeArray)) {
              return collaborativeArray.filter((item) => item != null);
            }
            const array = Array.from(collaborativeArray || []);
            return array.filter((item) => item != null);
          } catch (error) {
            console.error("Error accessing media array:", error);
            return [];
          }
        };

        let mediaItems: any[] = [];
        if (post.variants?.base?.media) {
          mediaItems = safeArrayAccess(post.variants.base.media);
        }
        // Also check platform variants for media
        if (mediaItems.length === 0 && post.variants) {
          for (const variant of Object.values(post.variants)) {
            const v = variant as any;
            if (v?.media) {
              const variantMedia = safeArrayAccess(v.media);
              if (variantMedia.length > 0) {
                mediaItems = variantMedia;
                break;
              }
            }
          }
        }

        const hasMedia = mediaItems.length > 0;
        const mediaCount = mediaItems.length;
        const firstMediaItem = mediaItems[0];
        const isSelected = selectedPosts.has(postId);

        return (
          <div
            key={postId}
            className={`bg-card border-2 rounded-lg p-4 hover:shadow-sm transition-all duration-200 group ${
              isSelected
                ? "border-brand-mint bg-brand-mint/10"
                : "border-border hover:border-brand-mint"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Selection Checkbox */}
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPostSelect(postId, !isSelected);
                }}
              >
                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-brand-seafoam dark:text-brand-mint" />
                ) : (
                  <Square className="w-5 h-5 text-muted-foreground hover:text-muted-foreground" />
                )}
              </div>

              {/* Media thumbnail (if available) */}
              {hasMedia && firstMediaItem && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <MediaThumbnail mediaItem={firstMediaItem} />
                </div>
              )}

              {/* Post content */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}${
                  listQuery ? `?${listQuery}` : ""
                }`}
                className="flex-1 min-w-0 group-hover:text-brand-seafoam dark:text-brand-mint transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-brand-seafoam dark:text-brand-mint line-clamp-1 mb-1">
                      {postTitle}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {postContent || "No content"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div
                        className={`flex items-center gap-1 ${getStatusColor(
                          postStatus
                        )}`}
                      >
                        {getStatusIcon(postStatus)}
                        <span>{postStatus}</span>
                      </div>
                      <span>{new Date(postDate).toLocaleDateString()}</span>
                      {hasMedia && (
                        <span className="flex items-center gap-1">
                          📎 {mediaCount} media
                        </span>
                      )}
                      {/* Platform icons */}
                      {postPlatforms.length > 0 && (
                        <div className="flex items-center gap-1">
                        {postPlatforms.map((platform: string) => {
                          const iconPath = resolvePlatformIcon(platform);
                          return (
                            <Image
                              key={platform}
                                src={iconPath}
                                alt={platform}
                                width={14}
                                height={14}
                                className="opacity-70 dark:invert"
                                title={platform}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
