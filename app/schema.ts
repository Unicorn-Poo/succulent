// schema.ts
import { co, z, Group } from "jazz-tools";
import { z as zod } from "zod";

export const PlatformNames = [
  "instagram",
  "facebook",
  "x",
  "linkedin",
  "youtube",
  "tiktok",
  "pinterest",
  "reddit",
  "telegram",
  "threads",
  "bluesky",
  "limesky",
  "google",
] as const;

// =============================================================================
// 🔐 API KEY MANAGEMENT SCHEMAS
// =============================================================================

export const APIKey = co.map({
  // Key identification
  keyId: z.string(), // Unique identifier for the key
  name: z.string(), // User-friendly name for the key
  keyPrefix: z.string(), // First 8 characters of the key (for display)
  hashedKey: z.string(), // Secure hash of the full key

  // Permissions and scope
  permissions: z.array(
    z.enum([
      "posts:create",
      "posts:read",
      "posts:update",
      "posts:delete",
      "accounts:read",
      "analytics:read",
      "media:upload",
    ])
  ),
  accountGroupIds: z.optional(z.array(z.string())), // Restrict to specific account groups

  // Status and metadata
  status: z.enum(["active", "inactive", "revoked"]),
  createdAt: z.date(),
  lastUsedAt: z.optional(z.date()),
  expiresAt: z.optional(z.date()),

  // Usage tracking
  usageCount: z.number(),
  lastUsedFromIP: z.optional(z.string()),
  lastUsedUserAgent: z.optional(z.string()),

  // Rate limiting
  rateLimitTier: z.enum(["standard", "premium", "enterprise"]),
  monthlyUsageCount: z.number(),
  monthlyUsageResetDate: z.date(),

  // Security
  allowedOrigins: z.optional(z.array(z.string())), // CORS origins
  ipWhitelist: z.optional(z.array(z.string())), // Allowed IP addresses

  // Notes
  description: z.optional(z.string()),
  createdBy: z.optional(z.string()), // For team management
});

export const APIKeyUsageLog = co.map({
  keyId: z.string(),
  timestamp: z.date(),
  endpoint: z.string(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  statusCode: z.number(),
  responseTime: z.optional(z.number()), // in milliseconds
  ipAddress: z.optional(z.string()),
  userAgent: z.optional(z.string()),
  requestSize: z.optional(z.number()), // in bytes
  responseSize: z.optional(z.number()), // in bytes
  errorMessage: z.optional(z.string()),
});

// =============================================================================
// 🎭 PLATFORM ACCOUNT SCHEMA (JAZZ INTEGRATED)
// =============================================================================

// Analytics data point for historical tracking
export const AnalyticsDataPoint = co.map({
  timestamp: z.date(),
  followerCount: z.optional(z.number()),
  followingCount: z.optional(z.number()),
  postsCount: z.optional(z.number()),
  likesCount: z.optional(z.number()),
  commentsCount: z.optional(z.number()),
  sharesCount: z.optional(z.number()),
  viewsCount: z.optional(z.number()),
  engagementRate: z.optional(z.number()),
  totalEngagement: z.optional(z.number()),
  // Platform-specific metrics
  storiesCount: z.optional(z.number()),
  reelsCount: z.optional(z.number()),
  igtv: z.optional(z.number()),
  // Metadata
  dataSource: z.enum(["ayrshare", "manual", "api"]),
  isValidated: z.boolean(),
});

// Current analytics snapshot
export const CurrentAnalytics = co.map({
  // Profile data
  followerCount: z.optional(z.number()),
  followingCount: z.optional(z.number()),
  postsCount: z.optional(z.number()),
  biography: z.optional(z.string()),
  website: z.optional(z.string()),
  profilePictureUrl: z.optional(z.string()),
  isVerified: z.optional(z.boolean()),
  isBusinessAccount: z.optional(z.boolean()),

  // Engagement metrics
  totalLikes: z.optional(z.number()),
  totalComments: z.optional(z.number()),
  totalShares: z.optional(z.number()),
  totalViews: z.optional(z.number()),
  engagementRate: z.optional(z.number()),
  avgLikesPerPost: z.optional(z.number()),
  avgCommentsPerPost: z.optional(z.number()),

  // Platform-specific data (stored as JSON string)
  platformSpecific: z.optional(z.string()), // Raw platform data as JSON

  // Metadata
  lastUpdated: z.date(),
  dataSource: z.enum(["ayrshare", "manual", "api"]),
  updateFrequency: z.optional(z.enum(["hourly", "daily", "weekly", "manual"])),
  nextUpdateDue: z.optional(z.date()),

  // Data quality indicators
  isComplete: z.boolean(),
  missingFields: z.optional(z.array(z.string())),
  confidence: z.optional(z.number()), // 0-1 confidence in data accuracy
});

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
  avatar: z.optional(z.string()), // URL fallback for compatibility
  avatarImage: co.optional(co.fileStream()), // Jazz FileStream for proper avatar storage
  username: z.optional(z.string()),
  displayName: z.optional(z.string()),
  url: z.optional(z.string()),

  // Connection Status
  status: z.enum(["pending", "linked", "error", "expired"]),
  lastError: z.optional(z.string()),

  // 📊 ANALYTICS DATA STORAGE
  currentAnalytics: co.optional(CurrentAnalytics),
  historicalAnalytics: co.list(AnalyticsDataPoint),

  // Analytics settings
  analyticsSettings: z.optional(
    z.object({
      autoUpdate: z.boolean(),
      updateFrequency: z.enum(["hourly", "daily", "weekly"]),
      trackMetrics: z.array(z.string()), // Which metrics to track
      alertThresholds: z.optional(
        z.object({
          followerDrop: z.optional(z.number()),
          engagementDrop: z.optional(z.number()),
        })
      ),
    })
  ),
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
  image: co.fileStream(),
  alt: co.optional(co.plainText()),
});

