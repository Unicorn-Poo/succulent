"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../atoms/button";
import { Input } from "../atoms/input";
import ContentSuggestionCard from "./content-suggestion-card";
import PostQueue from "./post-queue";
import { QueuedPost, AutomationLog, ContentFeedback } from "@/app/schema";
import { co } from "jazz-tools";

interface AutopilotSettings {
  enabled: boolean;
  aggressiveness: "conservative" | "moderate" | "aggressive";
  platforms: string[];
  goals: {
    followerGrowthTarget: number; // percentage per month
    engagementRateTarget: number; // percentage
    postsPerWeek: number;
    postsPerDayPerPlatform: number; // max posts per day per platform
  };
  automation: {
    autoReply: boolean;
    autoDM: boolean;
    autoSchedule: boolean;
    autoHashtags: boolean;
    autoContent: boolean;
    autoExecuteThreshold: number; // 0-100, actions above this confidence execute automatically
  };
  approvals: {
    requireApprovalForPosts: boolean;
    requireApprovalForDMs: boolean;
    requireApprovalForReplies: boolean;
  };
}

interface AutopilotAction {
  id: string;
  type: "post" | "reply" | "dm" | "hashtag" | "schedule" | "recommendation";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  status: "pending" | "approved" | "executed" | "rejected";
  scheduledFor?: string;
  platform: string;
  content?: string;
  target?: string;
  reason: string;
  createdAt: string;
}

interface GrowthInsight {
  type: "opportunity" | "warning" | "success";
  title: string;
  description: string;
  action?: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
}

interface AutopilotDashboard {
  status: "active" | "paused";
  actionsToday: number;
  growthRate: number;
  engagementRate: number;
  nextActions: AutopilotAction[];
  insights: GrowthInsight[];
  performance: {
    postsScheduled: number;
    commentsReplied: number;
    dmssSent: number;
    hashtagsOptimized: number;
    followerGrowth: number;
  };
}

