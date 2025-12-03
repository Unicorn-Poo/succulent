"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../atoms/button";
import {
  RefreshCw,
  Activity,
  TrendingUp,
  MessageCircle,
  Mail,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
  Inbox,
} from "lucide-react";

interface AutomationActivity {
  id: string;
  type: "post" | "reply" | "dm" | "hashtag" | "schedule" | "approval";
  title: string;
  description: string;
  platform: string;
  timestamp: string;
  status: "success" | "pending" | "failed";
  details?: string;
  impact?: string;
}

interface AutomationMetrics {
  today: {
    postsScheduled: number;
    commentsReplied: number;
    dmsSent: number;
    hashtagsOptimized: number;
    contentDiscovered: number;
    totalActions: number;
  };
  thisWeek: {
    followerGrowth: number;
    engagementIncrease: number;
    timesSaved: number;
    automationSuccessRate: number;
  };
  systemStatus: {
    autopilotEnabled: boolean;
    autoRepliesEnabled: boolean;
    autoSchedulingEnabled: boolean;
    dmAutomationEnabled: boolean;
    hashtagOptimizationEnabled: boolean;
  };
  hasRealData: boolean;
}

interface UnifiedAutomationDashboardProps {
  platform: string;
  profileKey?: string;
  accountGroup?: any;
}