export const VideoMedia = co.map({
  type: z.literal("video"),
  video: co.fileStream(),
  alt: co.optional(co.plainText()),
});

// URL-based media for API posts
export const URLImageMedia = co.map({
  type: z.literal("url-image"),
  url: z.string(),
  alt: co.optional(co.plainText()),
  filename: z.optional(z.string()),
});

export const URLVideoMedia = co.map({
  type: z.literal("url-video"),
  url: z.string(),
  alt: co.optional(co.plainText()),
  filename: z.optional(z.string()),
});

export const MediaItem = co.discriminatedUnion("type", [
  ImageMedia,
  VideoMedia,
  URLImageMedia,
  URLVideoMedia,
]);

// Post performance tracking schema
export const PostPerformance = co.map({
  // Ayrshare integration
  ayrsharePostId: z.optional(z.string()),
  socialPostId: z.optional(z.string()),

  // Engagement metrics
  likes: z.optional(z.number()),
  comments: z.optional(z.number()),
  shares: z.optional(z.number()),
  views: z.optional(z.number()),
  impressions: z.optional(z.number()),
  reach: z.optional(z.number()),
  clicks: z.optional(z.number()),

  // Calculated metrics
  engagementRate: z.optional(z.number()),
  totalEngagement: z.optional(z.number()),

  // Platform-specific data (stored as JSON string)
  platformSpecific: z.optional(z.string()),

  // Metadata
  lastUpdated: z.date(),
  dataSource: z.enum(["ayrshare", "manual", "api"]),
  fetchedAt: z.date(),

  // Data quality indicators
  isComplete: z.boolean(),
  hasError: z.boolean(),
  errorMessage: z.optional(z.string()),
});

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
  // Performance tracking
  performance: co.optional(PostPerformance),
  // Ayrshare integration
  ayrsharePostId: z.optional(z.string()),
  socialPostUrl: z.optional(z.string()),
  // Platform-specific options (twitterOptions, instagramOptions, etc.) - stored as JSON string
  platformOptions: z.optional(z.string()),
});

export const Post = co.map({
  title: co.plainText(),
  variants: co.record(z.string(), PostVariant),
});

export type PostFullyLoaded = co.loaded<
  typeof Post,
  {
    variants: { $each: true };
  }
