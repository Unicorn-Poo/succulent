export const platformIcons = {
	base: "/sprout.svg",
	x: "/icons8-twitter.svg",
	instagram: "/icons8-instagram.svg",
	youtube: "/icons8-youtube-logo.svg",
	facebook: "/icons8-facebook.svg",
	linkedin: "/icons8-linkedin.svg",
};

export const platformLabels = {
	base: "Base",
	x: "X/Twitter",
	instagram: "Instagram",
	youtube: "YouTube",
	facebook: "Facebook",
	linkedin: "LinkedIn",
};

export const PLATFORM_CHARACTER_LIMITS = {
	x: 280,
	twitter: 280,
	instagram: 2200,
	facebook: 63206,
	linkedin: 3000,
	youtube: 5000,
	default: 2200,
};

export const AYRSHARE_API_URL = "https://app.ayrshare.com/api";
export const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY; 