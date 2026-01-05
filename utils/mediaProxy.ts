const LUNARY_OG_IDENTIFIER = "lunary.app/api/og/";

export type MediaFormat = "png" | "jpg";
export const DEFAULT_MEDIA_FORMAT: MediaFormat = "png";
export const MEDIA_PROXY_BASE_URL = "https://app.succulent.social";

export function resolvePublicBaseUrl(): string {
  console.log("🌐 [BASE URL RESOLVED]", {
    result: MEDIA_PROXY_BASE_URL,
    source: "constant",
  });
  return MEDIA_PROXY_BASE_URL;
}

export function buildMediaProxyUrl(
  url: string,
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): string {
  const baseUrl = resolvePublicBaseUrl().replace(/\/$/, "");
  const encodedUrl = encodeURIComponent(url);
  return `${baseUrl}/api/convert-media-url/${encodedUrl}.${format}`;
}

export function proxyMediaUrlIfNeeded(
  url: string,
  format: MediaFormat = DEFAULT_MEDIA_FORMAT
): string {
  if (
    !url ||
    typeof url !== "string" ||
    !/^https?:\/\//i.test(url) ||
    !url.includes(LUNARY_OG_IDENTIFIER)
  ) {
    return url;
  }

  try {
    const proxyUrl = buildMediaProxyUrl(url, format);
    console.log("✅ [PROXY CREATED - LUNARY]", {
      original: url,
      proxy: proxyUrl,
      format,
    });
    return proxyUrl;
  } catch (error) {
    console.warn("⚠️ Failed to build media proxy URL, falling back:", {
      url,
      error,
    });
    return url;
  }
}

export function needsJpgConversion(platform: string): boolean {
  if (!platform) return false;
  const normalized = platform.toLowerCase();
  return normalized === "tiktok";
}

export function getPreferredMediaFormatForPlatform(
  platform: string
): MediaFormat {
  return needsJpgConversion(platform) ? "jpg" : DEFAULT_MEDIA_FORMAT;
}
