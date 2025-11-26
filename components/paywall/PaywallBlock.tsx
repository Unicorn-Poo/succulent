"use client";

import { Card, Text, Button, Badge, Dialog } from "@radix-ui/themes";
import { Lock, Star, Zap, Crown, X, Check } from "lucide-react";
import { useState } from "react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { useSubscription, PLAN_DEFINITIONS, formatPrice } from "@/utils/subscriptionManager";

// =============================================================================
// 🎨 UTILITIES
// =============================================================================

function getPlanColor(tier: string): 'gray' | 'lime' | 'purple' | 'orange' {
  switch (tier) {
    case 'premium': return 'lime';
    case 'business': return 'purple';
    case 'enterprise': return 'orange';
    default: return 'gray';
  }
}

// =============================================================================
// 🔒 PAYWALL BLOCK TYPES
// =============================================================================

interface PaywallBlockProps {
  feature: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  type?: 'modal' | 'inline' | 'overlay';
  requiredTier?: 'premium' | 'business' | 'enterprise';
  children?: React.ReactNode;
  showTrialOffer?: boolean;
  customUpgradeAction?: () => void;
  className?: string;
}

// =============================================================================
// 🎨 PAYWALL COMPONENT
// =============================================================================

export function PaywallBlock({
  feature,
  title,
  description,
  icon = <Lock className="w-5 h-5" />,
  type = 'inline',
  requiredTier = 'premium',
  children,
  showTrialOffer = true,
  customUpgradeAction,
  className = ""
}: PaywallBlockProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { me } = useAccount(MyAppAccount);
  const subscription = useSubscription(me);
  const { hasFeature, currentTier, isInTrial, getTrialInfo, startTrial, getUpgradeOptions } = subscription;
  
  if (!me) return null;

  // If user has the feature, render children
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  const currentPlan = PLAN_DEFINITIONS[currentTier];
  const requiredPlan = PLAN_DEFINITIONS[requiredTier];
  const upgradeOptions = getUpgradeOptions();
  const trialInfo = getTrialInfo();
  const canStartTrial = !trialInfo.trialUsed && !isInTrial();

  // =============================================================================
  // 🎯 UPGRADE ACTIONS
  // =============================================================================

  const handleUpgrade = () => {
    if (customUpgradeAction) {
      customUpgradeAction();
    } else {
      // Open pricing page
      window.open('https://succulent.app/pricing', '_blank');
    }
  };

  const handleStartTrial = () => {
    if (canStartTrial) {
      startTrial(requiredTier, 14);
      setShowUpgradeDialog(false);
    }
  };

  // =============================================================================
  // 🎨 RENDER COMPONENTS
  // =============================================================================

  const PaywallContent = () => (
    <div className="text-center">
      <div className="flex items-center justify-center mb-4">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-${getPlanColor(requiredTier)}-100 to-${getPlanColor(requiredTier)}-200 flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      
      <Text size="4" weight="bold" className="block mb-2">
        {title}
      </Text>
      
      <Text size="2" color="gray" className="block mb-4">
        {description}
      </Text>
      
      <div className="flex items-center justify-center gap-2 mb-4">
        <Badge color="gray" variant="soft">
          Current: {currentPlan.name}
        </Badge>
        <Badge color={getPlanColor(requiredTier)} variant="solid">
          Required: {requiredPlan.name}
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Trial Offer */}
        {showTrialOffer && canStartTrial && (
          <Button
            onClick={handleStartTrial}
            size="3"
            className="w-full bg-gradient-to-r from-lime-500 to-green-500 hover:from-lime-600 hover:to-green-600 text-white"
          >
            <Star className="w-4 h-4 mr-2" />
            Start 14-Day Free Trial
          </Button>
        )}

        {/* Upgrade Button */}
        <Button
          onClick={handleUpgrade}
          size="3"
          variant={canStartTrial ? "outline" : "solid"}
          className="w-full"
        >
          <Zap className="w-4 h-4 mr-2" />
          Upgrade to {requiredPlan.name}
        </Button>

        {/* Learn More */}
        <Button
          onClick={() => setShowUpgradeDialog(true)}
          size="2"
          variant="ghost"
          className="w-full"
        >
          Learn More About Plans
        </Button>
      </div>
    </div>
  );

  const UpgradeDialog = () => (
    <Dialog.Root open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
      <Dialog.Content style={{ maxWidth: 800 }}>
        <Dialog.Title className="flex items-center gap-2">
          <Crown className="w-5 h-5" />
          Upgrade Your Plan
        </Dialog.Title>
        
        <Dialog.Description>
          Choose the plan that best fits your needs
        </Dialog.Description>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {upgradeOptions.map((plan) => (
            <Card key={plan.tier} className={`p-4 ${plan.popular ? 'border-2 border-lime-500' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <Text size="3" weight="bold">{plan.name}</Text>
                {plan.popular && (
                  <Badge color="lime" variant="solid">Most Popular</Badge>
                )}
              </div>
              
              <Text size="2" color="gray" className="block mb-4">
                {plan.description}
              </Text>
              
              <div className="flex items-baseline gap-1 mb-4">
                <Text size="5" weight="bold">
                  {formatPrice(plan.price.monthly)}
                </Text>
                <Text size="2" color="gray">/month</Text>
              </div>
              
              <div className="space-y-2 mb-4">
                {plan.features.slice(0, 5).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-lime-500" />
                    <Text size="1">{feature.replace(/-/g, ' ')}</Text>
                  </div>
                ))}
                {plan.features.length > 5 && (
                  <Text size="1" color="gray">
                    +{plan.features.length - 5} more features
                  </Text>
                )}
              </div>
              
              <Button 
                className="w-full"
                onClick={handleUpgrade}
                variant={plan.popular ? "solid" : "outline"}
              >
                Upgrade to {plan.name}
              </Button>
            </Card>
          ))}
        </div>

        <Dialog.Close>
          <Button variant="ghost" className="absolute top-3 right-3">
            <X className="w-4 h-4" />
          </Button>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );

  // =============================================================================
  // 🎨 RENDER BASED ON TYPE
  // =============================================================================

  if (type === 'modal') {
    return (
      <>
        <Dialog.Root>
          <Dialog.Trigger>
            <div className={`cursor-pointer ${className}`}>
              {children}
            </div>
          </Dialog.Trigger>
          <Dialog.Content style={{ maxWidth: 450 }}>
            <Dialog.Title>Feature Locked</Dialog.Title>
            <PaywallContent />
          </Dialog.Content>
        </Dialog.Root>
        <UpgradeDialog />
      </>
    );
  }

  if (type === 'overlay') {
    return (
      <div className={`relative ${className}`}>
        {/* Blurred/disabled content */}
        <div className="blur-sm opacity-50 pointer-events-none">
          {children}
        </div>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-card/90 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md">
            <PaywallContent />
          </Card>
        </div>
        
        <UpgradeDialog />
      </div>
    );
  }

  // Default: inline
  return (
    <div className={className}>
      <Card className="p-6">
        <PaywallContent />
      </Card>
      <UpgradeDialog />
    </div>
  );
}

// =============================================================================
// 🎯 SPECIALIZED PAYWALL COMPONENTS
// =============================================================================

export function AnalyticsPaywall({ children }: { children: React.ReactNode }) {
  return (
    <PaywallBlock
      feature="analytics"
      title="Analytics Dashboard"
      description="Get detailed insights into your post performance, audience engagement, and growth metrics."
      icon={<Zap className="w-5 h-5 text-lime-500" />}
      type="overlay"
      requiredTier="premium"
    >
      {children}
    </PaywallBlock>
  );
}

export function SchedulingPaywall({ children }: { children: React.ReactNode }) {
  return (
    <PaywallBlock
      feature="scheduled-posting"
      title="Scheduled Posting"
      description="Schedule your posts to go live at optimal times for maximum engagement."
      icon={<Star className="w-5 h-5 text-purple-500" />}
      type="overlay"
      requiredTier="premium"
    >
      {children}
    </PaywallBlock>
  );
}

export function BrandManagementPaywall({ children }: { children: React.ReactNode }) {
  return (
    <PaywallBlock
      feature="brand-management"
      title="Brand Management"
      description="Manage your brand assets, templates, and team collaboration features."
      icon={<Crown className="w-5 h-5 text-purple-500" />}
      type="overlay"
      requiredTier="business"
    >
      {children}
    </PaywallBlock>
  );
}

export function UsageLimitPaywall({ 
  limitType,
  children 
}: { 
  limitType: 'posts' | 'accounts' | 'storage';
  children: React.ReactNode;
}) {
  const getPaywallProps = () => {
    switch (limitType) {
      case 'posts':
        return {
          title: "Post Limit Reached",
          description: "You've reached your monthly post limit. Upgrade to post more content.",
          icon: <Lock className="w-5 h-5 text-red-500" />
        };
      case 'accounts':
        return {
          title: "Account Limit Reached",
          description: "You've reached your connected account limit. Upgrade to connect more social media accounts.",
          icon: <Lock className="w-5 h-5 text-red-500" />
        };
      case 'storage':
        return {
          title: "Storage Limit Reached",
          description: "You've reached your storage limit. Upgrade to upload more media.",
          icon: <Lock className="w-5 h-5 text-red-500" />
        };
      default:
        return {
          title: "Limit Reached",
          description: "You've reached your plan limit. Upgrade to continue.",
          icon: <Lock className="w-5 h-5 text-red-500" />
        };
    }
  };

  const props = getPaywallProps();

  return (
    <PaywallBlock
      feature="unlimited-usage"
      title={props.title}
      description={props.description}
      icon={props.icon}
      type="inline"
      requiredTier="premium"
      showTrialOffer={false}
    >
      {children}
    </PaywallBlock>
  );
}

// =============================================================================
// 🔧 UTILITY COMPONENTS
// =============================================================================

export function FeaturePreview({ 
  feature, 
  children 
}: { 
  feature: string;
  children: React.ReactNode;
}) {
  const { me } = useAccount(MyAppAccount);
  const { hasFeature } = useSubscription(me);
  
  if (!me) return null;

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm opacity-75">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Badge color="gray" variant="soft">
          <Lock className="w-3 h-3 mr-1" />
          Preview Mode
        </Badge>
      </div>
    </div>
  );
}

export function PlanBadge({ 
  tier, 
  className = "" 
}: { 
  tier: 'free' | 'premium' | 'business' | 'enterprise';
  className?: string;
}) {
  const plan = PLAN_DEFINITIONS[tier];
  const color = getPlanColor(tier);
  
  return (
    <Badge color={color} variant="solid" className={className}>
      {plan.name}
    </Badge>
  );
} 