import { NextRequest, NextResponse } from "next/server";
import {
  validateAPIKey,
  validateAccountGroupAccess,
} from "@/utils/apiKeyManager";
import { deleteAyrsharePostById } from "@/utils/ayrshareApi";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const clientIP = request.headers.get("X-Forwarded-For") || "unknown";
    const userAgent = request.headers.get("User-Agent") || "unknown";
    const apiKey = request.headers.get("X-API-Key");

    const validation = apiKey
      ? await validateAPIKey(apiKey, "maintenance:ayrshare-orphans", clientIP, userAgent)
      : null;
    if (validation && !validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const accountGroupId = body?.accountGroupId as string | undefined;
    const postIds = Array.isArray(body?.postIds) ? body.postIds : [];
    const profileKeyOverride =
      (typeof body?.profileKey === "string" && body.profileKey.trim()) ||
      undefined;

    if (!accountGroupId || postIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "accountGroupId and postIds[] are required",
        },
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
    });

    if (!accountGroup) {
      return NextResponse.json(
        { success: false, error: "Account group not found" },
        { status: 404 }
      );
    }

    const profileKey =
      profileKeyOverride || accountGroup?.ayrshareProfileKey || undefined;
    if (!profileKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Ayrshare Profile-Key. Provide accountGroupId with a linked Ayrshare profile or pass profileKey directly.",
        },
        { status: 400 }
      );
    }

    const deletedPosts: string[] = [];
    const errors: Array<{ postId: string; error: string }> = [];

    for (const ayrsharePostId of postIds) {
      if (!ayrsharePostId) {
        continue;
      }
      try {
        await deleteAyrsharePostById(ayrsharePostId, profileKey);
        deletedPosts.push(ayrsharePostId);
      } catch (error) {
        errors.push({
          postId: ayrsharePostId,
          error:
            error instanceof Error ? error.message : "Failed to delete post",
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        deletedPosts,
        errors,
      },
    });
  } catch (error) {
    console.error("❌ Error deleting Ayrshare orphaned posts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete Ayrshare orphaned posts",
      },
      { status: 500 }
    );
  }
}
