/**
 * Platform Icons Helper
 * 
 * Provides consistent platform icons across the app using the existing icons8 SVGs.
 */

export const PLATFORM_ICONS: Record<string, string> = {
  // Social platforms
  x: "/icons8-twitter.svg",
  twitter: "/icons8-twitter.svg",
  instagram: "/icons8-instagram.svg",
  facebook: "/icons8-facebook.svg",
  linkedin: "/icons8-linkedin.svg",
  youtube: "/icons8-youtube-logo.svg",
  tiktok: "/icons8-tiktok.svg",
  pinterest: "/icons8-pinterest.svg",
  reddit: "/icons8-reddit.svg",
  threads: "/icons8-threads.svg",
  bluesky: "/icons8-bluesky.svg",
  
  // Fallback
  default: "/sprout.svg",
};

/**
 * Get the icon path for a platform
 */
export function getPlatformIcon(platform: string): string {
  const normalized = platform.toLowerCase().trim();
  return PLATFORM_ICONS[normalized] || PLATFORM_ICONS.default;
}

/**
 * Platform display names
 */
export const PLATFORM_LABELS: Record<string, string> = {
  x: "X (Twitter)",
  twitter: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  reddit: "Reddit",
  threads: "Threads",
  bluesky: "Bluesky",
};

/**
 * Get display label for a platform
 */
export function getPlatformLabel(platform: string): string {
  const normalized = platform.toLowerCase().trim();
  return PLATFORM_LABELS[normalized] || platform;
}

/**
 * Platform brand colors (for badges, indicators etc)
 */
export const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  x: { bg: "bg-gray-900 dark:bg-gray-100", text: "text-white dark:text-gray-900" },
  twitter: { bg: "bg-gray-900 dark:bg-gray-100", text: "text-white dark:text-gray-900" },
  instagram: { bg: "bg-gradient-to-r from-purple-500 to-pink-500", text: "text-white" },
  facebook: { bg: "bg-blue-600", text: "text-white" },
  linkedin: { bg: "bg-blue-700", text: "text-white" },
  youtube: { bg: "bg-red-600", text: "text-white" },
  tiktok: { bg: "bg-gray-900 dark:bg-white", text: "text-white dark:text-gray-900" },
  pinterest: { bg: "bg-red-700", text: "text-white" },
  reddit: { bg: "bg-orange-600", text: "text-white" },
  threads: { bg: "bg-gray-900 dark:bg-white", text: "text-white dark:text-gray-900" },
  bluesky: { bg: "bg-sky-500", text: "text-white" },
};

/**
 * Get brand colors for a platform
 */
export function getPlatformColors(platform: string): { bg: string; text: string } {
  const normalized = platform.toLowerCase().trim();
  return PLATFORM_COLORS[normalized] || { bg: "bg-gray-500", text: "text-white" };
}

