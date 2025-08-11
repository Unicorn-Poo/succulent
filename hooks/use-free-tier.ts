"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'jazz-react';
import { MyAppAccount } from '@/app/schema';

export function useFreeTier() {
  const { me } = useAccount(MyAppAccount);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const subscription = me?.profile?.subscription || null;
  const usage = subscription?.usage;
  const limits = subscription?.limits;

  const postsUsed = usage?.monthlyPosts ?? 0;
  const maxPosts = limits?.maxPosts ?? 0;
  const isUnlimited = maxPosts === -1;
  const postsRemaining = isUnlimited ? Number.POSITIVE_INFINITY : Math.max(0, maxPosts - postsUsed);

  const resetDate = useMemo(() => {
    const lastReset = usage?.lastResetDate ? new Date(usage.lastResetDate) : new Date();
    // Approximate monthly reset: 30 days after lastResetDate
    return new Date(lastReset.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }, [usage?.lastResetDate]);

  const computedUsage = useMemo(() => ({
    postsThisMonth: postsUsed,
    postsRemaining: isUnlimited ? 999999 : postsRemaining,
    resetDate,
    lastUpdated: new Date().toISOString(),
  }), [postsUsed, postsRemaining, resetDate, isUnlimited]);

  useEffect(() => {
    const interval = setInterval(() => setLastRefresh(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => setLastRefresh(Date.now());

  const recordPost = (platforms: string[]) => {
    if (!subscription?.usage) return;
    // Increment Jazz-backed counter
    subscription.usage.monthlyPosts += platforms.length;
    refresh();
  };

  const getStrategy = () => {
    const now = new Date();
    const reset = new Date(resetDate);
    const daysRemaining = Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const remaining = isUnlimited ? 100 : computedUsage.postsRemaining;
    const dailyBudget = Math.floor(remaining / daysRemaining);
    const weeklyBudget = Math.floor(remaining / Math.max(1, Math.ceil(daysRemaining / 7)));

    const recommendations: string[] = [];
    if (!isUnlimited && remaining <= 5) {
      recommendations.push("Low posts remaining - prioritize urgent content only");
      recommendations.push("Focus on high-engagement platforms (Instagram, X)");
      recommendations.push("Save drafts for next month's reset");
    } else if (!isUnlimited && remaining <= 10) {
      recommendations.push("Moderate usage - plan posts carefully");
      recommendations.push("Cross-post to multiple platforms in single API call");
      recommendations.push("Track which platforms give best engagement");
    } else {
      recommendations.push("Good allocation remaining");
      recommendations.push("Experiment with different content types");
      recommendations.push("Build consistent posting schedule");
    }

    return { dailyBudget, weeklyBudget, recommendations };
  };

  const tips = [
    "Use single API call for multiple platforms",
    "Upload single images only on free tier",
    "No scheduled posting on free tier - post immediately",
    "View analytics in dashboard for free tier",
    "Use /history endpoint to track performance",
  ];

  const getSuggestions = (platforms: string[], priority: 'urgent' | 'high' | 'medium' | 'low') => {
    const remaining = isUnlimited ? 100 : computedUsage.postsRemaining;
    const platformPriority: Record<'urgent' | 'high' | 'medium' | 'low', string[]> = {
      urgent: ['instagram', 'x', 'linkedin'],
      high: ['instagram', 'x', 'facebook'],
      medium: ['instagram', 'linkedin'],
      low: ['x'],
    };
    const maxPlatforms = priority === 'urgent' ? 3 : priority === 'high' ? 2 : 1;
    const recommended = platformPriority[priority]
      .filter(p => platforms.includes(p))
      .slice(0, Math.min(maxPlatforms, remaining));

    const reasoning = !isUnlimited && remaining <= 5
      ? `Conserving quota: ${remaining} posts remaining`
      : !isUnlimited && remaining <= 10
      ? `Moderate usage: Focus on high-impact platforms`
      : `Good quota: Can use multiple platforms`;

    return { recommended, reasoning };
  };

  return {
    usage: computedUsage,
    getStrategy,
    tips,
    recordPost,
    refresh,
    getSuggestions,
    lastRefresh,
  };
} 