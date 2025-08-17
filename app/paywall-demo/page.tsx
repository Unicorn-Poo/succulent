"use client";

import { Card, Text, Button, Badge, Tabs, Heading, Flex, Box, Container } from "@radix-ui/themes";
import { Lock, Star, Zap, Crown, TrendingUp, Users, Database, BarChart3, Shield, Calendar, Package } from "lucide-react";
import { useState } from "react";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { 
  PaywallBlock, 
  AnalyticsPaywall, 
  SchedulingPaywall, 
  BrandManagementPaywall, 
  UsageLimitPaywall,
  PlanBadge,
  FeaturePreview 
} from "@/components/paywall/PaywallBlock";
import { 
  PlanEnforcement, 
  PostLimitGuard, 
  AccountLimitGuard, 
  StorageLimitGuard,
  TrialBanner,
  UsageDashboard,
  AnalyticsGuard,
  SchedulingGuard,
  BrandManagementGuard
} from "@/components/paywall/PlanEnforcement";
import { 
  PlatformAccountGuard, 
  PlatformAccountOverview, 
  usePlatformLimits 
} from "@/components/paywall/PlatformAccountGuard";
import { PLAN_DEFINITIONS } from "@/utils/subscriptionManager";
import Link from "next/link";

// =============================================================================
// 🎨 DEMO COMPONENTS
// =============================================================================

const DemoAnalytics = () => (
  <Card className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <BarChart3 className="w-5 h-5 text-blue-500" />
      <Text size="4" weight="bold">Analytics Dashboard</Text>
    </div>
    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="text-center">
        <Text size="5" weight="bold" className="block text-blue-600">1.2K</Text>
        <Text size="2" color="gray">Impressions</Text>
      </div>
      <div className="text-center">
        <Text size="5" weight="bold" className="block text-green-600">85</Text>
        <Text size="2" color="gray">Engagements</Text>
      </div>
      <div className="text-center">
        <Text size="5" weight="bold" className="block text-purple-600">7.1%</Text>
        <Text size="2" color="gray">Engagement Rate</Text>
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 bg-blue-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: '70%' }}></div>
      </div>
      <div className="h-4 bg-green-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: '45%' }}></div>
      </div>
      <div className="h-4 bg-purple-100 rounded-full overflow-hidden">
        <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }}></div>
      </div>
    </div>
  </Card>
);

const DemoScheduling = () => (
  <Card className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <Calendar className="w-5 h-5 text-purple-500" />
      <Text size="4" weight="bold">Scheduled Posts</Text>
    </div>
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        <div className="flex-1">
          <Text size="2" weight="medium">Monday, 9:00 AM</Text>
          <Text size="1" color="gray">Morning motivation post</Text>
        </div>
        <Badge color="purple" variant="soft">Scheduled</Badge>
      </div>
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div className="flex-1">
          <Text size="2" weight="medium">Tuesday, 3:00 PM</Text>
          <Text size="1" color="gray">Product update announcement</Text>
        </div>
        <Badge color="blue" variant="soft">Scheduled</Badge>
      </div>
      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div className="flex-1">
          <Text size="2" weight="medium">Wednesday, 6:00 PM</Text>
          <Text size="1" color="gray">Behind the scenes content</Text>
        </div>
        <Badge color="green" variant="soft">Scheduled</Badge>
      </div>
    </div>
  </Card>
);

const DemoBrandManagement = () => (
  <Card className="p-6">
    <div className="flex items-center gap-2 mb-4">
      <Package className="w-5 h-5 text-orange-500" />
      <Text size="4" weight="bold">Brand Assets</Text>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="w-full h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Text size="2" weight="bold" className="text-white">Logo</Text>
        </div>
        <Text size="1" color="gray">Primary Logo</Text>
      </div>
      <div className="space-y-2">
        <div className="w-full h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
          <Text size="2" weight="bold" className="text-white">Alt</Text>
        </div>
        <Text size="1" color="gray">Alternative Logo</Text>
      </div>
      <div className="space-y-2">
        <div className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <Text size="2" weight="bold" className="text-white">Banner</Text>
        </div>
        <Text size="1" color="gray">Social Banner</Text>
      </div>
      <div className="space-y-2">
        <div className="w-full h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
          <Text size="2" weight="bold" className="text-white">Icon</Text>
        </div>
        <Text size="1" color="gray">App Icon</Text>
      </div>
    </div>
  </Card>
);

// =============================================================================
// 🎭 MAIN DEMO PAGE
// =============================================================================