>;

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
  pricing: z.optional(
    z.object({
      currency: z.optional(z.string()),
      basePrice: z.optional(z.number()),
      priceRange: z.optional(z.string()),
      retailPrice: z.optional(z.number()),
    })
  ),

  // Product specifications
  specifications: z.optional(
    z.object({
      material: z.optional(z.string()),
      weight: z.optional(z.string()),
      dimensions: z.optional(z.string()),
      features: z.optional(z.array(z.string())),
      careInstructions: z.optional(z.string()),
    })
  ),

  // Variant information
  availableSizes: z.optional(z.array(z.string())),
  availableColors: z.optional(z.array(z.string())),
  printAreas: z.optional(z.array(z.string())),

  // Shopify-specific fields
  shopifyData: z.optional(
    z.object({
      productType: z.optional(z.string()),
      vendor: z.optional(z.string()),
      tags: z.optional(z.array(z.string())),
      handle: z.optional(z.string()),
      status: z.optional(z.enum(["draft", "active", "archived"])),
      publishedScope: z.optional(z.string()),
      publishingChannels: z.optional(z.array(z.string())),
    })
  ),

  // Store additional details for better display
  details: z.optional(
    z.object({
      size: z.optional(z.string()),
      material: z.optional(z.string()),
      color: z.optional(z.string()),
      orientation: z.optional(z.string()),
      endpoint: z.optional(z.string()),
      apiVersion: z.optional(z.string()),
    })
  ),

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
  availableChannels: z.optional(
    z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        enabled: z.boolean(),
        supportsTags: z.boolean(),
      })
    )
  ),
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
  status: z.enum(["created", "publishing", "published", "error"]),
  createdAt: z.date(),
  lastUpdated: z.date(),

  // Shopify integration status
  shopifyStatus: z.optional(z.enum(["pending", "syncing", "synced", "error"])),
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

// Prodigi Product Schema (for tracking created products)
export const ProdigiProduct = co.map({
  // Prodigi product details
  productId: z.string(),
  title: z.string(),
  description: z.optional(z.string()),
  tags: z.optional(z.array(z.string())),
  productType: z.optional(z.string()),

  // Source information
  sourcePost: z.object({
    title: z.string(),
    variant: z.optional(z.string()),
    postId: z.optional(z.string()),
  }),

  // Template information
  templateId: z.optional(z.string()),
  templateName: z.optional(z.string()),
  baseProductId: z.optional(z.string()),

  // Status tracking
  status: z.enum(["created", "publishing", "published", "error"]),
  createdAt: z.date(),
  lastUpdated: z.date(),

  // External store integration status
  externalStoreStatus: z.optional(
    z.enum(["pending", "syncing", "synced", "error"])
  ),
  externalProductId: z.optional(z.string()),
  externalProductUrl: z.optional(z.string()),
  externalMessage: z.optional(z.string()),

  // Prodigi specific fields
  selectedVariant: z.optional(
    z.object({
      id: z.string(),
      sku: z.optional(z.string()),
      size: z.optional(z.string()),
      color: z.optional(z.string()),
      material: z.optional(z.string()),
    })
  ),

  // Assets used
  assets: z.optional(
    z.array(
      z.object({
        id: z.string(),
        url: z.string(),
        filename: z.optional(z.string()),
        format: z.optional(z.string()),
      })
    )
  ),

  // Pricing info
  baseCost: z.optional(z.string()),
  retailPrice: z.optional(z.string()),
  currency: z.optional(z.string()),

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
  shopifyCredentials: co.optional(ShopifyCredentials),
  // Auto-creation settings
  autoCreateOnPublish: z.optional(z.boolean()),
});

