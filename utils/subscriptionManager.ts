import { MyAppAccount, MyAppAccountLoaded, SubscriptionTier, Subscription, SubscriptionUsage, SubscriptionLimits, SubscriptionTrial, SubscriptionBilling } from '@/app/schema';
import { z } from 'jazz-tools';
import { FreeTierManager } from './freeTierManager';

// =============================================================================
// 💳 SUBSCRIPTION PLAN DEFINITIONS
// =============================================================================

type SubscriptionTierType = z.infer<typeof SubscriptionTier>;
type SubscriptionType = z.infer<typeof Subscription>;
type SubscriptionLimitsType = z.infer<typeof SubscriptionLimits>;

export interface PlanDefinition {
  tier: SubscriptionTierType;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  limits: {
    maxPosts: number;
    maxAccountGroups: number;
    maxConnectedAccounts: number;
    maxStorageMB: number;
    maxAnalyticsRequests: number;
    maxApiCalls: number;
    maxPlatformVariants: number;
  };
  features: string[];
  popular?: boolean;
  comingSoon?: boolean;
}

export const PLAN_DEFINITIONS: Record<SubscriptionTierType, PlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Creator',
    description: 'Perfect for individual creators getting started',
    price: { monthly: 0, yearly: 0 },
    limits: {
      maxPosts: 10, // 10 posts per month
      maxAccountGroups: 1,
      maxConnectedAccounts: 11, // 1 per platform (11 platforms max)
      maxStorageMB: 500,
      maxAnalyticsRequests: 0, // no analytics
      maxApiCalls: 100,
      maxPlatformVariants: 3, // 3 platform variants
    },
    features: [
      'automatic-saving',
      'offline-editing',
      'cross-device-sync',
      'platform-variants', // 3 platform variants
      'basic-scheduling',
      'basic-posting',
      'post-history',
      'profile-info',
      'single-images',
      'community-support'
    ],
  },
  premium: {
    tier: 'premium',
    name: 'Pro',
    description: 'For creators who need more power and flexibility',
    price: { monthly: 12, yearly: 120 },
    limits: {
      maxPosts: -1, // unlimited posts
      maxAccountGroups: 3,
      maxConnectedAccounts: 11, // 1 per platform (11 platforms max)
      maxStorageMB: 5000, // 5GB
      maxAnalyticsRequests: 1000,
      maxApiCalls: 1000,
      maxPlatformVariants: -1, // unlimited platform variants
    },
    features: [
      'automatic-saving',
      'offline-editing',
      'cross-device-sync',
      'unlimited-platform-variants',
      'advanced-scheduling',
      'team-collaboration', // up to 5
      'commerce-integrations',
      'analytics-insights',
      'basic-posting',
      'post-history',
      'profile-info',
      'single-images',
      'multiple-media',
      'scheduled-posting',
      'priority-support'
    ],
    popular: true,
  },
  business: {
    tier: 'business',
    name: 'Business',
    description: 'For teams and agencies',
    price: { monthly: 49, yearly: 490 },
    limits: {
      maxPosts: -1, // unlimited
      maxAccountGroups: 10,
      maxConnectedAccounts: -1, // unlimited accounts per platform
      maxStorageMB: 50000, // 50GB
      maxAnalyticsRequests: 10000,
      maxApiCalls: 10000,
      maxPlatformVariants: -1, // unlimited platform variants
    },
    features: [
      'automatic-saving',
      'offline-editing',
      'cross-device-sync',
      'unlimited-platform-variants',
      'advanced-scheduling',
      'unlimited-team-collaboration',
      'commerce-integrations',
      'analytics-insights',
      'basic-posting',
      'post-history',
      'profile-info',
      'single-images',
      'multiple-media',
      'scheduled-posting',
      'priority-support',
      'bulk-uploads',
      'custom-templates',
      'brand-management',
      'advanced-comments',
      'white-labeling'
    ],
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For teams and organizations with specific needs',
    price: { monthly: 0, yearly: 0 }, // Custom pricing
    limits: {
      maxPosts: -1, // unlimited
      maxAccountGroups: -1,
      maxConnectedAccounts: -1,
      maxStorageMB: -1,
      maxAnalyticsRequests: -1,
      maxApiCalls: -1,
      maxPlatformVariants: -1, // unlimited platform variants
    },
    features: [
      'automatic-saving',
      'offline-editing',
      'cross-device-sync',
      'unlimited-platform-variants',
      'advanced-scheduling',
      'unlimited-team-collaboration',
      'commerce-integrations',
      'analytics-insights',
      'custom-integrations',
      'advanced-security',
      'priority-support',
      'on-premise-deployment',
      'basic-posting',
      'post-history',
      'profile-info',
      'single-images',
      'multiple-media',
      'scheduled-posting',
      'bulk-uploads',
      'custom-templates',
      'brand-management',
      'advanced-comments',
      'white-labeling',
      'webhooks',
      'api-access',
      'dedicated-support',
      'sla-guarantee'
    ],
  },
};

