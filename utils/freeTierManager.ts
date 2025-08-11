/**
 * Free Tier Management for Ayrshare Basic Plan
 * Tracks and optimizes usage of the 20 posts/month limit
 */

// Removed React hooks: this is a pure utility usable on server or client

interface FreeTierUsage {
  postsThisMonth: number;
  postsRemaining: number;
  resetDate: string;
  lastUpdated: string;
}

interface PostPriority {
  urgent: number;    // Critical posts (announcements, time-sensitive)
  high: number;      // Important posts (product updates, events)
  medium: number;    // Regular content (tips, behind-scenes)
  low: number;       // Optional posts (general content)
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

export class FreeTierManager {
  private static MONTHLY_LIMIT = 20;
  private static STORAGE_KEY = 'ayrshare_free_tier_usage';

  /**
   * Get current free tier usage stats
   */
  static getUsageStats(): FreeTierUsage {
    const ls = getLocalStorage();
    const stored = ls?.getItem(this.STORAGE_KEY) || null;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    
    if (stored) {
      const usage = JSON.parse(stored);
      const usageMonth = new Date(usage.lastUpdated);
      const storedMonth = `${usageMonth.getFullYear()}-${usageMonth.getMonth()}`;
      
      // Reset if new month
      if (currentMonth !== storedMonth) {
        return this.resetUsage();
      }
      
      return {
        ...usage,
        postsRemaining: this.MONTHLY_LIMIT - usage.postsThisMonth
      };
    }
    
    return this.resetUsage();
  }

  /**
   * Reset usage for new month
   */
  private static resetUsage(): FreeTierUsage {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const usage: FreeTierUsage = {
      postsThisMonth: 0,
      postsRemaining: this.MONTHLY_LIMIT,
      resetDate: nextMonth.toISOString(),
      lastUpdated: now.toISOString()
    };
    
    const ls = getLocalStorage();
    ls?.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    return usage;
  }

  /**
   * Record a post being sent
   */
  static recordPost(platformCount: number = 1): FreeTierUsage {
    const usage = this.getUsageStats();
    usage.postsThisMonth += platformCount;
    usage.postsRemaining = Math.max(0, this.MONTHLY_LIMIT - usage.postsThisMonth);
    usage.lastUpdated = new Date().toISOString();
    
    const ls = getLocalStorage();
    ls?.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    return usage;
  }

  /**
   * Check if we can send a post
   */
  static canSendPost(platformCount: number = 1): boolean {
    const usage = this.getUsageStats();
    return usage.postsRemaining >= platformCount;
  }

  /**
   * Get optimal posting strategy for remaining month
   */
  static getPostingStrategy(): {
    dailyBudget: number;
    weeklyBudget: number;
    recommendations: string[];
  } {
    const usage = this.getUsageStats();
    const now = new Date();
    const resetDate = new Date(usage.resetDate);
    const daysRemaining = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const dailyBudget = Math.floor(usage.postsRemaining / Math.max(daysRemaining, 1));
    const weeklyBudget = Math.floor(usage.postsRemaining / Math.max(Math.ceil(daysRemaining / 7), 1));
    
    const recommendations: string[] = [];
    
    if (usage.postsRemaining <= 5) {
      recommendations.push("⚠️ Low posts remaining - prioritize urgent content only");
      recommendations.push("🎯 Focus on high-engagement platforms (Instagram, X)");
      recommendations.push("📅 Save drafts for next month's reset");
    } else if (usage.postsRemaining <= 10) {
      recommendations.push("⚡ Moderate usage - plan posts carefully");
      recommendations.push("🔄 Cross-post to multiple platforms in single API call");
      recommendations.push("📊 Track which platforms give best engagement");
    } else {
      recommendations.push("✅ Good allocation remaining");
      recommendations.push("🚀 Experiment with different content types");
      recommendations.push("📈 Build consistent posting schedule");
    }
    
    return { dailyBudget, weeklyBudget, recommendations };
  }

  /**
   * Suggest optimal platforms for a post based on remaining quota
   */
  static suggestPlatforms(availablePlatforms: string[], priority: 'urgent' | 'high' | 'medium' | 'low'): {
    recommended: string[];
    reasoning: string;
  } {
    const usage = this.getUsageStats();
    
    // Platform priority for different content types
    const platformPriority = {
      urgent: ['instagram', 'x', 'linkedin'],      // High engagement, professional
      high: ['instagram', 'x', 'facebook'],        // Broad reach
      medium: ['instagram', 'linkedin'],           // Good engagement
      low: ['x']                                   // Quick, low effort
    } as Record<'urgent' | 'high' | 'medium' | 'low', string[]>;
    
    const maxPlatforms = priority === 'urgent' ? 3 : 
                        priority === 'high' ? 2 : 1;
    
    const recommended = platformPriority[priority]
      .filter(p => availablePlatforms.includes(p))
      .slice(0, Math.min(maxPlatforms, usage.postsRemaining));
    
    const reasoning = usage.postsRemaining <= 5 
      ? `Conserving quota: ${usage.postsRemaining} posts remaining`
      : usage.postsRemaining <= 10
      ? `Moderate usage: Focus on high-impact platforms`
      : `Good quota: Can use multiple platforms`;
    
    return { recommended, reasoning };
  }

  /**
   * Get free tier optimization tips
   */
  static getOptimizationTips(): string[] {
    return [
      "🔄 Use single API call for multiple platforms (counts as 1 post)",
      "📸 Upload single images only (multiple images require Premium)",
      "⏰ No scheduled posting on free tier - post immediately",
      "👀 View post analytics on Ayrshare dashboard (API analytics need Premium)",
      "📊 Use /history endpoint to track your post performance",
      "💬 View comments via API, but replies need Business plan",
      "🔗 Use /profiles to sync account information",
      "📱 Focus on Instagram, X, LinkedIn for best engagement",
      "🎯 Save drafts in your app, publish strategically",
      "📅 Plan your 20 posts across the month (0.67 posts/day)"
    ];
  }

  /**
   * Export usage data for analysis
   */
  static exportUsageData() {
    const usage = this.getUsageStats();
    const strategy = this.getPostingStrategy();
    const tips = this.getOptimizationTips();
    
    return {
      current: usage,
      strategy,
      tips,
      exportedAt: new Date().toISOString(),
      suggestions: {
        urgent: this.suggestPlatforms(['instagram', 'twitter', 'linkedin', 'facebook'], 'urgent'),
        high: this.suggestPlatforms(['instagram', 'twitter', 'linkedin', 'facebook'], 'high'),
        medium: this.suggestPlatforms(['instagram', 'twitter', 'linkedin', 'facebook'], 'medium'),
        low: this.suggestPlatforms(['instagram', 'twitter', 'linkedin', 'facebook'], 'low'),
      }
    };
  }
}

// Removed the useFreeTier React hook from this file. Implemented in hooks/useFreeTier.ts for client-only usage. 