import { NextRequest, NextResponse } from "next/server";

import {
  fetchPostHistory,
  fetchPlatformPostHistory,
} from "@/utils/postPerformance";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountGroupId = searchParams.get("accountGroupId");
    const profileKeyParam = searchParams.get("profileKey");
    const postId = searchParams.get("postId");
    const refId = searchParams.get("refId");
    const platform = searchParams.get("platform");
    const includeRaw = searchParams.get("includeRaw") === "true";

    const limit = Number(searchParams.get("limit") || "0") || undefined;
    const lastDays = Number(searchParams.get("lastDays") || "0") || undefined;
    const status = searchParams.get("status") || undefined;

    let profileKey = profileKeyParam || undefined;
    if (!profileKey && accountGroupId) {
      const { jazzServerWorker } = await import("@/utils/jazzServer");
      const { AccountGroup } = await import("@/app/schema");
      const worker = await jazzServerWorker;

      if (!worker) {
        return NextResponse.json(
          {
            success: false,
            error: "Server worker not available",
          },
          { status: 500 }
        );
      }

      const accountGroup = await AccountGroup.load(accountGroupId, {
        loadAs: worker,
      });
      profileKey = accountGroup?.ayrshareProfileKey;
    }

    if (!profileKey) {
      return NextResponse.json(
        {
          success: false,
          error: "profileKey or accountGroupId is required",
        },
        { status: 400 }
      );
    }

    const historyResponse = platform
      ? await fetchPlatformPostHistory(platform, profileKey, {
          limit,
          lastDays,
          status,
        })
      : await fetchPostHistory(profileKey, {
          limit,
          lastDays,
          status,
        });

    if (!historyResponse) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch post history" },
        { status: 502 }
      );
    }

    const history = Array.isArray(historyResponse.history)
      ? historyResponse.history
      : [];

    const matches = history.filter((post: any) => {
      if (!postId && !refId) return true;
      const postIds = Array.isArray(post?.postIds) ? post.postIds : [];
      const postIdMatches =
        postId &&
        (post?.id === postId ||
          post?.refId === postId ||
          postIds.some((p: any) => p?.id === postId));
      const refIdMatches =
        refId && (post?.refId === refId || post?.id === refId);
      return Boolean(postIdMatches || refIdMatches);
    });

    return NextResponse.json({
      success: true,
      meta: {
        count: historyResponse.count,
        lastUpdated: historyResponse.lastUpdated,
        nextUpdate: historyResponse.nextUpdate,
        refId: historyResponse.refId,
        platform: platform || null,
        limit: limit || null,
        lastDays: lastDays || null,
        status: status || null,
        matchCount: matches.length,
      },
      matches,
      ...(includeRaw ? { history } : {}),
    });
  } catch (error) {
    console.error("❌ History debug endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