// =============================================================================
// 💳 SUBSCRIPTION MANAGER CLASS
// =============================================================================

export class SubscriptionManager {
  private account: MyAppAccountLoaded;
  private freeTierManager: FreeTierManager;

  constructor(account: MyAppAccountLoaded) {
    this.account = account;
    this.freeTierManager = new FreeTierManager();
  }

  // =============================================================================
  // 🔍 PLAN VALIDATION & ACCESS
  // =============================================================================

  /**
   * Get the current subscription information
   */
  getCurrentSubscription() {
    return this.account.profile?.subscription || null;
  }

  /**
   * Get the current plan tier
   */
  getCurrentTier() {
    const subscription = this.getCurrentSubscription();
    
    // Check for admin override first
    if (subscription?.adminOverride?.tier) {
      const overrideExpiry = subscription.adminOverride.expiresAt;
      if (!overrideExpiry || overrideExpiry > new Date()) {
        return subscription.adminOverride.tier;
      }
    }
    
    // Check for active trial
    if (subscription?.trial?.isInTrial) {
      const trialEnd = subscription.trial.trialEndDate;
      if (trialEnd && trialEnd > new Date()) {
        return subscription.trial.trialTier || 'free';
      }
    }
    
    return subscription?.tier || 'free';
  }

  /**
   * Get the current plan definition
   */
  getCurrentPlan(): PlanDefinition {
    const tier = this.getCurrentTier();
    return PLAN_DEFINITIONS[tier];
  }

  /**
   * Check if a feature is available on the current plan
   */
  hasFeature(feature: string): boolean {
    const plan = this.getCurrentPlan();
    return plan.features.includes(feature);
  }

  /**
   * Check if user has reached a usage limit
   */
  hasReachedLimit(limitType: keyof SubscriptionLimits): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return true;

    const limit = subscription.limits[limitType];
    const usage = subscription.usage;

    // -1 means unlimited
    if (limit === -1) return false;

