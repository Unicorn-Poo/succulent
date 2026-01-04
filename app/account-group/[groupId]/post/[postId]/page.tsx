"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
// Legacy accountGroups import removed - using Jazz account groups instead
import PostCreationComponent from "@/components/organisms/post-creation";
import { PostFullyLoaded } from "@/app/schema";
import { Button } from "@radix-ui/themes";
import { Home, Users, ArrowLeft } from "lucide-react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountGroupId = params.groupId as string;
  const postId = params.postId as string;
  const listQuery = searchParams.toString();
  const listHref = `/account-group/${accountGroupId}${
    listQuery ? `?${listQuery}` : ""
  }`;
  const [serverPost, setServerPost] = useState<any | null>(null);
  const [serverPostLoading, setServerPostLoading] = useState(false);
  const [serverPostError, setServerPostError] = useState<string | null>(null);

  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: {
          $each: {
            accounts: { $each: true },
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
        },
      },
    },
  });

  // Legacy accountGroups removed - using Jazz account groups only
  const jazzAccountGroup = me?.root?.accountGroups?.find(
    (group: any, index: number) => {
      if (!group) return false;

      const groupId = params.groupId as string;

      if (group.id === groupId) return true;
      if (groupId === "demo") return index === 0;

      if (groupId.startsWith("group-")) {
        const groupIndex = parseInt(groupId.replace("group-", ""));
        return index === groupIndex;
      }

      if (group?.name) {
        const safeName = group.name
          .toString()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        return safeName === groupId;
      }

      return false;
    }
  );

  const accountGroup = jazzAccountGroup;

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

  const getPostsArray = () => {
    if (jazzAccountGroup) {
      return safeArrayAccess(jazzAccountGroup.posts);
    }
    return [];
  };

  const posts = getPostsArray();
  const post = posts.find((post: any) => {
    const currentPostId =
      post.id ||
      post.postId ||
      post.variants?.base?.id ||
      post.variants?.base?.postId;
    return currentPostId === postId;
  });

  useEffect(() => {
    if (post || !accountGroupId || !postId) return;
    let isActive = true;
    const fetchServerPost = async () => {
      setServerPostLoading(true);
      setServerPostError(null);
      try {
        const response = await fetch(
          `/api/posts/list?accountGroupId=${accountGroupId}&limit=200`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch posts (${response.status})`);
        }
        const payload = await response.json();
        const list = Array.isArray(payload?.data?.posts)
          ? payload.data.posts
          : [];
        const match = list.find((item: any) => item?.id === postId);
        if (isActive) {
          setServerPost(match || null);
        }
      } catch (error) {
        if (isActive) {
          setServerPostError(
            error instanceof Error ? error.message : "Failed to fetch post"
          );
        }
      } finally {
        if (isActive) {
          setServerPostLoading(false);
        }
      }
    };

    fetchServerPost();
    return () => {
      isActive = false;
    };
  }, [accountGroupId, post, postId]);

  const serverMedia = useMemo(() => {
    if (!serverPost?.media || !Array.isArray(serverPost.media)) return [];
    return serverPost.media;
  }, [serverPost]);

  if (!accountGroup?.id && !serverPost) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Account Group Not Found
          </h2>
          <p className="text-muted-foreground mb-4">
            The account group you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button onClick={() => router.push("/")}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    if (serverPostLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Loading Post…</h2>
            <p className="text-muted-foreground mb-4">
              Fetching the latest data from the server.
            </p>
          </div>
        </div>
      );
    }

    if (serverPost) {
      const displayTitle = serverPost.title || "Untitled Post";
      const displayContent = serverPost.content || "";
      const displayStatus = serverPost.status || "draft";
      const displayDate =
        serverPost.scheduledFor ||
        serverPost.publishedAt ||
        serverPost.postDate ||
        serverPost.createdAt;
      return (
        <div className="w-full max-w-4xl mx-auto p-6">
          <div className="mb-6">
            <Button
              variant="soft"
              onClick={() => router.push(listHref)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Account Group
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {displayTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Status: {displayStatus}
                {displayDate ? ` • ${new Date(displayDate).toLocaleString()}` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                This post is visible from the server but hasn&apos;t synced to
                your local store yet.
              </p>
            </div>
            {displayContent && (
              <div className="whitespace-pre-line text-foreground">
                {displayContent}
              </div>
            )}
            {serverMedia.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {serverMedia.map((item: any, index: number) => {
                  const isVideo =
                    item?.type === "url-video" ||
                    typeof item?.url === "string" &&
                      item.url.match(/\.(mp4|mov|m4v|webm)(\?|#|$)/i);
                  if (isVideo) {
                    return (
                      <video
                        key={`${item?.url || index}`}
                        src={item?.url}
                        controls
                        className="w-full rounded-md bg-black"
                      />
                    );
                  }
                  return (
                    <img
                      key={`${item?.url || index}`}
                      src={item?.url}
                      alt={item?.alt || "Post media"}
                      className="w-full rounded-md object-cover"
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Post Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The post you&apos;re looking for doesn&apos;t exist in{" "}
            {accountGroup.name}.
          </p>
          {serverPostError && (
            <p className="text-sm text-red-600 mb-2">{serverPostError}</p>
          )}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {jazzAccountGroup
                ? "📍 Jazz Collaborative Group"
                : "📍 Demo Account Group"}
            </p>
          </div>
          <Button onClick={() => router.push(listHref)}>
            <Users className="w-4 h-4 mr-2" />
            Back to Account Group
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="soft"
          onClick={() => router.push(listHref)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {accountGroup.name || "Account Group"}
        </Button>
      </div>

      <PostCreationComponent
        post={post as unknown as PostFullyLoaded}
        accountGroup={accountGroup as any}
      />
    </div>
  );
}
