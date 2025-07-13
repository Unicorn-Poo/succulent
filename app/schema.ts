// schema.ts
import { co, z } from "jazz-tools";

export const PlatformNames = [
	"instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "pinterest", "reddit", "telegram", "threads", "limesky", "google"
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
	image: co.fileStream(), // Temporarily use fileStream until we fix co.image()
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
// 🏢 GELATO INTEGRATION SCHEMAS  
// =============================================================================

// Gelato Template Schema
export const GelatoTemplate = co.map({
	gelatoTemplateId: z.string(),
	name: z.string(),
	displayName: z.optional(z.string()),
	productType: z.string(),
	description: z.optional(z.string()),
	
	// Enhanced product metadata for Shopify
	tags: z.optional(z.array(z.string())),
	categories: z.optional(z.array(z.string())),
	keywords: z.optional(z.array(z.string())),
	seoTitle: z.optional(z.string()),
	seoDescription: z.optional(z.string()),
	
	// Pricing information
	pricing: z.optional(z.object({
		currency: z.optional(z.string()),
		basePrice: z.optional(z.number()),
		priceRange: z.optional(z.string()),
		retailPrice: z.optional(z.number()),
	})),
	
	// Product specifications
	specifications: z.optional(z.object({
		material: z.optional(z.string()),
		weight: z.optional(z.string()),
		dimensions: z.optional(z.string()),
		features: z.optional(z.array(z.string())),
		careInstructions: z.optional(z.string()),
	})),
	
	// Variant information
	availableSizes: z.optional(z.array(z.string())),
	availableColors: z.optional(z.array(z.string())),
	printAreas: z.optional(z.array(z.string())),
	
	// Shopify-specific fields
	shopifyData: z.optional(z.object({
		productType: z.optional(z.string()),
		vendor: z.optional(z.string()),
		tags: z.optional(z.array(z.string())),
		handle: z.optional(z.string()),
		status: z.optional(z.enum(['draft', 'active', 'archived'])),
		publishedScope: z.optional(z.string()),
		publishingChannels: z.optional(z.array(z.string())),
	})),
	
	// Store additional details for better display
	details: z.optional(z.object({
		size: z.optional(z.string()),
		material: z.optional(z.string()),
		color: z.optional(z.string()),
		orientation: z.optional(z.string()),
		endpoint: z.optional(z.string()),
		apiVersion: z.optional(z.string()),
	})),
	
	// Metadata
	fetchedAt: z.date(),
	isActive: z.boolean(),
});

// Shopify Integration Schema
export const ShopifyCredentials = co.map({
	storeUrl: z.string(),
	accessToken: z.string(),
	apiKey: z.optional(z.string()),
	storeName: z.optional(z.string()),
	isConfigured: z.boolean(),
	connectedAt: z.optional(z.date()),
	// Publishing channels
	availableChannels: z.optional(z.array(z.object({
		id: z.string(),
		name: z.string(),
		enabled: z.boolean(),
		supportsTags: z.boolean(),
	}))),
	defaultPublishingChannels: z.optional(z.array(z.string())),
	channelsLastFetched: z.optional(z.date()),
});

// Gelato Product Schema (for tracking created products)
export const GelatoProduct = co.map({
	// Gelato product details
	productId: z.string(),
	title: z.string(),
	description: z.optional(z.string()),
	tags: z.optional(z.array(z.string())),
	productType: z.optional(z.string()),
	vendor: z.optional(z.string()),
	
	// Source information
	sourcePost: z.object({
		title: z.string(),
		variant: z.optional(z.string()),
		postId: z.optional(z.string()),
	}),
	
	// Template information
	templateId: z.optional(z.string()),
	templateName: z.optional(z.string()),
	
	// Status tracking
	status: z.enum(['created', 'publishing', 'published', 'error']),
	createdAt: z.date(),
	lastUpdated: z.date(),
	
	// Shopify integration status
	shopifyStatus: z.optional(z.enum(['pending', 'syncing', 'synced', 'error'])),
	shopifyProductId: z.optional(z.string()),
	shopifyProductUrl: z.optional(z.string()),
	shopifyMessage: z.optional(z.string()),
	channelsUpdated: z.optional(z.boolean()),
	publishingChannels: z.optional(z.array(z.string())),
	
	// Error tracking
	errorMessage: z.optional(z.string()),
	errorDetails: z.optional(z.string()),
	retryCount: z.optional(z.number()),
});

// Gelato Integration Schema
export const GelatoCredentials = co.map({
	apiKey: z.string(),
	storeId: z.optional(z.string()),
	storeName: z.optional(z.string()),
	isConfigured: z.boolean(),
	connectedAt: z.optional(z.date()),
	// Template caching
	templates: co.list(GelatoTemplate),
	templatesLastFetched: z.optional(z.date()),
	// Created products tracking
	createdProducts: co.list(GelatoProduct),
	// Shopify integration
	shopifyCredentials: z.optional(ShopifyCredentials),
	// Auto-creation settings
	autoCreateOnPublish: z.optional(z.boolean()),
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
	gelatoCredentials: {
		templates: { $each: true },
		createdProducts: { $each: true }
	}
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
		gelatoCredentials: {
			templates: { $each: true },
			createdProducts: { $each: true }
		}
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
			gelatoCredentials: {
				templates: { $each: true },
				createdProducts: { $each: true }
			}
		}}
	}
}>;