    switch (limitType) {
      case 'maxPosts':
        return usage.monthlyPosts >= limit;
      case 'maxAccountGroups':
        return usage.accountGroups >= limit;
      case 'maxConnectedAccounts':
        return usage.connectedAccounts >= limit;
      case 'maxStorageMB':
        return usage.storageUsedMB >= limit;
      case 'maxAnalyticsRequests':
        return usage.analyticsRequests >= limit;
      case 'maxApiCalls':
        return usage.apiCalls >= limit;
      default:
        return false;
    }
  }

  /**
   * Get usage percentage for a specific limit
   */
  getUsagePercentage(limitType: keyof SubscriptionLimits): number {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return 100;

    const limit = subscription.limits[limitType];
    const usage = subscription.usage;

    if (limit === -1) return 0; // unlimited

    switch (limitType) {
      case 'maxPosts':
        return Math.min(100, (usage.monthlyPosts / limit) * 100);
      case 'maxAccountGroups':
        return Math.min(100, (usage.accountGroups / limit) * 100);
      case 'maxConnectedAccounts':
        return Math.min(100, (usage.connectedAccounts / limit) * 100);
      case 'maxStorageMB':
        return Math.min(100, (usage.storageUsedMB / limit) * 100);
      case 'maxAnalyticsRequests':
        return Math.min(100, (usage.analyticsRequests / limit) * 100);
      case 'maxApiCalls':
        return Math.min(100, (usage.apiCalls / limit) * 100);
      default:
        return 0;
    }
  }

  // =============================================================================
  // 📊 USAGE TRACKING
  // =============================================================================

  /**
   * Track post creation
   */
  trackPostUsage(count: number = 1): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxPosts')) {
      return false;
    }

    subscription.usage.monthlyPosts += count;
    subscription.usage.apiCalls += 1;
    
         // Also update the free tier manager for consistency
     FreeTierManager.recordPost(count);
    
    return true;
  }

  /**
   * Track account group creation
   */
  trackAccountGroupUsage(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxAccountGroups')) {
      return false;
    }

    subscription.usage.accountGroups += 1;
    return true;
  }

  /**
   * Track connected account addition
   */
  trackConnectedAccountUsage(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxConnectedAccounts')) {
      return false;
    }

    subscription.usage.connectedAccounts += 1;
    return true;
  }

  /**
   * Check if a platform account can be added (for Free/Pro one-per-platform limit)
   */
  canAddPlatformAccount(platform: string, existingAccounts: any[]): boolean {
    const currentTier = this.getCurrentTier();
    
    // Business and Enterprise: unlimited per platform
    if (currentTier === 'business' || currentTier === 'enterprise') {
      return true;
    }

    // Free and Pro plans: max 1 account per platform
    if (currentTier === 'free' || currentTier === 'premium') {
      const platformCount = existingAccounts.filter(account => 
        account.platform === platform
      ).length;
      return platformCount < 1;
    }

    return true;
  }

  /**
   * Get platform limits for current tier
   */
  getPlatformLimits(): { accountsPerPlatform: number; totalPlatforms: number } {
    const currentTier = this.getCurrentTier();
    
    if (currentTier === 'free' || currentTier === 'premium') {
      return {
        accountsPerPlatform: 1,
        totalPlatforms: 11 // All available platforms
      };
    }
    
    return {
      accountsPerPlatform: -1, // unlimited
      totalPlatforms: -1 // unlimited
    };
  }

  /**
   * Track storage usage
   */
  trackStorageUsage(sizeInMB: number): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxStorageMB')) {
      return false;
    }

    subscription.usage.storageUsedMB += sizeInMB;
    return true;
  }

  /**
   * Track analytics request
   */
  trackAnalyticsUsage(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxAnalyticsRequests')) {
      return false;
    }

    subscription.usage.analyticsRequests += 1;
    return true;
  }

  /**
   * Track API call
   */
  trackApiUsage(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxApiCalls')) {
      return false;
    }

    subscription.usage.apiCalls += 1;
    return true;
  }

  /**
   * Track platform variants usage for posts
   */
  trackPlatformVariantsUsage(count: number = 1): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    if (this.hasReachedLimit('maxPlatformVariants')) {
      return false;
    }

    subscription.usage.platformVariantsUsed += count;
    return true;
  }

  /**
   * Check if user can create more platform variants
   */
  canCreatePlatformVariants(count: number = 1): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    const currentLimits = subscription.limits;
    const currentUsage = subscription.usage;
    
    // Unlimited variants
    if (currentLimits.maxPlatformVariants === -1) return true;
    
    // Check if we have enough remaining
    return currentUsage.platformVariantsUsed + count <= currentLimits.maxPlatformVariants;
  }

  /**
   * Reset monthly usage counters
   */
  resetMonthlyUsage(): void {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return;

    const now = new Date();
    subscription.usage.monthlyPosts = 0;
    subscription.usage.analyticsRequests = 0;
    subscription.usage.apiCalls = 0;
    subscription.usage.platformVariantsUsed = 0;
    subscription.usage.lastResetDate = now;
  }

  /**
   * Check if monthly usage should be reset
   */
  shouldResetMonthlyUsage(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    const now = new Date();
    const lastReset = subscription.usage.lastResetDate;
    const daysDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysDiff >= 30;
  }

  // =============================================================================
  // 🎯 TRIAL MANAGEMENT
  // =============================================================================

  /**
   * Start a trial for a specific tier
   */
  startTrial(tier: SubscriptionTier, durationDays: number = 14): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;

    // Check if trial was already used
    if (subscription.trial?.trialUsed) {
      return false;
    }

    const now = new Date();
    const endDate = new Date(now.getTime() + (durationDays * 24 * 60 * 60 * 1000));

    if (!subscription.trial) {
      subscription.trial = {
        isInTrial: true,
        trialStartDate: now,
        trialEndDate: endDate,
        trialTier: tier,
        trialUsed: true,
        trialExtensions: 0,
      };
    } else {
      subscription.trial.isInTrial = true;
      subscription.trial.trialStartDate = now;
      subscription.trial.trialEndDate = endDate;
      subscription.trial.trialTier = tier;
      subscription.trial.trialUsed = true;
    }

    // Update limits for trial tier
    const trialPlan = PLAN_DEFINITIONS[tier];
    subscription.limits.maxPosts = trialPlan.limits.maxPosts;
    subscription.limits.maxAccountGroups = trialPlan.limits.maxAccountGroups;
    subscription.limits.maxConnectedAccounts = trialPlan.limits.maxConnectedAccounts;
    subscription.limits.maxStorageMB = trialPlan.limits.maxStorageMB;
    subscription.limits.maxAnalyticsRequests = trialPlan.limits.maxAnalyticsRequests;
    subscription.limits.maxApiCalls = trialPlan.limits.maxApiCalls;
    subscription.limits.features = trialPlan.features;

    return true;
  }

  /**
   * Check if user is currently in trial
   */
  isInTrial(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription?.trial) return false;

    if (!subscription.trial.isInTrial) return false;

    const now = new Date();
    const trialEnd = subscription.trial.trialEndDate;
    
    if (!trialEnd || trialEnd <= now) {
      // Trial has expired
      subscription.trial.isInTrial = false;
      return false;
    }

    return true;
  }

  /**
   * Get trial information
   */
  getTrialInfo(): {
    isInTrial: boolean;
    tier?: SubscriptionTier;
    daysRemaining?: number;
    trialUsed: boolean;
  } {
    const subscription = this.getCurrentSubscription();
    
    if (!subscription?.trial) {
      return { isInTrial: false, trialUsed: false };
    }

    const isInTrial = this.isInTrial();
    let daysRemaining = 0;

    if (isInTrial && subscription.trial.trialEndDate) {
      const now = new Date();
      const timeDiff = subscription.trial.trialEndDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }

    return {
      isInTrial,
      tier: subscription.trial.trialTier,
      daysRemaining,
      trialUsed: subscription.trial.trialUsed,
    };
  }

  // =============================================================================
  // 💰 BILLING HELPERS
  // =============================================================================

  /**
   * Calculate next billing date
   */
  getNextBillingDate(): Date | null {
    const subscription = this.getCurrentSubscription();
    return subscription?.billing?.nextBillingDate || null;
  }

  /**
   * Get billing status
   */
  getBillingStatus(): string {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return 'free';
    
    return subscription.status;
  }

  /**
   * Check if subscription is active
   */
  isSubscriptionActive(): boolean {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return false;
    
    return ['active', 'trialing'].includes(subscription.status);
  }

  // =============================================================================
  // 🔄 UPGRADE/DOWNGRADE HELPERS
  // =============================================================================

  /**
   * Get available upgrade options
   */
  getUpgradeOptions(): PlanDefinition[] {
    const currentTier = this.getCurrentTier();
    const tierOrder: SubscriptionTier[] = ['free', 'premium', 'business', 'enterprise'];
    const currentIndex = tierOrder.indexOf(currentTier);
    
    return tierOrder
      .slice(currentIndex + 1)
      .map(tier => PLAN_DEFINITIONS[tier])
      .filter(plan => !plan.comingSoon);
  }

  /**
   * Calculate potential savings with yearly billing
   */
  getYearlySavings(tier: SubscriptionTier): number {
    const plan = PLAN_DEFINITIONS[tier];
    const monthlyTotal = plan.price.monthly * 12;
    const yearlyTotal = plan.price.yearly;
    return monthlyTotal - yearlyTotal;
  }

  // =============================================================================
  // 📈 ANALYTICS & REPORTING
  // =============================================================================

  /**
   * Get usage summary for current month
   */
  getUsageSummary() {
    const subscription = this.getCurrentSubscription();
    if (!subscription) return null;

    const plan = this.getCurrentPlan();
    
    return {
      tier: this.getCurrentTier(),
      planName: plan.name,
      usage: {
        posts: {
          used: subscription.usage.monthlyPosts,
          limit: subscription.limits.maxPosts,
          percentage: this.getUsagePercentage('maxPosts')
        },
        accountGroups: {
          used: subscription.usage.accountGroups,
          limit: subscription.limits.maxAccountGroups,
          percentage: this.getUsagePercentage('maxAccountGroups')
        },
        connectedAccounts: {
          used: subscription.usage.connectedAccounts,
          limit: subscription.limits.maxConnectedAccounts,
          percentage: this.getUsagePercentage('maxConnectedAccounts')
        },
        storage: {
          used: subscription.usage.storageUsedMB,
          limit: subscription.limits.maxStorageMB,
          percentage: this.getUsagePercentage('maxStorageMB')
        },
        analytics: {
          used: subscription.usage.analyticsRequests,
          limit: subscription.limits.maxAnalyticsRequests,
          percentage: this.getUsagePercentage('maxAnalyticsRequests')
        },
        apiCalls: {
          used: subscription.usage.apiCalls,
          limit: subscription.limits.maxApiCalls,
          percentage: this.getUsagePercentage('maxApiCalls')
        },
        platformVariants: {
          used: subscription.usage.platformVariantsUsed,
          limit: subscription.limits.maxPlatformVariants,
          percentage: this.getUsagePercentage('maxPlatformVariants')
        }
      },
      trial: this.getTrialInfo(),
      billing: {
        status: this.getBillingStatus(),
        nextBillingDate: this.getNextBillingDate()
      }
    };
  }
}

