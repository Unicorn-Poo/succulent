import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { resolvePublicBaseUrl } from "@/utils/mediaProxy";

function isValidMediaUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url as string | undefined;
    const accountGroupId = body?.accountGroupId as string | undefined;
    const format = body?.format === "jpg" ? "jpg" : "png";

    if (!url || !accountGroupId) {
      return NextResponse.json(
        { success: false, error: "url and accountGroupId are required" },
        { status: 400 }
      );
    }

    if (!isValidMediaUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Invalid media URL" },
        { status: 400 }
      );
    }

    const { jazzServerWorker } = await import("@/utils/jazzServer");
    const { AccountGroup } = await import("@/app/schema");
    const { co } = await import("jazz-tools");
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Succulent/1.0)",
        Accept: "image/png, image/jpeg, image/webp, image/*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch media (${response.status})`,
        },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Invalid content type" },
        { status: 400 }
      );
    }

    const inputBuffer = Buffer.from(await response.arrayBuffer());
    const outputBuffer =
      format === "jpg"
        ? await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer()
        : inputBuffer;
    const outputType = format === "jpg" ? "image/jpeg" : contentType;

    const blob = new Blob([outputBuffer], { type: outputType });
    const fileStream = await co.fileStream().createFromBlob(blob, {
      owner: accountGroup._owner,
    });
    const fileStreamId =
      (fileStream as any)?.id ||
      (typeof (fileStream as any)?.toString === "function"
        ? (fileStream as any).toString()
        : undefined);

    if (!fileStreamId || typeof fileStreamId !== "string") {
      return NextResponse.json(
        { success: false, error: "Failed to persist media" },
        { status: 500 }
      );
    }

    const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
    const proxyUrl = `${baseUrl}/api/media-proxy/${fileStreamId}`;

    return NextResponse.json({
      success: true,
      proxyUrl,
      fileStreamId,
      contentType: outputType,
    });
  } catch (error) {
    console.error("❌ Media cache error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Media cache failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
