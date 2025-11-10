'use client';

import { useEffect, useState } from 'react';
import { MyAppAccountLoaded } from '@/app/schema';
import { useSubscription } from '@/utils/subscriptionManager';
import { PaywallBlock } from './PaywallBlock';

interface PlatformVariantsGuardProps {
  account: MyAppAccountLoaded;
  variantsToCreate?: number;
  children: React.ReactNode;
  onUpgrade?: () => void;
}

export function PlatformVariantsGuard({ 
  account, 
  variantsToCreate = 1, 
  children, 
  onUpgrade 
}: PlatformVariantsGuardProps) {
  const { canCreatePlatformVariants, getUsageSummary } = useSubscription(account);
  const [canCreateVariants, setCanCreateVariants] = useState(true);
  const [usageSummary, setUsageSummary] = useState<any>(null);

  useEffect(() => {
    const canCreate = canCreatePlatformVariants(variantsToCreate);
    const summary = getUsageSummary();
    setCanCreateVariants(canCreate);
    setUsageSummary(summary);
  }, [canCreatePlatformVariants, getUsageSummary, variantsToCreate]);

  // If user can create variants, show the children
  if (canCreateVariants) {
    return <>{children}</>;
  }

  // If user has reached the limit, show paywall
  const variantsUsage = usageSummary?.usage?.platformVariants;
  
  return (
    <PaywallBlock
      title="Platform Variants Limit Reached"
      description={`You've used ${variantsUsage?.used || 0} of ${variantsUsage?.limit || 0} platform variants this month. Upgrade to Pro for unlimited variants.`}
      type="overlay"
      feature="platform-variants"
      customUpgradeAction={onUpgrade}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Platform Variants Usage</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Used this month:</span>
              <span className="font-medium">{variantsUsage?.used || 0} / {variantsUsage?.limit || 0}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${variantsUsage?.percentage || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Platform variants</strong> allow you to customize your content for different social media platforms automatically.
          </p>
          <p>
            Upgrade to <strong>Pro</strong> for unlimited platform variants and advanced customization options.
          </p>
        </div>
      </div>
    </PaywallBlock>
  );
}

// Hook to easily check variants limit
export function usePlatformVariantsLimit(account: MyAppAccountLoaded) {
  const { canCreatePlatformVariants, getUsageSummary, trackPlatformVariantsUsage } = useSubscription(account);
  const [state, setState] = useState({
    canCreateVariants: true,
    usage: { used: 0, limit: 0, percentage: 0 }
  });

  useEffect(() => {
    const summary = getUsageSummary();
    const variantsUsage = summary?.usage?.platformVariants;
    
    setState({
      canCreateVariants: canCreatePlatformVariants(1),
      usage: {
        used: variantsUsage?.used || 0,
        limit: variantsUsage?.limit || 0,
        percentage: variantsUsage?.percentage || 0
      }
    });
  }, [canCreatePlatformVariants, getUsageSummary]);

  const trackVariantUsage = (count: number = 1) => {
    return trackPlatformVariantsUsage(count);
  };

  return {
    ...state,
    trackVariantUsage
  };
} 