// =============================================================================
// 🪝 REACT HOOKS
// =============================================================================

/**
 * React hook for subscription management
 */
export function useSubscription(account: MyAppAccountLoaded) {
  const subscriptionManager = new SubscriptionManager(account);
  
  return {
    // Plan info
    currentTier: subscriptionManager.getCurrentTier(),
    currentPlan: subscriptionManager.getCurrentPlan(),
    subscription: subscriptionManager.getCurrentSubscription(),
    
    // Feature checks
    hasFeature: (feature: string) => subscriptionManager.hasFeature(feature),
    hasReachedLimit: (limitType: keyof SubscriptionLimits) => subscriptionManager.hasReachedLimit(limitType),
    getUsagePercentage: (limitType: keyof SubscriptionLimits) => subscriptionManager.getUsagePercentage(limitType),
    
    // Usage tracking
    trackPostUsage: (count?: number) => subscriptionManager.trackPostUsage(count),
    trackAccountGroupUsage: () => subscriptionManager.trackAccountGroupUsage(),
    trackConnectedAccountUsage: () => subscriptionManager.trackConnectedAccountUsage(),
    trackStorageUsage: (sizeInMB: number) => subscriptionManager.trackStorageUsage(sizeInMB),
    trackAnalyticsUsage: () => subscriptionManager.trackAnalyticsUsage(),
    trackApiUsage: () => subscriptionManager.trackApiUsage(),
    trackPlatformVariantsUsage: (count?: number) => subscriptionManager.trackPlatformVariantsUsage(count),
    canCreatePlatformVariants: (count?: number) => subscriptionManager.canCreatePlatformVariants(count),
    
    // Trial management
    isInTrial: () => subscriptionManager.isInTrial(),
    getTrialInfo: () => subscriptionManager.getTrialInfo(),
    startTrial: (tier: SubscriptionTier, durationDays?: number) => subscriptionManager.startTrial(tier, durationDays),
    
    // Billing
    isSubscriptionActive: () => subscriptionManager.isSubscriptionActive(),
    getNextBillingDate: () => subscriptionManager.getNextBillingDate(),
    getBillingStatus: () => subscriptionManager.getBillingStatus(),
    
    // Upgrade helpers
    getUpgradeOptions: () => subscriptionManager.getUpgradeOptions(),
    getYearlySavings: (tier: SubscriptionTier) => subscriptionManager.getYearlySavings(tier),
    
    // Analytics
    getUsageSummary: () => subscriptionManager.getUsageSummary(),
    
    // Platform limits
    canAddPlatformAccount: (platform: string, existingAccounts: any[]) => 
      subscriptionManager.canAddPlatformAccount(platform, existingAccounts),
    getPlatformLimits: () => subscriptionManager.getPlatformLimits(),
    
    // Reset (for admin/testing)
    resetMonthlyUsage: () => subscriptionManager.resetMonthlyUsage(),
    shouldResetMonthlyUsage: () => subscriptionManager.shouldResetMonthlyUsage(),
  };
}

// =============================================================================
// 📊 UTILITY FUNCTIONS
// =============================================================================

/**
 * Format storage size for display
 */
export function formatStorageSize(sizeInMB: number): string {
  if (sizeInMB < 1024) {
    return `${sizeInMB.toFixed(1)} MB`;
  } else {
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price);
}

/**
 * Get plan color for UI
 */
export function getPlanColor(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free': return 'gray';
    case 'premium': return 'lime';
    case 'business': return 'purple';
    case 'enterprise': return 'gold';
    default: return 'gray';
  }
} 