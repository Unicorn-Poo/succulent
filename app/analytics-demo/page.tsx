"use client";

import { useState } from "react";
import { Button, Card, Text, Badge } from "@radix-ui/themes";
import { 
  BarChart3, 
  Instagram, 
  Users, 
  ArrowLeft,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap
} from "lucide-react";
import Link from "next/link";
import InstagramAccountDashboard from "@/components/organisms/instagram-account-dashboard";
import EnhancedReplyHandler from "@/components/organisms/enhanced-reply-handler";
import FreeTierDashboard from "@/components/organisms/free-tier-dashboard";
import { validateAyrshareConfig, isBusinessPlanMode } from "@/utils/ayrshareIntegration";

// Demo Instagram account data
const demoInstagramAccount = {
  id: "demo-instagram-1",
  name: "Demo Instagram Account",
  platform: "instagram" as const,
  profileKey: undefined, // Will be set when user has business plan
  isLinked: true, // Set to false to test linking flow
};

export default function AnalyticsDemoPage() {
  const [selectedFeature, setSelectedFeature] = useState<string>("free-tier-dashboard");
  
  const ayrshareConfigured = validateAyrshareConfig();
  const businessPlan = isBusinessPlanMode();

  const features = [
    {
      id: "free-tier-dashboard",
      name: "Free Tier Management",
      description: "Track and optimize your 20 free posts per month",
      available: true,
      component: <FreeTierDashboard onUpgradeClick={() => window.open('https://www.ayrshare.com/pricing', '_blank')} />
    },
    {
      id: "instagram-dashboard",
      name: "Instagram Analytics Dashboard", 
      description: "View profile stats, engagement metrics, and recent posts",
      available: true,
      component: <InstagramAccountDashboard account={demoInstagramAccount} />
    },
    {
      id: "post-analytics",
      name: "Individual Post Analytics",
      description: "Get detailed analytics for specific posts",
      available: ayrshareConfigured,
      component: (
        <Card className="p-6">
          <Text size="4" weight="bold" className="mb-4 block">Post Analytics</Text>
          <Text size="2" color="gray" className="mb-4 block">
            This feature allows you to get detailed analytics for individual posts using either:
          </Text>
          <div className="space-y-3">
            <div className="p-3 bg-lime-50 rounded-lg">
              <Text size="2" weight="medium" className="mb-1 block">Ayrshare Post ID</Text>
              <Text size="1" color="gray">For posts published through Ayrshare API</Text>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Text size="2" weight="medium" className="mb-1 block">Social Media Post ID</Text>
              <Text size="1" color="gray">For any public post on the platform</Text>
            </div>
          </div>
          <Button className="mt-4 bg-lime-600 hover:bg-lime-700 text-white" onClick={() => window.open('https://www.ayrshare.com/docs/apis/analytics/overview', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            View API Documentation
          </Button>
        </Card>
      )
    },
    {
      id: "rss-feeds",
      name: "RSS Feed Automation",
      description: "Automate posting from RSS feeds",
      available: ayrshareConfigured,
      component: (
        <Card className="p-6">
          <Text size="4" weight="bold" className="mb-4 block">RSS Feed Management</Text>
          <Text size="2" color="gray" className="mb-4 block">
            Automatically post content from RSS feeds to your social media accounts. Perfect for:
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Text size="2" weight="medium" className="block">Blog Posts</Text>
              <Text size="1" color="gray">Auto-share new articles</Text>
            </div>
            <div className="text-center p-3 bg-lime-50 rounded-lg">
              <Text size="2" weight="medium" className="block">YouTube Videos</Text>
              <Text size="1" color="gray">Share new uploads</Text>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Text size="2" weight="medium" className="block">Podcasts</Text>
              <Text size="1" color="gray">Promote new episodes</Text>
            </div>
          </div>
          <Button onClick={() => window.open('https://www.ayrshare.com/docs/apis/feeds/overview', '_blank')} className="bg-lime-600 hover:bg-lime-700 text-white">
            <ExternalLink className="w-4 h-4 mr-2" />
            Learn More About RSS Feeds
          </Button>
        </Card>
      )
    },
    {
      id: "brand-management",
      name: "Brand Management",
      description: "Manage brand guidelines and templates",
      available: businessPlan,
      component: (
        <Card className="p-6">
          <Text size="4" weight="bold" className="mb-4 block">Brand Management</Text>
          <Text size="2" color="gray" className="mb-4 block">
            Maintain consistent branding across all your social media posts with:
          </Text>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-4 h-4 bg-lime-500 rounded-full"></div>
              <div>
                <Text size="2" weight="medium" className="block">Brand Colors</Text>
                <Text size="1" color="gray">Define primary and secondary colors</Text>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <Text size="2" weight="medium" className="block">Logo Management</Text>
                <Text size="1" color="gray">Upload and manage brand logos</Text>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <div>
                <Text size="2" weight="medium" className="block">Content Templates</Text>
                <Text size="1" color="gray">Pre-designed post templates</Text>
              </div>
            </div>
          </div>
          {!businessPlan && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Text size="1" color="orange">
                ⚠️ Brand management requires a Business Plan subscription
              </Text>
            </div>
          )}
        </Card>
      )
    },
    {
      id: "auto-schedule",
      name: "Auto Schedule",
      description: "Intelligent posting schedule optimization",
      available: ayrshareConfigured,
      component: (
        <Card className="p-6">
          <Text size="4" weight="bold" className="mb-4 block">Auto Schedule</Text>
          <Text size="2" color="gray" className="mb-4 block">
            Let AI optimize when your posts are published for maximum engagement:
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-lime-50 to-lime-100 rounded-lg">
              <Text size="2" weight="medium" className="mb-2 block">Optimal Timing</Text>
              <Text size="1" color="gray">
                Posts are scheduled when your audience is most active
              </Text>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <Text size="2" weight="medium" className="mb-2 block">Smart Frequency</Text>
              <Text size="1" color="gray">
                Avoids over-posting and maintains consistent presence
              </Text>
            </div>
          </div>
          <Button onClick={() => window.open('https://www.ayrshare.com/docs/apis/auto-schedule/overview', '_blank')} className="bg-lime-600 hover:bg-lime-700 text-white">
            <ExternalLink className="w-4 h-4 mr-2" />
            Auto Schedule Documentation
          </Button>
        </Card>
      )
    },
    {
      id: "enhanced-replies",
      name: "Enhanced Reply Handler",
      description: "Advanced comment management for non-Twitter platforms",
      available: ayrshareConfigured,
      component: <EnhancedReplyHandler />
    }
  ];

  const selectedFeatureData = features.find(f => f.id === selectedFeature);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Link>
              <div className="w-px h-6 bg-gray-300" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-lime-500" />
                <Text size="4" weight="bold">Ayrshare Analytics Demo</Text>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={ayrshareConfigured ? "green" : "red"}>
                {ayrshareConfigured ? "API Configured" : "API Not Configured"}
              </Badge>
              <Badge color={businessPlan ? "lime" : "gray"}>
                {businessPlan ? "Business Plan" : "Free Plan"}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Configuration Status */}
        {!ayrshareConfigured && (
          <Card className="mb-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <Text size="3" weight="medium" color="red">Ayrshare API Not Configured</Text>
              </div>
              <Text size="2" color="red" className="mb-3 block">
                To use these analytics features, you need to configure your Ayrshare API key.
              </Text>
              <div className="bg-red-100 p-3 rounded font-mono text-sm">
                <Text size="1" color="red">
                  Add to your .env file:<br />
                  NEXT_PUBLIC_AYRSHARE_API_KEY=your_api_key_here
                </Text>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Feature Navigation */}
          <div className="lg:col-span-1">
            <Card className="p-4">
              <Text size="3" weight="bold" className="mb-4 block">Available Features</Text>
              <div className="space-y-2">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setSelectedFeature(feature.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedFeature === feature.id
                        ? 'bg-lime-100 text-lime-900 border border-lime-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Text size="2" weight="medium">{feature.name}</Text>
                      {feature.available ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <Text size="1" color="gray">{feature.description}</Text>
                  </button>
                ))}
              </div>

              {/* API Documentation Links */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Text size="2" weight="medium" className="mb-3 block">API Documentation</Text>
                <div className="space-y-2">
                  <a 
                    href="https://www.ayrshare.com/docs/apis/analytics/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-lime-600 hover:text-lime-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Analytics API
                  </a>
                  <a 
                    href="https://www.ayrshare.com/docs/apis/feeds/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-lime-600 hover:text-lime-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    RSS Feeds API
                  </a>
                  <a 
                    href="https://www.ayrshare.com/docs/apis/comments/post-comment"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-lime-600 hover:text-lime-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Comments API
                  </a>
                </div>
              </div>
            </Card>
          </div>

          {/* Feature Content */}
          <div className="lg:col-span-3">
            {selectedFeatureData?.component || (
              <Card className="p-6">
                <Text>Feature not found</Text>
              </Card>
            )}
          </div>
        </div>

        {/* Implementation Guide */}
        <Card className="mt-8 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-lime-500" />
            <Text size="4" weight="bold">Implementation Guide</Text>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Text size="3" weight="medium" className="mb-3 block">Quick Start</Text>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">1</div>
                  <div>
                    <Text size="2" weight="medium" className="block">Configure API Key</Text>
                    <Text size="1" color="gray">Add your Ayrshare API key to environment variables</Text>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">2</div>
                  <div>
                    <Text size="2" weight="medium" className="block">Link Social Accounts</Text>
                    <Text size="1" color="gray">Connect your Instagram account in Ayrshare dashboard</Text>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-lime-500 text-white rounded-full flex items-center justify-center text-xs font-medium mt-0.5">3</div>
                  <div>
                    <Text size="2" weight="medium" className="block">Use Analytics</Text>
                    <Text size="1" color="gray">Import and use the analytics utilities in your components</Text>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Text size="3" weight="medium" className="mb-3 block">Key Features Available</Text>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">Instagram account analytics</Text>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">Post history and engagement data</Text>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">Profile information sync</Text>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">Enhanced comment management</Text>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">RSS feed automation</Text>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <Text size="2">Auto-scheduling capabilities</Text>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 