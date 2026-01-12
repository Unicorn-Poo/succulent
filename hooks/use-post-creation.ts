"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Post,
  PostFullyLoaded,
  ImageMedia,
  VideoMedia,
  PostVariant,
  MediaItem,
  ReplyTo,
  PlatformNames,
} from "../app/schema";
import { co, FileStream } from "jazz-tools";
// Note: createImage might be imported differently in your Jazz version
import {
  platformIcons,
  platformLabels,
  PLATFORM_CHARACTER_LIMITS,
  AYRSHARE_API_URL,
  AYRSHARE_API_KEY,
} from "../utils/postConstants";
import {
  validateReplyUrl,
  detectPlatformFromUrl,
  hasPendingAyrsharePost,
} from "../utils/postValidation";
import { generateThreadPreview, ThreadPost } from "../utils/threadUtils";
import {
  handleStandardPost,
  handleReplyPost,
  handleMultiPosts,
  handleApiError,
  PostData,
  fetchPostContent,
} from "../utils/apiHandlers";
import {
  AYRSHARE_PLATFORM_MAP,
  isBusinessPlanMode,
} from "../utils/ayrshareIntegration";
import {
  getPreferredMediaFormatForPlatform,
  needsJpgConversion,
  proxyMediaUrlIfNeeded,
} from "../utils/mediaProxy";

type SeriesType = "reply" | "thread" | null;
type AyrshareResult = {
  success?: boolean;
  status?: string;
  posts?: Array<any>;
  postIds?: Record<string, string>;
  id?: string;
  _hasPendingPosts?: boolean;
  _pendingWarning?: string;
};
type AyrshareResultOrArray = AyrshareResult | AyrshareResult[];

interface PostCreationProps {
  post: PostFullyLoaded;
  accountGroup: {
    id: string;
    name: string;
    ayrshareProfileKey?: string;
    ayrshareProfileTitle?: string;
    accounts:
      | Record<
          string,
          {
            id: string;
            platform: string;
            name: string;
            profileKey?: string;
            isLinked?: boolean;
            status?: "pending" | "linked" | "error" | "expired";
            // Legacy fields for backward compatibility
            apiUrl?: string;
            avatar?: string;
            username?: string;
            displayName?: string;
            url?: string;
          }
        >
      | any[]; // Allow array for Jazz CoList
  };
}

