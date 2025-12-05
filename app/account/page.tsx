"use client";

import { useAccount } from "jazz-tools/react";
import { MyAppAccount, MyAppAccountLoaded, AccountGroup, PlatformAccount, Post, AccountRoot } from "@/app/schema";
import { Group, co } from "jazz-tools";
import {
  Card,
  Tabs,
  Box,
  Heading,
  Text,
  Button,
  Badge,
  Flex,
} from "@radix-ui/themes";
import {
  User,
  CreditCard,
  Settings,
  BarChart3,
  Shield,
  Bell,
  Key,
  Users,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useSubscription } from "@/utils/subscriptionManager";
import { usePaymentManager } from "@/utils/paymentIntegration";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FreeTierDashboard from "@/components/organisms/free-tier-dashboard";
import APIKeyManagement from "@/components/organisms/api-key-management";
import AccountGroupCreation from "@/components/organisms/account-group-creation";

// =============================================================================
// 🏠 MAIN DASHBOARD COMPONENT
// =============================================================================

export default function AccountDashboard() {
  const { me } = useAccount(MyAppAccount);
  const [activeTab, setActiveTab] = useState("account-groups");

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
        <Heading size="8" className="mb-2">
          Account Dashboard
        </Heading>
        <Text size="4" color="gray">
          Manage your profile, subscription, and settings
        </Text>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <Tabs.List className="mb-6">
          <Tabs.Trigger value="account-groups" className="flex items-center gap-2">
            <Users size={16} />
            Account Groups
          </Tabs.Trigger>
          <Tabs.Trigger value="profile" className="flex items-center gap-2">
            <User size={16} />
            Profile
          </Tabs.Trigger>
          <Tabs.Trigger
            value="subscription"
            className="flex items-center gap-2"
          >
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

        <Tabs.Content value="account-groups">
          <AccountGroupsTab account={me} />
        </Tabs.Content>

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
          <SettingsTab
            account={me}
            onViewKeysClick={() => setActiveTab("api-keys")}
          />
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
  const [name, setName] = useState(account.profile?.name || "");
  const [email, setEmail] = useState(account.profile?.email || "");

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
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            >
              {isEditing ? "Save" : "Edit"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              ) : (
                <p className="text-foreground">
                  {account.profile?.name || "Not set"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded-md"
                />
              ) : (
                <p className="text-foreground">
                  {account.profile?.email || "Not set"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Account Created
              </label>
              <p className="text-foreground">
                {account.profile?.createdAt
                  ? new Date(account.profile.createdAt).toLocaleDateString()
                  : "Unknown"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Updated
              </label>
              <p className="text-foreground">
                {account.profile?.updatedAt
                  ? new Date(account.profile.updatedAt).toLocaleDateString()
                  : "Unknown"}
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
  const { currentTier, currentPlan, subscription, getUpgradeOptions } =
    useSubscription(account);
  const { upgradeToTier, openBillingPortal } = usePaymentManager(account);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async (tier: "premium" | "business" | "enterprise") => {
    setIsLoading(true);
    try {
      await upgradeToTier(tier);
    } catch (error) {
      console.error("Upgrade failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillingPortal = async () => {
    setIsLoading(true);
    try {
      await openBillingPortal();
    } catch (error) {
      console.error("Failed to open billing portal:", error);
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
            <Badge size="2" color={currentTier === "free" ? "gray" : "green"}>
              {currentPlan.name}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-1">
              <Text size="2" color="gray" className="block">
                Status
              </Text>
              <Text size="4" weight="medium" className="block">
                {subscription?.status || "Free"}
              </Text>
            </div>
            <div className="space-y-1">
              <Text size="2" color="gray" className="block">
                Price
              </Text>
              <Text size="4" weight="medium" className="block">
                ${currentPlan.price.monthly}/month
              </Text>
            </div>
            <div className="space-y-1">
              <Text size="2" color="gray" className="block">
                Next Billing
              </Text>
              <Text size="4" weight="medium" className="block">
                {subscription?.endDate
                  ? new Date(subscription.endDate).toLocaleDateString()
                  : "N/A"}
              </Text>
            </div>
          </div>

          <div className="flex gap-3">
            {currentTier !== "free" && (
              <Button onClick={handleBillingPortal} disabled={isLoading}>
                <CreditCard size={16} className="mr-2" />
                Manage Billing
              </Button>
            )}
            {currentTier === "free" && (
              <Button
                onClick={() => handleUpgrade("premium")}
                disabled={isLoading}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>
        </Box>
      </Card>

      {/* Upgrade Options */}
      {currentTier === "free" && (
        <Card>
          <Box p="6">
            <Heading size="5" className="mb-4">
              Upgrade Options
            </Heading>

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
                    <p className="text-muted-foreground text-sm">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold">
                      ${plan.price.monthly}
                    </span>
                    <span className="text-muted-foreground">
                      /month
                    </span>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() =>
                      handleUpgrade(
                        plan.tier as "premium" | "business" | "enterprise"
                      )
                    }
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
    { key: "posts", label: "Posts", icon: "📝" },
    { key: "storage", label: "Storage", icon: "💾" },
    { key: "platformVariants", label: "Platform Variants", icon: "🎨" },
    { key: "connectedAccounts", label: "Connected Accounts", icon: "🔗" },
    { key: "analytics", label: "Analytics Requests", icon: "📈" },
  ];

  return (
    <div className="space-y-6">
      {/* Free Tier Dashboard - show for free tier users */}
      {currentTier === "free" && (
        <FreeTierDashboard
          onUpgradeClick={() =>
            window.open("https://www.ayrshare.com/pricing", "_blank")
          }
          showDetailedView={true}
        />
      )}

      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            Usage Overview
          </Heading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {usageItems.map((item) => {
              const usage =
                usageSummary.usage[item.key as keyof typeof usageSummary.usage];
              return (
                <div key={item.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="font-medium text-foreground">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {usage.used} / {usage.limit === -1 ? "∞" : usage.limit}
                    </span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-brand-seafoam h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
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

function SettingsTab({
  account,
  onViewKeysClick,
}: {
  account: MyAppAccountLoaded;
  onViewKeysClick: () => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <Box p="6">
          <Heading size="5" className="mb-6">
            Account Settings
          </Heading>

          <div className="space-y-6">
            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Text weight="medium" className="block">Email Notifications</Text>
                <Text size="2" color="gray" className="block">
                  Receive updates about your account
                </Text>
              </div>
              <Button variant="outline">Configure</Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Text weight="medium" className="block">Privacy Settings</Text>
                <Text size="2" color="gray" className="block">
                  Control your data and privacy
                </Text>
              </div>
              <Button variant="outline">Manage</Button>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Text weight="medium" className="block">API Keys</Text>
                <Text size="2" color="gray" className="block">
                  Manage your API access
                </Text>
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

            <div className="flex items-center justify-between py-2">
              <div className="space-y-1">
                <Text weight="medium" color="red" className="block">
                  Delete Account
                </Text>
                <Text size="2" color="gray" className="block">
                  Permanently delete your account
                </Text>
              </div>
              <Button variant="outline" color="red">
                Delete
              </Button>
            </div>
          </div>
        </Box>
      </Card>
    </div>
  );
}

// =============================================================================
// 👥 ACCOUNT GROUPS TAB
// =============================================================================

function AccountGroupsTab({ account }: { account: MyAppAccountLoaded }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  const accountGroups = account.root?.accountGroups || [];

  const handleCreateGroup = async (groupData: {
    name: string;
    accounts: Array<{
      platform: string;
      name: string;
      profileKey?: string;
      isLinked: boolean;
      status: "pending" | "linked" | "error" | "expired";
      lastError?: string;
    }>;
    ayrshareProfileKey?: string;
    ayrshareProfileTitle?: string;
  }) => {
    setIsCreating(true);
    try {
      // Create the account group using Jazz with a Group owner
      const group = Group.create();
      
      const newAccountGroup = AccountGroup.create(
        {
          name: groupData.name,
          accounts: co.list(PlatformAccount).create([], { owner: group }),
          posts: co.list(Post).create([], { owner: group }),
          ayrshareProfileKey: groupData.ayrshareProfileKey,
          ayrshareProfileTitle: groupData.ayrshareProfileTitle,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { owner: group }
      );

      // Add accounts to the group
      for (const accountData of groupData.accounts) {
        const platformAccount = PlatformAccount.create({
          platform: accountData.platform as any,
          name: accountData.name,
          profileKey: accountData.profileKey,
          isLinked: accountData.isLinked,
          status: accountData.status,
          lastError: accountData.lastError,
          historicalAnalytics: co.list(co.map({})).create([], { owner: group }),
        }, { owner: group });
        newAccountGroup.accounts?.push(platformAccount);
      }

      // Ensure root exists with account groups
      if (!account.root) {
        const rootGroup = Group.create();
        account.root = AccountRoot.create(
          {
            accountGroups: co.list(AccountGroup).create([], { owner: rootGroup }),
          },
          { owner: rootGroup }
        );
      }
      
      // Add the new account group
      account.root.accountGroups?.push(newAccountGroup);

      setShowCreateDialog(false);
      
      // Navigate to the new account group
      router.push(`/account-group/${newAccountGroup.id}`);
    } catch (error) {
      console.error("Failed to create account group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <Box p="6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Heading size="5">Account Groups</Heading>
              <Text size="2" color="gray">
                Organize your social media accounts into groups
              </Text>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              Create Account Group
            </Button>
          </div>
        </Box>
      </Card>

      {/* Account Groups List */}
      {accountGroups.length === 0 ? (
        <Card>
          <Box p="8" className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-mint/20 flex items-center justify-center">
              <Users size={32} className="text-brand-seafoam" />
            </div>
            <Heading size="4" className="mb-2">No Account Groups Yet</Heading>
            <Text size="3" color="gray" className="mb-6 block">
              Create your first account group to start managing your social media accounts.
            </Text>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus size={16} className="mr-2" />
              Create Your First Account Group
            </Button>
          </Box>
        </Card>
      ) : (
        <div className="grid gap-4">
          {accountGroups.map((group) => (
            group && (
              <Link key={group.id} href={`/account-group/${group.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <Box p="6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-lavender/20 flex items-center justify-center">
                          <Users size={24} className="text-brand-plum" />
                        </div>
                        <div>
                          <Text size="4" weight="medium" className="block">
                            {group.name || "Unnamed Group"}
                          </Text>
                          <Text size="2" color="gray">
                            {group.accounts?.length || 0} accounts • {group.posts?.length || 0} posts
                          </Text>
                        </div>
                      </div>
                      <ArrowRight size={20} className="text-muted-foreground" />
                    </div>
                  </Box>
                </Card>
              </Link>
            )
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <AccountGroupCreation
        isOpen={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleCreateGroup}
      />
    </div>
  );
}