// External Store Integration Schema
export const ExternalStore = co.map({
  name: z.string(),
  storeType: z.enum(["woocommerce", "shopify", "custom", "medusa", "magento"]),
  apiUrl: z.string(),
  apiKey: z.string(),
  webhookSecret: z.optional(z.string()),
  isConfigured: z.boolean(),
  connectedAt: z.optional(z.date()),
  // Store settings
  settings: z.optional(
    z.object({
      currency: z.optional(z.string()),
      taxIncluded: z.optional(z.boolean()),
      autoPublish: z.optional(z.boolean()),
      defaultCategory: z.optional(z.string()),
      markupPercentage: z.optional(z.number()),
    })
  ),
  // Posted products tracking
  postedProducts: co.list(
    co.map({
      id: z.string(),
      externalProductId: z.string(),
      externalProductUrl: z.optional(z.string()),
      name: z.string(),
      description: z.optional(z.string()),
      price: z.optional(z.string()),
      currency: z.optional(z.string()),
      status: z.enum(["draft", "published", "archived"]),
      postedAt: z.date(),
      sourcePostId: z.optional(z.string()),
      // Prodigi connection
      prodigiProductId: z.optional(z.string()),
      prodigiVariantSku: z.optional(z.string()),
      // Store-specific metadata
      storeMetadata: z.optional(
        z.object({
          category: z.optional(z.string()),
          tags: z.optional(z.array(z.string())),
          slug: z.optional(z.string()),
          featured: z.optional(z.boolean()),
        })
      ),
    })
  ),
  // Sync settings
  lastSync: z.optional(z.date()),
  syncErrors: z.optional(z.array(z.string())),
});

// Prodigi Integration Schema
export const ProdigiCredentials = co.map({
  apiKey: z.string(),
  sandboxMode: z.boolean(),
  isConfigured: z.boolean(),
  connectedAt: z.optional(z.date()),
  // Products as templates (like Gelato templates) - optional until first fetch
  templates: co.optional(
    co.list(
      co.map({
        id: z.string(),
        name: z.string(),
        displayName: z.optional(z.string()),
        productType: z.optional(z.string()),
        description: z.optional(z.string()),
        variants: z.optional(
          z.array(
            z.object({
              id: z.string(),
              sku: z.optional(z.string()),
              size: z.optional(z.string()),
              material: z.optional(z.string()),
              color: z.optional(z.string()),
              price: z.optional(z.string()),
              currency: z.optional(z.string()),
            })
          )
        ),
        printAreas: z.optional(
          z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              width: z.optional(z.number()),
              height: z.optional(z.number()),
              dpi: z.optional(z.number()),
            })
          )
        ),
        details: z.optional(
          z.object({
            sizes: z.optional(z.array(z.string())),
            materials: z.optional(z.array(z.string())),
            colors: z.optional(z.array(z.string())),
            category: z.optional(z.string()),
            minDpi: z.optional(z.number()),
            maxDpi: z.optional(z.number()),
          })
        ),
      })
    )
  ),
  templatesLastFetched: z.optional(z.date()),
  // Created product designs (before posting to store) - optional until first creation
  createdProducts: co.optional(co.list(ProdigiProduct)),
  // Auto-creation settings
  autoCreateOnPublish: z.optional(z.boolean()),
});

// =============================================================================
// 🎨 BRAND PERSONA SCHEMA (AI-POWERED BRAND VOICE)
// =============================================================================