export function usePostCreation({ post, accountGroup }: PostCreationProps) {
  // Immediate cleanup of corrupted variants before any other processing
  try {
    const corruptedVariantId = "co_zerhbvzPjo6yVD4HZ7URSzung3k";
    if (post?.variants && post.variants[corruptedVariantId]) {
      delete post.variants[corruptedVariantId];
    }
  } catch (error) {
    console.error("Error during immediate cleanup:", error);
  }

  const [activeTab, setActiveTab] = useState("base");
  const [seriesType, setSeriesType] = useState<SeriesType>(null);
  const [title, setTitle] = useState(post.title?.toString() || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Sync title with Jazz post object changes, but only if not currently editing
  useEffect(() => {
    if (!isEditingTitle) {
      const jazzTitle = post.title?.toString() || "";
      if (jazzTitle !== title) {
        setTitle(jazzTitle);
      }
    }
  }, [post.title, isEditingTitle, title]);
  const [replyUrl, setReplyUrl] = useState("");
  const [postingInterval, setPostingInterval] = useState(5);
  const [showSettings, setShowSettings] = useState(false);
  const [showPostTypeDropdown, setShowPostTypeDropdown] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [showPublishButton, setShowPublishButton] = useState(false);
  const [contextText, setContextText] = useState<string | null>(null);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [manualThreadMode, setManualThreadMode] = useState(false);
  const [isFetchingReply, setIsFetchingReply] = useState(false);
  const [fetchReplyError, setFetchReplyError] = useState<string | null>(null);
  const [isQuoteTweet, setIsQuoteTweet] = useState(false);
  const [currentPost, setPost] = useState(post);
  const [platformAuthErrors, setPlatformAuthErrors] = useState<any[]>([]);
  const [showAuthErrorDialog, setShowAuthErrorDialog] = useState(false);
  const baseVariant = currentPost?.variants?.base;
  const scheduledVariants = currentPost?.variants
    ? Object.entries(currentPost.variants).filter(
        ([key, variant]) =>
          key !== "base" &&
          variant &&
          (variant.status === "scheduled" || variant.scheduledFor)
      )
    : [];
  const scheduledVariant = scheduledVariants[0]?.[1];
  const existingScheduledFor = baseVariant?.scheduledFor
    ? new Date(baseVariant.scheduledFor)
    : scheduledVariant?.scheduledFor
    ? new Date(scheduledVariant.scheduledFor)
    : null;
  const isAlreadyScheduled = Boolean(
    (baseVariant?.ayrsharePostId &&
      (baseVariant?.status === "scheduled" || existingScheduledFor)) ||
      scheduledVariants.some(([, variant]) => variant?.ayrsharePostId)
  );
  const hasScheduleChange =
    !!scheduledDate &&
    isAlreadyScheduled &&
    !!existingScheduledFor &&
    scheduledDate.getTime() !== existingScheduledFor.getTime();

  // Sync currentPost with post prop changes
  useEffect(() => {
    setPost(post);
  }, [post]);

  useEffect(() => {
    if (!accountGroup?.id || !currentPost) return;
    if (!hasPendingAyrsharePost(currentPost)) return;
    let isActive = true;

    const syncStatuses = async () => {
      try {
        await fetch("/api/sync-post-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountGroupId: accountGroup.id,
            reason: "pending_poll",
          }),
        });
      } catch (error) {
        console.warn("⚠️ Pending post sync failed:", error);
      }
    };

    syncStatuses();
    const interval = setInterval(() => {
      if (isActive) {
        syncStatuses();
      }
    }, 180000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [accountGroup?.id, currentPost]);

  // Initialize selectedPlatforms from post variants
  useEffect(() => {
    if (post?.variants) {
      const variantKeys = Object.keys(post.variants);
      // Always include "base" if it exists, plus any other platform variants
      const platforms = variantKeys.filter((key) => {
        // Include base and any valid platform names
        if (key === "base") return true;
        // Check if it's a valid platform name
        return PlatformNames.includes(key as any);
      });

      // Only update if different to avoid loops
      if (
        platforms.length > 0 &&
        JSON.stringify(platforms.sort()) !==
          JSON.stringify(selectedPlatforms.sort())
      ) {
        console.log(
          "🔍 Initializing selectedPlatforms from post variants:",
          platforms
        );
        setSelectedPlatforms(platforms);
      } else if (platforms.length === 0 && selectedPlatforms.length === 0) {
        // If no variants exist yet, at least include "base"
        console.log("🔍 No variants found, initializing with base");
        setSelectedPlatforms(["base"]);
      }
    } else if (selectedPlatforms.length === 0) {
      // If post has no variants at all, initialize with base
      console.log("🔍 Post has no variants, initializing with base");
      setSelectedPlatforms(["base"]);
    }
  }, [post?.id, post?.variants, selectedPlatforms]); // Include selectedPlatforms to satisfy React Hook rules

  // Initialize form state from existing post data
  useEffect(() => {
    if (post?.variants?.base?.scheduledFor) {
      const existingDate = new Date(post.variants.base.scheduledFor);
      // Only update if the date is actually different to prevent loops
      if (
        !scheduledDate ||
        existingDate.getTime() !== scheduledDate.getTime()
      ) {
        setScheduledDate(existingDate);
      }
    }
  }, [post?.variants?.base?.scheduledFor, scheduledDate]); // Include all dependencies

  // Clean up corrupted variants immediately to prevent Jazz loading errors
  useEffect(() => {
    try {
      const corruptedVariantId = "co_zerhbvzPjo6yVD4HZ7URSzung3k";

      // Check if the corrupted variant exists and remove it
      if (post.variants && post.variants[corruptedVariantId]) {
        delete post.variants[corruptedVariantId];
      }

      // Also clean up any other variants with broken references
      Object.keys(post.variants || {}).forEach((key) => {
        if (key !== "title") {
          const variant = post.variants[key];
          if (
            variant &&
            (variant.text === null ||
              variant.media === null ||
              variant.replyTo === null)
          ) {
            delete post.variants[key];
          }
        }
      });
    } catch (error) {
      console.error("Error cleaning up variants:", error);
    }
  }, [post]);

  const hasMultipleAccounts = useMemo(() => {
    return selectedPlatforms.filter((p) => p !== "base").length > 1;
  }, [selectedPlatforms]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleReplyMode = useCallback(() => {
    setSeriesType((prev) => {
      const newSeriesType = prev === "reply" ? null : "reply";

      if (newSeriesType === "reply") {
        // Entering reply mode - clear content and reset state
        setContextText("");
        setReplyUrl("");
        setIsQuoteTweet(false);
        setFetchReplyError(null);
      } else {
        // Exiting reply mode - clear reply-related state
        setReplyUrl("");
        setIsQuoteTweet(false);
        setFetchReplyError(null);
      }

      return newSeriesType;
    });
  }, []);

  const isExplicitThread = useMemo(() => {
    // Safely access variant text with fallback to empty string for broken references
    const variant = currentPost.variants[activeTab];
    const content =
      contextText ??
      (variant?.text && typeof variant.text.toString === "function"
        ? variant.text.toString()
        : "") ??
      "";
    return manualThreadMode && content.includes("\n\n");
  }, [manualThreadMode, contextText, currentPost.variants, activeTab]);

  const isImplicitThread = useMemo(() => {
    // Safely access variant text with fallback to empty string for broken references
    const variant = currentPost.variants[activeTab];
    const content =
      contextText ??
      (variant?.text && typeof variant.text.toString === "function"
        ? variant.text.toString()
        : "") ??
      "";

    // Safe platform access with proper type handling
    let platform = "default";
    if (Array.isArray(accountGroup.accounts)) {
      const account = accountGroup.accounts.find(
        (acc: any) => acc.id === activeTab || acc.platform === activeTab
      );
      platform = account?.platform || "default";
    } else if (
      accountGroup.accounts &&
      typeof accountGroup.accounts === "object"
    ) {
      platform = accountGroup.accounts[activeTab]?.platform || "default";
    }

    const limit =
      PLATFORM_CHARACTER_LIMITS[
        platform as keyof typeof PLATFORM_CHARACTER_LIMITS
      ] || PLATFORM_CHARACTER_LIMITS.default;
    return content.length > limit;
  }, [contextText, currentPost.variants, activeTab, accountGroup.accounts]);

  const isThread = isExplicitThread || isImplicitThread;

  useEffect(() => {
    const replyToData = post.variants[activeTab]?.replyTo;
    if (replyToData?.url) {
      setReplyUrl(replyToData.url);
      setSeriesType("reply");
    } else {
      setReplyUrl("");
      setSeriesType(null);
    }
  }, [activeTab, post.variants]);

  const isValidReplyUrl = useMemo(
    () => (replyUrl ? validateReplyUrl(replyUrl) : false),
    [replyUrl]
  );

  const detectedPlatform = useMemo(() => {
    const detected = replyUrl ? detectPlatformFromUrl(replyUrl) : null;
    // Type cast to ensure it matches the PlatformNames enum
    return detected && PlatformNames.includes(detected as any)
      ? (detected as (typeof PlatformNames)[number])
      : null;
  }, [replyUrl]);

  const availableAccounts = useMemo(() => {
    // Handle both legacy account groups (object) and Jazz account groups (array)
    let allAccounts: [string, any][] = [];

    if (accountGroup.accounts) {
      if (Array.isArray(accountGroup.accounts)) {
        // Jazz CoList - treat as array
        allAccounts = (accountGroup.accounts as any[]).map((account, index) => {
          // Use platform as the key (this is what handleAddAccount expects)
          const platform = account.platform || "unknown";
          const accountData = {
            id: account.id,
            name:
              account.name ||
              account.displayName ||
              account.username ||
              "Unknown Account",
            platform: platform,
            profileKey: account.profileKey,
            isLinked: account.isLinked || true,
            status: account.status || "linked",
          };

          return [platform, accountData];
        });
      } else {
        // Legacy object - use Object.entries
        allAccounts = Object.entries(accountGroup.accounts);
      }
    }

    const filtered = allAccounts.filter(([key, account]) => {
      // Show accounts that are NOT already selected (excluding 'base' from comparison)
      const platformsToMatch = selectedPlatforms.filter((p) => p !== "base");
      const keyMatch = platformsToMatch.includes(key);
      const platformMatch = platformsToMatch.includes(account.platform);
      // Return accounts that are NOT already selected
      return !keyMatch && !platformMatch;
    });

    console.log(
      "🔍 All accounts:",
      allAccounts.map(([key, account]) => `${key}:${account.platform}`)
    );
    console.log("🔍 Selected platforms:", selectedPlatforms);

    return filtered;
  }, [accountGroup.accounts, selectedPlatforms]);

  const hasUnsavedChanges = useMemo(() => {
    if (!contextText) return false;
    // Safely access variant text with fallback for broken references
    const variant = currentPost.variants[activeTab];
    const savedContent =
      (variant?.text && typeof variant.text.toString === "function"
        ? variant.text.toString()
        : "") || "";
    return contextText !== savedContent;
  }, [contextText, currentPost.variants, activeTab]);

  const canPublish = useMemo(() => {
    // Safely access variant text with fallback for broken references
    const variant = currentPost.variants[activeTab];
    const content =
      (variant?.text && typeof variant.text.toString === "function"
        ? variant.text.toString()
        : "") || "";
    return content.trim().length > 0 && selectedPlatforms.length > 1;
  }, [currentPost.variants, activeTab, selectedPlatforms]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowPostTypeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Only include known safe variants to avoid corrupted ones
    const platforms = ["base"]; // Start with just base variant to avoid corruption

    // Get list of valid platform names for validation
    const validPlatformNames = new Set<string>(PlatformNames);

    // Debug: Log all variant keys to diagnose platform detection issues
    const allVariantKeys = Object.keys(currentPost.variants || {});
    console.log("🔍 [VARIANT DETECTION] Post ID:", currentPost.id);
    console.log("🔍 [VARIANT DETECTION] All variant keys:", allVariantKeys);
    console.log(
      "🔍 [VARIANT DETECTION] Valid platform names:",
      Array.from(validPlatformNames)
    );

    // Safely check for additional variants without triggering Jazz loading errors
    // IMPORTANT: Do NOT delete variants for unconnected platforms - they may have been
    // created intentionally via the API for scheduled posts
    try {
      allVariantKeys.forEach((key) => {
        if (
          key !== "title" &&
          key !== "base" &&
          key !== "co_zerhbvzPjo6yVD4HZ7URSzung3k"
        ) {
          // Only add if it's a valid platform key (in PlatformNames) and not corrupted
          try {
            const variant = currentPost.variants[key];
            const isValidPlatform = validPlatformNames.has(key);
            const hasValidText =
              variant && variant.text !== null && variant.text !== undefined;

            console.log(
              `🔍 [VARIANT CHECK] Key: ${key}, isValidPlatform: ${isValidPlatform}, hasValidText: ${hasValidText}, variant exists: ${!!variant}`
            );

            if (hasValidText && isValidPlatform) {
              platforms.push(key);
              console.log(`✅ [VARIANT ADDED] Added platform: ${key}`);
            }
          } catch (e) {
            console.warn(`Skipping corrupted variant: ${key}`, e);
          }
        }
      });
    } catch (error) {
      console.error("Error accessing variants, using base only:", error);
    }

    console.log("🔍 [VARIANT DETECTION] Final selectedPlatforms:", platforms);
    setSelectedPlatforms(platforms);
  }, [currentPost.variants, currentPost.id]);

  useEffect(() => {
    setShowSaveButton(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setShowPublishButton(canPublish && !hasUnsavedChanges);
  }, [canPublish, hasUnsavedChanges]);

  const updateThreadPreview = useCallback(
    (text: string) => {
      if (isThread) {
        const threads = generateThreadPreview(text, activeTab);
        setThreadPosts(threads);
      } else {
        setThreadPosts([]);
      }
    },
    [isThread, activeTab]
  );

  useEffect(() => {
    if (contextText) {
      updateThreadPreview(contextText);
    } else {
      const savedContent = post.variants[activeTab]?.text?.toString() || "";
      updateThreadPreview(savedContent);
    }
  }, [contextText, post.variants, activeTab, updateThreadPreview]);

  useEffect(() => {
    const text =
      contextText ?? post.variants[activeTab]?.text?.toString() ?? "";
    if (isThread) {
      const threads = generateThreadPreview(text, activeTab);
      setThreadPosts(threads);
    } else {
      setThreadPosts([]);
    }
  }, [contextText, post.variants, activeTab, isThread]);

  useEffect(() => {
    const replyToData = post.variants[activeTab]?.replyTo;

    const shouldFetch =
      isValidReplyUrl &&
      seriesType === "reply" &&
      (!replyToData ||
        replyToData.url !== replyUrl ||
        !replyToData.authorPostContent);

    if (shouldFetch) {
      const fetchContent = async () => {
        setIsFetchingReply(true);
        setFetchReplyError(null);
        try {
          const postContent = await fetchPostContent(replyUrl);

          // Update the Jazz object directly
          const variant = post.variants[activeTab];
          if (variant && variant.replyTo) {
            // Update existing ReplyTo object properties
            variant.replyTo.url = replyUrl;
            variant.replyTo.platform = detectedPlatform || undefined;
            variant.replyTo.author = postContent.author;
            variant.replyTo.authorUsername = postContent.authorUsername;
            variant.replyTo.authorPostContent = postContent.authorPostContent;
            variant.replyTo.authorAvatar = postContent.authorAvatar;
            variant.replyTo.likesCount = postContent.likesCount;
          }
        } catch (error) {
          setFetchReplyError(
            error instanceof Error ? error.message : "Failed to fetch post."
          );
        } finally {
          setIsFetchingReply(false);
        }
      };

      const handler = setTimeout(fetchContent, 500);
      return () => clearTimeout(handler);
    }

    if (!isValidReplyUrl && replyToData?.url) {
      // Clear reply data in Jazz object
      const variant = post.variants[activeTab];
      if (variant && variant.replyTo) {
        // Clear the ReplyTo object properties instead of replacing it
        variant.replyTo.url = undefined;
        variant.replyTo.platform = undefined;
        variant.replyTo.author = undefined;
        variant.replyTo.authorUsername = undefined;
        variant.replyTo.authorPostContent = undefined;
        variant.replyTo.authorAvatar = undefined;
        variant.replyTo.likesCount = undefined;
      }
    }
  }, [
    replyUrl,
    isValidReplyUrl,
    seriesType,
    activeTab,
    post.variants,
    detectedPlatform,
  ]);

  // Removed automatic tab switching when platform is detected for replies
  // useEffect(() => {
  // 	if (detectedPlatform && seriesType === 'reply') {
  // 		const accountKey = Object.keys(accountGroup.accounts).find(
  // 			key => accountGroup.accounts[key].platform === detectedPlatform
  // 		);
  // 		if (accountKey) {
  // 			setActiveTab(accountKey);
  // 		}
  // 	}
  // }, [detectedPlatform, seriesType, accountGroup.accounts]);

  const handleSaveContent = useCallback(async () => {
    if (!contextText) return;

    setIsSaving(true);
    setErrors([]);
    setSuccess("");

    try {
      // Update the Jazz CoPlainText using applyDiff (as per Jazz docs)
      const variant = currentPost.variants[activeTab];
      // Only attempt to save if we have a valid variant with proper text reference
      if (
        variant?.text &&
        typeof variant.text.applyDiff === "function" &&
        contextText
      ) {
        variant.text.applyDiff(contextText);

        // Update metadata fields directly on the Jazz object
        variant.edited = true;
        variant.lastModified = new Date().toISOString();
      }

      setContextText(null);
      setSuccess("Content saved successfully!");
    } catch (error) {
      console.error("Error saving content:", error);
      setErrors([handleApiError(error)]);
    } finally {
      setIsSaving(false);
    }
  }, [contextText, post.variants, activeTab]);

  const handlePublishPost = useCallback(async () => {
    setIsScheduling(true);
    setErrors([]);
    setSuccess("");
    setPlatformAuthErrors([]);
    setShowAuthErrorDialog(false);

    try {
      const platforms = selectedPlatforms.filter((p) => p !== "base");
      const postText = post.variants[activeTab]?.text?.toString() || "";
      const baseText = post.variants.base?.text?.toString() || "";

      if (!postText.trim() && !baseText.trim()) {
        throw new Error("Post content cannot be empty");
      }

      const extractMediaUrlsFromVariant = async (
        variant: any
      ): Promise<string[]> => {
        const extractFileStreamId = (fileStream: any) => {
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

          if (typeof fileStream === "string" && fileStream.startsWith("co_")) {
            return fileStream;
          }
          const fileStreamString =
            typeof fileStream?.toString === "function"
              ? fileStream.toString()
              : undefined;
          const stringMatch =
            typeof fileStreamString === "string"
              ? fileStreamString.match(/co_[A-Za-z0-9]+/)
              : null;
          return (
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
            extractCoId(fileStream)
          );
        };

        const resolveFileStreamUrl = async (fileStream: any) => {
          if (!fileStream) return null;
          let stream = fileStream;
          try {
            if (typeof stream.load === "function") {
              const loaded = await stream.load();
              if (loaded) {
                stream = loaded;
              }
            }
          } catch (error) {
            console.warn("⚠️ Failed to load FileStream ref:", error);
          }

          const fileStreamId = extractFileStreamId(stream);
          if (
            typeof fileStreamId === "string" &&
            fileStreamId.startsWith("co_")
          ) {
            return `https://app.succulent.social/api/media-proxy/${fileStreamId}`;
          }

          const publicUrlValue =
            typeof stream?.publicUrl === "function"
              ? stream.publicUrl()
              : stream?.publicUrl;
          const urlValue =
            typeof stream?.url === "function" ? stream.url() : stream?.url;
          const directUrl = publicUrlValue || urlValue;
          if (typeof directUrl === "string" && directUrl.startsWith("http")) {
            return directUrl;
          }

          if (typeof stream === "string" && stream.startsWith("http")) {
            return stream;
          }

          return null;
        };

        const mediaUrls = (await Promise.all(
          variant?.media?.map(async (item: any) => {
            if (item?.type === "url-image" || item?.type === "url-video") {
              const url = item.url;
              return typeof url === "string" ? url : null;
            }

            if (
              (item?.type === "image" || item?.type === "video") &&
              typeof item?.sourceUrl === "string"
            ) {
              return item.sourceUrl;
            }

            if (item?.type === "image" && item.image) {
              return resolveFileStreamUrl(item.image);
            }

            if (item?.type === "video" && item.video) {
              return resolveFileStreamUrl(item.video);
            }

            if (item?.type === "image" || item?.type === "video") {
              const fileStreamRef = item?._refs?.image || item?._refs?.video;
              if (fileStreamRef) {
                return resolveFileStreamUrl(fileStreamRef);
              }
            }

            return null;
          }) || []
        )) as Array<string | null>;

        return mediaUrls
          .filter((url): url is string => typeof url === "string")
          .filter(
            (url: string) =>
              url.startsWith("http://") || url.startsWith("https://")
          );
      };

      const parsePlatformOptions = (variant: any) => {
        const rawOptions = variant?.platformOptions;
        if (!rawOptions) return {};
        try {
          const textValue =
            typeof rawOptions === "string"
              ? rawOptions
              : rawOptions?.toString?.();
          return textValue ? JSON.parse(textValue) : {};
        } catch (error) {
          console.warn("⚠️ Failed to parse platform options:", error);
          return {};
        }
      };

      const applyPublishResultsToPost = (
        platform: string,
        results: any,
        resolvedStatus: "scheduled" | "published",
        scheduledFor?: Date | null
      ) => {
        const postIds: Record<string, string> = {};

        if (results?.postIds) {
          Object.assign(postIds, results.postIds);
        } else if (results?.id) {
          postIds[platform] = results.id;
        } else if (results?.posts && Array.isArray(results.posts)) {
          const firstPost = results.posts[0];
          if (firstPost?.postIds && Array.isArray(firstPost.postIds)) {
            firstPost.postIds.forEach((p: any) => {
              if (p?.platform && (p?.id || p?.idShare)) {
                postIds[p.platform] = p.id || p.idShare;
              }
            });
          } else if (firstPost?.id) {
            postIds[platform] = firstPost.id;
          }
        }

        const baseVariant = post.variants.base;
        if (baseVariant) {
          baseVariant.status = resolvedStatus;
          if (resolvedStatus === "published") {
            baseVariant.publishedAt = new Date();
            baseVariant.scheduledFor = undefined;
          } else if (scheduledFor) {
            baseVariant.scheduledFor = scheduledFor;
          }
        }

        Object.entries(postIds).forEach(([ayrsharePlatform, id]) => {
          const internalPlatform =
            AYRSHARE_PLATFORM_MAP[ayrsharePlatform] || ayrsharePlatform;
          const variant = post.variants[internalPlatform] || baseVariant;
          if (!variant || !id) return;
          variant.ayrsharePostId = id;
          variant.status = resolvedStatus;
          if (resolvedStatus === "published") {
            variant.publishedAt = new Date();
            variant.scheduledFor = undefined;
          } else if (scheduledFor) {
            variant.scheduledFor = scheduledFor;
          }
        });
      };

      // Check for Twitter/X and set auto-threading options
      const hasTwitter =
        platforms.includes("twitter") || platforms.includes("x");
      const twitterOptions = hasTwitter
        ? { thread: true, threadNumber: true }
        : undefined;

      // Get profile key for Business Plan mode
      const profileKey = isBusinessPlanMode()
        ? accountGroup.ayrshareProfileKey
        : undefined;

      const baseVariant = post.variants.base;
      const baseOptions = parsePlatformOptions(baseVariant);
      const scheduleDate = scheduledDate
        ? new Date(scheduledDate).toISOString()
        : undefined;
      const isReschedule = !!scheduleDate && hasScheduleChange;
      const lunaryCache = new Map<string, string>();
      const cacheLunaryMediaUrls = async (
        urls: string[],
        format: "png" | "jpg"
      ) => {
        if (urls.length === 0) return urls;
        const results = await Promise.all(
          urls.map(async (url) => {
            if (!url.includes("lunary.app/api/og/")) {
              return url;
            }
            const cached = lunaryCache.get(url);
            if (cached) return cached;
            try {
              const response = await fetch("/api/cache-lunary-media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  accountGroupId: accountGroup.id,
                  url,
                  format,
                }),
              });
              if (response.ok) {
                const data = await response.json();
                if (data?.proxyUrl) {
                  lunaryCache.set(url, data.proxyUrl);
                  return data.proxyUrl;
                }
              }
            } catch (error) {
              console.warn("⚠️ Failed to cache media, using proxy:", error);
            }
            const fallback = proxyMediaUrlIfNeeded(url, format);
            lunaryCache.set(url, fallback);
            return fallback;
          })
        );
        return results;
      };
      const cacheLunaryMediaUrlsForPlatform = async (
        urls: string[],
        platform: string
      ) => {
        const preferredFormat = getPreferredMediaFormatForPlatform(platform);
        return cacheLunaryMediaUrls(urls, preferredFormat);
      };
      const cacheLunaryMediaUrlsForPlatforms = async (
        urls: string[],
        platforms: string[]
      ) => {
        const useJpg = platforms.some((platform) =>
          needsJpgConversion(platform)
        );
        const format = useJpg ? "jpg" : "png";
        return cacheLunaryMediaUrls(urls, format);
      };

      const deleteScheduledAyrsharePosts = async (platforms: string[]) => {
        if (!AYRSHARE_API_KEY) {
          throw new Error("Missing AYRSHARE_API_KEY for delete operation");
        }

        const profileKey = isBusinessPlanMode()
          ? accountGroup.ayrshareProfileKey
          : undefined;
        const baseVariant = post.variants.base;
        const deleteTargets = platforms
          .map((platform) => {
            const variant = post.variants[platform] || baseVariant;
            if (!variant) return null;
            const isScheduled =
              variant?.status === "scheduled" || !!variant?.scheduledFor;
            const postId = variant?.ayrsharePostId;
            return isScheduled && postId ? { platform, postId } : null;
          })
          .filter(
            (target): target is { platform: string; postId: string } => !!target
          );
        const seenIds = new Set<string>();
        const uniqueTargets = deleteTargets.filter((target) => {
          if (seenIds.has(target.postId)) return false;
          seenIds.add(target.postId);
          return true;
        });

        if (uniqueTargets.length === 0) return;

        const deleteErrors: string[] = [];
        for (const target of uniqueTargets) {
          try {
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
              Authorization: `Bearer ${AYRSHARE_API_KEY}`,
            };
            if (isBusinessPlanMode() && profileKey) {
              headers["Profile-Key"] = profileKey;
            }
            const response = await fetch(`${AYRSHARE_API_URL}/post`, {
              method: "DELETE",
              headers,
              body: JSON.stringify({ id: target.postId }),
            });
            if (!response.ok) {
              const text = await response.text();
              throw new Error(
                `Delete failed (${response.status}): ${text || "Unknown error"}`
              );
            }
          } catch (deleteError) {
            deleteErrors.push(
              `${target.platform}: ${
                deleteError instanceof Error
                  ? deleteError.message
                  : "Delete failed"
              }`
            );
          }
        }

        if (deleteErrors.length > 0) {
          throw new Error(
            `Failed to delete scheduled posts: ${deleteErrors.join(", ")}`
          );
        }
      };

      const triggerPostStatusSync = async (reason: string) => {
        try {
          await fetch("/api/sync-post-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accountGroupId: accountGroup.id, reason }),
          });
        } catch (syncError) {
          console.warn("⚠️ Post status sync failed:", syncError);
        }
      };

      const getPrimaryResult = (
        value: AyrshareResultOrArray | null | undefined
      ): AyrshareResult | null => {
        if (!value) return null;
        return Array.isArray(value) ? value[0] : value;
      };

      let results: AyrshareResultOrArray | null = null;

      if (isReschedule) {
        await deleteScheduledAyrsharePosts(platforms);
      }

      if (seriesType === "reply" && replyUrl) {
        const mediaUrls = await cacheLunaryMediaUrlsForPlatforms(
          await extractMediaUrlsFromVariant(post.variants[activeTab]),
          platforms
        );
        const basePostData: PostData = {
          post: postText,
          platforms,
          profileKey,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          scheduleDate: scheduleDate,
          twitterOptions,
        };
        results = (await handleReplyPost(
          basePostData,
          replyUrl
        )) as AyrshareResult;
        const primaryResult = getPrimaryResult(results);
        const resolvedStatus =
          scheduleDate ||
          primaryResult?.status === "scheduled" ||
          primaryResult?.posts?.[0]?.status === "scheduled" ||
          primaryResult?._hasPendingPosts
            ? "scheduled"
            : "published";
        platforms.forEach((platform) => {
          applyPublishResultsToPost(
            platform,
            primaryResult,
            resolvedStatus,
            scheduledDate
          );
        });
      } else if (seriesType === "thread" && contextText?.trim()) {
        const threadPosts = generateThreadPreview(contextText);
        const mediaUrls = await cacheLunaryMediaUrlsForPlatforms(
          await extractMediaUrlsFromVariant(post.variants[activeTab]),
          platforms
        );
        const basePostData: PostData = {
          post: postText,
          platforms,
          profileKey,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
          scheduleDate: scheduleDate,
          twitterOptions,
        };
        results = (await handleMultiPosts(
          basePostData,
          threadPosts
        )) as AyrshareResult[];
        const primaryResult = getPrimaryResult(results);
        const resolvedStatus =
          scheduleDate ||
          primaryResult?.status === "scheduled" ||
          primaryResult?.posts?.[0]?.status === "scheduled" ||
          primaryResult?._hasPendingPosts
            ? "scheduled"
            : "published";
        platforms.forEach((platform) => {
          applyPublishResultsToPost(
            platform,
            primaryResult,
            resolvedStatus,
            scheduledDate
          );
        });
      } else {
        const errorsByPlatform: string[] = [];
        let hasPendingPosts = false;
        let pendingWarning: string | undefined;

        for (const platform of platforms) {
          try {
            const variant = post.variants[platform] || baseVariant;
            const variantText = variant?.text?.toString() || postText;
            let mediaUrls = await extractMediaUrlsFromVariant(variant);
            if (
              mediaUrls.length === 0 &&
              variant &&
              baseVariant &&
              variant !== baseVariant
            ) {
              const baseMediaUrls = await extractMediaUrlsFromVariant(
                baseVariant
              );
              if (baseMediaUrls.length > 0) {
                mediaUrls = baseMediaUrls;
              }
            }
            mediaUrls = await cacheLunaryMediaUrlsForPlatform(
              mediaUrls,
              platform
            );
            const variantOptions = parsePlatformOptions(variant);
            const mergedOptions = { ...baseOptions, ...variantOptions };

            if (!variantText.trim()) {
              throw new Error(`Missing content for ${platform}`);
            }

            if (platform === "tiktok" && mediaUrls.length === 0) {
              throw new Error(
                "TikTok requires media. Add a portrait image or video before publishing."
              );
            }

            const postData: PostData = {
              post: variantText,
              platforms: [platform],
              profileKey,
              mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
              scheduleDate,
              twitterOptions: mergedOptions.twitterOptions || twitterOptions,
              redditOptions: mergedOptions.redditOptions,
              pinterestOptions: mergedOptions.pinterestOptions,
              instagramOptions: mergedOptions.instagramOptions,
              facebookOptions: mergedOptions.facebookOptions,
              linkedinOptions: mergedOptions.linkedinOptions,
              tiktokOptions: mergedOptions.tiktokOptions,
              youtubeOptions: mergedOptions.youtubeOptions,
            };

            const platformResult = await handleStandardPost(postData);
            const resolvedStatus =
              scheduleDate ||
              platformResult?.status === "scheduled" ||
              platformResult?.posts?.[0]?.status === "scheduled" ||
              platformResult?._hasPendingPosts
                ? "scheduled"
                : "published";

            applyPublishResultsToPost(
              platform,
              platformResult,
              resolvedStatus,
              scheduledDate
            );

            if (platformResult?._hasPendingPosts) {
              hasPendingPosts = true;
              pendingWarning = platformResult?._pendingWarning;
            }
          } catch (platformError) {
            errorsByPlatform.push(
              `${platform.toUpperCase()}: ${handleApiError(platformError)}`
            );
          }
        }

        if (errorsByPlatform.length > 0) {
          throw new Error(errorsByPlatform.join("\n"));
        }

        if (hasPendingPosts) {
          results = {
            _hasPendingPosts: true,
            _pendingWarning: pendingWarning,
          };
        } else {
          results = { success: true };
        }
      }

      // Check if post is still processing (has pending IDs)
      const primaryResult = getPrimaryResult(results);
      if (primaryResult?._hasPendingPosts) {
        setSuccess(
          primaryResult._pendingWarning ||
            "Post is still processing. It may take a few minutes to appear on the platform."
        );
        triggerPostStatusSync("pending_publish").catch(() => undefined);
        setTimeout(() => {
          triggerPostStatusSync("pending_followup").catch(() => undefined);
        }, 2 * 60 * 1000);
      } else {
        setSuccess(
          isReschedule
            ? "Post rescheduled successfully!"
            : scheduleDate
            ? "Post scheduled successfully!"
            : "Post published successfully!"
        );
        triggerPostStatusSync("publish_complete").catch(() => undefined);
      }
    } catch (error) {
      // Check if this is a platform authorization error
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Parse platform-specific errors from the enhanced error message
      if (
        errorMessage.includes(":") &&
        errorMessage.includes("authorization")
      ) {
        const platformErrors = errorMessage.split("\n").map((line) => {
          const [platform, message] = line.split(":").map((s) => s.trim());
          return {
            platform: platform.toLowerCase(),
            code: message.includes("authorization expired") ? 272 : 156,
            message: message,
            resolution: { relink: true, platform: platform.toLowerCase() },
          };
        });

        setPlatformAuthErrors(platformErrors);
        setShowAuthErrorDialog(true);
      } else {
        const errorMessageText = handleApiError(error);
        setErrors([errorMessageText]);
      }
    } finally {
      setIsScheduling(false);
    }
  }, [
    selectedPlatforms,
    post,
    activeTab,
    scheduledDate,
    seriesType,
    replyUrl,
    contextText,
    accountGroup.ayrshareProfileKey,
    accountGroup.id,
    hasScheduleChange,
  ]);

  const handleContentChange = useCallback((newContent: string) => {
    setContextText(newContent);
    setSuccess("");
  }, []);

  const handleReplyUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setReplyUrl(newUrl);

    // Update the Jazz object directly
    const variant = post.variants[activeTab];
    if (variant && variant.replyTo) {
      variant.replyTo.url = newUrl;
      if (!newUrl) {
        // Clear all ReplyTo properties instead of replacing the object
        variant.replyTo.url = undefined;
        variant.replyTo.platform = undefined;
        variant.replyTo.author = undefined;
        variant.replyTo.authorUsername = undefined;
        variant.replyTo.authorPostContent = undefined;
        variant.replyTo.authorAvatar = undefined;
        variant.replyTo.likesCount = undefined;
      } else {
        variant.replyTo.authorPostContent = undefined;
      }
    }
  };

  const handleTitleSave = useCallback(() => {
    setIsEditingTitle(false);
    // Update the Jazz CoPlainText using applyDiff (as per Jazz docs)
    try {
      if (post.title) {
        post.title.applyDiff(title);
      }
    } catch (error) {
      console.error("Error updating title:", error);
    }
  }, [title, post]);

  const handleClearSchedule = useCallback(() => {
    setScheduledDate(null);
    // Update the post object to unschedule it
    if (post?.variants?.base) {
      try {
        post.variants.base.scheduledFor = undefined;
        if (post.variants.base.status === "scheduled") {
          post.variants.base.status = "draft";
        }
      } catch (error) {
        console.error("Failed to unschedule post:", error);
      }
    }
    setShowSettings(false);
  }, [post]);

  const handleScheduleDateChange = useCallback(
    (date: Date | null) => {
      setScheduledDate(date);
      // Save to post object immediately
      if (post?.variants?.base) {
        try {
          const baseVariant = post.variants.base;
          const hasExistingSchedule = Boolean(
            baseVariant?.ayrsharePostId &&
              (baseVariant?.status === "scheduled" || baseVariant?.scheduledFor)
          );

          if (date) {
            if (!hasExistingSchedule) {
              // Keep draft schedule metadata only for unscheduled posts
              if (
                baseVariant.scheduledFor !== undefined ||
                "scheduledFor" in baseVariant
              ) {
                baseVariant.scheduledFor = date;
              }
              if (baseVariant.status !== undefined || "status" in baseVariant) {
                baseVariant.status = "scheduled";
              }
            }
          } else {
            if (
              baseVariant.scheduledFor !== undefined ||
              "scheduledFor" in baseVariant
            ) {
              baseVariant.scheduledFor = undefined;
            }
            if (baseVariant.status === "scheduled") {
              baseVariant.status = "draft";
            }
          }
        } catch (error) {
          console.error("Failed to save schedule change:", error);
        }
      }
    },
    [post]
  );

  const handleAddAccount = useCallback(
    (platform: string) => {
      console.log("🔍 Adding account for platform:", platform);
      console.log("🔍 Current selectedPlatforms:", selectedPlatforms);
      console.log("🔍 Existing variants:", Object.keys(post.variants || {}));

      if (!selectedPlatforms.includes(platform)) {
        try {
          // Check if variant already exists to prevent duplicate key error
          if (post.variants[platform]) {
            console.log(
              `⚠️ Platform variant ${platform} already exists, just adding to selectedPlatforms`
            );
            setSelectedPlatforms((prev) => [...prev, platform]);
            setShowAddAccountDialog(false);
            return;
          }

          // Create a new PostVariant for this platform
          const baseVariant = post.variants.base;
          const baseText = baseVariant?.text?.toString() || "";

          console.log(`🔧 Creating new variant for platform: ${platform}`);

          // Create the collaborative objects
          const platformText = co
            .plainText()
            .create(baseText, { owner: post._owner });
          const mediaList = co
            .list(MediaItem)
            .create([], { owner: post._owner });
          const replyToObj = ReplyTo.create({}, { owner: post._owner });

          // Create the platform variant with all required fields
          const platformVariant = PostVariant.create(
            {
              text: platformText,
              postDate: new Date(),
              media: mediaList,
              replyTo: replyToObj,
              status: "draft", // Add required status field
              edited: false,
              lastModified: undefined,
            },
            { owner: post._owner }
          );

          // Add to post variants
          post.variants[platform] = platformVariant;

          console.log(
            `✅ Successfully created variant for platform: ${platform}`
          );
          setSelectedPlatforms((prev) => [...prev, platform]);
        } catch (error) {
          console.error(
            "❌ Error creating Jazz variant for platform:",
            platform,
            error
          );
          // Fallback to just state update if Jazz creation fails
          setSelectedPlatforms((prev) => [...prev, platform]);
        }
      } else {
        console.log(`ℹ️ Platform ${platform} already selected`);
      }
      setShowAddAccountDialog(false);
    },
    [selectedPlatforms, post]
  );

  const handleRemoveAccount = useCallback(
    (platform: string) => {
      try {
        // Remove the Jazz variant
        if (post.variants[platform]) {
          delete post.variants[platform];
        }
      } catch (error) {
        console.error(
          "Error removing Jazz variant for platform:",
          platform,
          error
        );
      }

      setSelectedPlatforms((prev) => prev.filter((p) => p !== platform));

      if (activeTab === platform) {
        setActiveTab("base");
      }
    },
    [activeTab, post]
  );

  const getReplyDescription = useCallback(() => {
    if (!seriesType || seriesType !== "reply") return "";

    if (detectedPlatform === "x") {
      return "This will be posted as a reply to the specified tweet.";
    } else {
      return "This will be posted as a comment on the specified post.";
    }
  }, [seriesType, detectedPlatform]);

  const getMultiDescription = useCallback(() => {
    if (!isThread) return "";

    if (activeTab === "x") {
      return "This will be posted as a Twitter thread with automatic numbering.";
    } else {
      return "This will be posted as multiple connected posts with numbering.";
    }
  }, [isThread, activeTab]);

  const handlePreview = useCallback(() => {
    // Only allow preview if accounts are selected (excluding 'base')
    const hasSelectedAccounts =
      selectedPlatforms.filter((p) => p !== "base").length > 0;
    if (hasSelectedAccounts) {
      setShowPreviewModal(true);
    }
  }, [selectedPlatforms]);

  const handleImageUpload = useCallback(async () => {
    // Create a file input element with enhanced Apple Photos support
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    // Explicitly include Apple formats and common extensions
    fileInput.accept =
      "image/*,video/*,.heic,.heif,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.m4v";
    fileInput.multiple = true;

    fileInput.onchange = async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setSuccess("Processing files...");
      setErrors([]);

      try {
        const normalizeVideoFile = (inputFile: File) => {
          const fileName = inputFile.name.toLowerCase();
          let mimeType = inputFile.type;

          if (!mimeType || !mimeType.startsWith("video/")) {
            if (fileName.endsWith(".mp4")) {
              mimeType = "video/mp4";
            } else if (fileName.endsWith(".mov")) {
              mimeType = "video/quicktime";
            } else if (fileName.endsWith(".m4v")) {
              mimeType = "video/x-m4v";
            } else if (fileName.endsWith(".avi")) {
              mimeType = "video/x-msvideo";
            } else if (fileName.endsWith(".webm")) {
              mimeType = "video/webm";
            } else if (fileName.endsWith(".mkv")) {
              mimeType = "video/x-matroska";
            }
          }

          if (mimeType && mimeType !== inputFile.type) {
            return new File([inputFile], inputFile.name, {
              type: mimeType,
              lastModified: inputFile.lastModified,
            });
          }

          return inputFile;
        };

        // Process each selected file
        for (const file of Array.from(files)) {
          console.log("📱 Processing file:", {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
          });

          // Enhanced file type detection for Apple Photos
          let isImage = file.type.startsWith("image/");
          let isVideo = file.type.startsWith("video/");

          // Handle Apple Photos edge cases
          if (!isImage && !isVideo) {
            // Check file extension as fallback (Apple Photos sometimes has missing/wrong MIME types)
            const fileName = file.name.toLowerCase();
            const imageExtensions = [
              ".jpg",
              ".jpeg",
              ".png",
              ".gif",
              ".webp",
              ".bmp",
              ".heic",
              ".heif",
            ];
            const videoExtensions = [
              ".mp4",
              ".mov",
              ".avi",
              ".webm",
              ".mkv",
              ".m4v",
            ];

            isImage = imageExtensions.some((ext) => fileName.endsWith(ext));
            isVideo = videoExtensions.some((ext) => fileName.endsWith(ext));

            if (isImage) {
              console.log("📱 Detected image by extension:", fileName);
            } else if (isVideo) {
              console.log("📱 Detected video by extension:", fileName);
            }
          }

          // Handle HEIC/HEIF files specifically (Apple's format)
          if (
            file.type === "image/heic" ||
            file.type === "image/heif" ||
            file.name.toLowerCase().endsWith(".heic") ||
            file.name.toLowerCase().endsWith(".heif")
          ) {
            console.log("📱 HEIC/HEIF file detected - treating as image");
            isImage = true;
          }

          // Handle missing MIME type (common with Apple Photos)
          if (!file.type || file.type === "") {
            console.log("📱 Missing MIME type - detecting by extension");
            const fileName = file.name.toLowerCase();
            if (
              fileName.endsWith(".jpg") ||
              fileName.endsWith(".jpeg") ||
              fileName.endsWith(".png")
            ) {
              isImage = true;
            } else if (fileName.endsWith(".mp4") || fileName.endsWith(".mov")) {
              isVideo = true;
            }
          }

          if (!isImage && !isVideo) {
            setErrors((prev) => [
              ...prev,
              `Unsupported file type: ${file.type || "unknown"} (${file.name})`,
            ]);
            continue;
          }

          // Get the current post's owner for creating new objects
          const variant = post.variants[activeTab];
          if (!variant || !variant.media) {
            setErrors((prev) => [
              ...prev,
              "No media list found for current post variant",
            ]);
            continue;
          }

          const owner = variant.media._owner;

          let mediaItem;
          if (isImage) {
            console.log("📱 Creating image media for:", file.name);
            try {
              // Use Jazz createImage for proper URL generation
              const { createImage } = await import("jazz-tools/media");
              const imageDefinition = await createImage(file, {
                owner,
                maxSize: 2048, // Reasonable size for social media
                placeholder: false, // No need for blur placeholder
                progressive: false, // Simple single resolution
              });

              console.log("✅ Jazz ImageDefinition created:", imageDefinition);

              // Create ImageMedia with the ImageDefinition
              if (imageDefinition.original) {
                mediaItem = ImageMedia.create(
                  {
                    type: "image" as const,
                    image: imageDefinition.original, // Use the original FileStream
                    alt: `Image from ${file.name}`,
                  },
                  { owner }
                );
              } else {
                throw new Error("ImageDefinition original is null");
              }

              console.log(
                "✅ Image media created with ImageDefinition:",
                mediaItem
              );
            } catch (imageError) {
              console.error(
                "❌ Failed to create ImageDefinition, falling back to FileStream:",
                imageError
              );
              // Fallback to original method
              const fileStream = await FileStream.createFromBlob(file, {
                owner,
              });
              mediaItem = ImageMedia.create(
                {
                  type: "image" as const,
                  image: fileStream,
                  alt: `Image from ${file.name}`,
                },
                { owner }
              );
            }
          } else {
            console.log("📱 Creating video media for:", file.name);
            // Use the proper async FileStream creation method for video
            const normalizedFile = normalizeVideoFile(file);
            const fileStream = await FileStream.createFromBlob(normalizedFile, {
              owner,
            });

            mediaItem = VideoMedia.create(
              {
                type: "video" as const,
                video: fileStream,
                alt: `Video from ${file.name}`,
              },
              { owner }
            );

            console.log("✅ Video media created:", mediaItem);
          }

          // Add to the current post variant's media array directly
          if (variant.media) {
            // Add the new media item to the collaborative list
            variant.media.push(mediaItem);
          }

          setSuccess(`Successfully uploaded ${file.name}!`);
        }
      } catch (error) {
        setErrors((prev) => [
          ...prev,
          `Failed to upload files: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        ]);
        setSuccess("");
      }
    };

    // Trigger the file dialog
    fileInput.click();
  }, [activeTab, post]);

  return {
    activeTab,
    setActiveTab,
    seriesType,
    setSeriesType,
    title,
    setTitle,
    isEditingTitle,
    setIsEditingTitle,
    replyUrl,
    setReplyUrl,
    postingInterval,
    setPostingInterval,
    showSettings,
    setShowSettings,
    showSaveButton,
    showPublishButton,
    contextText,
    setContextText,
    showAddAccountDialog,
    setShowAddAccountDialog,
    scheduledDate,
    setScheduledDate,
    isScheduling,
    isSaving,
    errors,
    setErrors,
    success,
    setSuccess,
    threadPosts,
    selectedPlatforms,
    showPreviewModal,
    setShowPreviewModal,
    manualThreadMode,
    setManualThreadMode,
    isFetchingReply,
    fetchReplyError,
    isQuoteTweet,
    setIsQuoteTweet,
    post: currentPost,
    setPost,
    hasMultipleAccounts,
    isThread,
    isValidReplyUrl,
    detectedPlatform,
    availableAccounts,
    hasUnsavedChanges,
    handleToggleReplyMode,
    handleSaveContent,
    handlePublishPost,
    handleContentChange,
    handleReplyUrlChange,
    handleTitleSave,
    handleClearSchedule,
    handleScheduleDateChange,
    handleAddAccount,
    handleRemoveAccount,
    getReplyDescription,
    getMultiDescription,
    handlePreview,
    handleImageUpload,
    isExplicitThread,
    isImplicitThread,
    platformAuthErrors,
    showAuthErrorDialog,
    setShowAuthErrorDialog,
    isAlreadyScheduled,
    hasScheduleChange,
  };
}
