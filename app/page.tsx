"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/atoms/button";
import { useAccount } from "jazz-tools/react";
import { MyAppAccount } from "@/app/schema";
import { PLAN_DEFINITIONS } from "@/utils/subscriptionManager";
import { useAuthModal } from "@/components/organisms/passphrase-ui";
import {
  Check,
  Zap,
  BarChart3,
  Calendar,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Globe,
  Users,
  Clock,
  Upload,
  Bot,
  TrendingUp,
  Package,
  Store,
  Hash,
} from "lucide-react";

// Platform data for the integrations showcase
const SOCIAL_PLATFORMS = [
  { name: "Instagram", icon: "/icons8-instagram.svg" },
  { name: "Facebook", icon: "/icons8-facebook.svg" },
  { name: "X (Twitter)", icon: "/icons8-twitter.svg" },
  { name: "LinkedIn", icon: "/icons8-linkedin.svg" },
  { name: "YouTube", icon: "/icons8-youtube.svg" },
  { name: "TikTok", icon: "/icons8-tiktok.svg" },
  { name: "Pinterest", icon: "/icons8-pinterest.svg" },
  { name: "Reddit", icon: "/icons8-reddit.svg" },
  { name: "Threads", icon: "/icons8-threads.svg" },
  { name: "Bluesky", icon: "/icons8-bluesky.svg" },
  { name: "Telegram", icon: "/icons8-telegram.svg" },
  { name: "Google Business", icon: "/icons8-google.svg" },
];

const COMMERCE_INTEGRATIONS = [
  { name: "Shopify", description: "E-commerce", type: "commerce" },
  { name: "Gelato", description: "Print-on-Demand", type: "pod" },
  { name: "Prodigi", description: "Print-on-Demand", type: "pod" },
];

// Feature data with brand colors
const FEATURES = [
  {
    icon: Globe,
    title: "13+ Social Platforms",
    description:
      "Publish to Instagram, Facebook, X, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Threads, Bluesky, and more from one dashboard.",
    gradient: "from-brand-seafoam to-brand-mint",
  },
  {
    icon: Bot,
    title: "AI Autopilot",
    description:
      "Smart content generation, optimal posting times, and engagement predictions powered by AI that learns your brand voice.",
    gradient: "from-brand-lavender to-brand-plum",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track growth, engagement, and follower trends across all platforms. Get actionable recommendations to improve performance.",
    gradient: "from-brand-mint to-brand-seafoam",
  },
  {
    icon: Package,
    title: "Print-on-Demand",
    description:
      "Turn your posts into products with Gelato and Prodigi integration. Create merchandise directly from your content.",
    gradient: "from-brand-coral to-brand-rose",
  },
  {
    icon: Upload,
    title: "Bulk Scheduling",
    description:
      "Upload CSV files with hundreds of posts. Schedule weeks of content in minutes with smart batch processing.",
    gradient: "from-brand-plum to-brand-lavender",
  },
  {
    icon: Hash,
    title: "Hashtag Research",
    description:
      "Discover trending hashtags, analyze competitor strategies, and get AI-powered recommendations to maximize your reach and engagement.",
    gradient: "from-brand-sand to-brand-coral",
  },
];

