import { NextRequest, NextResponse } from "next/server";
import {
  validateAPIKey,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";

export const dynamic = "force-dynamic";

async function deleteAyrsharePostById(
  postId: string,
  profileKey: string
): Promise<void> {
  if (!process.env.AYRSHARE_API_KEY) {
    throw new Error("Missing AYRSHARE_API_KEY for delete operation");
  }
  if (!profileKey) {
    throw new Error("Missing Profile-Key for delete operation");
  }

  const response = await fetch("https://api.ayrshare.com/api/post", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
      "Profile-Key": profileKey,
    },
    body: JSON.stringify({ id: postId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Ayrshare delete failed (${response.status}): ${text || "Unknown error"}`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get("X-Forwarded-For") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const apiKey = request.headers.get("X-API-Key");

    const validation = apiKey
      ? await validateAPIKey(apiKey, "posts:delete", clientIP, userAgent)
      : null;
    if (validation && !validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const accountGroupId = body?.accountGroupId as string | undefined;
    const postId = body?.postId as string | undefined;
    const postIds = body?.postIds as string[] | undefined;
    const profileKeyOverride = body?.profileKey as string | undefined;

    const ids = postId ? [postId] : Array.isArray(postIds) ? postIds : [];
    if (!accountGroupId || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "accountGroupId and postId(s) are required" },
        { status: 400 }
      );
    }

    if (validation) {
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
    }

    const { jazzServerWorker } = await import("@/utils/jazzServer");
    const { AccountGroup } = await import("@/app/schema");
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
              $each: true,
            },
          },
        },
      },
    });

    if (!accountGroup || !accountGroup.posts) {
      return NextResponse.json(
        { success: false, error: "Account group not found" },
        { status: 404 }
      );
    }

    const profileKey =
      profileKeyOverride || accountGroup?.ayrshareProfileKey || undefined;

    const deletedPosts: string[] = [];
    const unscheduledPosts: Array<{ platform: string; id: string }> = [];
    const errors: Array<{ postId: string; error: string }> = [];

    for (const targetId of ids) {
      const postIndex = accountGroup.posts.findIndex(
        (item: any) => item?.id === targetId
      );
      if (postIndex === -1) {
        errors.push({ postId: targetId, error: "Post not found" });
        continue;
      }

      const post = accountGroup.posts[postIndex];
      const variants = post?.variants ? Object.entries(post.variants) : [];
      const attemptedAyrshareIds = new Set<string>();

      for (const [platform, variant] of variants) {
        if (!variant) continue;
        const isScheduled =
          variant?.status === "scheduled" || !!variant?.scheduledFor;
        const ayrsharePostId = variant?.ayrsharePostId;
        if (!isScheduled || !ayrsharePostId) continue;

        if (attemptedAyrshareIds.has(ayrsharePostId)) {
          continue;
        }

        if (!profileKey) {
          errors.push({
            postId: targetId,
            error: "Missing Profile-Key for delete operation",
          });
          continue;
        }

        try {
          await deleteAyrsharePostById(ayrsharePostId, profileKey);
          unscheduledPosts.push({ platform, id: ayrsharePostId });
          attemptedAyrshareIds.add(ayrsharePostId);
        } catch (error) {
          errors.push({
            postId: targetId,
            error:
              error instanceof Error ? error.message : "Failed to unschedule",
          });
        }
      }

      accountGroup.posts.splice(postIndex, 1);
      deletedPosts.push(targetId);
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedPosts,
        unscheduledPosts,
        errors,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting posts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete posts" },
      { status: 500 }
    );
  }
}
