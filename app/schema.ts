// schema.ts
import { co, z } from "jazz-tools";

export const PlatformNames = [
	"instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "pinterest", "reddit", "telegram", "threads", "bluesky", "google"
] as const;

// =============================================================================
// 🎭 PLATFORM ACCOUNT SCHEMA (JAZZ INTEGRATED)
// =============================================================================

export const PlatformAccount = co.map({
	name: z.string(),
	platform: z.enum(PlatformNames),
	
	// Legacy field for backward compatibility
	apiUrl: z.optional(z.string()),
	
	// Ayrshare Integration Fields
	profileKey: z.optional(z.string()), // Ayrshare User Profile Key
	isLinked: z.boolean(), // Whether the account is linked to Ayrshare
	linkedAt: z.optional(z.date()), // When the account was linked
	
	// Social Account Details
	avatar: z.optional(z.string()),
	username: z.optional(z.string()),
	displayName: z.optional(z.string()),
	url: z.optional(z.string()),
	
	// Connection Status
	status: z.enum(["pending", "linked", "error", "expired"]),
	lastError: z.optional(z.string()),
});

// =============================================================================
// 📝 POST RELATED SCHEMAS
// =============================================================================

export const ReplyTo = co.map({
	url: z.optional(z.string()),
	platform: z.optional(z.enum(PlatformNames)),
	author: z.optional(z.string()),
	authorUsername: z.optional(z.string()),
	authorPostContent: z.optional(z.string()),
	authorAvatar: z.optional(z.string()),
	likesCount: z.optional(z.number()),
});

export const ImageMedia = co.map({
	type: z.literal("image"),
	image: co.image(),
	alt: z.optional(co.plainText()),
});

export const VideoMedia = co.map({
	type: z.literal("video"),
	video: co.fileStream(),
	alt: z.optional(co.plainText()),
});

export const MediaItem = z.discriminatedUnion("type", [ImageMedia, VideoMedia]);

export const PostVariant = co.map({
	text: co.plainText(),
	postDate: z.date(),
	media: co.list(MediaItem),
	replyTo: ReplyTo,
	// New fields for better tracking
	edited: z.boolean(),
	lastModified: z.optional(z.string()),
});

export const Post = co.map({
	title: co.plainText(),
	variants: co.record(z.string(), PostVariant),
});

export type PostFullyLoaded = co.loaded<typeof Post, {
	variants: { $each: true }
}>;

// =============================================================================
// 🏪 GELATO INTEGRATION SCHEMA (ENCRYPTED)
// =============================================================================

export const GelatoCredentials = co.map({
	apiKey: z.string(),
	storeId: z.string(),
	isConfigured: z.boolean(),
	connectedAt: z.optional(z.date()),
	storeName: z.optional(z.string()),
	// Template configurations for this account group's store
	customTemplates: z.optional(z.array(z.object({
		id: z.string(),
		name: z.string(),
		description: z.string(),
		productType: z.string(),
		isDefault: z.optional(z.boolean()),
	}))),
});

// =============================================================================
// 🏢 ACCOUNT GROUP SCHEMA (JAZZ INTEGRATED)
// =============================================================================

export const AccountGroup = co.map({
	name: z.string(),
	createdAt: z.date(),
	updatedAt: z.date(),
	
	// Accounts stored as a collaborative list
	accounts: co.list(PlatformAccount),
	
	// Posts associated with this account group
	posts: co.list(Post),
	
	// Group metadata
	description: z.optional(z.string()),
	tags: z.optional(z.array(z.string())),
	
	// Ayrshare Integration (Business Plan)
	ayrshareProfileKey: z.optional(z.string()),
	ayrshareProfileTitle: z.optional(z.string()),
	
	// Gelato Integration (per account group)
	gelatoCredentials: z.optional(GelatoCredentials),
	
	// Account Group Settings
	settings: z.optional(z.object({
		autoCreateProducts: z.optional(z.boolean()),
		defaultProductType: z.optional(z.string()),
		notifyOnProductCreation: z.optional(z.boolean()),
	})),
});

export type AccountGroupType = co.loaded<typeof AccountGroup, {
	accounts: { $each: true },
	posts: { $each: true },
	gelatoCredentials: true
}>;

export const UserProfile = co.map({
	name: z.string(),
	// User-level preferences (not related to specific account groups)
	preferences: z.optional(z.object({
		theme: z.optional(z.enum(["light", "dark", "system"])),
		notificationPreferences: z.optional(z.object({
			email: z.optional(z.boolean()),
			push: z.optional(z.boolean()),
		})),
	})),
});

// =============================================================================
// 📂 ROOT ACCOUNT STRUCTURE
// =============================================================================

export const AccountRoot = co.map({
	accountGroups: co.list(AccountGroup),
});

export type AccountRootLoaded = co.loaded<typeof AccountRoot, {
	accountGroups: { $each: { 
		accounts: { $each: true },
		posts: { $each: true },
		gelatoCredentials: true
	}}
}>;

export const MyAppAccount = co.account({
	root: AccountRoot,
	profile: UserProfile,
}).withMigration(account => {
  if (account.root === undefined) {
    account.root = AccountRoot.create({
      accountGroups: co.list(AccountGroup).create([])
    })
  }
});

export type MyAppAccountLoaded = co.loaded<typeof MyAppAccount, {
	root: {
		accountGroups: { $each: {
			accounts: { $each: true },
			posts: { $each: true },
			gelatoCredentials: true
		}}
	}
}>;
