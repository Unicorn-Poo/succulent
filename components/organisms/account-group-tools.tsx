"use client";

import { useState } from "react";
import { Button, Card, Text, Dialog, Tabs } from "@radix-ui/themes";
import { 
  MessageCircle, 
  Rss, 
  Settings, 
  Palette,
  Calendar,
  BarChart3,
  ExternalLink,
  Plus,
  Users,
  Package,
  Webhook,
  UserPlus
} from "lucide-react";
import EnhancedReplyHandler from "./enhanced-reply-handler";
import GelatoProductsOverview from "./gelato-products-overview";
import UserProfileManagement from "./user-profile-management";
import WebhookManagement from "./webhook-management";
import {
  getRSSFeeds,
  addRSSFeed,
  getBrandInfo,
  updateBrandInfo,
  getAutoScheduleSettings,
  updateAutoScheduleSettings,
  isFeatureAvailable
} from "@/utils/ayrshareAnalytics";
import { isBusinessPlanMode } from "@/utils/ayrshareIntegration";

interface Account {
  id: string;
  name: string;
  platform: string;
  profileKey?: string;
  isLinked: boolean;
}

interface AccountGroupToolsProps {
  accounts: Account[];
  accountGroupId: string;
  accountGroup?: any; // Account group with Gelato credentials
  onToolUsed?: (tool: string, result: any) => void;
}