// Pricing features for comparison
const PRICING_FEATURES = [
  { name: "Posts per month", free: "10", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
  { name: "Account groups", free: "1", pro: "3", business: "10", enterprise: "Unlimited" },
  { name: "Platform variants", free: "3", pro: "Unlimited", business: "Unlimited", enterprise: "Unlimited" },
  { name: "Cross-device sync", free: true, pro: true, business: true, enterprise: true },
  { name: "Analytics dashboard", free: false, pro: true, business: true, enterprise: true },
  { name: "Commerce integrations", free: false, pro: true, business: true, enterprise: true },
  { name: "Team collaboration", free: false, pro: "Up to 5", business: "Unlimited", enterprise: "Unlimited" },
  { name: "Bulk uploads", free: false, pro: false, business: true, enterprise: true },
  { name: "Brand management", free: false, pro: false, business: true, enterprise: true },
  { name: "White-labeling", free: false, pro: false, business: true, enterprise: true },
  { name: "API access", free: false, pro: false, business: false, enterprise: true },
  { name: "Dedicated support", free: false, pro: false, business: false, enterprise: true },
  { name: "SLA guarantee", free: false, pro: false, business: false, enterprise: true },
];

export default function MarketingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const authModal = useAuthModal();
  const { me } = useAccount(MyAppAccount, {
    resolve: {
      root: {
        accountGroups: { $each: true },
      },
      profile: true,
    },
  });

  const isLoggedIn = !!me;
  const hasAccountGroups = me?.root?.accountGroups && me.root.accountGroups.length > 0;

  // Get first account group for dashboard link
  const firstGroupId = hasAccountGroups ? me?.root?.accountGroups?.[0]?.id : null;
  
  // Handler to open auth modal
  const openAuth = () => authModal?.setShowAuthModal(true);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient - brand colors */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-mint/10 via-background to-brand-lavender/10 dark:from-brand-seafoam/5 dark:via-background dark:to-brand-plum/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-mint/20 via-transparent to-brand-lavender/10 dark:from-brand-mint/5" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-24 sm:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-lavender/20 dark:bg-brand-plum/20 text-brand-plum dark:text-brand-lavender text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Now with AI Autopilot</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-6">
              One dashboard for{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-seafoam to-brand-mint dark:from-brand-mint dark:to-brand-seafoam">
                all your social media
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Publish to 13+ platforms, create print-on-demand products, and grow your audience with AI-powered insights. 
              The only social media tool with built-in commerce.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              {isLoggedIn ? (
                hasAccountGroups ? (
                  <>
                    <Link href={`/account-group/${firstGroupId}`}>
                      <Button intent="primary" size="3" className="w-full sm:w-auto">
                        Go to Dashboard
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                    <Link href="/account">
                      <Button variant="outline" size="3" className="w-full sm:w-auto">
                        Account Settings
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/account">
                      <Button intent="primary" size="3" className="w-full sm:w-auto">
                        Get Started
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                    <Link href="#pricing">
                      <Button variant="outline" size="3" className="w-full sm:w-auto">
                        View Pricing
                      </Button>
                    </Link>
                  </>
                )
              ) : (
                <>
                  <Button intent="primary" size="3" className="w-full sm:w-auto" onClick={openAuth}>
                    Start Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Link href="#pricing">
                    <Button variant="outline" size="3" className="w-full sm:w-auto">
                      View Pricing
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Platform logos strip */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 opacity-70">
              {SOCIAL_PLATFORMS.slice(0, 8).map((platform) => (
                <div
                  key={platform.name}
                  className="w-8 h-8 sm:w-10 sm:h-10 grayscale hover:grayscale-0 transition-all duration-300"
                  title={platform.name}
                >
                  <Image
                    src={platform.icon}
                    alt={platform.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain dark:invert"
                  />
                </div>
              ))}
              <span className="text-muted-foreground text-sm">+5 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-foreground mb-1">
                <Globe className="w-6 h-6 text-brand-seafoam" />
                13+
              </div>
              <p className="text-sm text-muted-foreground">Social Platforms</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-foreground mb-1">
                <Store className="w-6 h-6 text-brand-lavender" />
                3
              </div>
              <p className="text-sm text-muted-foreground">Commerce & POD Partners</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-foreground mb-1">
                <Zap className="w-6 h-6 text-brand-plum" />
                AI
              </div>
              <p className="text-sm text-muted-foreground">Powered Autopilot</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 text-2xl sm:text-3xl font-bold text-foreground mb-1">
                <Users className="w-6 h-6 text-brand-mint" />
                Real-time
              </div>
              <p className="text-sm text-muted-foreground">Team Collaboration</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to grow
            </h2>
            <p className="text-lg text-muted-foreground">
              From scheduling to analytics, from AI content to commerce integrations. 
              Succulent is the complete toolkit for modern creators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-8 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300"
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-6`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Integrations */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Connect everywhere you create
            </h2>
            <p className="text-lg text-muted-foreground">
              Publish content across all major social platforms and turn your posts into products with print-on-demand integrations.
            </p>
          </div>

          {/* Social Platforms Grid */}
          <div className="mb-12">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-6">
              Social Platforms
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {SOCIAL_PLATFORMS.map((platform) => (
                <div
                  key={platform.name}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-card transition-colors"
                >
                  <div className="w-12 h-12">
                    <Image
                      src={platform.icon}
                      alt={platform.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-contain dark:invert"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commerce Integrations */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-center mb-6">
              Commerce & Print-on-Demand
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {COMMERCE_INTEGRATIONS.map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-seafoam to-brand-mint">
                    {integration.type === "commerce" ? (
                      <Store className="w-5 h-5 text-white" />
                    ) : (
                      <Package className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{integration.name}</p>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start free, upgrade when you need more. No hidden fees, cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="ml-2 text-xs text-brand-seafoam font-semibold">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Creator (Free) */}
            <div className="relative p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {PLAN_DEFINITIONS.free.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {PLAN_DEFINITIONS.free.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <Button variant="outline" className="w-full mb-8" onClick={isLoggedIn ? undefined : openAuth}>
                {isLoggedIn ? "Current Plan" : "Get Started"}
              </Button>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  10 posts per month
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  1 account group
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  3 platform variants
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Cross-device sync
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Basic scheduling
                </li>
              </ul>
            </div>

            {/* Pro (Popular) */}
            <div className="relative p-8 rounded-2xl border-2 border-brand-seafoam bg-card shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 text-xs font-semibold bg-brand-seafoam text-white rounded-full">
                  Most Popular
                </span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {PLAN_DEFINITIONS.premium.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {PLAN_DEFINITIONS.premium.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  ${billingPeriod === "monthly" 
                    ? PLAN_DEFINITIONS.premium.price.monthly 
                    : Math.round(PLAN_DEFINITIONS.premium.price.yearly / 12)}
                </span>
                <span className="text-muted-foreground">/month</span>
                {billingPeriod === "yearly" && (
                  <p className="text-sm text-brand-seafoam mt-1">
                    ${PLAN_DEFINITIONS.premium.price.yearly} billed yearly
                  </p>
                )}
              </div>
              <Button intent="primary" className="w-full mb-8" onClick={isLoggedIn ? undefined : openAuth}>
                {isLoggedIn ? "Upgrade to Pro" : "Start Free Trial"}
              </Button>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  <strong className="text-foreground">Unlimited</strong>&nbsp;posts
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  3 account groups
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Unlimited platform variants
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Analytics dashboard
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Commerce integrations
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Team collaboration (up to 5)
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Priority support
                </li>
              </ul>
            </div>

            {/* Business */}
            <div className="relative p-8 rounded-2xl border border-border bg-card">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {PLAN_DEFINITIONS.business.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {PLAN_DEFINITIONS.business.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  ${billingPeriod === "monthly" 
                    ? PLAN_DEFINITIONS.business.price.monthly 
                    : Math.round(PLAN_DEFINITIONS.business.price.yearly / 12)}
                </span>
                <span className="text-muted-foreground">/month</span>
                {billingPeriod === "yearly" && (
                  <p className="text-sm text-brand-seafoam mt-1">
                    ${PLAN_DEFINITIONS.business.price.yearly} billed yearly
                  </p>
                )}
              </div>
              <Button variant="outline" className="w-full mb-8" onClick={isLoggedIn ? undefined : openAuth}>
                {isLoggedIn ? "Upgrade to Business" : "Start Free Trial"}
              </Button>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Everything in Pro
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  10 account groups
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Unlimited team members
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Bulk CSV uploads
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Brand management
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  White-labeling
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Custom templates
                </li>
              </ul>
            </div>

            {/* Enterprise */}
            <div className="relative p-8 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {PLAN_DEFINITIONS.enterprise.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {PLAN_DEFINITIONS.enterprise.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">Custom</span>
              </div>
              <Button variant="outline" className="w-full mb-8">
                Contact Sales
              </Button>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Everything in Business
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Unlimited everything
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Custom integrations
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  API access
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  Dedicated support
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  SLA guarantee
                </li>
                <li className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-brand-seafoam flex-shrink-0" />
                  On-premise deployment
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-brand-seafoam via-brand-mint to-brand-lavender dark:from-brand-plum dark:via-brand-lavender dark:to-brand-mint">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to grow your social presence?
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto">
            Join creators and businesses who use Succulent to manage their social media, 
            create products, and grow their audience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              hasAccountGroups ? (
                <Link href={`/account-group/${firstGroupId}`}>
                  <Button
                    size="3"
                    className="w-full sm:w-auto bg-white text-brand-plum hover:bg-brand-sand/20"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link href="/account">
                  <Button
                    size="3"
                    className="w-full sm:w-auto bg-white text-brand-plum hover:bg-brand-sand/20"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              )
            ) : (
              <Button
                size="3"
                className="w-full sm:w-auto bg-white text-brand-plum hover:bg-brand-sand/20"
                onClick={openAuth}
              >
                Start Free - No Credit Card
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/succulent-namemark.png"
                alt="Succulent"
                width={140}
                height={32}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Succulent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