export const BrandPersona = co.map({
  // Basic info
  name: z.string(),
  description: z.optional(z.string()),

  // Voice settings
  tone: z.enum([
    "professional",
    "casual",
    "friendly",
    "authoritative",
    "playful",
    "inspirational",
    "educational",
  ]),
  writingStyle: z.enum([
    "formal",
    "conversational",
    "witty",
    "direct",
    "storytelling",
    "technical",
  ]),
  emojiUsage: z.enum(["none", "minimal", "moderate", "frequent"]),
  languageLevel: z.enum(["simple", "intermediate", "advanced", "expert"]),
  personality: z.array(z.string()), // e.g., ["authentic", "helpful", "witty"]

  // Content strategy
  contentPillars: z.array(z.string()), // Main topics/themes
  targetAudience: z.string(),
  keyMessages: z.array(z.string()),
  valueProposition: z.optional(z.string()),
  avoidTopics: z.array(z.string()),

  // Engagement style
  commentStyle: z.optional(
    z.enum(["brief", "detailed", "questions", "supportive", "expert"])
  ),
  hashtagStrategy: z.optional(
    z.enum(["branded", "trending", "niche", "mixed"])
  ),
  callToActionStyle: z.optional(
    z.enum(["subtle", "direct", "creative", "none"])
  ),

  // Platform-specific customization (stored as JSON)
  platformCustomization: z.optional(z.string()), // JSON stringified

  // Examples for few-shot learning
  samplePosts: z.array(z.string()),
  sampleReplies: z.optional(z.array(z.string())),

  // Metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

// =============================================================================
// 📊 CONTENT FEEDBACK SCHEMA (LEARNING FROM ACCEPT/REJECT)
// =============================================================================

export const ContentFeedback = co.map({
  // The generated content
  generatedContent: z.string(),
  contentType: z.enum(["post", "reply", "caption", "thread"]),
  platform: z.optional(z.string()), // Which platform it was generated for

  // User decision
  accepted: z.boolean(),
  reason: z.optional(z.string()), // Why rejected/accepted
  editedVersion: z.optional(z.string()), // If user edited before accepting

  // Context about the generation
  promptUsed: z.optional(z.string()), // What prompt generated this
  confidenceScore: z.optional(z.number()), // AI's confidence 0-100

  // Learning metadata
  contentPillar: z.optional(z.string()), // Which content pillar was targeted
  toneUsed: z.optional(z.string()), // What tone was used

  // Metadata
  createdAt: z.date(),
});

// =============================================================================
// 🤖 AUTOMATION QUEUE SCHEMAS (AI AUTOPILOT)
// =============================================================================

export const QueuedPost = co.map({
  // Content
  content: z.string(),
  platform: z.string(),
  contentPillar: z.optional(z.string()),

  // Media (optional - for generated OG images or uploaded media)
  mediaUrls: z.optional(z.array(z.string())),
  ogImageTemplate: z.optional(z.enum(["quote", "tip", "stat", "announcement"])),

  // Timing
  suggestedAt: z.date(),
  scheduledFor: z.optional(z.date()),
  postedAt: z.optional(z.date()),

  // Status tracking
  status: z.enum([
    "pending",
    "approved",
    "rejected",
    "scheduled",
    "posted",
    "failed",
  ]),

  // Approval tracking
  approvedBy: z.optional(z.string()),
  approvedAt: z.optional(z.date()),
  rejectedReason: z.optional(z.string()),

  // AI metadata
  confidenceScore: z.optional(z.number()), // 0-100
  engagementPotential: z.optional(z.number()), // 0-100
  reasoning: z.optional(z.string()),

  // Post result tracking
  ayrsharePostId: z.optional(z.string()),
  socialPostUrl: z.optional(z.string()),
  errorMessage: z.optional(z.string()),
});

export const AutomationLog = co.map({
  // Action details
  type: z.enum(["post", "reply", "dm", "hashtag", "schedule", "approval"]),
  action: z.string(), // e.g., "Post scheduled for optimal engagement"
  platform: z.string(),

  // Status
  status: z.enum(["success", "pending", "failed"]),

  // Timing
  timestamp: z.date(),
  completedAt: z.optional(z.date()),

  // Details
  details: z.optional(z.string()), // JSON or description
  targetId: z.optional(z.string()), // Post ID, comment ID, etc.

  // Impact tracking
  engagementImpact: z.optional(z.number()),

  // Error tracking
  errorMessage: z.optional(z.string()),
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
  gelatoCredentials: co.optional(GelatoCredentials),

  // Prodigi Integration (per account group)
  prodigiCredentials: co.optional(ProdigiCredentials),

  // External Store Integration (per account group)
  externalStore: co.optional(ExternalStore),

  // Account Group Settings
  settings: z.optional(
    z.object({
      autoCreateProducts: z.optional(z.boolean()),
      defaultProductType: z.optional(z.string()),
      notifyOnProductCreation: z.optional(z.boolean()),
    })
  ),

  // Notification Settings
  notificationSettings: z.optional(
    z.object({
      pushover: z.optional(
        z.object({
          enabled: z.boolean(),
          apiToken: z.string(),
          userKey: z.string(),
          notifyOnPublish: z.optional(z.boolean()),
          notifyOnSchedule: z.optional(z.boolean()),
          notifyOnFailure: z.optional(z.boolean()),
          notifyOnBulkComplete: z.optional(z.boolean()),
        })
      ),
      email: z.optional(
        z.object({
          enabled: z.boolean(),
          recipients: z.array(z.string()),
          notifyOnPublish: z.optional(z.boolean()),
          notifyOnSchedule: z.optional(z.boolean()),
          notifyOnFailure: z.optional(z.boolean()),
        })
      ),
    })
  ),

  // Brand Persona for AI-powered content generation
  brandPersona: co.optional(BrandPersona),

  // Content feedback for learning from accept/reject decisions
  // Made optional for backwards compatibility with older account groups
  contentFeedback: co.optional(co.list(ContentFeedback)),

  // 🤖 Automation Queue - AI-generated posts awaiting approval/scheduling
  // Made optional for backwards compatibility with older account groups
  postQueue: co.optional(co.list(QueuedPost)),

  // 📊 Automation Activity Logs - track all automation actions
  // Made optional for backwards compatibility with older account groups
  automationLogs: co.optional(co.list(AutomationLog)),

  // 🎛️ Automation Settings
  automationSettings: z.optional(
    z.object({
      enabled: z.boolean(),
      aggressiveness: z.enum(["conservative", "moderate", "aggressive"]),
      postingMode: z.optional(z.enum(["manual", "semi-auto", "full-auto"])),
      automation: z.object({
        autoReply: z.boolean(),
        autoDM: z.boolean(),
        autoSchedule: z.boolean(),
        autoHashtags: z.boolean(),
        autoContent: z.boolean(),
        autoExecuteThreshold: z.optional(z.number()),
      }),
      approvals: z.object({
        requireApprovalForPosts: z.boolean(),
        requireApprovalForDMs: z.boolean(),
        requireApprovalForReplies: z.boolean(),
      }),
      goals: z.object({
        followerGrowthTarget: z.number(),
        engagementRateTarget: z.number(),
        postsPerWeek: z.number(),
        postsPerDayPerPlatform: z.optional(z.number()),
      }),
    })
  ),

  // 📦 Cached Autopilot Content - avoid regenerating on every page load
  cachedAutopilotContent: z.optional(
    z.object({
      generatedAt: z.string(),
      platform: z.string(),
      posts: z.array(
        z.object({
          id: z.string(),
          content: z.string(),
          platform: z.string(),
          confidence: z.number(),
          contentPillar: z.optional(z.string()),
          hashtags: z.optional(z.array(z.string())),
          bestTimeToPost: z.optional(z.string()),
          status: z.enum(["pending", "approved", "scheduled", "rejected"]),
        })
      ),
      recommendations: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          type: z.string(),
          priority: z.enum(["high", "medium", "low"]),
        })
      ),
    })
  ),
});

