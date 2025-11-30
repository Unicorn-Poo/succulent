"use client";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Dialog,
  TextField,
  TextArea,
  Text,
  Tabs,
  Card,
  Button as RadixButton,
  Select,
} from "@radix-ui/themes";
import { Button } from "@/components/atoms/button";
import {
  Plus,
  Users,
  BarChart3,
  Settings,
  MessageCircle,
  Cog,
  Eye,
  List,
  Calendar,
  Copy,
  Check,
  Trash2,
  Square,
  CheckSquare,
  Upload,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
// Legacy accountGroups import removed - using Jazz account groups instead
import { Home } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import AnalyticsDashboard from "@/components/organisms/analytics-dashboard";
import AccountGroupTools from "@/components/organisms/account-group-tools";
import { GelatoSettings } from "@/components/gelato-settings";
import { ProdigiSettings } from "@/components/prodigi-settings";
import { ExternalStoreSettings } from "@/components/external-store-settings";
import { CollaborationSettings } from "@/components/organisms/collaboration-settings";
import AccountLinkingManager from "@/components/organisms/account-linking-manager";
import { co, z } from "jazz-tools";
import {
  Post,
  PostVariant,
  MediaItem,
  ReplyTo,
  PlatformAccount,
  AnalyticsDataPoint,
} from "@/app/schema";
import { PlatformPreview } from "@/components/organisms/platform-previews";
import CalendarView from "@/components/organisms/calendar-view";
import {
  PlatformFeedView,
  PlatformAnalyticsDashboard,
} from "@/components/organisms";
import { getPostStatus } from "@/utils/postValidation";
import { platformLabels } from "@/utils/postConstants";
import CSVPostUpload from "@/components/organisms/csv-post-upload";
import PostViewSelector, {
  PostViewType,
} from "@/components/atoms/post-view-selector";
import {
  PostGridView,
  PostImageView,
  PostSuccinctView,
} from "@/components/organisms/post-views";
import GrowthToolsDropdown from "@/components/organisms/growth-tools-dropdown";
import GrowthQuickAccess from "@/components/organisms/growth-quick-access";
// import SmartTitleInput from "@/components/organisms/smart-title-input";

export default function AccountGroupPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const validTabs = [
        "posts",
        "analytics",
        "tools",
        "accounts",
        "calendar",
        "settings",
      ];
      if (validTabs.includes(hash)) {
        return hash;
      }
    }
    return "posts";
  });

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    window.location.hash = newTab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = [
        "posts",
        "analytics",
        "tools",
        "accounts",
        "calendar",
        "settings",
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const [showCollaborationSettings, setShowCollaborationSettings] =
    useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostText, setNewPostText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewAccount, setPreviewAccount] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"feed" | "profile">("feed");
  const [postsFilter, setPostsFilter] = useState<
    "all" | "draft" | "scheduled" | "published"
  >("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [copiedAccountGroupId, setCopiedAccountGroupId] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [postView, setPostView] = useState<PostViewType>("grid");
  const [selectedGrowthTool, setSelectedGrowthTool] = useState<string | null>(
    null
  );

  const accountGroupId = params.groupId as string;

  // Use minimal resolve - x is local-first, so we only need to specify what to eagerly load
  // The rest will be loaded on-demand from local cache
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: {
          $each: {
            accounts: { $each: true },
            posts: {
              $each: {
                title: true,
                variants: {
                  $each: {
                    text: true,
                    media: { $each: true },
                  },
                },
              },
            },
            // CRITICAL: Load brand persona for AI content generation
            brandPersona: {
              personality: { $each: true },
              contentPillars: { $each: true },
              keyMessages: { $each: true },
              avoidTopics: { $each: true },
              samplePosts: { $each: true },
            },
            // NOTE: postQueue, automationLogs, contentFeedback are optional
            // They're initialized on-demand in growth-autopilot.tsx when accessed
            // Don't request them in resolve to avoid errors on older account groups
          },
        },
      },
    },
  });

  // Legacy accountGroups removed - using Jazz account groups only
  const jazzAccountGroup = me?.root?.accountGroups?.find(
    (group: any, index: number) => {
      if (!group) return false;

      if (group.id === accountGroupId) return true;
      if (accountGroupId === "demo") return index === 0;

      if (accountGroupId.startsWith("group-")) {
        const groupIndex = parseInt(accountGroupId.replace("group-", ""));
        return index === groupIndex;
      }

      if (group?.name) {
        const safeName = group.name
          .toString()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        return safeName === accountGroupId;
      }

      return false;
    }
  );

  const accountGroup = jazzAccountGroup;

  if (!accountGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Account Group Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The account group you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const safeArrayAccess = (collaborativeArray: any): any[] => {
    try {
      if (!collaborativeArray) {
        return [];
      }

      if (Array.isArray(collaborativeArray)) {
        return collaborativeArray.filter((item) => item != null);
      }

      const array = Array.from(collaborativeArray || []);
      return array.filter((item) => item != null);
    } catch (error) {
      console.error("🚨 Jazz collaborative array is corrupted:", error);
      return [];
    }
  };

  const getAccountsArray = () => {
    if (jazzAccountGroup) {
      return safeArrayAccess(jazzAccountGroup.accounts);
    }
    return [];
  };

  const getPostsArray = () => {
    let postsArray: any[] = [];
    if (jazzAccountGroup) {
      postsArray = safeArrayAccess(jazzAccountGroup.posts);
    }

    // Filter out corrupted/unavailable posts before sorting
    // This prevents page crashes when a post has invalid Jazz references
    postsArray = postsArray.filter((post: any, index: number) => {
      try {
        // Check if the post exists and has variants
        if (!post) {
          console.warn(`⚠️ Skipping null post at index ${index}`);
          return false;
        }
        if (!post.variants) {
          console.warn(
            `⚠️ Skipping post without variants at index ${index}:`,
            post.id
          );
          return false;
        }
        // Try to access base variant to verify it's loadable
        const baseVariant = post.variants.base;
        if (!baseVariant) {
          console.warn(
            `⚠️ Skipping post without base variant at index ${index}:`,
            post.id
          );
          return false;
        }
        // Try to access text to ensure the variant is fully loaded
        const text = baseVariant.text;
        if (text === undefined) {
          console.warn(
            `⚠️ Skipping post with unavailable text at index ${index}:`,
            post.id
          );
          return false;
        }
        return true;
      } catch (e) {
        console.warn(
          `⚠️ Skipping corrupted post at index ${index}:`,
          post?.id,
          e
        );
        return false;
      }
    });

    // Sort by newest first - prioritize publishedAt, then scheduledFor, then createdAt/postDate
    return [...postsArray].sort((a: any, b: any) => {
      const getPostDate = (post: any) => {
        // Check all variants for publishedAt (most recent activity)
        if (post.variants) {
          for (const variant of Object.values(post.variants)) {
            const v = variant as any;
            if (v?.publishedAt) return new Date(v.publishedAt).getTime();
          }
          for (const variant of Object.values(post.variants)) {
            const v = variant as any;
            if (v?.scheduledFor) return new Date(v.scheduledFor).getTime();
          }
          for (const variant of Object.values(post.variants)) {
            const v = variant as any;
            if (v?.postDate) return new Date(v.postDate).getTime();
          }
        }
        // Fallback to top-level dates
        if (post.publishedAt) return new Date(post.publishedAt).getTime();
        if (post.scheduledFor) return new Date(post.scheduledFor).getTime();
        if (post.createdAt) return new Date(post.createdAt).getTime();
        return 0; // Put undated posts at the end
      };
      return getPostDate(b) - getPostDate(a); // Newest first (descending)
    });
  };

  const accounts = getAccountsArray();
  const posts = getPostsArray();

  // Transform accounts to the format expected by analytics components
  const transformedAccounts = accounts.map((account: any) => ({
    id: account.id || account._id || Math.random().toString(),
    name: account.name || account.displayName || "Unnamed Account",
    platform: account.platform || "unknown",
    profileKey: account.profileKey,
    isLinked: account.isLinked || false,
    status: account.status || "pending",
  }));

  // Extract connected platforms for post views
  const connectedPlatforms = accounts
    .filter((acc: any) => acc.isLinked)
    .map((acc: any) => acc.platform)
    .filter((platform: string) => platform && platform !== "unknown");

  const handleCreatePost = () => {
    if (!newPostTitle.trim()) return;

    if (jazzAccountGroup) {
      // Create a proper Jazz Post for collaborative account groups

      // Create the collaborative objects with the correct syntax
      const titleText = co
        .plainText()
        .create(newPostTitle, { owner: jazzAccountGroup._owner });
      const baseText = co
        .plainText()
        .create(newPostText || "", { owner: jazzAccountGroup._owner });
      const mediaList = co
        .list(MediaItem)
        .create([], { owner: jazzAccountGroup._owner });
      const replyToObj = ReplyTo.create({}, { owner: jazzAccountGroup._owner });

      // Create the base post variant
      const baseVariant = PostVariant.create(
        {
          text: baseText,
          postDate: new Date(),
          media: mediaList,
          replyTo: replyToObj,
          status: "draft",
          scheduledFor: undefined,
          publishedAt: undefined,
          edited: false,
          lastModified: undefined,
          platformOptions: undefined,
        },
        { owner: jazzAccountGroup._owner }
      );

      // Create the variants record
      const variantsRecord = co.record(z.string(), PostVariant).create(
        {
          base: baseVariant,
        },
        { owner: jazzAccountGroup._owner }
      );

      // Create the post
      const newPost = Post.create(
        {
          title: titleText,
          variants: variantsRecord,
        },
        { owner: jazzAccountGroup._owner }
      );

      // Add the post to the account group
      jazzAccountGroup.posts.push(newPost);

      // Navigate to the newly created post
      router.push(`/account-group/${accountGroup.id}/post/${newPost.id}`);
    } else {
      // For legacy account groups, use the old approach
      const newPostId = Date.now().toString();
      router.push(
        `/account-group/${
          accountGroup.id
        }/post/${newPostId}?title=${encodeURIComponent(
          newPostTitle
        )}&content=${encodeURIComponent(newPostText)}`
      );
    }

    // Reset form
    setNewPostTitle("");
    setNewPostText("");
    setShowCreateDialog(false);
  };

  const handleToolUsed = (tool: string, result: any) => {
    // You can add specific handling for different tools here
  };

  // Handle post selection
  const handlePostSelect = (postId: string, selected: boolean) => {
    const newSelection = new Set(selectedPosts);
    if (selected) {
      newSelection.add(postId);
    } else {
      newSelection.delete(postId);
    }
    setSelectedPosts(newSelection);
  };

  // Helper function to check if post matches platform filter
  const postMatchesPlatformFilter = (post: any) => {
    if (platformFilter === "all") return true;

    const variantPlatforms = post.variants
      ? Object.keys(post.variants).filter((key: string) => key !== "base")
      : [];
    const postPlatforms =
      variantPlatforms.length > 0 ? variantPlatforms : connectedPlatforms;

    if (platformFilter === "none") {
      return postPlatforms.length === 0;
    }

    return postPlatforms.includes(platformFilter);
  };

  // Select all filtered posts
  const handleSelectAll = () => {
    const filteredPosts = posts.filter((post) => {
      // Status filter
      if (postsFilter !== "all") {
        const postStatus = getPostStatus(post);
        if (postStatus !== postsFilter) return false;
      }
      // Platform filter
      if (!postMatchesPlatformFilter(post)) return false;
      return true;
    });
    const allIds = new Set(
      filteredPosts.map(
        (post: any) => post.id || post.variants?.base?.id || "unknown"
      )
    );
    setSelectedPosts(allIds);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedPosts(new Set());
  };

  // Handle bulk deletion
  const handleBulkDelete = async () => {
    if (!jazzAccountGroup || selectedPosts.size === 0) return;

    setIsBulkDeleting(true);
    try {
      // Remove selected posts from the account group's posts array
      const postsArray = jazzAccountGroup.posts;
      if (postsArray) {
        // Get posts to delete by their IDs
        const postsToDelete = Array.from(selectedPosts);

        // Remove posts in reverse order to avoid index shifting issues
        for (let i = postsArray.length - 1; i >= 0; i--) {
          const post = postsArray[i];
          if (post && postsToDelete.includes(post.id)) {
            postsArray.splice(i, 1);
          }
        }

        console.log(`✅ Successfully deleted ${selectedPosts.size} posts`);

        // Clear selection
        setSelectedPosts(new Set());
        setShowBulkDeleteDialog(false);
      }
    } catch (error) {
      console.error("❌ Failed to delete posts:", error);
      alert("Failed to delete posts. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Handle CSV upload completion
  const handleCSVUploadComplete = (results: any) => {
    if (results.success) {
      console.log(`✅ CSV upload completed: ${results.created} posts created`);
      // The posts will automatically appear due to Jazz reactivity
      setShowCSVUpload(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:h-16 gap-3 sm:gap-0">
            <div className="flex items-center">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground mr-3 sm:mr-4 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Home className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
                  {accountGroup.name || "Account Group"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground">
                  {accounts.length} account{accounts.length !== 1 ? "s" : ""} •{" "}
                  {posts.length} post{posts.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <GrowthQuickAccess
                platform={
                  accounts.find((acc) => acc.isLinked)?.platform || "instagram"
                }
                profileKey={
                  (jazzAccountGroup as any)?.ayrshareProfileKey ||
                  (accountGroup as any)?.ayrshareProfileKey
                }
                accountGroup={jazzAccountGroup}
                onToolSelect={(toolId) => {
                  if (toolId === "tools-overview") {
                    handleTabChange("tools");
                  } else {
                    setSelectedGrowthTool(toolId);
                    handleTabChange("tools");
                  }
                }}
              />
              <Button
                onClick={async () => {
                  if (!jazzAccountGroup?.id) return;
                  try {
                    const response = await fetch("/api/sync-post-status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        accountGroupId: jazzAccountGroup.id,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(
                        `✅ Synced ${
                          result.updated || 0
                        } post statuses from Ayrshare`
                      );
                    } else {
                      alert(
                        `⚠️ Sync failed: ${result.error || "Unknown error"}`
                      );
                    }
                  } catch (error) {
                    console.error("❌ Failed to sync post statuses:", error);
                    alert("❌ Failed to sync post statuses");
                  }
                }}
                intent="secondary"
                variant="soft"
                className="text-xs"
                title="Sync post statuses from Ayrshare"
              >
                <Calendar className="w-4 h-4 mr-1" />
                Sync Status
              </Button>
              <Button
                onClick={() => {
                  setShowCSVUpload(true);
                }}
                intent="secondary"
                variant="outline"
                className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                intent="primary"
                variant="solid"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs.List className="min-w-max">
              <Tabs.Trigger value="posts" className="min-h-[44px]">
                <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Posts</span>
                <span className="sm:hidden">Posts</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="analytics" className="min-h-[44px]">
                <BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="tools" className="min-h-[44px]">
                <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Enhanced Tools</span>
                <span className="sm:hidden">Tools</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="accounts" className="min-h-[44px]">
                <Users className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Accounts</span>
                <span className="sm:hidden">Accts</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="calendar" className="min-h-[44px]">
                <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Calendar</span>
                <span className="sm:hidden">Cal</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="settings" className="min-h-[44px]">
                <Cog className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">Set</span>
              </Tabs.Trigger>
            </Tabs.List>
          </div>

          {/* Settings Tab - Delete Account Group */}
          <Tabs.Content value="settings" className="mt-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Account Group Settings
              </h2>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-medium text-red-600 mb-2">
                  Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting this account group will permanently remove all posts,
                  accounts, and settings associated with it. This action cannot
                  be undone.
                </p>
                <Button
                  onClick={async () => {
                    if (
                      !confirm(
                        `Are you sure you want to delete "${
                          accountGroup.name || "this account group"
                        }"? This will delete all ${
                          posts.length
                        } posts and cannot be undone.`
                      )
                    ) {
                      return;
                    }

                    if (!jazzAccountGroup || !me?.root?.accountGroups) {
                      alert(
                        "Cannot delete account group. Please refresh and try again."
                      );
                      return;
                    }

                    try {
                      // Find and remove the account group from root
                      const groupIndex = me.root.accountGroups.findIndex(
                        (g: any) => g?.id === jazzAccountGroup.id
                      );
                      if (groupIndex >= 0) {
                        me.root.accountGroups.splice(groupIndex, 1);
                        // Navigate back to home
                        router.push("/");
                      } else {
                        alert(
                          "Account group not found. It may have already been deleted."
                        );
                      }
                    } catch (error) {
                      console.error(
                        "❌ Failed to delete account group:",
                        error
                      );
                      alert(
                        "Failed to delete account group. Please try again."
                      );
                    }
                  }}
                  intent="danger"
                  variant="solid"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account Group
                </Button>
              </div>
            </div>
          </Tabs.Content>

          {/* Posts Tab */}
          <Tabs.Content value="posts" className="mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <p className="text-lg mb-2">No posts yet</p>
                  <p className="text-sm">
                    Create your first post to get started!
                  </p>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  intent="primary"
                  variant="solid"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Post
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Posts Header with Filters and View Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                      Posts
                    </h2>
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground">
                      {(() => {
                        const filterCounts = {
                          all: posts.length,
                          draft: posts.filter(
                            (p) => getPostStatus(p) === "draft"
                          ).length,
                          scheduled: posts.filter(
                            (p) => getPostStatus(p) === "scheduled"
                          ).length,
                          published: posts.filter(
                            (p) => getPostStatus(p) === "published"
                          ).length,
                        };
                        return `${filterCounts[postsFilter]} ${
                          postsFilter === "all" ? "total" : postsFilter
                        } post${filterCounts[postsFilter] !== 1 ? "s" : ""}`;
                      })()}
                    </div>
                  </div>

                  {/* Filter Controls and View Selector */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* Filter Controls */}
                    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                      {[
                        { key: "all", label: "All", icon: List },
                        { key: "draft", label: "Drafts", icon: MessageCircle },
                        {
                          key: "scheduled",
                          label: "Scheduled",
                          icon: Calendar,
                        },
                        { key: "published", label: "Published", icon: Eye },
                      ].map(({ key, label, icon: Icon }) => (
                        <Button
                          key={key}
                          variant={postsFilter === key ? "solid" : "outline"}
                          intent={postsFilter === key ? "primary" : "secondary"}
                          size="1"
                          onClick={() => setPostsFilter(key as any)}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {label}
                        </Button>
                      ))}
                    </div>

                    {/* Platform Filter */}
                    <Select.Root
                      value={platformFilter}
                      onValueChange={setPlatformFilter}
                    >
                      <Select.Trigger placeholder="All Platforms" />
                      <Select.Content>
                        <Select.Item value="all">All Platforms</Select.Item>
                        <Select.Item value="none">No Platform</Select.Item>
                        <Select.Separator />
                        {connectedPlatforms.map((platform) => (
                          <Select.Item key={platform} value={platform}>
                            {platformLabels[
                              platform as keyof typeof platformLabels
                            ] || platform}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>

                    {/* View Selector */}
                    <PostViewSelector
                      currentView={postView}
                      onViewChange={setPostView}
                    />
                  </div>
                </div>

                {/* Bulk Selection Controls */}
                {selectedPosts.size > 0 && (
                  <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-lime-600" />
                        <span className="text-sm font-medium text-lime-800">
                          {selectedPosts.size} post
                          {selectedPosts.size !== 1 ? "s" : ""} selected
                        </span>
                      </div>
                      <Button
                        size="1"
                        variant="soft"
                        intent="secondary"
                        onClick={handleClearSelection}
                      >
                        Clear Selection
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="1"
                        variant="soft"
                        intent="secondary"
                        onClick={handleSelectAll}
                      >
                        Select All Visible
                      </Button>
                      <Button
                        size="1"
                        variant="solid"
                        intent="danger"
                        onClick={() => setShowBulkDeleteDialog(true)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                )}

                {/* Posts Views */}
                {postView === "grid" && (
                  <PostGridView
                    posts={posts}
                    accountGroupId={accountGroup.id}
                    accountGroupName={accountGroup.name || "Account Group"}
                    postsFilter={postsFilter}
                    platformFilter={platformFilter}
                    selectedPosts={selectedPosts}
                    onPostSelect={handlePostSelect}
                    connectedPlatforms={connectedPlatforms}
                  />
                )}

                {postView === "image" && (
                  <PostImageView
                    posts={posts}
                    accountGroupId={accountGroup.id}
                    accountGroupName={accountGroup.name || "Account Group"}
                    postsFilter={postsFilter}
                    platformFilter={platformFilter}
                    selectedPosts={selectedPosts}
                    onPostSelect={handlePostSelect}
                    connectedPlatforms={connectedPlatforms}
                  />
                )}

                {postView === "succinct" && (
                  <PostSuccinctView
                    posts={posts}
                    accountGroupId={accountGroup.id}
                    accountGroupName={accountGroup.name || "Account Group"}
                    postsFilter={postsFilter}
                    platformFilter={platformFilter}
                    selectedPosts={selectedPosts}
                    onPostSelect={handlePostSelect}
                    onSelectAll={handleSelectAll}
                    connectedPlatforms={connectedPlatforms}
                  />
                )}

                {/* Empty state for filtered results */}
                {posts.filter((post) => {
                  // Status filter
                  if (postsFilter !== "all") {
                    const postStatus = getPostStatus(post);
                    if (postStatus !== postsFilter) return false;
                  }
                  // Platform filter
                  if (!postMatchesPlatformFilter(post)) return false;
                  return true;
                }).length === 0 &&
                  (postsFilter !== "all" || platformFilter !== "all") && (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-2">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                      </div>
                      <p className="text-muted-foreground">
                        No {postsFilter !== "all" ? postsFilter : ""} posts
                        found
                        {platformFilter !== "all" &&
                          platformFilter !== "none" &&
                          ` for ${
                            platformLabels[
                              platformFilter as keyof typeof platformLabels
                            ] || platformFilter
                          }`}
                        {platformFilter === "none" && " without a platform"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {postsFilter === "draft" &&
                          "Create a new post to get started"}
                        {postsFilter === "scheduled" &&
                          "Schedule some posts for future publishing"}
                        {postsFilter === "published" &&
                          "Publish some posts to see them here"}
                      </p>
                    </div>
                  )}
              </div>
            )}
          </Tabs.Content>

          {/* Analytics Tab */}
          <Tabs.Content value="analytics" className="mt-6">
            {(() => {
              const linkedAccounts = transformedAccounts.filter(
                (account) => account.isLinked
              );
              const supportedPlatforms = linkedAccounts
                .map((account) => account.platform)
                .filter((platform) =>
                  [
                    "instagram",
                    "x",
                    "twitter",
                    "linkedin",
                    "facebook",
                    "youtube",
                    "tiktok",
                  ].includes(platform)
                );

              if (linkedAccounts.length === 0) {
                return (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <Text size="4" weight="medium" className="mb-2 block">
                      No Connected Accounts
                    </Text>
                    <Text size="2" color="gray" className="mb-6 block">
                      Connect your social media accounts to start viewing
                      analytics data.
                    </Text>
                    <RadixButton
                      onClick={() =>
                        window.open(
                          "https://app.ayrshare.com/social-accounts",
                          "_blank"
                        )
                      }
                    >
                      Connect Accounts
                    </RadixButton>
                  </div>
                );
              }

              if (supportedPlatforms.length === 0) {
                return (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <Text size="4" weight="medium" className="mb-2 block">
                      Unsupported Platforms
                    </Text>
                    <Text size="2" color="gray" className="mb-6 block">
                      Analytics are available for Instagram, X (Twitter),
                      LinkedIn, Facebook, YouTube, and TikTok.
                    </Text>
                    <Text size="2" color="gray" className="block">
                      Connected platforms:{" "}
                      {linkedAccounts.map((a) => a.platform).join(", ")}
                    </Text>
                  </div>
                );
              }

              return (
                <AnalyticsDashboard
                  accountGroup={jazzAccountGroup || accountGroup}
                  selectedPlatforms={supportedPlatforms}
                  timeframe="30d"
                />
              );
            })()}
          </Tabs.Content>

          {/* Enhanced Tools Tab */}
          <Tabs.Content value="tools" className="mt-6">
            <div className="space-y-8">
              {/* Growth Tools Section */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Growth Automation Tools
                  </h2>
                </div>
                <GrowthToolsDropdown
                  platform={
                    accounts.find((acc) => acc.isLinked)?.platform ||
                    "instagram"
                  }
                  profileKey={
                    (jazzAccountGroup as any)?.ayrshareProfileKey ||
                    (accountGroup as any)?.ayrshareProfileKey
                  }
                  accountGroup={jazzAccountGroup}
                  selectedTool={selectedGrowthTool}
                  onToolSelect={setSelectedGrowthTool}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-border"></div>

              {/* Original Tools Section */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold text-foreground">
                    Account Management Tools
                  </h2>
                </div>
                <AccountGroupTools
                  accounts={transformedAccounts}
                  accountGroupId={accountGroup.id}
                  accountGroup={jazzAccountGroup}
                  onToolUsed={handleToolUsed}
                />
              </div>
            </div>
          </Tabs.Content>

          {/* Accounts Tab */}
          <Tabs.Content value="accounts" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Text size="5" weight="bold">
                  Connected Accounts
                </Text>
                <Button
                  onClick={() =>
                    window.open(
                      "https://app.ayrshare.com/social-accounts",
                      "_blank"
                    )
                  }
                  intent="success"
                  variant="solid"
                >
                  Link More Accounts
                </Button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <Text size="4" weight="medium" className="mb-2 block">
                    No Accounts Connected
                  </Text>
                  <Text size="2" color="gray" className="mb-6 block">
                    Connect your social media accounts to start posting and
                    managing content.
                  </Text>
                  <Button
                    onClick={() =>
                      window.open(
                        "https://app.ayrshare.com/social-accounts",
                        "_blank"
                      )
                    }
                    intent="success"
                    variant="solid"
                  >
                    Connect Accounts
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account: any) => (
                    <div
                      key={account.id || account._id}
                      className="bg-card rounded-lg p-6 border border-border"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-lime-100 rounded-lg flex items-center justify-center">
                          <Text size="2" weight="bold">
                            {account.platform?.charAt(0).toUpperCase()}
                          </Text>
                        </div>
                        <div>
                          <Text size="3" weight="medium" className="block">
                            {account.name}
                          </Text>
                          <Text size="2" color="gray">
                            {account.platform}
                          </Text>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            account.isLinked
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                          }`}
                        />
                        <Text
                          size="2"
                          color={account.isLinked ? "green" : "gray"}
                        >
                          {account.isLinked ? "Connected" : "Not Connected"}
                        </Text>
                      </div>

                      {/* Preview Buttons */}
                      {account.isLinked && (
                        <div className="flex gap-2">
                          <Button
                            size="1"
                            variant="soft"
                            className="flex-1"
                            onClick={() => {
                              setPreviewAccount(account);
                              setPreviewMode("feed");
                              setShowPreview(true);
                            }}
                          >
                            <List className="w-3 h-3 mr-1" />
                            Feed
                          </Button>
                          <Button
                            size="1"
                            variant="soft"
                            className="flex-1"
                            onClick={() => {
                              setPreviewAccount(account);
                              setPreviewMode("profile");
                              setShowPreview(true);
                            }}
                          >
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Analytics
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Calendar Tab */}
          <Tabs.Content value="calendar" className="mt-6">
            <CalendarView posts={posts} accountGroupId={accountGroup.id} />
          </Tabs.Content>

          {/* Settings Tab */}
          <Tabs.Content value="settings" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Cog className="w-5 h-5 text-muted-foreground" />
                  <Text size="5" weight="bold">
                    Account Group Settings
                  </Text>
                </div>

                {/* Copy Account Group ID */}
                <div className="flex items-center gap-3">
                  {/* Jazz ID Display (for reference) */}
                  {jazzAccountGroup && (
                    <div className="text-xs text-muted-foreground font-mono">
                      Jazz ID: {jazzAccountGroup.id}
                    </div>
                  )}

                  {/* API ID Copy Button */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={async () => {
                      try {
                        // Copy the URL-friendly ID (this is what API expects)
                        await navigator.clipboard.writeText(accountGroupId);
                        setCopiedAccountGroupId(true);
                        setTimeout(() => setCopiedAccountGroupId(false), 2000);
                      } catch (err) {
                        console.error("Failed to copy account group ID:", err);
                      }
                    }}
                    title="Click to copy the API-friendly Account Group ID"
                  >
                    <Text size="1" className="font-mono text-muted-foreground">
                      API ID: {accountGroupId}
                    </Text>
                    {copiedAccountGroupId ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Account Linking Management */}
              {jazzAccountGroup && (
                <AccountLinkingManager
                  accountGroup={jazzAccountGroup}
                  onAccountsUpdated={(updatedAccounts) => {
                    // Simple approach: only add new accounts that don't already exist
                    if (jazzAccountGroup.accounts) {
                      try {
                        const currentAccounts = safeArrayAccess(
                          jazzAccountGroup.accounts
                        );
                        const existingPlatforms = new Set(
                          currentAccounts
                            .map((acc: any) => acc?.platform)
                            .filter(Boolean)
                        );

                        // Only add truly new accounts to avoid infinite loops
                        updatedAccounts.forEach((account) => {
                          if (
                            !existingPlatforms.has(account.platform) &&
                            account.autoCreated
                          ) {
                            // Create and add only new auto-created accounts
                            const newAccount = PlatformAccount.create(
                              {
                                name: account.name,
                                platform: account.platform,
                                apiUrl: undefined,
                                profileKey: account.profileKey,
                                isLinked: account.isLinked,
                                linkedAt: account.linkedAt,
                                username: account.username,
                                displayName: account.displayName,
                                avatar: account.avatar,
                                url: account.url,
                                status: account.status,
                                lastError: undefined,
                                historicalAnalytics: co
                                  .list(AnalyticsDataPoint)
                                  .create([], {
                                    owner: jazzAccountGroup._owner,
                                  }),
                              },
                              { owner: jazzAccountGroup._owner }
                            );

                            jazzAccountGroup.accounts.push(newAccount);
                          } else if (existingPlatforms.has(account.platform)) {
                            // Update existing accounts in place
                            const existingAccount = currentAccounts.find(
                              (acc: any) => acc?.platform === account.platform
                            );
                            if (existingAccount) {
                              existingAccount.isLinked = account.isLinked;
                              existingAccount.status = account.status;
                              if (account.linkedAt)
                                existingAccount.linkedAt = account.linkedAt;
                              if (account.username)
                                existingAccount.username = account.username;
                              if (account.displayName)
                                existingAccount.displayName =
                                  account.displayName;
                              if (account.avatar)
                                existingAccount.avatar = account.avatar;
                              if (account.url)
                                existingAccount.url = account.url;
                            }
                          }
                        });
                      } catch (error) {
                        // Don't reload page, just log error
                      }
                    }
                  }}
                />
              )}

              {/* Collaboration Settings */}
              {jazzAccountGroup && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Text size="4" weight="bold" className="mb-2 block">
                        Team Collaboration
                      </Text>
                      <Text size="2" color="gray">
                        Invite team members to collaborate on this account group
                      </Text>
                    </div>
                    <Button
                      onClick={() => setShowCollaborationSettings(true)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Manage Team
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <Text size="2" weight="medium" className="block mb-1">
                        Members
                      </Text>
                      <Text size="1" color="gray">
                        3 collaborators
                      </Text>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <Text size="2" weight="medium" className="block mb-1">
                        Pending Invites
                      </Text>
                      <Text size="1" color="gray">
                        1 invitation sent
                      </Text>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <Text size="2" weight="medium" className="block mb-1">
                        Role
                      </Text>
                      <Text size="1" color="gray">
                        Owner
                      </Text>
                    </div>
                  </div>
                </Card>
              )}

              {/* Gelato Integration */}
              {jazzAccountGroup && (
                <GelatoSettings accountGroup={jazzAccountGroup as any} />
              )}

              {/* Prodigi Integration */}
              {jazzAccountGroup && (
                <ProdigiSettings accountGroup={jazzAccountGroup as any} />
              )}

              {/* External Store Integration */}
              {jazzAccountGroup && (
                <ExternalStoreSettings accountGroup={jazzAccountGroup as any} />
              )}

              {/* Future settings can be added here */}
              {!jazzAccountGroup && (
                <div className="text-center py-12">
                  <Text size="4" weight="medium" className="mb-2 block">
                    Settings Not Available
                  </Text>
                  <Text size="2" color="gray" className="mb-6 block">
                    Settings are only available for collaborative account groups
                    created with Jazz.
                  </Text>
                </div>
              )}
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {/* Create Post Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Create New Post</Dialog.Title>
          <Dialog.Description>
            Create a new post for your social media accounts
          </Dialog.Description>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Post Title
              </label>
              <TextField.Root
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Enter post title..."
              />
            </div>
            {/* <div>
								<label className="block text-sm font-medium text-foreground mb-2">Post Title</label>
								<SmartTitleInput
									value={newPostTitle}
									onChange={setNewPostTitle}
									posts={posts}
									placeholder="Enter post title..."
								/>
							</div> */}

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Content
              </label>
              <TextArea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="soft" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePost}
              className="bg-lime-600 hover:bg-lime-700 text-white"
            >
              Create Post
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Preview Modal */}
      <Dialog.Root open={showPreview} onOpenChange={setShowPreview}>
        <Dialog.Content
          style={{
            maxWidth: previewMode === "feed" ? 600 : 800,
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Dialog.Title>
            {previewAccount?.name} -{" "}
            {previewMode === "feed" ? "Feed" : "Analytics"} View
          </Dialog.Title>

          {previewAccount && (
            <div className="mt-4">
              {previewMode === "feed" ? (
                <PlatformFeedView
                  account={{
                    id: previewAccount.id,
                    name: previewAccount.name,
                    platform: previewAccount.platform,
                    profileKey: previewAccount.profileKey,
                    isLinked: previewAccount.isLinked,
                  }}
                  localPosts={posts.filter((post) => {
                    // Filter posts for this specific platform
                    if (post.platforms && Array.isArray(post.platforms)) {
                      return post.platforms.includes(previewAccount.platform);
                    }
                    return true; // Include all posts if no platform filter
                  })}
                  accountGroupId={accountGroup.id}
                  jazzAccountGroup={jazzAccountGroup} // Pass Jazz AccountGroup for real database access
                  onCreatePost={(platform) => {
                    setShowPreview(false);
                    setShowCreateDialog(true);
                  }}
                />
              ) : (
                <PlatformAnalyticsDashboard
                  account={{
                    id: previewAccount.id,
                    name: previewAccount.name,
                    platform: previewAccount.platform,
                    profileKey: previewAccount.profileKey,
                    isLinked: previewAccount.isLinked,
                  }}
                  accountGroupId={accountGroup.id}
                  jazzAccountGroup={jazzAccountGroup} // Pass Jazz AccountGroup for real database access
                />
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              onClick={() =>
                setPreviewMode(previewMode === "feed" ? "profile" : "feed")
              }
            >
              Switch to {previewMode === "feed" ? "Analytics" : "Feed"} View
            </Button>
            <Button variant="soft" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog.Root
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <Dialog.Content style={{ maxWidth: 500 }}>
          <Dialog.Title>Delete Selected Posts</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to delete {selectedPosts.size} post
            {selectedPosts.size !== 1 ? "s" : ""}? This action cannot be undone.
          </Dialog.Description>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="soft"
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete {selectedPosts.size} Post
                  {selectedPosts.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* CSV Upload Dialog */}
      <CSVPostUpload
        isOpen={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        accountGroupId={accountGroup.id}
        accountGroup={jazzAccountGroup || null}
        onUploadComplete={handleCSVUploadComplete}
      />

      {/* Collaboration Settings Dialog */}
      {showCollaborationSettings && jazzAccountGroup && (
        <CollaborationSettings
          accountGroup={jazzAccountGroup as any}
          onClose={() => setShowCollaborationSettings(false)}
        />
      )}
    </div>
  );
}
