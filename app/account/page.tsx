'use client';

import { useAccount } from 'jazz-tools/react';
import { MyAppAccount, MyAppAccountLoaded } from '@/app/schema';
import { Card, Tabs, Box, Heading, Text, Button, Badge, Flex } from '@radix-ui/themes';
import { User, CreditCard, Settings, BarChart3, Shield, Bell, Key } from 'lucide-react';
import { useSubscription } from '@/utils/subscriptionManager';
import { usePaymentManager } from '@/utils/paymentIntegration';
import { useState } from 'react';
import FreeTierDashboard from '@/components/organisms/free-tier-dashboard';
import APIKeyManagement from '@/components/organisms/api-key-management';

// =============================================================================
// 🏠 MAIN DASHBOARD COMPONENT
// =============================================================================

export default function AccountDashboard() {
  const { me } = useAccount(MyAppAccount);
  const [activeTab, setActiveTab] = useState('profile');

  if (!me) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Text>Loading account...</Text>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <Heading size="8" className="mb-2">Account Dashboard</Heading>
        <Text size="4" color="gray">Manage your profile, subscription, and settings</Text>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full">
        <Tabs.List className="mb-6">
          <Tabs.Trigger value="profile" className="flex items-center gap-2">
            <User size={16} />
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger value="subscription" className="flex items-center gap-2">
            <CreditCard size={16} />
            Subscription
          </Tabs.Trigger>
          <Tabs.Trigger value="usage" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Usage
          </Tabs.Trigger>
          <Tabs.Trigger value="api-keys" className="flex items-center gap-2">
            <Key size={16} />
            API Keys
          </Tabs.Trigger>
          <Tabs.Trigger value="settings" className="flex items-center gap-2">
            <Settings size={16} />
            Settings
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile">
          <ProfileTab account={me} />
        </Tabs.Content>
        
        <Tabs.Content value="subscription">
          <SubscriptionTab account={me} />
        </Tabs.Content>
        
        <Tabs.Content value="usage">
          <UsageTab account={me} />
        </Tabs.Content>
        
        <Tabs.Content value="api-keys">
          <APIKeyManagement />
        </Tabs.Content>
        
        <Tabs.Content value="settings">
          <SettingsTab account={me} onViewKeysClick={() => setActiveTab('api-keys')} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

// =============================================================================
// 👤 PROFILE TAB
// =============================================================================

function ProfileTab({ account }: { account: MyAppAccountLoaded }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(account.profile.name || '');
  const [email, setEmail] = useState(account.profile.email || '');

  const handleSave = () => {
    if (account.profile) {
      account.profile.name = name;
      account.profile.email = email;
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <div className="flex items-center justify-between mb-6">
            <Heading size="5">Profile Information</Heading>
            <Button 
              variant={isEditing ? "solid" : "outline"} 
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              ) : (
                <p className="text-gray-900">{account.profile.name || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              ) : (
                <p className="text-gray-900">{account.profile.email || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Account Created</label>
              <p className="text-gray-900">
                {account.profile.createdAt ? new Date(account.profile.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Last Updated</label>
              <p className="text-gray-900">
                {account.profile.updatedAt ? new Date(account.profile.updatedAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// 💳 SUBSCRIPTION TAB
// =============================================================================

function SubscriptionTab({ account }: { account: MyAppAccountLoaded }) {
  const { currentTier, currentPlan, subscription, getUpgradeOptions } = useSubscription(account);
  const { upgradeToTier, openBillingPortal } = usePaymentManager(account);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: 'premium' | 'business' | 'enterprise') => {
    setIsLoading(true);
    try {
      await upgradeToTier(tier);
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    setIsLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <Box p="6">
          <div className="flex items-center justify-between mb-4">
            <Heading size="5">Current Plan</Heading>
            <Badge size="2" color={currentTier === 'free' ? 'gray' : 'green'}>
              {currentPlan.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Text size="2" color="gray">Status</Text>
              <Text size="4" weight="medium">
                {subscription?.status || 'Free'}
              </Text>
            </div>
            <div>
              <Text size="2" color="gray">Price</Text>
              <Text size="4" weight="medium">
                ${currentPlan.price.monthly}/month
              </Text>
            </div>
            <div>
              <Text size="2" color="gray">Next Billing</Text>
              <Text size="4" weight="medium">
                {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
              </Text>
            </div>
          </div>

          <div className="flex gap-3">
            {currentTier !== 'free' && (
              <Button onClick={handleBillingPortal} disabled={isLoading}>
                <CreditCard size={16} className="mr-2" />
                Manage Billing
              </Button>
            )}
            {currentTier === 'free' && (
              <Button onClick={() => handleUpgrade('premium')} disabled={isLoading}>
                Upgrade to Pro
              </Button>
            )}
          </div>
        </Box>
      </Card>

      {/* Upgrade Options */}
      {currentTier === 'free' && (
        <Card>
          <Box p="6">
            <Heading size="5" className="mb-4">Upgrade Options</Heading>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getUpgradeOptions().map((plan) => (
                <div key={plan.tier} className="border rounded-lg p-4 relative">
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-4" color="green">
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-2xl font-bold">${plan.price.monthly}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(plan.tier as 'premium' | 'business' | 'enterprise')}
                    disabled={isLoading}
                  >
                    Upgrade to {plan.name}
                  </Button>
                </div>
              ))}
            </div>
          </Box>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 📊 USAGE TAB
// =============================================================================

function UsageTab({ account }: { account: MyAppAccountLoaded }) {
  const { getUsageSummary, currentTier } = useSubscription(account);
  const usageSummary = getUsageSummary();

  if (!usageSummary) {
    return <div>Loading usage data...</div>;
  }

  const usageItems = [
    { key: 'posts', label: 'Posts', icon: '📝' },
    { key: 'storage', label: 'Storage', icon: '💾' },
    { key: 'platformVariants', label: 'Platform Variants', icon: '🎨' },
    { key: 'connectedAccounts', label: 'Connected Accounts', icon: '🔗' },
    { key: 'analytics', label: 'Analytics Requests', icon: '📈' },
  ];

  return (
    <div className="space-y-6">
      {/* Free Tier Dashboard - show for free tier users */}
      {currentTier === 'free' && (
        <FreeTierDashboard 
          onUpgradeClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}
          showDetailedView={true}
        />
      )}

      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">Usage Overview</Heading>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {usageItems.map((item) => {
              const usage = usageSummary.usage[item.key as keyof typeof usageSummary.usage];
              return (
                <div key={item.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {usage.used} / {usage.limit === -1 ? '∞' : usage.limit}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    {usage.percentage.toFixed(1)}% used
                  </p>
                </div>
              );
            })}
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// ⚙️ SETTINGS TAB
// =============================================================================

function SettingsTab({ account, onViewKeysClick }: { 
  account: MyAppAccountLoaded; 
  onViewKeysClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">Account Settings</Heading>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Text weight="medium">Email Notifications</Text>
                <Text size="2" color="gray">Receive updates about your account</Text>
              </div>
              <Button variant="outline">Configure</Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Text weight="medium">Privacy Settings</Text>
                <Text size="2" color="gray">Control your data and privacy</Text>
              </div>
              <Button variant="outline">Manage</Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Text weight="medium">API Keys</Text>
                <Text size="2" color="gray">Manage your API access</Text>
              </div>
              <Button 
                variant="outline" 
                onClick={onViewKeysClick}
                className="flex items-center gap-2"
              >
                <Key size={16} />
                View Keys
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Text weight="medium" color="red">Delete Account</Text>
                <Text size="2" color="gray">Permanently delete your account</Text>
              </div>
              <Button variant="outline" color="red">Delete</Button>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
} 