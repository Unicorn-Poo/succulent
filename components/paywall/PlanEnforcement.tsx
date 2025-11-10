"use client";

import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { useSubscription } from "@/utils/subscriptionManager";
import { PaywallBlock, UsageLimitPaywall, AnalyticsPaywall, SchedulingPaywall, BrandManagementPaywall } from "./PaywallBlock";
import { Card, Text, Badge, Button, Progress } from "@radix-ui/themes";
import { AlertTriangle, Lock, Star, Zap, Crown, TrendingUp, Users, Database, BarChart3 } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

// =============================================================================
// 🔒 PLAN ENFORCEMENT WRAPPER
// =============================================================================

interface PlanEnforcementProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  showPreview?: boolean;
  onLimitReached?: () => void;
}

export function PlanEnforcement({ 
  children, 
  feature, 
  fallback, 
  showPreview = false,
  onLimitReached 
}: PlanEnforcementProps) {
  const { me } = useAccount(MyAppAccount);
  const { hasFeature, currentTier } = useSubscription(me);
  
  if (!me) {
    return <div>Loading...</div>;
  }

  // If user has the feature, render children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // If onLimitReached callback provided, call it
  if (onLimitReached) {
    onLimitReached();
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show preview if enabled
  if (showPreview) {
    return (
      <div className="relative">
        <div className="blur-sm opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Badge color="gray" variant="soft">
            <Lock className="w-3 h-3 mr-1" />
            Preview Mode - Upgrade to Access
          </Badge>
        </div>
      </div>
    );
  }

  // Default: show paywall
  return (
    <PaywallBlock
      feature={feature}
      title={`${feature.replace(/-/g, ' ')} Feature`}
      description={`This feature requires a higher plan. Current plan: ${currentTier}`}
      type="inline"
    >
      {children}
    </PaywallBlock>
  );
}

// =============================================================================
// 🎯 USAGE LIMIT COMPONENTS
// =============================================================================

export function PostLimitGuard({ children }: { children: ReactNode }) {
  const { me } = useAccount(MyAppAccount);
  const { hasReachedLimit, getUsagePercentage, subscription } = useSubscription(me);
  
  if (!me) return null;

  if (hasReachedLimit('maxPosts')) {
    return (
      <UsageLimitPaywall limitType="posts">
        {children}
      </UsageLimitPaywall>
    );
  }

  const usage = getUsagePercentage('maxPosts');
  const postsUsed = subscription?.usage?.monthlyPosts || 0;
  const postsLimit = subscription?.limits?.maxPosts || 20;

  // Show warning when approaching limit
  if (usage > 80) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <Text size="2" weight="bold" className="text-amber-800">
              Approaching Post Limit
            </Text>
          </div>
          <Text size="1" className="text-amber-700 mb-2">
            You&apos;ve used {postsUsed} of {postsLimit} posts this month ({usage.toFixed(0)}%)
          </Text>
          <Progress value={usage} className="mb-2" />
          <Button size="1" variant="soft" onClick={() => window.open('/pricing', '_blank')}>
            Upgrade for More Posts
          </Button>
        </Card>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

export function AccountLimitGuard({ children }: { children: ReactNode }) {
  const { me } = useAccount(MyAppAccount);
  const { hasReachedLimit, getUsagePercentage, subscription } = useSubscription(me);
  
  if (!me) return null;

  if (hasReachedLimit('maxConnectedAccounts')) {
    return (
      <UsageLimitPaywall limitType="accounts">
        {children}
      </UsageLimitPaywall>
    );
  }

  const usage = getUsagePercentage('maxConnectedAccounts');
  const accountsUsed = subscription?.usage?.connectedAccounts || 0;
  const accountsLimit = subscription?.limits?.maxConnectedAccounts || 5;

  // Show warning when approaching limit
  if (usage > 80) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-amber-600" />
            <Text size="2" weight="bold" className="text-amber-800">
              Account Limit Warning
            </Text>
          </div>
          <Text size="1" className="text-amber-700 mb-2">
            You&apos;ve connected {accountsUsed} of {accountsLimit} accounts ({usage.toFixed(0)}%)
          </Text>
          <Progress value={usage} className="mb-2" />
          <Button size="1" variant="soft" onClick={() => window.open('/pricing', '_blank')}>
            Upgrade for More Accounts
          </Button>
        </Card>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

export function StorageLimitGuard({ children }: { children: ReactNode }) {
  const { me } = useAccount(MyAppAccount);
  const { hasReachedLimit, getUsagePercentage, subscription } = useSubscription(me);
  
  if (!me) return null;

  if (hasReachedLimit('maxStorageMB')) {
    return (
      <UsageLimitPaywall limitType="storage">
        {children}
      </UsageLimitPaywall>
    );
  }

  const usage = getUsagePercentage('maxStorageMB');
  const storageUsed = subscription?.usage?.storageUsedMB || 0;
  const storageLimit = subscription?.limits?.maxStorageMB || 100;

  // Show warning when approaching limit
  if (usage > 80) {
    return (
      <div className="space-y-4">
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-amber-600" />
            <Text size="2" weight="bold" className="text-amber-800">
              Storage Limit Warning
            </Text>
          </div>
          <Text size="1" className="text-amber-700 mb-2">
            You&apos;ve used {storageUsed.toFixed(1)}MB of {storageLimit}MB ({usage.toFixed(0)}%)
          </Text>
          <Progress value={usage} className="mb-2" />
          <Button size="1" variant="soft" onClick={() => window.open('/pricing', '_blank')}>
            Upgrade for More Storage
          </Button>
        </Card>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// =============================================================================
// 🎨 USAGE TRACKING COMPONENTS
// =============================================================================

interface UsageTrackerProps {
  children: ReactNode;
  trackingType: 'post' | 'account' | 'storage' | 'analytics' | 'api';
  amount?: number;
  onUsageTracked?: (success: boolean) => void;
}

export function UsageTracker({ 
  children, 
  trackingType, 
  amount = 1,
  onUsageTracked 
}: UsageTrackerProps) {
  const { me } = useAccount(MyAppAccount);
  const subscription = useSubscription(me);
  
  const trackUsage = () => {
    if (!me) return;
    
    let success = false;
    
    switch (trackingType) {
      case 'post':
        success = subscription.trackPostUsage(amount);
        break;
      case 'account':
        success = subscription.trackConnectedAccountUsage();
        break;
      case 'storage':
        success = subscription.trackStorageUsage(amount);
        break;
      case 'analytics':
        success = subscription.trackAnalyticsUsage();
        break;
      case 'api':
        success = subscription.trackApiUsage();
        break;
    }
    
    if (onUsageTracked) {
      onUsageTracked(success);
    }
  };

  // Track usage when component mounts
  useEffect(() => {
    trackUsage();
  }, [trackUsage]);
  
  if (!me) return null;

  return <>{children}</>;
}

// =============================================================================
// 🎯 FEATURE-SPECIFIC GUARDS
// =============================================================================

export function AnalyticsGuard({ children }: { children: ReactNode }) {
  return (
    <PlanEnforcement feature="analytics">
      <AnalyticsPaywall>
        {children}
      </AnalyticsPaywall>
    </PlanEnforcement>
  );
}

export function SchedulingGuard({ children }: { children: ReactNode }) {
  return (
    <PlanEnforcement feature="scheduled-posting">
      <SchedulingPaywall>
        {children}
      </SchedulingPaywall>
    </PlanEnforcement>
  );
}

export function BrandManagementGuard({ children }: { children: ReactNode }) {
  return (
    <PlanEnforcement feature="brand-management">
      <BrandManagementPaywall>
        {children}
      </BrandManagementPaywall>
    </PlanEnforcement>
  );
}

export function MultiMediaGuard({ children }: { children: ReactNode }) {
  return (
    <PlanEnforcement 
      feature="multiple-media"
      fallback={
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <Text size="2" weight="bold" className="text-blue-800">
              Single Image Only
            </Text>
          </div>
          <Text size="1" className="text-blue-700">
            Multiple images and videos require a premium plan
          </Text>
        </Card>
      }
    >
      {children}
    </PlanEnforcement>
  );
}

export function BulkUploadGuard({ children }: { children: ReactNode }) {
  return (
    <PlanEnforcement 
      feature="bulk-uploads"
      fallback={
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <Text size="2" weight="bold" className="text-purple-800">
              Bulk Upload Available
            </Text>
          </div>
          <Text size="1" className="text-purple-700">
            Upload multiple posts at once with Premium
          </Text>
        </Card>
      }
    >
      {children}
    </PlanEnforcement>
  );
}

// =============================================================================
// 🎭 TRIAL SYSTEM COMPONENTS
// =============================================================================

export function TrialBanner() {
  const { me } = useAccount(MyAppAccount);
  const { isInTrial, getTrialInfo, currentTier } = useSubscription(me);
  
  if (!me) return null;

  if (!isInTrial()) return null;

  const trialInfo = getTrialInfo();

  return (
    <Card className="p-4 mb-4 bg-gradient-to-r from-lime-50 to-green-50 border-lime-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-lime-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-lime-600" />
          </div>
          <div>
            <Text size="3" weight="bold" className="text-lime-800">
              Free Trial Active
            </Text>
            <Text size="2" className="text-lime-700">
              {trialInfo.tier} plan • {trialInfo.daysRemaining} days remaining
            </Text>
          </div>
        </div>
        <Button 
          size="2" 
          className="bg-lime-600 hover:bg-lime-700 text-white"
          onClick={() => window.open('/pricing', '_blank')}
        >
          Upgrade Now
        </Button>
      </div>
    </Card>
  );
}

export function UsageDashboard() {
  const { me } = useAccount(MyAppAccount);
  const { getUsageSummary, currentTier } = useSubscription(me);
  
  if (!me) return null;
  const summary = getUsageSummary();

  if (!summary) return null;

  const usageItems = [
    {
      label: 'Posts',
      icon: <TrendingUp className="w-4 h-4" />,
      usage: summary.usage.posts,
      color: 'blue'
    },
    {
      label: 'Accounts',
      icon: <Users className="w-4 h-4" />,
      usage: summary.usage.connectedAccounts,
      color: 'green'
    },
    {
      label: 'Storage',
      icon: <Database className="w-4 h-4" />,
      usage: summary.usage.storage,
      color: 'purple'
    },
    {
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      usage: summary.usage.analytics,
      color: 'orange'
    }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Text size="4" weight="bold">Usage Overview</Text>
        <Badge color="lime" variant="soft">
          {summary.planName} Plan
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {usageItems.map((item, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {item.icon}
              <Text size="2" weight="medium">{item.label}</Text>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Text size="1" color="gray">
                  {item.usage.used} / {item.usage.limit === -1 ? '∞' : item.usage.limit}
                </Text>
                <Text size="1" color="gray">
                  {item.usage.percentage.toFixed(0)}%
                </Text>
              </div>
              
              <Progress 
                value={item.usage.percentage} 
                className="h-2"
                color={item.usage.percentage > 80 ? 'red' : item.usage.percentage > 60 ? 'yellow' : 'green'}
              />
            </div>
          </Card>
        ))}
      </div>

      {currentTier === 'free' && (
        <div className="mt-4 pt-4 border-t">
          <Button 
            className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white"
            onClick={() => window.open('/pricing', '_blank')}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade for More Resources
          </Button>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// 🔧 UTILITY HOOKS
// =============================================================================

export function useFeatureCheck(feature: string) {
  const { me } = useAccount(MyAppAccount);
  const { hasFeature, currentTier } = useSubscription(me);
  
  if (!me) {
    return { hasFeature: false, currentTier: 'free' };
  }
  
  return {
    hasFeature: hasFeature(feature),
    currentTier,
    canUseFeature: hasFeature(feature)
  };
}

export function usePlanLimits() {
  const { me } = useAccount(MyAppAccount);
  const subscription = useSubscription(me);
  
  if (!me) {
    return {
      hasReachedPostLimit: true,
      hasReachedAccountLimit: true,
      hasReachedStorageLimit: true,
      canPost: false,
      canAddAccount: false,
      canUploadMedia: false
    };
  }
  
  return {
    hasReachedPostLimit: subscription.hasReachedLimit('maxPosts'),
    hasReachedAccountLimit: subscription.hasReachedLimit('maxConnectedAccounts'),
    hasReachedStorageLimit: subscription.hasReachedLimit('maxStorageMB'),
    canPost: !subscription.hasReachedLimit('maxPosts'),
    canAddAccount: !subscription.hasReachedLimit('maxConnectedAccounts'),
    canUploadMedia: !subscription.hasReachedLimit('maxStorageMB'),
    subscription
  };
} 