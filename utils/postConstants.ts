export const platformIcons = {
	base: "/sprout.svg",
	x: "/icons8-twitter.svg",
	instagram: "/icons8-instagram.svg",
	youtube: "/icons8-youtube-logo.svg",
	facebook: "/icons8-facebook.svg",
	linkedin: "/icons8-linkedin.svg",
	threads: "/icons8-threads.svg",
	bluesky: "/icons8-bluesky.svg",
	tiktok: "/icons8-tiktok.svg",
	pinterest: "/icons8-pinterest.svg",
	reddit: "/icons8-reddit.svg",
	telegram: "/icons8-telegram.svg",
	google: "/icons8-google.svg",
};

export const platformLabels = {
	base: "Base",
	x: "X/Twitter",
	instagram: "Instagram",
	youtube: "YouTube",
	facebook: "Facebook",
	linkedin: "LinkedIn",
	threads: "Threads",
	bluesky: "Bluesky",
	tiktok: "TikTok",
	pinterest: "Pinterest",
};

export const PLATFORM_CHARACTER_LIMITS = {
	x: 280,
	twitter: 280,
	instagram: 2200,
	facebook: 63206,
	linkedin: 3000,
	youtube: 5000,
	threads: 10000,
	bluesky: 300,
	tiktok: 2200,
	pinterest: 500,
	default: 2200,
};

// Use the correct Ayrshare API URL from their official documentation
export const AYRSHARE_API_URL = process.env.NEXT_PUBLIC_AYRSHARE_API_URL || "https://api.ayrshare.com/api";
export const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY; 