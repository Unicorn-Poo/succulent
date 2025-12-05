"use client";

import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { useSubscription } from "@/utils/subscriptionManager";
import { Card, Text, Badge, Button } from "@radix-ui/themes";
import { Crown, Users, Lock } from "lucide-react";
import { ReactNode } from "react";
import Image from "next/image";
import { getPlatformIcon, getPlatformLabel } from "@/utils/platformIcons";

// =============================================================================
// 🎯 PLATFORM ACCOUNT GUARD
// =============================================================================

interface PlatformAccountGuardProps {
  children: ReactNode;
  platform: string;
  existingAccounts: any[];
  onUpgradeClick?: () => void;
}

export function PlatformAccountGuard({ 
  children, 
  platform, 
  existingAccounts,
  onUpgradeClick 
}: PlatformAccountGuardProps) {
  const { me } = useAccount(MyAppAccount);
  const { canAddPlatformAccount, currentTier, getPlatformLimits } = useSubscription(me);
  
  if (!me) return null;
  const platformLimits = getPlatformLimits();
  
  // Check if this platform can have another account
  const canAdd = canAddPlatformAccount(platform, existingAccounts);
  
  // If user can add account, render children
  if (canAdd) {
    return <>{children}</>;
  }

  // Get current platform count
  const platformCount = existingAccounts.filter(account => 
    account.platform === platform
  ).length;

  // Show platform limit message
  return (
    <Card className="p-6 bg-amber-50 border-amber-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Lock className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <Text size="4" weight="bold" className="text-amber-800 block">
            Platform Account Limit Reached
          </Text>
          <Text size="2" className="text-amber-700">
            {currentTier === 'free' ? 'Creator' : 'Pro'} plan allows 1 account per platform
          </Text>
        </div>
      </div>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between p-3 bg-card rounded-lg border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center p-1">
              <Image
                src={getPlatformIcon(platform)}
                alt={platform}
                width={16}
                height={16}
                className="dark:invert"
              />
            </div>
            <Text size="2" weight="medium">
              {getPlatformLabel(platform)}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="amber" variant="soft">
              {platformCount}/{platformLimits.accountsPerPlatform} used
            </Badge>
          </div>
        </div>
        
        <Text size="2" color="gray">
          You already have {platformCount} {platform} account{platformCount !== 1 ? 's' : ''} connected. 
          {currentTier === 'free' || currentTier === 'premium' 
            ? ' Your plan allows only 1 account per platform.' 
            : ''
          }
        </Text>
      </div>

      <div className="flex flex-col gap-3">
        <div className="p-3 bg-brand-mint/10 dark:bg-brand-seafoam/20 rounded-lg">
          <Text size="2" weight="medium" className="text-brand-seafoam dark:text-brand-mint block mb-1">
            💡 What you can do:
          </Text>
          <ul className="text-sm text-brand-seafoam dark:text-brand-mint space-y-1">
            <li>• Connect accounts on different platforms</li>
            <li>• Upgrade to Business plan for unlimited accounts per platform</li>
            <li>• Remove an existing {platform} account to add a new one</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            size="2" 
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={onUpgradeClick || (() => window.open('/pricing', '_blank'))}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Business
          </Button>
          
          <Button 
            size="2" 
            variant="outline" 
            className="flex-1"
            onClick={() => window.open(`/account-settings?platform=${platform}`, '_blank')}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Accounts
          </Button>
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// 🎯 PLATFORM OVERVIEW COMPONENT
// =============================================================================

interface PlatformAccountOverviewProps {
  existingAccounts: any[];
  onUpgradeClick?: () => void;
}

export function PlatformAccountOverview({ existingAccounts, onUpgradeClick }: PlatformAccountOverviewProps) {
  const { me } = useAccount(MyAppAccount);
  const { currentTier, getPlatformLimits } = useSubscription(me);
  
  if (!me) return null;
  const platformLimits = getPlatformLimits();
  
  // Count accounts per platform
  const platformCounts: Record<string, number> = {};
  existingAccounts.forEach(account => {
    platformCounts[account.platform] = (platformCounts[account.platform] || 0) + 1;
  });

  const platforms = [
    'instagram', 'facebook', 'x', 'linkedin', 'youtube', 
    'tiktok', 'pinterest', 'reddit', 'telegram', 'threads'
  ];

  const isLimited = currentTier === 'free' || currentTier === 'premium';

  if (!isLimited) {
    return null; // No restrictions for Business/Enterprise
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Text size="4" weight="bold">Platform Account Limits</Text>
          <Text size="2" color="gray">
            {currentTier === 'free' ? 'Creator' : 'Pro'} plan: 1 account per platform
          </Text>
        </div>
        <Badge color="lime" variant="soft">
          {currentTier === 'free' ? 'Creator' : 'Pro'} Plan
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {platforms.map(platform => {
          const count = platformCounts[platform] || 0;
          const atLimit = count >= platformLimits.accountsPerPlatform;
          
          return (
            <div 
              key={platform}
              className={`p-3 rounded-lg border transition-colors ${
                atLimit 
                  ? 'bg-amber-50 border-amber-200' 
                  : count > 0 
                    ? 'bg-brand-mint/10 border-brand-mint/40'
                    : 'bg-muted border-border'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-4 h-4 rounded ${
                  atLimit 
                    ? 'bg-amber-500' 
                    : count > 0 
                      ? 'bg-brand-seafoam'
                      : 'bg-muted-foreground/30'
                }`}></div>
                <Text size="1" weight="medium" className="capitalize">
                  {platform}
                </Text>
              </div>
              <Text size="1" color="gray">
                {count}/{platformLimits.accountsPerPlatform}
              </Text>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-brand-mint/10 dark:bg-brand-seafoam/20 rounded-lg mb-4">
        <Text size="2" weight="medium" className="text-brand-seafoam dark:text-brand-mint block mb-1">
          💡 Platform Strategy Tips
        </Text>
        <Text size="1" className="text-brand-seafoam dark:text-brand-mint">
          Focus on 3-5 platforms where your audience is most active. 
          Quality engagement beats quantity every time!
        </Text>
      </div>

      <Button 
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        onClick={onUpgradeClick || (() => window.open('/pricing', '_blank'))}
      >
        <Crown className="w-4 h-4 mr-2" />
        Upgrade for Unlimited Platform Accounts
      </Button>
    </Card>
  );
}

// =============================================================================
// 🔧 UTILITY FUNCTIONS
// =============================================================================

export function usePlatformLimits(existingAccounts: any[]) {
  const { me } = useAccount(MyAppAccount);
  const { canAddPlatformAccount, currentTier, getPlatformLimits } = useSubscription(me);
  
  if (!me) {
    return {
      canAddPlatform: () => false,
      getPlatformUsage: () => ({ used: 0, limit: 1, canAdd: false }),
      isLimited: true
    };
  }
  const platformLimits = getPlatformLimits();
  
  return {
    canAddPlatform: (platform: string) => canAddPlatformAccount(platform, existingAccounts),
    getPlatformUsage: (platform: string) => {
      const used = existingAccounts.filter(account => account.platform === platform).length;
      return {
        used,
        limit: platformLimits.accountsPerPlatform,
        canAdd: platformLimits.accountsPerPlatform === -1 || used < platformLimits.accountsPerPlatform
      };
    },
    isLimited: currentTier === 'free' || currentTier === 'premium',
    currentTier,
    platformLimits
  };
} 