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
import { getPostStatus } from "@/utils/postValidation";
import { platformIcons } from "@/utils/postConstants";

interface PostViewsProps {
  posts: any[];
  accountGroupId: string;
  accountGroupName: string;
  postsFilter: "all" | "draft" | "scheduled" | "published";
  selectedPosts: Set<string>;
  onPostSelect: (postId: string, selected: boolean) => void;
  onSelectAll?: () => void;
  connectedPlatforms?: string[];
}

// Helper function to render media thumbnail
function MediaThumbnail({ mediaItem }: { mediaItem: any }) {
  const [imageError, setImageError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  if (!mediaItem) {
    return (
      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
        <span className="text-gray-500 text-xs">No media</span>
      </div>
    );
  }

  // Handle URL-based images (API posts use 'url-image' type)
  if (
    (mediaItem.type === "url-image" || mediaItem.type === "image") &&
    mediaItem.url
  ) {
    // Use proxy for external images to avoid CORS issues
    const isExternalUrl =
      mediaItem.url.startsWith("http") &&
      (typeof window === "undefined" ||
        !mediaItem.url.includes(window.location.hostname));
    const imageUrl = isExternalUrl
      ? `/api/image-proxy?url=${encodeURIComponent(mediaItem.url)}`
      : mediaItem.url;

    if (imageError) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center p-2">
            <span className="text-gray-400 text-2xl block mb-1">📷</span>
            <span className="text-gray-500 text-xs block">
              Image unavailable
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-gray-100">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-gray-400 text-xs">Loading...</span>
            </div>
          </div>
        )}
        <Image
          src={imageUrl}
          alt={mediaItem.alt?.toString() || mediaItem.alt || "Post media"}
          fill
          className={`object-cover ${
            isLoading ? "opacity-0" : "opacity-100"
          } transition-opacity duration-200`}
          onLoadingComplete={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setIsLoading(false);
            setImageError(true);
          }}
          unoptimized
        />
      </div>
    );
  }

  // Handle FileStream images (Jazz collaborative objects)
  if (mediaItem.type === "image" && mediaItem.image) {
    const fileStreamId = mediaItem.image?.id;
    if (
      fileStreamId &&
      typeof fileStreamId === "string" &&
      fileStreamId.startsWith("co_")
    ) {
      const proxyUrl = `/api/media-proxy/${fileStreamId}`;
      return (
        <div className="relative w-full h-full">
          <Image
            src={proxyUrl}
            alt={mediaItem.alt?.toString() || mediaItem.alt || "Post media"}
            fill
            className="object-cover"
            onError={() => {
              console.error("❌ Media proxy failed to load:", proxyUrl);
            }}
            unoptimized
          />
        </div>
      );
    }
  }

  // Handle URL-based videos (API posts use 'url-video' type)
  if (
    (mediaItem.type === "url-video" || mediaItem.type === "video") &&
    mediaItem.url
  ) {
    return (
      <div className="relative w-full h-full">
        <video
          src={mediaItem.url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
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
          <div className="w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center">
            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-y-2 border-y-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown media types
  return (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <span className="text-gray-500 text-xs">📎 Media</span>
    </div>
  );
}

// Grid View (existing default view)
export function PostGridView({
  posts,
  accountGroupId,
  accountGroupName,
  postsFilter,
  selectedPosts,
  onPostSelect,
  connectedPlatforms = [],
}: PostViewsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published":
        return "✓";
      case "scheduled":
        return "⏰";
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
          if (postsFilter === "all") return true;
          const postStatus = getPostStatus(post);
          return postStatus === postsFilter;
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
          const postStatus = getPostStatus(post);
          const postDate =
            post.variants?.base?.postDate || post.createdAt || new Date();
          const hasMedia =
            post.variants?.base?.media && post.variants.base.media.length > 0;
          const isSelected = selectedPosts.has(postId);
          // Extract platform names from variants (excluding 'base'), fallback to connected platforms
          const variantPlatforms = post.variants
            ? Object.keys(post.variants).filter((key) => key !== "base")
            : [];
          const postPlatforms = variantPlatforms.length > 0 ? variantPlatforms : connectedPlatforms;

          return (
            <div
              key={postId}
              className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-all duration-200 group relative ${
                isSelected
                  ? "border-lime-400 bg-lime-50"
                  : "border-gray-200 hover:border-lime-300"
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
                  <CheckSquare className="w-5 h-5 text-lime-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}`}
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
                  <div className="text-xs text-gray-500">
                    {new Date(postDate).toLocaleDateString()}
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-lime-600 transition-colors">
                  {postTitle}
                </h3>

                {/* Content Preview */}
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {postContent || "No content"}
                </p>

                {/* Footer with media indicator and platforms */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {hasMedia && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>📎</span>
                        <span>{post.variants.base.media.length} media</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Platform icons */}
                    {postPlatforms.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {postPlatforms.map((platform: string) => {
                          const iconPath =
                            platformIcons[
                              platform as keyof typeof platformIcons
                            ] || platformIcons.base;
                          return (
                            <Image
                              key={platform}
                              src={iconPath}
                              alt={platform}
                              width={16}
                              height={16}
                              className="opacity-70 hover:opacity-100 transition-opacity"
                              title={platform}
                            />
                          );
                        })}
                      </div>
                    )}
                    <MessageCircle className="w-3 h-3 text-gray-400 group-hover:text-lime-500 transition-colors" />
                    <span className="text-xs text-gray-500 group-hover:text-lime-600">
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
                  ? "bg-white w-3 h-3"
                  : "bg-white/60 hover:bg-white/80 w-2 h-2"
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
          if (postsFilter === "all") return true;
          const postStatus = getPostStatus(post);
          return postStatus === postsFilter;
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
          const postStatus = getPostStatus(post);
          // Extract platform names from variants (excluding 'base'), fallback to connected platforms
          const variantPlatforms = post.variants
            ? Object.keys(post.variants).filter((key) => key !== "base")
            : [];
          const postPlatforms = variantPlatforms.length > 0 ? variantPlatforms : connectedPlatforms;
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
                  ? "ring-2 ring-lime-400 ring-offset-2"
                  : "hover:ring-2 hover:ring-lime-300"
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
                      ? "bg-lime-600 border-2 border-white"
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
                      : "bg-gray-500 text-white"
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
                      const iconPath =
                        platformIcons[platform as keyof typeof platformIcons] ||
                        platformIcons.base;
                      return (
                        <Image
                          key={platform}
                          src={iconPath}
                          alt={platform}
                          width={14}
                          height={14}
                          className="opacity-90"
                          title={platform}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Clickable content area */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}`}
                className="block w-full h-full relative"
              >
                {/* Media content - behind overlay */}
                <div className="w-full h-full bg-gray-100 relative z-0 overflow-hidden">
                  {hasMedia ? (
                    <ImageCarousel mediaItems={mediaItems} postId={postId} />
                  ) : (
                    // Text preview when no media
                    <div className="text-center text-gray-600 p-3 flex flex-col items-center justify-center h-full">
                      <div className="text-2xl mb-2">📝</div>
                      <div className="text-xs leading-tight line-clamp-4 max-w-full px-2">
                        {postTitle}
                      </div>
                      {postContent && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-full px-2">
                          {postContent.substring(0, 60)}...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hover overlay with post info - Only show on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-200 flex items-end pointer-events-none z-20">
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
                      <p className="text-xs text-gray-300 mt-1">
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
  selectedPosts,
  onPostSelect,
  onSelectAll,
  connectedPlatforms = [],
}: PostViewsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "text-green-600";
      case "scheduled":
        return "text-yellow-600";
      case "draft":
        return "text-gray-600";
      default:
        return "text-gray-600";
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
    if (postsFilter === "all") return true;
    const postStatus = getPostStatus(post);
    return postStatus === postsFilter;
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
        const postStatus = getPostStatus(post);
        const postDate =
          post.variants?.base?.postDate || post.createdAt || new Date();
        // Extract platform names from variants (excluding 'base'), fallback to connected platforms
        const variantPlatforms = post.variants
          ? Object.keys(post.variants).filter((key) => key !== "base")
          : [];
        const postPlatforms = variantPlatforms.length > 0 ? variantPlatforms : connectedPlatforms;

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
            className={`bg-white border-2 rounded-lg p-4 hover:shadow-sm transition-all duration-200 group ${
              isSelected
                ? "border-lime-400 bg-lime-50"
                : "border-gray-200 hover:border-lime-300"
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
                  <CheckSquare className="w-5 h-5 text-lime-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </div>

              {/* Media thumbnail (if available) */}
              {hasMedia && firstMediaItem && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <MediaThumbnail mediaItem={firstMediaItem} />
                </div>
              )}

              {/* Post content */}
              <Link
                href={`/account-group/${accountGroupId}/post/${postId}`}
                className="flex-1 min-w-0 group-hover:text-lime-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 group-hover:text-lime-600 line-clamp-1 mb-1">
                      {postTitle}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                      {postContent || "No content"}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
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
                            const iconPath =
                              platformIcons[
                                platform as keyof typeof platformIcons
                              ] || platformIcons.base;
                            return (
                              <Image
                                key={platform}
                                src={iconPath}
                                alt={platform}
                                width={14}
                                height={14}
                                className="opacity-70"
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
