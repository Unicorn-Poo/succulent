// schema.ts
import { co, z, Group } from "jazz-tools";

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
	// Post status tracking
	status: z.enum(["draft", "scheduled", "published"]),
	scheduledFor: z.optional(z.date()),
	publishedAt: z.optional(z.date()),
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

// =============================================================================
// 💳 SUBSCRIPTION SCHEMA
// =============================================================================

export const SubscriptionTier = z.enum(["free", "premium", "business", "enterprise"]);

export const SubscriptionBilling = co.map({
	customerId: z.optional(z.string()), // Stripe customer ID
	subscriptionId: z.optional(z.string()), // Stripe subscription ID
	paymentMethodId: z.optional(z.string()), // Stripe payment method ID
	lastChargeDate: z.optional(z.date()),
	nextBillingDate: z.optional(z.date()),
	billingInterval: z.optional(z.enum(["monthly", "yearly"])),
	priceId: z.optional(z.string()), // Stripe price ID
});

export const SubscriptionUsage = co.map({
	monthlyPosts: z.number(),
	lastResetDate: z.date(),
	accountGroups: z.number(),
	connectedAccounts: z.number(),
	storageUsedMB: z.number(),
	analyticsRequests: z.number(),
	apiCalls: z.number(),
	platformVariantsUsed: z.number(),
});

export const SubscriptionLimits = co.map({
	maxPosts: z.number(),
	maxAccountGroups: z.number(),
	maxConnectedAccounts: z.number(),
	maxStorageMB: z.number(),
	maxAnalyticsRequests: z.number(),
	maxApiCalls: z.number(),
	maxPlatformVariants: z.number(),
	features: z.array(z.string()),
});

export const SubscriptionTrial = co.map({
	isInTrial: z.boolean(),
	trialStartDate: z.optional(z.date()),
	trialEndDate: z.optional(z.date()),
	trialTier: z.optional(SubscriptionTier),
	trialUsed: z.boolean(),
	trialExtensions: z.number(),
});

export const Subscription = co.map({
	tier: SubscriptionTier,
	status: z.enum(["active", "canceled", "past_due", "unpaid", "incomplete", "trialing"]),
	startDate: z.date(),
	endDate: z.optional(z.date()),
	billing: z.optional(SubscriptionBilling),
	usage: SubscriptionUsage,
	limits: SubscriptionLimits,
	trial: z.optional(SubscriptionTrial),
	grandfathered: z.boolean(),
	adminOverride: z.optional(z.object({
		tier: z.optional(SubscriptionTier),
		reason: z.optional(z.string()),
		grantedBy: z.optional(z.string()),
		expiresAt: z.optional(z.date()),
	})),
});

// =============================================================================
// 🏢 COMPANY & ADMIN GROUPS
// =============================================================================

export const AdminRole = z.enum(["super_admin", "admin", "moderator", "support"]);
export type AdminRole = z.infer<typeof AdminRole>;

export const CompanyAdminGroup = co.map({
  name: co.plainText(),
  description: co.plainText(),
  createdAt: z.date(),
  settings: co.map({
    canManageUsers: z.boolean(),
    canManageSubscriptions: z.boolean(),
    canViewAnalytics: z.boolean(),
    canManagePayments: z.boolean(),
    canAccessSystemSettings: z.boolean(),
  }),
  members: co.list(co.map({
    accountId: z.string(),
    role: AdminRole,
    addedAt: z.date(),
    addedBy: z.string(),
  })),
});

export const CollaborationGroup = co.map({
  name: co.plainText(),
  description: co.plainText(),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: co.map({
    allowPosting: z.boolean(),
    allowEditing: z.boolean(),
    requireApproval: z.boolean(),
  }),
  members: co.list(co.map({
    accountId: z.string(),
    role: z.enum(["owner", "admin", "editor", "viewer"]),
    joinedAt: z.date(),
  })),
  // Shared content
  sharedPosts: co.list(Post),
  sharedAccountGroups: co.list(AccountGroup),
});

// Update UserProfile to include admin status
export const UserProfile = co.map({
  name: co.plainText(),
  email: co.plainText(),
  avatar: z.optional(co.plainText()),
  bio: z.optional(co.plainText()),
  createdAt: z.date(),
  updatedAt: z.date(),
  subscription: Subscription,
  // Admin privileges
  isSystemAdmin: z.boolean(),
  adminGroups: co.list(CompanyAdminGroup),
  // Collaboration
  collaborationGroups: co.list(CollaborationGroup),
  ownedGroups: co.list(CollaborationGroup),
});

// Company root for system-wide management
export const CompanyRoot = co.map({
  name: co.plainText(),
  adminGroups: co.list(CompanyAdminGroup),
  systemSettings: co.map({
    maintenanceMode: z.boolean(),
    signupEnabled: z.boolean(),
    trialPeriodDays: z.number(),
    maxFreeUsers: z.number(),
    enabledFeatures: z.array(z.string()),
  }),
  analytics: co.map({
    totalUsers: z.number(),
    activeUsers: z.number(),
    totalPosts: z.number(),
    storageUsed: z.number(),
    lastAnalyticsUpdate: z.date(),
  }),
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
  
  // Initialize user profile with default subscription
  if (account.profile === undefined) {
    const now = new Date();
    account.profile = UserProfile.create({
      name: "User",
      email: undefined,
      createdAt: now,
      lastLoginAt: now,
      subscription: Subscription.create({
        tier: "free",
        status: "active",
        startDate: now,
        endDate: undefined,
        billing: undefined,
        usage: SubscriptionUsage.create({
          monthlyPosts: 0,
          lastResetDate: now,
          accountGroups: 0,
          connectedAccounts: 0,
          storageUsedMB: 0,
          analyticsRequests: 0,
          apiCalls: 0,
          platformVariantsUsed: 0,
        }),
        limits: SubscriptionLimits.create({
          maxPosts: 20,
          maxAccountGroups: 1,
          maxConnectedAccounts: 5,
          maxStorageMB: 100,
          maxAnalyticsRequests: 50,
          maxApiCalls: 100,
          maxPlatformVariants: 3,
          features: ["basic-posting", "post-history", "profile-info", "basic-comments", "delete-posts", "single-images"],
        }),
        trial: undefined,
        grandfathered: false,
        adminOverride: undefined,
      }),
      preferences: undefined,
    })
  }
  
  // Initialize subscription for existing users without one
  if (account.profile && !account.profile.subscription) {
    const now = new Date();
    account.profile.subscription = Subscription.create({
      tier: "free",
      status: "active",
      startDate: now,
      endDate: undefined,
      billing: undefined,
      usage: SubscriptionUsage.create({
        monthlyPosts: 0,
        lastResetDate: now,
        accountGroups: 0,
        connectedAccounts: 0,
        storageUsedMB: 0,
        analyticsRequests: 0,
        apiCalls: 0,
        platformVariantsUsed: 0,
      }),
      limits: SubscriptionLimits.create({
        maxPosts: 20,
        maxAccountGroups: 1,
        maxConnectedAccounts: 5,
        maxStorageMB: 100,
        maxAnalyticsRequests: 50,
        maxApiCalls: 100,
        maxPlatformVariants: 3,
        features: ["basic-posting", "post-history", "profile-info", "basic-comments", "delete-posts", "single-images"],
      }),
      trial: undefined,
      grandfathered: false,
      adminOverride: undefined,
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
	},
	profile: {
		subscription: {
			billing: true,
			usage: true,
			limits: true,
			trial: true
		}
	}
}>;
