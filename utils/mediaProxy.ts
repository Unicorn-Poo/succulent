const LUNARY_OG_IDENTIFIER = "lunary.app/api/og/";

export type MediaFormat = "png" | "jpg";
export const DEFAULT_MEDIA_FORMAT: MediaFormat = "png";
export const MEDIA_PROXY_BASE_URL = "https://app.succulent.social";

function toBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  const utf8 = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  const base64 = typeof btoa === "function" ? btoa(utf8) : value;
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

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
  const encodedUrl = toBase64Url(url);
  return `${baseUrl}/api/convert-media-url?u=${encodedUrl}&format=${format}`;
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