export default function PaywallDemoPage() {
  const [activeTab, setActiveTab] = useState("components");
  const { me } = useAccount(MyAppAccount);

  return (
    <Container size="4" className="py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="w-8 h-8 text-lime-500" />
          <Heading size="6">Paywall System Demo</Heading>
        </div>
        <Text size="3" color="gray">
          Demonstration of Succulent's subscription and paywall system
        </Text>
        <div className="flex items-center justify-center gap-4 mt-4">
          <Link href="/">
            <Button variant="soft">← Back to Dashboard</Button>
          </Link>
          <Link href="/analytics-demo">
            <Button variant="outline">Analytics Demo</Button>
          </Link>
        </div>
      </div>

      {/* Trial Banner */}
      <TrialBanner />

      {/* Main Content */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="grid grid-cols-4 gap-1 mb-6">
          <Tabs.Trigger value="components">Components</Tabs.Trigger>
          <Tabs.Trigger value="guards">Guards</Tabs.Trigger>
          <Tabs.Trigger value="plans">Plans</Tabs.Trigger>
          <Tabs.Trigger value="usage">Usage</Tabs.Trigger>
        </Tabs.List>

        {/* Components Tab */}
        <Tabs.Content value="components">
          <div className="space-y-8">
            <div>
              <Heading size="4" className="mb-4">Paywall Components</Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Analytics Paywall */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Analytics Paywall</Text>
                  <AnalyticsPaywall>
                    <DemoAnalytics />
                  </AnalyticsPaywall>
                </div>

                {/* Scheduling Paywall */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Scheduling Paywall</Text>
                  <SchedulingPaywall>
                    <DemoScheduling />
                  </SchedulingPaywall>
                </div>

                {/* Brand Management Paywall */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Brand Management</Text>
                  <BrandManagementPaywall>
                    <DemoBrandManagement />
                  </BrandManagementPaywall>
                </div>

                {/* Usage Limit Paywall */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Usage Limit</Text>
                  <UsageLimitPaywall limitType="posts">
                    <Card className="p-4">
                      <Text>Post creation interface would go here</Text>
                    </Card>
                  </UsageLimitPaywall>
                </div>
              </div>
            </div>

            <div>
              <Heading size="4" className="mb-4">Feature Preview</Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Preview Mode</Text>
                  <FeaturePreview feature="analytics">
                    <DemoAnalytics />
                  </FeaturePreview>
                </div>
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Plan Badges</Text>
                  <div className="flex flex-wrap gap-2">
                    <PlanBadge tier="free" />
                    <PlanBadge tier="premium" />
                    <PlanBadge tier="business" />
                    <PlanBadge tier="enterprise" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Guards Tab */}
        <Tabs.Content value="guards">
          <div className="space-y-8">
            <div>
              <Heading size="4" className="mb-4">Plan Enforcement Guards</Heading>
              <div className="grid grid-cols-1 gap-6">
                {/* Post Limit Guard */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Post Limit Guard</Text>
                  <PostLimitGuard>
                    <Card className="p-4">
                      <Text>This content is protected by the post limit guard</Text>
                    </Card>
                  </PostLimitGuard>
                </div>

                {/* Account Limit Guard */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Account Limit Guard</Text>
                  <AccountLimitGuard>
                    <Card className="p-4">
                      <Text>This content is protected by the account limit guard</Text>
                    </Card>
                  </AccountLimitGuard>
                </div>

                {/* Storage Limit Guard */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Storage Limit Guard</Text>
                  <StorageLimitGuard>
                    <Card className="p-4">
                      <Text>This content is protected by the storage limit guard</Text>
                    </Card>
                  </StorageLimitGuard>
                </div>

                                {/* Platform Account Guard */}
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Platform Account Guard</Text>
                  <PlatformAccountGuard 
                    platform="instagram" 
                    existingAccounts={[
                      { platform: 'instagram', name: 'existing_account' }
                    ]}
                  >
                    <Card className="p-4">
                      <Text>Add another Instagram account (blocked for Free/Pro plans)</Text>
                    </Card>
                  </PlatformAccountGuard>
                </div>
              </div>
            </div>

            <div>
              <Heading size="4" className="mb-4">Platform Account Overview</Heading>
              <PlatformAccountOverview 
                existingAccounts={[
                  { platform: 'instagram', name: 'account1' },
                  { platform: 'x', name: 'account2' },
                  { platform: 'linkedin', name: 'account3' }
                ]}
              />
            </div>

            <div>
              <Heading size="4" className="mb-4">Feature Guards</Heading>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Analytics Guard</Text>
                  <AnalyticsGuard>
                    <DemoAnalytics />
                  </AnalyticsGuard>
                </div>
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Scheduling Guard</Text>
                  <SchedulingGuard>
                    <DemoScheduling />
                  </SchedulingGuard>
                </div>
                <div>
                  <Text size="3" weight="bold" className="mb-2 block">Brand Guard</Text>
                  <BrandManagementGuard>
                    <DemoBrandManagement />
                  </BrandManagementGuard>
                </div>
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Plans Tab */}
        <Tabs.Content value="plans">
          <div className="space-y-8">
            <div>
              <Heading size="4" className="mb-4">Subscription Plans</Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.values(PLAN_DEFINITIONS).map((plan) => (
                  <Card key={plan.tier} className={`p-6 ${plan.popular ? 'border-2 border-lime-500' : ''}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <PlanBadge tier={plan.tier} />
                        {plan.tier === 'premium' && <Crown className="w-4 h-4 text-lime-500" />}
                        {plan.tier === 'business' && <Zap className="w-4 h-4 text-purple-500" />}
                        {plan.tier === 'enterprise' && <Star className="w-4 h-4 text-orange-500" />}
                      </div>
                      {plan.popular && (
                        <Badge color="lime" variant="solid">Popular</Badge>
                      )}
                    </div>
                    
                    <Text size="2" color="gray" className="block mb-4">
                      {plan.description}
                    </Text>
                    
                    <div className="flex items-baseline gap-1 mb-4">
                      <Text size="5" weight="bold">
                        ${plan.price.monthly}
                      </Text>
                      <Text size="2" color="gray">/month</Text>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-lime-500" />
                        <Text size="1">
                          {plan.limits.maxPosts === -1 ? 'Unlimited' : plan.limits.maxPosts} posts/month
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-blue-500" />
                        <Text size="1">
                          {plan.limits.maxConnectedAccounts === -1 ? 'Unlimited' : plan.limits.maxConnectedAccounts} accounts
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-3 h-3 text-purple-500" />
                        <Text size="1">
                          {plan.limits.maxStorageMB === -1 ? 'Unlimited' : `${plan.limits.maxStorageMB}MB`} storage
                        </Text>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3 h-3 text-orange-500" />
                        <Text size="1">
                          {plan.features.includes('analytics') ? 'Full Analytics' : 'Basic Analytics'}
                        </Text>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full"
                      variant={plan.popular ? "solid" : "outline"}
                      disabled={plan.comingSoon}
                    >
                      {plan.comingSoon ? 'Coming Soon' : `Choose ${plan.name}`}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Heading size="4" className="mb-4">Feature Comparison</Heading>
              <Card className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Feature</th>
                        <th className="text-center p-3">Free</th>
                        <th className="text-center p-3">Premium</th>
                        <th className="text-center p-3">Business</th>
                        <th className="text-center p-3">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3">Basic Posting</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Analytics</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Scheduled Posting</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Brand Management</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Team Collaboration</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                      <tr>
                        <td className="p-3">API Access</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">❌</td>
                        <td className="text-center p-3">✅</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </Tabs.Content>

        {/* Usage Tab */}
        <Tabs.Content value="usage">
          <div className="space-y-8">
            <div>
              <Heading size="4" className="mb-4">Usage Dashboard</Heading>
              <UsageDashboard />
            </div>

            <div>
              <Heading size="4" className="mb-4">Implementation Guide</Heading>
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Text size="3" weight="bold" className="mb-2 block">Basic Usage</Text>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
{`import { PaywallBlock } from '@/components/paywall/PaywallBlock';

// Basic paywall
<PaywallBlock 
  feature="analytics" 
  title="Analytics Dashboard"
  description="View detailed analytics"
>
  <AnalyticsComponent />
</PaywallBlock>`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <Text size="3" weight="bold" className="mb-2 block">Guards</Text>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
{`import { PostLimitGuard } from '@/components/paywall/PlanEnforcement';

// Usage limit guard
<PostLimitGuard>
  <PostCreationForm />
</PostLimitGuard>`}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <Text size="3" weight="bold" className="mb-2 block">Hooks</Text>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
{`import { useFeatureCheck } from '@/components/paywall/PlanEnforcement';

function MyComponent() {
  const { hasFeature, currentTier } = useFeatureCheck('analytics');
  
  if (!hasFeature) {
    return <PaywallBlock feature="analytics" />;
  }
  
  return <AnalyticsComponent />;
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center">
        <Text size="2" color="gray">
          This is a demonstration of the Succulent paywall system. Features shown may not be fully functional in demo mode.
        </Text>
      </div>
    </Container>
  );
} 