export default function UnifiedAutomationDashboard({
  platform,
  profileKey,
  accountGroup,
}: UnifiedAutomationDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate real metrics from Jazz data
  const { metrics, activities } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get automation logs from Jazz
    const automationLogs: any[] = accountGroup?.automationLogs || [];

    // Get post queue from Jazz
    const postQueue: any[] = accountGroup?.postQueue || [];

    // Get automation settings
    const automationSettings = accountGroup?.automationSettings;

    // Filter today's logs
    const todayLogs = automationLogs.filter((log: any) => {
      const logDate = new Date(log?.timestamp);
      return logDate >= todayStart;
    });

    // Filter this week's logs
    const weekLogs = automationLogs.filter((log: any) => {
      const logDate = new Date(log?.timestamp);
      return logDate >= weekStart;
    });

    // Count by type for today
    const todayMetrics = {
      postsScheduled: todayLogs.filter(
        (l: any) => l?.type === "post" || l?.type === "schedule"
      ).length,
      commentsReplied: todayLogs.filter((l: any) => l?.type === "reply").length,
      dmsSent: todayLogs.filter((l: any) => l?.type === "dm").length,
      hashtagsOptimized: todayLogs.filter((l: any) => l?.type === "hashtag")
        .length,
      contentDiscovered: postQueue.filter((p: any) => {
        const suggestedDate = new Date(p?.suggestedAt);
        return suggestedDate >= todayStart && p?.status === "pending";
      }).length,
      totalActions: todayLogs.length,
    };

    // Calculate week stats
    const successCount = weekLogs.filter(
      (l: any) => l?.status === "success"
    ).length;
    const totalWeekActions = weekLogs.length;
    const successRate =
      totalWeekActions > 0 ? (successCount / totalWeekActions) * 100 : 0;

    // Estimate time saved (rough: 5 min per action)
    const timesSaved = (totalWeekActions * 5) / 60;

    // System status from settings
    const systemStatus = {
      autopilotEnabled: automationSettings?.enabled ?? false,
      autoRepliesEnabled: automationSettings?.automation?.autoReply ?? false,
      autoSchedulingEnabled:
        automationSettings?.automation?.autoSchedule ?? false,
      dmAutomationEnabled: automationSettings?.automation?.autoDM ?? false,
      hashtagOptimizationEnabled:
        automationSettings?.automation?.autoHashtags ?? false,
    };

    const calculatedMetrics: AutomationMetrics = {
      today: todayMetrics,
      thisWeek: {
        followerGrowth: 0, // Would need analytics data
        engagementIncrease: 0, // Would need analytics data
        timesSaved,
        automationSuccessRate: successRate,
      },
      systemStatus,
      hasRealData: automationLogs.length > 0 || postQueue.length > 0,
    };

    // Convert automation logs to activity format
    const convertedActivities: AutomationActivity[] = automationLogs
      .slice(0, 50) // Limit to last 50
      .map((log: any, index: number) => ({
        id: log?.id || `log-${index}`,
        type: log?.type || "post",
        title: log?.action || "Automation action",
        description:
          log?.details || `Automated action on ${log?.platform || platform}`,
        platform: log?.platform || platform,
        timestamp: log?.timestamp || new Date().toISOString(),
        status: log?.status || "pending",
        impact: log?.engagementImpact
          ? `+${log.engagementImpact} engagement`
          : undefined,
      }))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    return { metrics: calculatedMetrics, activities: convertedActivities };
  }, [
    accountGroup?.automationLogs,
    accountGroup?.postQueue,
    accountGroup?.automationSettings,
    platform,
  ]);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "today" | "success" | "pending" | "failed"
  >("all");

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    // Just a brief loading state for UX
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsLoading(false);
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [loadDashboardData, autoRefresh]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "post":
      case "schedule":
        return <Clock className="w-4 h-4" />;
      case "reply":
        return <MessageCircle className="w-4 h-4" />;
      case "dm":
        return <Mail className="w-4 h-4" />;
      case "hashtag":
        return <Search className="w-4 h-4" />;
      case "approval":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "post":
      case "schedule":
        return "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400";
      case "reply":
        return "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400";
      case "dm":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400";
      case "hashtag":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600";
      case "approval":
        return "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return (
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        );
      case "failed":
        return (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      default:
        return (
          <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        );
    }
  };

  const filteredActivities = activities.filter((activity) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "today") {
      const today = new Date().toDateString();
      return new Date(activity.timestamp).toDateString() === today;
    }
    return activity.status === activeFilter;
  });

  const toggleAutomation = async (
    type: keyof AutomationMetrics["systemStatus"]
  ) => {
    // This would update the Jazz automationSettings
    // For now, just show a toast or alert
    alert(`Toggle ${type} - This will update your automation settings.`);
  };

  // Empty state when no automation data
  if (!metrics.hasRealData) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                🤖 Automation Dashboard
              </h3>
              <p className="text-sm text-muted-foreground">
                Monitor all automated growth activities in real-time
              </p>
            </div>
          </div>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-muted-foreground" />
          </div>
          <h4 className="text-lg font-medium text-foreground mb-2">
            No Automation Activity Yet
          </h4>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Your automation dashboard will display real metrics once you start
            using the AI Autopilot. Enable automation features in the Settings
            tab to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">0</span> posts
              scheduled
            </div>
            <div className="hidden sm:block text-muted-foreground">•</div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">0</span> replies
              sent
            </div>
            <div className="hidden sm:block text-muted-foreground">•</div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">0</span> actions
              today
            </div>
          </div>
        </div>

        {/* System Status - Show current state */}
        <div className="bg-muted/50 p-6 rounded-lg mt-6">
          <h4 className="font-medium text-foreground mb-4">
            🔧 Automation System Status
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(metrics.systemStatus).map(([key, enabled]) => {
              const labels: Record<string, string> = {
                autopilotEnabled: "AI Autopilot",
                autoRepliesEnabled: "Auto-Replies",
                autoSchedulingEnabled: "Auto-Scheduling",
                dmAutomationEnabled: "DM Automation",
                hashtagOptimizationEnabled: "Hashtag Optimization",
              };

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        enabled ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {labels[key]}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      toggleAutomation(
                        key as keyof AutomationMetrics["systemStatus"]
                      )
                    }
                    className={`p-1 rounded ${
                      enabled
                        ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {enabled ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              🤖 Automation Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Monitor all automated growth activities in real-time
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
          <Button onClick={loadDashboardData} disabled={isLoading} size="1">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Today's Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-lime-50 dark:bg-lime-900/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-lime-600 dark:text-lime-400" />
          </div>
          <p className="text-2xl font-bold text-lime-900 dark:text-lime-300">
            {metrics.today.postsScheduled}
          </p>
          <p className="text-sm text-lime-700 dark:text-lime-300">
            Posts Scheduled
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-300">
            {metrics.today.commentsReplied}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            Comments Replied
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
            {metrics.today.dmsSent}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            DMs Sent
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <Search className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">
            {metrics.today.hashtagsOptimized}
          </p>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Hashtags Optimized
          </p>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg text-center">
          <div className="flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-300">
            {metrics.today.contentDiscovered}
          </p>
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            Pending Queue
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg text-center border border-lime-200 dark:border-lime-800">
          <div className="flex items-center justify-center mb-2">
            <Activity className="w-5 h-5 text-lime-600 dark:text-lime-400" />
          </div>
          <p className="text-2xl font-bold text-lime-900 dark:text-lime-300">
            {metrics.today.totalActions}
          </p>
          <p className="text-sm text-lime-700 dark:text-lime-300">
            Total Actions
          </p>
        </div>
      </div>

      {/* Weekly Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-green-200 dark:border-green-800 p-4 rounded-lg">
          <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
            Follower Growth
          </h4>
          <p className="text-3xl font-bold text-green-900 dark:text-green-300">
            {metrics.thisWeek.followerGrowth > 0
              ? `${metrics.thisWeek.followerGrowth.toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {metrics.thisWeek.followerGrowth > 0 ? "This week" : "No data yet"}
          </p>
        </div>

        <div className="bg-card border border-lime-200 dark:border-lime-800 p-4 rounded-lg">
          <h4 className="font-medium text-lime-800 dark:text-lime-300 mb-2">
            Engagement Boost
          </h4>
          <p className="text-3xl font-bold text-lime-900 dark:text-lime-300">
            {metrics.thisWeek.engagementIncrease > 0
              ? `${metrics.thisWeek.engagementIncrease.toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm text-lime-600 dark:text-lime-400">
            {metrics.thisWeek.engagementIncrease > 0
              ? "vs last week"
              : "No data yet"}
          </p>
        </div>

        <div className="bg-card border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
          <h4 className="font-medium text-purple-800 dark:text-purple-300 mb-2">
            Time Saved
          </h4>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
            {metrics.thisWeek.timesSaved > 0
              ? `${metrics.thisWeek.timesSaved.toFixed(1)}h`
              : "0h"}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            This week
          </p>
        </div>

        <div className="bg-card border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
            Success Rate
          </h4>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-300">
            {metrics.thisWeek.automationSuccessRate > 0
              ? `${metrics.thisWeek.automationSuccessRate.toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {metrics.thisWeek.automationSuccessRate > 0
              ? "Automation accuracy"
              : "No actions yet"}
          </p>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-muted/50 p-6 rounded-lg mb-8">
        <h4 className="font-medium text-foreground mb-4">
          🔧 Automation System Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(metrics.systemStatus).map(([key, enabled]) => {
            const labels: Record<string, string> = {
              autopilotEnabled: "AI Autopilot",
              autoRepliesEnabled: "Auto-Replies",
              autoSchedulingEnabled: "Auto-Scheduling",
              dmAutomationEnabled: "DM Automation",
              hashtagOptimizationEnabled: "Hashtag Optimization",
            };

            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      enabled ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {labels[key]}
                  </span>
                </div>
                <button
                  onClick={() =>
                    toggleAutomation(
                      key as keyof AutomationMetrics["systemStatus"]
                    )
                  }
                  className={`p-1 rounded ${
                    enabled
                      ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {enabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-foreground">
            📋 Recent Automation Activity
          </h4>

          {/* Activity Filters */}
          <div className="flex items-center space-x-2">
            {[
              { key: "all", label: "All" },
              { key: "today", label: "Today" },
              { key: "success", label: "Success" },
              { key: "pending", label: "Pending" },
              { key: "failed", label: "Failed" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() =>
                  setActiveFilter(filter.key as typeof activeFilter)
                }
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  activeFilter === filter.key
                    ? "bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter.label} (
                {
                  activities.filter((a) => {
                    if (filter.key === "all") return true;
                    if (filter.key === "today") {
                      const today = new Date().toDateString();
                      return new Date(a.timestamp).toDateString() === today;
                    }
                    return a.status === filter.key;
                  }).length
                }
                )
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-4 border border-border rounded-lg hover:border-muted-foreground/30 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActivityColor(
                  activity.type
                )}`}
              >
                {getActivityIcon(activity.type)}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-medium text-foreground">
                    {activity.title}
                  </h5>
                  <div className="flex items-center space-x-2">
                    {activity.impact && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {activity.impact}
                      </span>
                    )}
                    {getStatusIcon(activity.status)}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-2">
                  {activity.description}
                </p>

                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span>{activity.platform}</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  <span
                    className={`px-2 py-1 rounded-full ${
                      activity.status === "success"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        : activity.status === "failed"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                        : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No activities found for the selected filter
          </div>
        )}
      </div>

      {/* Real-time Status */}
      <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
        <span>
          Last updated: {new Date().toLocaleString()}
          {autoRefresh && <span className="ml-2">• Auto-refresh enabled</span>}
        </span>
        <span className="flex items-center space-x-1">
          <div
            className={`w-2 h-2 rounded-full ${
              metrics.systemStatus.autopilotEnabled
                ? "bg-green-500 animate-pulse"
                : "bg-gray-400"
            }`}
          />
          <span>
            {metrics.systemStatus.autopilotEnabled
              ? "System active"
              : "Autopilot disabled"}
          </span>
        </span>
      </div>
    </div>
  );
}