export type AccountGroupType = co.loaded<
  typeof AccountGroup,
  {
    accounts: { $each: true };
    posts: { $each: true };
    gelatoCredentials: {
      templates: { $each: true };
      createdProducts: { $each: true };
    };
    prodigiCredentials: {
      templates: { $each: true };
      createdProducts: { $each: true };
    };
    externalStore: {
      postedProducts: { $each: true };
    };
    brandPersona: true;
    // These are optional - initialized on-demand when accessed
    // contentFeedback, postQueue, automationLogs may be undefined on older accounts
  }
>;

// Export types for automation schemas
export type QueuedPostType = co.loaded<typeof QueuedPost>;
export type AutomationLogType = co.loaded<typeof AutomationLog>;

// Export types for the new schemas
export type BrandPersonaType = co.loaded<typeof BrandPersona>;
export type ContentFeedbackType = co.loaded<typeof ContentFeedback>;

// =============================================================================
// 💳 SUBSCRIPTION SCHEMA
// =============================================================================

export const SubscriptionTier = z.enum([
  "free",
  "premium",
  "business",
  "enterprise",
]);

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
  status: z.enum([
    "active",
    "canceled",
    "past_due",
    "unpaid",
    "incomplete",
    "trialing",
  ]),
  startDate: z.date(),
  endDate: z.optional(z.date()),
  billing: co.optional(SubscriptionBilling),
  usage: SubscriptionUsage,
  limits: SubscriptionLimits,
  trial: co.optional(SubscriptionTrial),
  grandfathered: z.boolean(),
  adminOverride: z.optional(
    z.object({
      tier: z.optional(SubscriptionTier),
      reason: z.optional(z.string()),
      grantedBy: z.optional(z.string()),
      expiresAt: z.optional(z.date()),
    })
  ),
});