interface GrowthAutopilotProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function GrowthAutopilot({
  platform,
  profileKey,
  accountGroup,
}: GrowthAutopilotProps) {
  // Extract all linked platforms from account group
  const linkedPlatforms: string[] = React.useMemo(() => {
    if (!accountGroup?.accounts) return [platform];
    const platforms: string[] = accountGroup.accounts
      .filter((acc: any) => acc?.isLinked)
      .map((acc: any) => acc?.platform as string)
      .filter((p: string | undefined): p is string => Boolean(p));
    return platforms.length > 0
      ? ([...new Set(platforms)] as string[])
      : [platform];
  }, [accountGroup?.accounts, platform]);

  const [settings, setSettings] = useState<AutopilotSettings>({
    enabled: false,
    aggressiveness: "moderate",
    platforms: linkedPlatforms,
    goals: {
      followerGrowthTarget: 15, // 15% per month
      engagementRateTarget: 5, // 5% engagement rate
      postsPerWeek: 7,
      postsPerDayPerPlatform: 2, // max 2 posts per day per platform
    },
    automation: {
      autoReply: true,
      autoDM: false,
      autoSchedule: true,
      autoHashtags: true,
      autoContent: true,
      autoExecuteThreshold: 85, // Auto-execute actions with 85%+ confidence
    },
    approvals: {
      requireApprovalForPosts: false,
      requireApprovalForDMs: true,
      requireApprovalForReplies: false,
    },
  });

  // Track if we've loaded settings from Jazz to avoid overwriting
  const settingsLoadedRef = useRef(false);

  // Load settings from Jazz on mount
  useEffect(() => {
    if (accountGroup?.automationSettings && !settingsLoadedRef.current) {
      const saved = accountGroup.automationSettings;
      settingsLoadedRef.current = true;
      setSettings({
        enabled: saved.enabled ?? false,
        aggressiveness: saved.aggressiveness ?? "moderate",
        platforms: linkedPlatforms,
        goals: {
          followerGrowthTarget: saved.goals?.followerGrowthTarget ?? 15,
          engagementRateTarget: saved.goals?.engagementRateTarget ?? 5,
          postsPerWeek: saved.goals?.postsPerWeek ?? 7,
          postsPerDayPerPlatform: saved.goals?.postsPerDayPerPlatform ?? 2,
        },
        automation: {
          autoReply: saved.automation?.autoReply ?? true,
          autoDM: saved.automation?.autoDM ?? false,
          autoSchedule: saved.automation?.autoSchedule ?? true,
          autoHashtags: saved.automation?.autoHashtags ?? true,
          autoContent: saved.automation?.autoContent ?? true,
          autoExecuteThreshold: saved.automation?.autoExecuteThreshold ?? 85,
        },
        approvals: {
          requireApprovalForPosts:
            saved.approvals?.requireApprovalForPosts ?? false,
          requireApprovalForDMs: saved.approvals?.requireApprovalForDMs ?? true,
          requireApprovalForReplies:
            saved.approvals?.requireApprovalForReplies ?? false,
        },
      });
    }
  }, [accountGroup?.automationSettings, linkedPlatforms]);

  // Update platforms when linked accounts change
  React.useEffect(() => {
    setSettings((prev) => ({ ...prev, platforms: linkedPlatforms }));
  }, [linkedPlatforms]);

  // Initialize missing Jazz CoLists for automation features
  // This handles older account groups that were created before these fields existed
  useEffect(() => {
    if (!accountGroup || !accountGroup._owner) return;

    try {
      // Initialize postQueue if missing
      if (!accountGroup.postQueue) {
        accountGroup.postQueue = co
          .list(QueuedPost)
          .create([], { owner: accountGroup._owner });
      }

      // Initialize automationLogs if missing
      if (!accountGroup.automationLogs) {
        accountGroup.automationLogs = co
          .list(AutomationLog)
          .create([], { owner: accountGroup._owner });
      }

      // Initialize contentFeedback if missing
      if (!accountGroup.contentFeedback) {
        accountGroup.contentFeedback = co
          .list(ContentFeedback)
          .create([], { owner: accountGroup._owner });
      }
    } catch (error) {
      console.error("Failed to initialize automation fields:", error);
    }
  }, [accountGroup]);

  // Save settings to Jazz whenever they change
  const saveSettingsToJazz = useCallback(
    (newSettings: AutopilotSettings) => {
      if (!accountGroup) return;

      try {
        accountGroup.automationSettings = {
          enabled: newSettings.enabled,
          aggressiveness: newSettings.aggressiveness,
          automation: {
            autoReply: newSettings.automation.autoReply,
            autoDM: newSettings.automation.autoDM,
            autoSchedule: newSettings.automation.autoSchedule,
            autoHashtags: newSettings.automation.autoHashtags,
            autoContent: newSettings.automation.autoContent,
            autoExecuteThreshold: newSettings.automation.autoExecuteThreshold,
          },
          approvals: {
            requireApprovalForPosts:
              newSettings.approvals.requireApprovalForPosts,
            requireApprovalForDMs: newSettings.approvals.requireApprovalForDMs,
            requireApprovalForReplies:
              newSettings.approvals.requireApprovalForReplies,
          },
          goals: {
            followerGrowthTarget: newSettings.goals.followerGrowthTarget,
            engagementRateTarget: newSettings.goals.engagementRateTarget,
            postsPerWeek: newSettings.goals.postsPerWeek,
            postsPerDayPerPlatform: newSettings.goals.postsPerDayPerPlatform,
          },
        };
      } catch (error) {
        console.error("Failed to save settings to Jazz:", error);
      }
    },
    [accountGroup]
  );

  // Helper to update settings and persist to Jazz
  const updateSettings = useCallback(
    (updater: (prev: AutopilotSettings) => AutopilotSettings) => {
      setSettings((prev) => {
        const newSettings = updater(prev);
        saveSettingsToJazz(newSettings);
        return newSettings;
      });
    },
    [saveSettingsToJazz]
  );

  // Load performance stats from automationLogs (persisted in Jazz)
  // Handle case where automationLogs doesn't exist on older account groups
  const automationLogs: any[] = (() => {
    try {
      return accountGroup?.automationLogs
        ? Array.from(accountGroup.automationLogs)
        : [];
    } catch {
      return [];
    }
  })();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayLogs = automationLogs.filter((log: any) => {
    if (!log?.timestamp) return false;
    const logDate = new Date(log.timestamp);
    return logDate >= todayStart;
  });

  const persistedPerformance = {
    postsScheduled: todayLogs.filter(
      (l: any) => l?.type === "post" || l?.type === "schedule"
    ).length,
    commentsReplied: todayLogs.filter((l: any) => l?.type === "reply").length,
    dmssSent: todayLogs.filter((l: any) => l?.type === "dm").length,
    hashtagsOptimized: todayLogs.filter((l: any) => l?.type === "hashtag")
      .length,
    followerGrowth: 0,
  };

  // Calculate posts this week across all platforms
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const postsThisWeek = automationLogs.filter((log: any) => {
    if (!log?.timestamp || (log?.type !== "post" && log?.type !== "schedule"))
      return false;
    const logDate = new Date(log.timestamp);
    return logDate >= weekStart;
  }).length;

  const postsToday = persistedPerformance.postsScheduled;
  const platformCount = settings.platforms.length || 1;

  // Smart scheduling helpers
  const shouldGenerateMorePosts = useCallback(() => {
    // Check weekly limit
    if (postsThisWeek >= settings.goals.postsPerWeek) {
      return {
        allowed: false,
        reason: `Weekly goal reached (${postsThisWeek}/${settings.goals.postsPerWeek})`,
      };
    }

    // Check daily per-platform limit
    const maxTodayAllPlatforms =
      settings.goals.postsPerDayPerPlatform * platformCount;
    if (postsToday >= maxTodayAllPlatforms) {
      return {
        allowed: false,
        reason: `Daily limit reached (${postsToday}/${maxTodayAllPlatforms})`,
      };
    }

    // Calculate how many more we can generate
    const remainingWeekly = settings.goals.postsPerWeek - postsThisWeek;
    const remainingDaily = maxTodayAllPlatforms - postsToday;
    const canGenerate = Math.min(remainingWeekly, remainingDaily);

    return { allowed: true, canGenerate, remainingWeekly, remainingDaily };
  }, [postsThisWeek, postsToday, settings.goals, platformCount]);

  const [dashboard, setDashboard] = useState<AutopilotDashboard>({
    status: settings.enabled ? "active" : "paused",
    actionsToday: todayLogs.length,
    growthRate: 12.5,
    engagementRate: 4.2,
    nextActions: [],
    insights: [],
    performance: persistedPerformance,
  });

  const [pendingActions, setPendingActions] = useState<AutopilotAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "posts" | "actions" | "settings" | "insights"
  >("dashboard");
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [generatedPosts, setGeneratedPosts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Auto-clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load cached content first, then only regenerate if stale or empty
  useEffect(() => {
    if (!settings.enabled) return;

    // Try to load from cache first
    const cached = accountGroup?.cachedAutopilotContent;
    if (cached && cached.generatedAt) {
      const generatedTime = new Date(cached.generatedAt);
      const hoursSinceGenerated =
        (Date.now() - generatedTime.getTime()) / (1000 * 60 * 60);

      // Use cache if less than 24 hours old
      if (hoursSinceGenerated < 24) {
        setGeneratedPosts(cached.posts || []);
        setRecommendations(cached.recommendations || []);
        setStatusMessage(
          `Last updated ${Math.round(hoursSinceGenerated)} hours ago`
        );
        generateGrowthInsights();
        return;
      }
    }

    // No valid cache, generate fresh content
    generateAutopilotActions();
    generateGrowthInsights();
  }, [settings.enabled]);

  const generateAutopilotActions = useCallback(async () => {
    setIsLoading(true);

    // Check if we should generate more posts based on goals
    const scheduleCheck = shouldGenerateMorePosts();
    if (!scheduleCheck.allowed) {
      setNotification({
        type: "success",
        message:
          scheduleCheck.reason || "Posting limit reached for this period",
      });
      setIsLoading(false);
      return;
    }

    try {
      // Extract brand persona from account group for API
      // CRITICAL: Jazz CoLists must be converted with Array.from() to serialize properly
      const brandPersona = accountGroup?.brandPersona
        ? {
            name: accountGroup.brandPersona.name,
            description: accountGroup.brandPersona.description,
            tone: accountGroup.brandPersona.tone,
            writingStyle: accountGroup.brandPersona.writingStyle,
            emojiUsage: accountGroup.brandPersona.emojiUsage,
            languageLevel: accountGroup.brandPersona.languageLevel,
            personality: accountGroup.brandPersona.personality
              ? Array.from(accountGroup.brandPersona.personality)
              : [],
            contentPillars: accountGroup.brandPersona.contentPillars
              ? Array.from(accountGroup.brandPersona.contentPillars)
              : [],
            targetAudience: accountGroup.brandPersona.targetAudience,
            valueProposition: accountGroup.brandPersona.valueProposition,
            keyMessages: accountGroup.brandPersona.keyMessages
              ? Array.from(accountGroup.brandPersona.keyMessages)
              : [],
            avoidTopics: accountGroup.brandPersona.avoidTopics
              ? Array.from(accountGroup.brandPersona.avoidTopics)
              : [],
            callToActionStyle: accountGroup.brandPersona.callToActionStyle,
            samplePosts: accountGroup.brandPersona.samplePosts
              ? Array.from(accountGroup.brandPersona.samplePosts)
              : [],
          }
        : null;

      // 🔍 DEBUG: Log what we're sending to API
      console.log(
        "🔍 [GROWTH-AUTOPILOT] Raw accountGroup.brandPersona:",
        accountGroup?.brandPersona
      );
      console.log("🔍 [GROWTH-AUTOPILOT] Sending to API:", {
        hasBrandPersona: !!brandPersona,
        hasRawBrandPersona: !!accountGroup?.brandPersona,
        rawContentPillars: accountGroup?.brandPersona?.contentPillars,
        contentPillarsCount: brandPersona?.contentPillars?.length || 0,
        contentPillars: brandPersona?.contentPillars,
        samplePostsCount: brandPersona?.samplePosts?.length || 0,
      });

      // Extract content feedback for learning
      const contentFeedback = accountGroup?.contentFeedback
        ? Array.from(accountGroup.contentFeedback).map((f: any) => ({
            generatedContent: f.generatedContent,
            accepted: f.accepted,
            reason: f.reason,
            editedVersion: f.editedVersion,
          }))
        : [];

      // Generate content for ALL linked platforms
      const allActions: AutopilotAction[] = [];

      for (const targetPlatform of settings.platforms) {
        try {
          const aiResults = await fetch("/api/ai-growth-autopilot", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              platform: targetPlatform,
              profileKey,
              aggressiveness: settings.aggressiveness,
              accountGroupId: accountGroup?.id,
              brandPersona,
              contentFeedback,
              userGoals: {
                followerTarget: settings.goals.followerGrowthTarget,
                engagementTarget: settings.goals.engagementRateTarget,
                postsPerWeek: settings.goals.postsPerWeek,
              },
            }),
          });

          if (aiResults.ok) {
            const data = await aiResults.json();

            // Convert AI recommendations to autopilot actions
            // NOTE: Recommendations are strategy tips, NOT actual posts with content
            // They should be type "recommendation" not "post" to avoid 400 errors
            data.recommendations.forEach((rec: any, index: number) => {
              // Determine action type - only use "post" if we have actual content
              const actionType = rec.action.includes("reply")
                ? "reply"
                : rec.action.includes("hashtag")
                ? "hashtag"
                : rec.action.includes("DM")
                ? "dm"
                : "recommendation"; // NOT "post" - recommendations don't have content

              allActions.push({
                id: `ai_action_${targetPlatform}_${index}`,
                type: actionType,
                title: rec.action,
                description: rec.reasoning,
                confidence: rec.confidence,
                impact:
                  rec.priority === "high"
                    ? "high"
                    : rec.priority === "medium"
                    ? "medium"
                    : "low",
                status: "pending",
                platform: targetPlatform,
                reason: rec.expectedImpact,
                createdAt: new Date().toISOString(),
              });
            });

            // Add content suggestions as post actions
            data.contentSuggestions.forEach(
              (suggestion: any, index: number) => {
                allActions.push({
                  id: `content_${targetPlatform}_${index}`,
                  type: "post",
                  title: `Schedule: ${suggestion.title}`,
                  description: `AI-generated content with ${suggestion.engagementPotential}% engagement potential`,
                  confidence: suggestion.engagementPotential,
                  impact:
                    suggestion.engagementPotential > 80 ? "high" : "medium",
                  status: "pending",
                  platform: targetPlatform,
                  content: suggestion.content,
                  reason: suggestion.reasoning,
                  createdAt: new Date().toISOString(),
                });
              }
            );

            // Add brand-aware content suggestions (prioritized)
            if (data.brandAwareContent?.suggestions) {
              data.brandAwareContent.suggestions.forEach(
                (suggestion: any, index: number) => {
                  allActions.unshift({
                    id: `brand_content_${targetPlatform}_${index}`,
                    type: "post",
                    title: `🎯 ${suggestion.contentPillar}: On-Brand Content`,
                    description: suggestion.content.slice(0, 150) + "...",
                    confidence: suggestion.confidenceScore,
                    impact:
                      suggestion.expectedEngagement === "high"
                        ? "high"
                        : suggestion.expectedEngagement === "medium"
                        ? "medium"
                        : "low",
                    status: "pending",
                    platform: targetPlatform,
                    content: suggestion.content,
                    reason: `Matches your brand voice • Best time: ${
                      suggestion.bestTimeToPost
                    } • Hashtags: ${suggestion.hashtags
                      .slice(0, 3)
                      .join(", ")}`,
                    createdAt: new Date().toISOString(),
                  });
                }
              );
            }
          }
        } catch (platformError) {
          // Continue with other platforms if one fails
        }
      }

      if (allActions.length > 0) {
        setPendingActions(allActions);

        // Separate posts from recommendations
        const posts = allActions
          .filter((a) => a.type === "post" && a.content)
          .map((a) => ({
            id: a.id,
            content: a.content || "",
            platform: a.platform,
            confidence: a.confidence,
            contentPillar: a.title.split(":")[0]?.replace("🎯 ", ""),
            hashtags: [],
            bestTimeToPost: a.scheduledFor,
            status: "pending" as const,
          }));

        const recs = allActions
          .filter((a) => a.type === "recommendation" || !a.content)
          .map((a) => ({
            id: a.id,
            title: a.title,
            description: a.description,
            type: a.type,
            priority: a.impact as "high" | "medium" | "low",
          }));

        setGeneratedPosts(posts);
        setRecommendations(recs);
        setStatusMessage(`Generated ${posts.length} posts`);

        // Save to cache
        if (accountGroup) {
          try {
            accountGroup.cachedAutopilotContent = {
              generatedAt: new Date().toISOString(),
              platform: platform,
              posts: posts,
              recommendations: recs,
            };
          } catch (cacheError) {
            // Cache save failed, continue anyway
          }
        }

        // Prioritize showing ACTUAL POST CONTENT in the dashboard
        const nextActionsToShow =
          posts.length > 0
            ? allActions
                .filter((a) => a.type === "post" && a.content)
                .slice(0, 3)
            : allActions.slice(0, 3);

        setDashboard((prev) => ({
          ...prev,
          nextActions: nextActionsToShow,
          status: "active",
        }));

        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error("Error getting AI recommendations:", error);
    }

    // Fallback message when API fails - no fake content
    const actions: AutopilotAction[] = [
      {
        id: "action_fallback",
        type: "schedule",
        title: "Set Up Content Generation",
        description:
          "Configure your brand persona to enable AI-powered content generation. Go to Brand Management to add your voice, content pillars, and sample posts.",
        confidence: 100,
        impact: "high",
        status: "pending",
        platform,
        reason:
          "A configured brand persona helps the AI generate content that matches your style",
        createdAt: new Date().toISOString(),
      },
    ];

    setPendingActions(actions);
    setDashboard((prev) => ({
      ...prev,
      nextActions: actions.slice(0, 3),
      status: "active",
    }));

    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform, settings, shouldGenerateMorePosts]);

  const generateGrowthInsights = useCallback(() => {
    // Note: These insights are based on general best practices until real analytics are connected
    // TODO: Replace with real insights from Ayrshare analytics API when available
    const insights: GrowthInsight[] = [
      {
        type: "opportunity",
        title: "Recommended Posting Strategy",
        description:
          "Based on general engagement patterns, posting between 12-3 PM on weekdays tends to get better visibility. Test different times to find your audience's peak activity.",
        action: "Experiment with posting times this week",
        priority: "medium",
        estimatedImpact: "Find your optimal posting time",
      },
      {
        type: "success",
        title: "Content Consistency",
        description:
          "Regular posting helps build audience expectations. Aim for a consistent schedule that you can maintain.",
        priority: "medium",
        estimatedImpact: "Better audience retention",
      },
      {
        type: "opportunity",
        title: "Engagement Tip",
        description:
          "Posts with questions and calls-to-action typically get more comments. Try ending posts with a question to encourage discussion.",
        action: "Add a question to your next post",
        priority: "low",
        estimatedImpact: "Increased comment engagement",
      },
    ];

    setDashboard((prev) => ({
      ...prev,
      insights,
    }));
  }, []);

  const executeAction = async (actionId: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    setIsLoading(true);

    try {
      // For post actions, schedule via the API
      if (action.type === "post" && action.content && action.platform) {
        // Validate before sending
        if (!action.content.trim()) {
          setNotification({
            type: "error",
            message: "Cannot schedule empty content",
          });
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/automation/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: action.content,
            platform: action.platform,
            profileKey: profileKey,
            // Use Ayrshare enhanced features based on automation settings
            autoHashtag: settings.automation.autoHashtags,
            shortenLinks: true, // Always shorten links for cleaner posts
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          setNotification({
            type: "error",
            message: `Failed to schedule: ${error.error || "Unknown error"}`,
          });
          setIsLoading(false);
          return;
        }

        const result = await response.json();

        // Log to automationLogs for persistence (skip if field doesn't exist on older account groups)
        try {
          if (accountGroup?.automationLogs && accountGroup._owner) {
            const { AutomationLog } = await import("@/app/schema");
            const newLog = AutomationLog.create(
              {
                type: "post",
                action: `Scheduled: ${action.title}`,
                platform: action.platform,
                status: "success",
                timestamp: new Date(),
                details: JSON.stringify({
                  postId: result.postId,
                  scheduledFor: result.scheduledTime,
                  contentPreview: action.content.slice(0, 200),
                }),
              },
              { owner: accountGroup._owner }
            );
            accountGroup.automationLogs.push(newLog);
          }
        } catch (logError) {
          // Continue even if logging fails - field may not exist on older account groups
        }

        setNotification({
          type: "success",
          message: `Post scheduled for ${action.platform}!`,
        });
      } else if (action.type === "reply" && action.content) {
        // For reply actions
        const response = await fetch("/api/automation/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commentId: action.target || `comment-${Date.now()}`,
            commentText: action.description,
            commentAuthor: "user",
            postId: action.target || "post",
            platform: action.platform,
            profileKey: profileKey,
          }),
        });

        if (response.ok) {
          setNotification({
            type: "success",
            message: `Reply sent on ${action.platform}!`,
          });
        }
      } else if (action.type === "dm" && action.content) {
        // For DM actions
        const response = await fetch("/api/automation/dm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientUsername: action.target || "user",
            platform: action.platform,
            profileKey: profileKey,
            messageType: "custom",
            customMessage: action.content,
          }),
        });

        if (response.ok) {
          setNotification({
            type: "success",
            message: `DM prepared for ${action.platform}!`,
          });
        }
      }

      // Update action status
      setPendingActions((prev) =>
        prev.map((a) => (a.id === actionId ? { ...a, status: "executed" } : a))
      );

      // Update dashboard metrics
      setDashboard((prev) => ({
        ...prev,
        actionsToday: prev.actionsToday + 1,
        performance: {
          ...prev.performance,
          [action.type === "post"
            ? "postsScheduled"
            : action.type === "reply"
            ? "commentsReplied"
            : action.type === "dm"
            ? "dmssSent"
            : action.type === "hashtag"
            ? "hashtagsOptimized"
            : "postsScheduled"]:
            prev.performance[
              action.type === "post"
                ? "postsScheduled"
                : action.type === "reply"
                ? "commentsReplied"
                : action.type === "dm"
                ? "dmssSent"
                : action.type === "hashtag"
                ? "hashtagsOptimized"
                : "postsScheduled"
            ] + 1,
        },
      }));
    } catch (error) {
      console.error("Failed to execute action:", error);
      setNotification({
        type: "error",
        message: "Failed to execute action. Please try again.",
      });
    }

    setIsLoading(false);
  };

  const executeAllActions = async () => {
    const highConfidenceActions = pendingActions.filter(
      (a) => a.confidence >= 80 && a.status === "pending"
    );

    for (const action of highConfidenceActions) {
      await executeAction(action.id);
      // Small delay between actions
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  // Add content to PostQueue for approval
  const addToPostQueue = useCallback(
    (action: AutopilotAction, content: string, edited?: string) => {
      const finalContent = edited || content;

      if (!accountGroup?.postQueue) {
        setNotification({ type: "error", message: "Post queue not available" });
        return;
      }

      try {
        // Create a new QueuedPost and add to the queue
        const newPost = QueuedPost.create(
          {
            content: finalContent,
            platform: action.platform,
            contentPillar: action.title
              .split(":")[0]
              ?.replace("🎯 ", "")
              .trim(),
            suggestedAt: new Date(),
            status: "pending",
            confidenceScore: action.confidence,
            engagementPotential: action.confidence,
            reasoning: action.reason,
          },
          { owner: accountGroup._owner }
        );

        accountGroup.postQueue.push(newPost);
        setNotification({
          type: "success",
          message: "Content added to queue for review!",
        });
      } catch (error) {
        console.error("Failed to add to post queue:", error);
        setNotification({ type: "error", message: "Failed to add to queue" });
      }
    },
    [accountGroup]
  );

  const approveAction = async (
    actionId: string,
    content?: string,
    edited?: string
  ) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    // Update content if edited
    if (content || edited) {
      const updatedAction = {
        ...action,
        content: edited || content || action.content,
      };
      setPendingActions((prev) =>
        prev.map((a) => (a.id === actionId ? updatedAction : a))
      );
    }

    // If approval NOT required, execute directly (no double approval)
    if (!settings.approvals.requireApprovalForPosts) {
      // Execute immediately - schedules via Ayrshare
      await executeAction(actionId);
      return;
    }

    // Approval required - add to PostQueue for single review step
    if (action.content) {
      addToPostQueue(action, edited || content || action.content);
    }

    setPendingActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "approved" } : a))
    );
  };

  const rejectAction = (actionId: string, reason?: string) => {
    setPendingActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, status: "rejected" } : a))
    );

    // Save feedback for learning
    if (accountGroup?.contentFeedback && reason) {
      try {
        const action = pendingActions.find((a) => a.id === actionId);
        // Could add to contentFeedback for AI learning
      } catch (error) {
        console.error("Failed to save rejection feedback:", error);
      }
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "post":
        return "📝";
      case "reply":
        return "💬";
      case "dm":
        return "📧";
      case "hashtag":
        return "🏷️";
      case "schedule":
        return "⏰";
      case "recommendation":
        return "💡";
      default:
        return "🤖";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
      case "medium":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-lime-900/20";
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return "💡";
      case "warning":
        return "⚠️";
      case "success":
        return "✅";
      default:
        return "📊";
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "opportunity":
        return "border-lime-200 dark:border-lime-800 bg-lime-50 dark:bg-lime-900/20";
      case "warning":
        return "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20";
      case "success":
        return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20";
      default:
        return "border-border bg-muted";
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border p-6">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center justify-between ${
            notification.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
          }`}
        >
          <span>
            {notification.type === "success" ? "✓" : "✗"} {notification.message}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-foreground">
            🤖 Growth Autopilot
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              dashboard.status === "active"
                ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                : isLoading
                ? "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300"
                : "bg-muted text-foreground"
            }`}
          >
            {isLoading
              ? "🔄 Loading..."
              : dashboard.status === "active"
              ? "🟢 Active"
              : "⏸️ Paused"}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  enabled: e.target.checked,
                }))
              }
              className="rounded"
            />
            <span className="text-sm font-medium text-foreground">
              Enable Autopilot
            </span>
          </label>

          {settings.enabled &&
            pendingActions.filter((a) => a.status === "pending").length > 0 && (
              <Button
                onClick={executeAllActions}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading
                  ? "Executing..."
                  : "⚡ Execute All High-Confidence Actions"}
              </Button>
            )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-lime-50 dark:bg-lime-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-lime-900 dark:text-lime-300">
            {dashboard.actionsToday}
          </p>
          <p className="text-sm text-lime-700 dark:text-lime-300">
            Actions Today
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-900 dark:text-green-300">
            {dashboard.growthRate}%
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Growth Rate
          </p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
            {dashboard.engagementRate}%
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Engagement Rate
          </p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
            {pendingActions.filter((a) => a.status === "pending").length}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Pending Actions
          </p>
        </div>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="mb-4 px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground flex items-center justify-between">
          <span>{statusMessage}</span>
          <button
            onClick={() => {
              setStatusMessage("Refreshing...");
              generateAutopilotActions();
            }}
            className="text-lime-600 hover:text-lime-700 font-medium"
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Refresh"}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 border-b overflow-x-auto">
          {[
            { key: "dashboard", label: "Overview" },
            {
              key: "posts",
              label: `Posts (${
                generatedPosts.filter((p) => p.status === "pending").length
              })`,
            },
            {
              key: "actions",
              label: `Tips (${recommendations.length})`,
            },
            { key: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-lime-500 text-lime-600 dark:text-lime-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Generated Posts Preview */}
          {dashboard.nextActions.filter((a) => a.content).length > 0 && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-lime-50 dark:from-green-900/20 dark:to-lime-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">
                📝 Generated Posts Ready to Publish
              </h4>
              <div className="space-y-4">
                {dashboard.nextActions
                  .filter((a) => a.content)
                  .slice(0, 2)
                  .map((action) => (
                    <div
                      key={action.id}
                      className="p-4 bg-card rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {getActionIcon(action.type)}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {action.title}
                          </span>
                          <span className="px-2 py-0.5 bg-muted text-xs rounded">
                            {action.platform}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getImpactColor(
                            action.impact
                          )}`}
                        >
                          {action.confidence}%
                        </span>
                      </div>
                      <div className="bg-muted p-3 rounded-lg mb-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {action.content!.length > 300
                            ? action.content!.slice(0, 300) + "..."
                            : action.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() =>
                            approveAction(action.id, action.content)
                          }
                          size="1"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isLoading}
                        >
                          {settings.approvals.requireApprovalForPosts
                            ? "✓ Approve & Queue"
                            : "✓ Schedule Now"}
                        </Button>
                        <Button
                          onClick={() => setActiveTab("actions")}
                          size="1"
                          variant="soft"
                        >
                          Edit First
                        </Button>
                      </div>
                    </div>
                  ))}
                {dashboard.nextActions.filter((a) => a.content).length > 2 && (
                  <button
                    onClick={() => setActiveTab("actions")}
                    className="w-full py-2 text-sm text-green-600 dark:text-green-400 hover:underline"
                  >
                    View all{" "}
                    {dashboard.nextActions.filter((a) => a.content).length}{" "}
                    generated posts →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tips & Recommendations (non-content actions) */}
          {dashboard.nextActions.filter((a) => !a.content).length > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-lime-200 dark:border-lime-800 rounded-lg">
              <h4 className="font-medium text-lime-800 dark:text-lime-300 mb-3">
                💡 Growth Tips & Recommendations
              </h4>
              <div className="space-y-3">
                {dashboard.nextActions
                  .filter((a) => !a.content)
                  .slice(0, 3)
                  .map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getActionIcon(action.type)}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {action.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${getImpactColor(
                            action.impact
                          )}`}
                        >
                          {action.confidence}% confidence
                        </span>
                        <Button
                          onClick={() => executeAction(action.id)}
                          size="1"
                          disabled={isLoading}
                        >
                          Execute
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Post Queue Widget */}
          <PostQueue
            accountGroup={accountGroup}
            profileKey={profileKey}
            compact={true}
          />

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3 text-foreground">
                Today's Automation Performance
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Posts Scheduled
                  </span>
                  <span className="font-bold text-lime-600 dark:text-lime-400">
                    {dashboard.performance.postsScheduled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Comments Replied
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {dashboard.performance.commentsReplied}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">DMs Sent</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {dashboard.performance.dmssSent}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Hashtags Optimized
                  </span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">
                    {dashboard.performance.hashtagsOptimized}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-border rounded-lg">
              <h4 className="font-medium mb-3 text-foreground">
                Growth Trajectory
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Current Growth Rate
                  </span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {dashboard.growthRate}%/month
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Target Growth Rate
                  </span>
                  <span className="font-bold text-lime-600 dark:text-lime-400">
                    {settings.goals.followerGrowthTarget}%/month
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    Projected Followers (30 days)
                  </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    +{Math.round(2500 * (dashboard.growthRate / 100))}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (dashboard.growthRate /
                          settings.goals.followerGrowthTarget) *
                          100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Tab - Generated content ready to publish */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {generatedPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No posts generated yet</p>
              <p className="text-sm mb-4">
                Click refresh to generate content based on your brand persona
              </p>
              <Button
                onClick={() => generateAutopilotActions()}
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Posts"}
              </Button>
            </div>
          ) : (
            <>
              {generatedPosts
                .filter((p) => p.status === "pending")
                .map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-card border border-border rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-muted text-xs rounded font-medium">
                          {post.platform}
                        </span>
                        {post.contentPillar && (
                          <span className="px-2 py-1 bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300 text-xs rounded">
                            {post.contentPillar}
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          post.confidence >= 85
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : post.confidence >= 70
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {post.confidence}% confidence
                      </span>
                    </div>

                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </p>
                    </div>

                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-1">
                        {post.hashtags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs text-lime-600 dark:text-lime-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {post.bestTimeToPost && (
                      <p className="text-xs text-muted-foreground mb-4">
                        🕐 Best time to post: {post.bestTimeToPost}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={async () => {
                          setStatusMessage(`Scheduling to ${post.platform}...`);
                          try {
                            const response = await fetch(
                              "/api/automation/schedule",
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  content: post.content,
                                  platform: post.platform,
                                  profileKey: profileKey,
                                  autoHashtag: settings.automation.autoHashtags,
                                  shortenLinks: true,
                                }),
                              }
                            );
                            if (response.ok) {
                              setGeneratedPosts((prev) =>
                                prev.map((p) =>
                                  p.id === post.id
                                    ? { ...p, status: "scheduled" }
                                    : p
                                )
                              );
                              setNotification({
                                type: "success",
                                message: `Posted to ${post.platform}!`,
                              });
                            } else {
                              const err = await response.json();
                              setNotification({
                                type: "error",
                                message: err.error || "Failed to schedule",
                              });
                            }
                          } catch (error) {
                            setNotification({
                              type: "error",
                              message: "Failed to schedule post",
                            });
                          }
                          setStatusMessage("");
                        }}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Schedule Now
                      </Button>
                      <Button
                        onClick={() => {
                          setGeneratedPosts((prev) =>
                            prev.map((p) =>
                              p.id === post.id
                                ? { ...p, status: "rejected" }
                                : p
                            )
                          );
                        }}
                        variant="outline"
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                ))}

              {generatedPosts.filter((p) => p.status === "scheduled").length >
                0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    ✓ Scheduled (
                    {
                      generatedPosts.filter((p) => p.status === "scheduled")
                        .length
                    }
                    )
                  </h4>
                  {generatedPosts
                    .filter((p) => p.status === "scheduled")
                    .map((post) => (
                      <div
                        key={post.id}
                        className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-700 dark:text-green-300">
                            ✓ Scheduled to {post.platform}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {post.content.slice(0, 50)}...
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Actions Tab - Recommendations only */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recommendations available</p>
              <p className="text-sm mt-1">
                Tips and suggestions will appear here
              </p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div key={rec.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{rec.title}</h4>
                    <p className="text-muted-foreground mt-1">
                      {rec.description}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      rec.priority === "high"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : rec.priority === "medium"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))
          )}

          {/* Legacy actions for backwards compatibility */}
          {pendingActions
            .filter(
              (action) =>
                action.id.startsWith("brand_content_") && action.content
            )
            .map((action) => (
              <ContentSuggestionCard
                key={action.id}
                id={action.id}
                content={action.content || ""}
                contentPillar={action.title.split(":")[0]?.replace("🎯 ", "")}
                platform={action.platform}
                confidenceScore={action.confidence}
                expectedEngagement={action.impact as "high" | "medium" | "low"}
                accountGroup={accountGroup}
                onAccept={(content, edited) => {
                  approveAction(action.id, content, edited);
                }}
                onReject={(reason) => {
                  rejectAction(action.id, reason);
                }}
                onRegenerate={() => {
                  generateAutopilotActions();
                }}
              />
            ))}

          {/* Regular actions */}
          {pendingActions
            .filter((action) => !action.id.startsWith("brand_content_"))
            .map((action) => (
              <div
                key={action.id}
                className="p-4 border border-border rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl mt-1">
                      {getActionIcon(action.type)}
                    </span>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {action.title}
                      </h4>
                      <p className="text-foreground mt-1">
                        {action.description}
                      </p>
                      <p className="text-sm text-lime-600 dark:text-lime-400 mt-2">
                        💡 {action.reason}
                      </p>
                      {action.content && (
                        <div className="mt-3 p-3 bg-muted rounded-lg border border-border">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {action.content}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getImpactColor(
                        action.impact
                      )}`}
                    >
                      {action.confidence}% confidence
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        action.status === "executed"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          : action.status === "approved"
                          ? "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300"
                          : action.status === "rejected"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>
                </div>

                {action.status === "pending" && (
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => approveAction(action.id)}
                      size="1"
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {settings.approvals.requireApprovalForPosts
                        ? "Approve & Queue"
                        : "Schedule Now"}
                    </Button>
                    <Button
                      onClick={() => rejectAction(action.id)}
                      size="1"
                      variant="outline"
                    >
                      Reject
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>Platform: {action.platform}</span>
                  <span>
                    Created: {new Date(action.createdAt).toLocaleString()}
                  </span>
                  {action.scheduledFor && (
                    <span>
                      Scheduled:{" "}
                      {new Date(action.scheduledFor).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {dashboard.insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${getInsightColor(
                insight.type
              )}`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{getInsightIcon(insight.type)}</span>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">
                    {insight.title}
                  </h4>
                  <p className="text-foreground mt-1">{insight.description}</p>
                  {insight.action && (
                    <p className="text-sm font-medium text-lime-600 dark:text-lime-400 mt-2">
                      Recommended Action: {insight.action}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        insight.priority === "high"
                          ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                          : insight.priority === "medium"
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                          : "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300"
                      }`}
                    >
                      {insight.priority} priority
                    </span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {insight.estimatedImpact}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Posting Mode - Simplified */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3 text-foreground">Posting Mode</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  mode: "manual",
                  label: "Manual",
                  desc: "I approve every post before it goes live",
                  icon: "✋",
                },
                {
                  mode: "semi-auto",
                  label: "Semi-Auto",
                  desc: "Auto-post high-confidence content, review the rest",
                  icon: "⚡",
                },
                {
                  mode: "full-auto",
                  label: "Full Auto",
                  desc: "Generate and post automatically based on my schedule",
                  icon: "🚀",
                },
              ].map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    const isManual = opt.mode === "manual";
                    const isFullAuto = opt.mode === "full-auto";
                    updateSettings((prev) => ({
                      ...prev,
                      aggressiveness: isFullAuto
                        ? "aggressive"
                        : isManual
                        ? "conservative"
                        : "moderate",
                      approvals: {
                        ...prev.approvals,
                        requireApprovalForPosts: isManual,
                      },
                      automation: {
                        ...prev.automation,
                        autoExecuteThreshold: isFullAuto
                          ? 70
                          : isManual
                          ? 0
                          : 85,
                      },
                    }));
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    (opt.mode === "manual" &&
                      settings.approvals.requireApprovalForPosts) ||
                    (opt.mode === "full-auto" &&
                      settings.aggressiveness === "aggressive" &&
                      !settings.approvals.requireApprovalForPosts) ||
                    (opt.mode === "semi-auto" &&
                      settings.aggressiveness === "moderate" &&
                      !settings.approvals.requireApprovalForPosts)
                      ? "border-lime-500 bg-lime-50 dark:bg-lime-900/20"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-medium text-foreground">
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Growth Goals */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3 text-foreground">Growth Goals</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Monthly Follower Growth Target (%)
                </label>
                <Input
                  type="number"
                  value={settings.goals.followerGrowthTarget}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      goals: {
                        ...prev.goals,
                        followerGrowthTarget: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Engagement Rate Target (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.goals.engagementRateTarget}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      goals: {
                        ...prev.goals,
                        engagementRateTarget: parseFloat(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Posts Per Week
                </label>
                <Input
                  type="number"
                  value={settings.goals.postsPerWeek}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      goals: {
                        ...prev.goals,
                        postsPerWeek: parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Max Posts Per Day (per platform)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.goals.postsPerDayPerPlatform}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      goals: {
                        ...prev.goals,
                        postsPerDayPerPlatform: parseInt(e.target.value) || 1,
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Automation Toggles */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3 text-foreground">
              Automation Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.automation)
                .filter(([key]) => key !== "autoExecuteThreshold") // Exclude threshold from checkboxes
                .map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          automation: {
                            ...prev.automation,
                            [key]: e.target.checked,
                          },
                        }))
                      }
                      className="rounded"
                    />
                    <span className="capitalize text-foreground">
                      {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </span>
                  </label>
                ))}
            </div>

            {/* Auto-Execute Threshold Slider */}
            <div className="mt-4 pt-4 border-t border-border">
              <label className="block text-sm font-medium text-foreground mb-2">
                Auto-Execute Confidence Threshold:{" "}
                {settings.automation.autoExecuteThreshold}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.automation.autoExecuteThreshold}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    automation: {
                      ...prev.automation,
                      autoExecuteThreshold: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {settings.automation.autoExecuteThreshold === 0
                  ? "Auto-execute disabled - all posts require manual approval"
                  : `Posts with ${settings.automation.autoExecuteThreshold}%+ confidence will be scheduled automatically`}
              </p>
            </div>
          </div>

          {/* Approval Settings */}
          <div className="p-4 border border-border rounded-lg">
            <h4 className="font-medium mb-3">Approval Requirements</h4>
            <div className="space-y-3">
              {Object.entries(settings.approvals).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        approvals: {
                          ...prev.approvals,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                    className="rounded"
                  />
                  <span>
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .toLowerCase()
                      .replace(
                        "require approval for ",
                        "Require approval for "
                      )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