export default function AccountGroupTools({ 
  accounts, 
  accountGroupId, 
  accountGroup,
  onToolUsed 
}: AccountGroupToolsProps) {
  const [activeTab, setActiveTab] = useState("replies");
  const [showDialog, setShowDialog] = useState(false);

  // Feature availability checks
  const linkedAccounts = accounts.filter(account => account.isLinked);
  const commentsAvailable = isFeatureAvailable('advanced-comments');
  const rssAvailable = isFeatureAvailable('rss-feeds');
  const brandAvailable = isFeatureAvailable('brand-management');
  const scheduleAvailable = isFeatureAvailable('auto-schedule');
  const businessPlan = isBusinessPlanMode();

  // Get first linked account's profile key (for API calls)
  const profileKey = linkedAccounts[0]?.profileKey;

  const tools = [
    {
      id: "replies",
      name: "Enhanced Replies",
      icon: MessageCircle,
      description: "Reply to posts and comments on Instagram, Facebook, LinkedIn, YouTube",
      available: commentsAvailable && linkedAccounts.length > 0,
      component: (
        <EnhancedReplyHandler 
          accountProfileKey={profileKey}
          onReplySuccess={(result) => onToolUsed?.('replies', result)}
        />
      )
    },
    {
      id: "user-profiles",
      name: "User Profile Management",
      icon: UserPlus,
      description: "Create and manage multiple user profiles for client management",
      available: businessPlan,
      component: (
        <UserProfileManagement 
          onProfileCreated={(profile) => onToolUsed?.('user-profiles', profile)}
        />
      )
    },
    {
      id: "webhooks",
      name: "Webhook Management",
      icon: Webhook,
      description: "Set up real-time notifications for post events and social media activities",
      available: businessPlan,
      component: <WebhookManagement />
    },
    {
      id: "rss",
      name: "RSS Feed Management",
      icon: Rss,
      description: "Automatically post content from RSS feeds",
      available: rssAvailable,
      component: <RSSFeedManager profileKey={profileKey} onUpdate={(result) => onToolUsed?.('rss', result)} />
    },
    {
      id: "brand",
      name: "Brand Management",
      icon: Palette,
      description: "Manage brand colors, logos, and templates",
      available: brandAvailable,
      component: <BrandManager profileKey={profileKey} onUpdate={(result) => onToolUsed?.('brand', result)} />
    },
    {
      id: "schedule",
      name: "Auto Schedule",
      icon: Calendar,
      description: "Set up intelligent posting schedules",
      available: scheduleAvailable,
      component: <AutoScheduleManager accounts={linkedAccounts} onUpdate={(result) => onToolUsed?.('schedule', result)} />
    },
    {
      id: "gelato",
      name: "Gelato Products",
      icon: Package,
      description: "View and manage your created Gelato products",
      available: accountGroup?.gelatoCredentials?.isConfigured || false,
      component: <GelatoProductsOverview accountGroup={accountGroup} />
    }
  ];

  const availableTools = tools.filter(tool => tool.available);

  if (linkedAccounts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <Text size="4" weight="medium" className="mb-2 block">
            No Linked Accounts
          </Text>
          <Text size="2" color="gray" className="mb-4 block">
            Link your social media accounts to access enhanced tools and features.
          </Text>
          <Button onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')} className="bg-green-600 hover:bg-green-700 text-white">
            <ExternalLink className="w-4 h-4 mr-2" />
            Link Accounts
          </Button>
        </div>
      </Card>
    );
  }

  if (availableTools.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <Text size="4" weight="medium" className="mb-2 block">
            Premium Tools Available
          </Text>
          <Text size="2" color="gray" className="mb-4 block">
            Upgrade to unlock enhanced reply management, RSS feeds, brand tools, and auto-scheduling.
          </Text>
          <Button onClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View Pricing
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Text size="5" weight="bold" className="mb-1 block">Enhanced Tools</Text>
          <Text size="2" color="gray">
            Advanced features for managing your {linkedAccounts.length} linked account{linkedAccounts.length !== 1 ? 's' : ''}
          </Text>
        </div>
        
        <Button onClick={() => setShowDialog(true)} variant="soft">
          <Plus className="w-4 h-4 mr-2" />
          Open Tools Panel
        </Button>
      </div>

      {/* Quick Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableTools.map((tool) => {
          const ToolIcon = tool.icon;
          return (
            <Card key={tool.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
              setActiveTab(tool.id);
              setShowDialog(true);
            }}>
              <div className="text-center">
                <ToolIcon className="w-8 h-8 text-lime-500 mx-auto mb-3" />
                <Text size="3" weight="medium" className="mb-2 block">
                  {tool.name}
                </Text>
                <Text size="1" color="gray" className="leading-tight">
                  {tool.description}
                </Text>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Tools Dialog */}
      <Dialog.Root open={showDialog} onOpenChange={setShowDialog}>
        <Dialog.Content style={{ maxWidth: 900, maxHeight: '80vh' }}>
          <Dialog.Title>Enhanced Account Tools</Dialog.Title>
          <Dialog.Description>
            Advanced features for managing your social media accounts through Ayrshare
          </Dialog.Description>

          <div className="mt-6">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List>
                {availableTools.map((tool) => (
                  <Tabs.Trigger key={tool.id} value={tool.id}>
                    <tool.icon className="w-4 h-4 mr-2" />
                    {tool.name}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>

              {availableTools.map((tool) => (
                <Tabs.Content key={tool.id} value={tool.id} className="mt-4">
                  <div className="max-h-96 overflow-y-auto">
                    {tool.component}
                  </div>
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="soft" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

// RSS Feed Manager Component
function RSSFeedManager({ profileKey, onUpdate }: { profileKey?: string; onUpdate?: (result: any) => void }) {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFeeds = async () => {
    setLoading(true);
    try {
      const feedData = await getRSSFeeds(profileKey);
      setFeeds(feedData);
    } catch (error) {
      console.error('Error loading RSS feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Text size="4" weight="bold">RSS Feed Management</Text>
        <Button size="2" onClick={loadFeeds} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>
      
      <Text size="2" color="gray" className="mb-4 block">
        Automatically post content from your RSS feeds to social media accounts.
      </Text>

      {feeds.length > 0 ? (
        <div className="space-y-3">
          {feeds.map((feed) => (
            <div key={feed.id} className="p-3 bg-muted rounded-lg">
              <Text size="2" weight="medium" className="block">{feed.title || feed.url}</Text>
              <Text size="1" color="gray">{feed.platforms?.join(', ')}</Text>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Rss className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <Text size="2">No RSS feeds configured</Text>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          onClick={() => window.open('https://www.ayrshare.com/docs/apis/feeds/overview', '_blank')}
          variant="soft" 
          size="2"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Learn More About RSS Feeds
        </Button>
      </div>
    </Card>
  );
}

// Brand Manager Component
function BrandManager({ profileKey, onUpdate }: { profileKey?: string; onUpdate?: (result: any) => void }) {
  return (
    <Card className="p-6">
      <Text size="4" weight="bold" className="mb-4 block">Brand Management</Text>
      
      <Text size="2" color="gray" className="mb-4 block">
        Manage your brand colors, logos, fonts, and templates for consistent social media presence.
      </Text>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-lime-50 rounded-lg">
            <Text size="2" weight="medium" className="mb-1 block">Brand Colors</Text>
            <Text size="1" color="gray">Primary and secondary colors</Text>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Text size="2" weight="medium" className="mb-1 block">Logo Assets</Text>
            <Text size="1" color="gray">Brand logos and imagery</Text>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Text size="2" weight="medium" className="mb-1 block">Typography</Text>
            <Text size="1" color="gray">Font families and styles</Text>
          </div>
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Text size="2" weight="medium" className="mb-1 block">Templates</Text>
            <Text size="1" color="gray">Post templates and layouts</Text>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          onClick={() => window.open('https://www.ayrshare.com/docs/apis/brand/overview', '_blank')}
          variant="soft" 
          size="2"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Brand API Documentation
        </Button>
      </div>
    </Card>
  );
}

// Auto Schedule Manager Component
function AutoScheduleManager({ 
  accounts, 
  onUpdate 
}: { 
  accounts: Account[]; 
  onUpdate?: (result: any) => void;
}) {
  return (
    <Card className="p-6">
      <Text size="4" weight="bold" className="mb-4 block">Auto Schedule Settings</Text>
      
      <Text size="2" color="gray" className="mb-4 block">
        Set up intelligent posting schedules for optimal engagement on each platform.
      </Text>

      <div className="space-y-4">
        {accounts.map((account) => (
          <div key={account.id} className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Text size="2" weight="medium" className="block">{account.name}</Text>
                <Text size="1" color="gray">{account.platform}</Text>
              </div>
              <Button size="1" variant="soft">
                Configure Schedule
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <Button 
          onClick={() => window.open('https://www.ayrshare.com/docs/apis/auto-schedule/overview', '_blank')}
          variant="soft" 
          size="2"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Auto Schedule Documentation
        </Button>
      </div>
    </Card>
  );
} 