// =============================================================================
// 🏢 COMPANY & ADMIN GROUPS
// =============================================================================

export const AdminRole = z.enum([
  "super_admin",
  "admin",
  "moderator",
  "support",
]);
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
  members: co.list(
    co.map({
      accountId: z.string(),
      role: AdminRole,
      addedAt: z.date(),
      addedBy: z.string(),
    })
  ),
});

// Collaboration schemas for team management
export const CollaboratorRole = z.enum(["owner", "admin", "editor", "viewer"]);
export type CollaboratorRole = z.infer<typeof CollaboratorRole>;

export const AccountCollaborator = co.map({
  account: co.account(),
  role: CollaboratorRole,
  addedAt: z.date(),
  addedBy: co.account(),
  permissions: co.map({
    canCreatePosts: z.boolean(),
    canEditPosts: z.boolean(),
    canDeletePosts: z.boolean(),
    canManageAccounts: z.boolean(),
    canInviteOthers: z.boolean(),
    canManageSubscription: z.boolean(),
  }),
});

export const CollaborationGroup = co.map({
  name: z.string(),
  description: z.optional(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  settings: co.map({
    allowPosting: z.boolean(),
    allowAnalytics: z.boolean(),
    allowAccountManagement: z.boolean(),
    requireApprovalForPosts: z.boolean(),
  }),
  collaborators: co.list(AccountCollaborator),
  invitedEmails: co.list(z.string()), // Track pending invites
});

// Update UserProfile to work with Jazz's profile system
export const SucculentProfile = co.profile({
  name: z.string(),
  email: z.optional(z.string()),
  avatar: z.optional(z.string()),
  bio: z.optional(z.string()),
  createdAt: z.optional(z.date()),
  updatedAt: z.optional(z.date()),

  // Subscription information
  subscription: co.optional(Subscription),

  // Admin privileges
  isSystemAdmin: z.optional(z.boolean()),
  adminGroups: co.optional(co.list(CompanyAdminGroup)),

  // Collaboration
  collaborationGroups: co.optional(co.list(CollaborationGroup)),
  ownedGroups: co.optional(co.list(CollaborationGroup)),

  // API Key Management - using simple storage for persistence
  apiKeys: co.optional(co.list(APIKey)), // Keep for compatibility
  apiKeysJson: z.optional(z.string()), // Simple JSON storage that actually persists
  apiKeyUsageLogs: co.optional(co.list(APIKeyUsageLog)),

  // API settings
  apiSettings: z.optional(
    z.object({
      maxKeysAllowed: z.number().default(5),
      defaultKeyExpiration: z.enum(["never", "30d", "90d", "1y"]).default("1y"),
      requireKeyExpiration: z.boolean().default(false),
      allowCORSOrigins: z.boolean().default(true),
      enableUsageLogging: z.boolean().default(true),
      rateLimitNotifications: z.boolean().default(true),
    })
  ),

  // User preferences for legacy compatibility
  preferences: z.optional(
    z.object({
      autoCreateProducts: z.boolean(),
      defaultProductType: z.optional(z.string()),
      notifyOnProductCreation: z.boolean(),
    })
  ),
});

export type SucculentProfile = co.loaded<typeof SucculentProfile>;

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

export type AccountRootLoaded = co.loaded<
  typeof AccountRoot,
  {
    accountGroups: {
      $each: {
        accounts: { $each: true };
        posts: { $each: true };
        gelatoCredentials: {
          templates: { $each: true };
          createdProducts: { $each: true };
        };
        prodigiCredentials: {
          templates: { $each: true };
          createdProducts: { $each: true };
        };
        externalStore: {
          postedProducts: { $each: true };
        };
        // postQueue, automationLogs, contentFeedback are optional
        // Initialized on-demand when accessed
      };
    };
  }
>;

export const MyAppAccount = co
  .account({
    root: AccountRoot,
    profile: SucculentProfile,
  })
  .withMigration(async (account, creationProps?: { name: string }) => {
    try {
      if (account.root === undefined) {
        try {
          const accountGroups = co
            .list(AccountGroup)
            .create([], { owner: account });
          // Create root with a group owner for proper Jazz functionality
          const rootGroup = Group.create();
          account.root = AccountRoot.create(
            {
              accountGroups: accountGroups,
            },
            { owner: rootGroup }
          );

          // Add server worker permissions to root and account groups
          if (process.env.JAZZ_WORKER_ACCOUNT) {
            try {
              const { Account } = await import("jazz-tools");
              const serverWorker = await Account.load(
                process.env.JAZZ_WORKER_ACCOUNT
              );
              if (serverWorker) {
                // Add to root group
                rootGroup.addMember(serverWorker, "writer");

                // Add to each account group
                if (account.root.accountGroups) {
                  for (const accountGroup of account.root.accountGroups) {
                    if (accountGroup?._owner instanceof Group) {
                      accountGroup._owner.addMember(serverWorker, "writer");
                    }
                  }
                }
              }
            } catch (workerError) {
              // Worker permissions will be added during API calls
            }
          }
        } catch (error) {
          console.error("❌ Failed to create account root:", error);
        }
      }

      if (account.profile === undefined) {
        try {
          // Create profile owned by a Group (required by Jazz)
          const profileGroup = Group.create();
          profileGroup.makePublic();
          account.profile = SucculentProfile.create(
            {
              name: creationProps?.name ?? "New user",
              collaborationGroups: co
                .list(CollaborationGroup)
                .create([], profileGroup),
              ownedGroups: co.list(CollaborationGroup).create([], profileGroup),
              apiKeys: co.list(APIKey).create([], profileGroup),
              apiKeyUsageLogs: co.list(APIKeyUsageLog).create([], profileGroup),
            },
            profileGroup
          );
        } catch (error) {
          console.error("❌ Failed to create account profile:", error);
          throw error;
        }
      } else {
        // Migrate existing profiles to fix ownership and add missing fields
        if (account.profile) {
          try {
            console.log("🔧 Migrating existing profile...");

            // Always clean up the profile name first
            const originalName = account.profile.name;
            let cleanedName = originalName.replace(/-test-\d+/g, "");
            if (!cleanedName || cleanedName.trim() === "") {
              cleanedName = "My Account";
            }

            const needsNameCleanup = originalName !== cleanedName;
            console.log("🧹 Profile name cleanup:", {
              original: originalName,
              cleaned: cleanedName,
              needsCleanup: needsNameCleanup,
            });

            if (needsNameCleanup) {
              account.profile.name = cleanedName;
              console.log("✅ Profile name cleaned up");
            }

            // Check if profile is owned by the account (incorrect) or by a Group (correct)
            const currentOwner = account.profile._owner;
            const needsOwnershipFix = currentOwner?.id === account.id; // Account ownership is WRONG, Group ownership is CORRECT

            console.log("🔍 Profile ownership check:", {
              accountId: account.id,
              profileOwnerId: currentOwner?.id,
              needsOwnershipFix,
            });

            if (needsOwnershipFix) {
              console.log(
                "⚠️ Profile ownership needs fixing but SKIPPING recreation to preserve data"
              );
              console.log(
                "🔧 Just adding missing fields without destroying existing data..."
              );
            }

            // Always just add missing fields without destroying the profile
            {
              // Profile ownership is correct, just add missing fields
              if (!account.profile.apiKeys) {
                const profileOwner = account.profile._owner;
                account.profile.apiKeys = co
                  .list(APIKey)
                  .create([], profileOwner);
              }

              if (!account.profile.apiKeyUsageLogs) {
                const profileOwner = account.profile._owner;
                account.profile.apiKeyUsageLogs = co
                  .list(APIKeyUsageLog)
                  .create([], profileOwner);
              }

              console.log("✅ Profile updated with missing fields");
            }
          } catch (migrationError) {
            console.error("❌ Failed to migrate profile:", migrationError);
            // Continue without throwing - this is not critical for basic functionality
          }
        }
      }
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  });

export type MyAppAccount = co.loaded<typeof MyAppAccount>;

// TODO: this is used in a lot of places, what do we actually need loaded?
export type MyAppAccountLoaded = MyAppAccount;
