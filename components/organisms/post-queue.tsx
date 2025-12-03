"use client";

import React, { useState, useMemo } from "react";
import { Button } from "../atoms/button";
import {
  CheckCircle,
  XCircle,
  Clock,
  Edit3,
  Trash2,
  Calendar,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RefreshCw,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { QueuedPost } from "@/app/schema";
import { co } from "jazz-tools";

interface PostQueueProps {
  accountGroup: any;
  profileKey?: string; // Ayrshare profile key for scheduling
  onApprove?: (post: any, scheduledTime: Date) => Promise<void>;
  onReject?: (post: any, reason: string) => Promise<void>;
  onEdit?: (post: any) => void;
  onDelete?: (post: any) => Promise<void>;
  compact?: boolean; // For widget view in Growth Autopilot
}

export default function PostQueue({
  accountGroup,
  profileKey,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  compact = false,
}: PostQueueProps) {
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "approved" | "scheduled" | "rejected"
  >("pending");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-clear notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Get posts from the queue
  const queuedPosts: any[] = useMemo(() => {
    return accountGroup?.postQueue || [];
  }, [accountGroup?.postQueue]);

  // Filter posts based on active filter
  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") return queuedPosts;
    return queuedPosts.filter((post: any) => post?.status === activeFilter);
  }, [queuedPosts, activeFilter]);

  // Count by status
  const statusCounts = useMemo(
    () => ({
      all: queuedPosts.length,
      pending: queuedPosts.filter((p: any) => p?.status === "pending").length,
      approved: queuedPosts.filter((p: any) => p?.status === "approved").length,
      scheduled: queuedPosts.filter((p: any) => p?.status === "scheduled")
        .length,
      rejected: queuedPosts.filter((p: any) => p?.status === "rejected").length,
    }),
    [queuedPosts]
  );

  // Calculate optimal posting time (simplified - would use analytics in production)
  const getOptimalTime = () => {
    const now = new Date();
    const optimalHours = [9, 12, 15, 18, 20]; // Common high-engagement times
    const currentHour = now.getHours();

    // Find next optimal hour
    const nextOptimalHour =
      optimalHours.find((h) => h > currentHour) || optimalHours[0];

    const scheduledTime = new Date(now);
    if (nextOptimalHour <= currentHour) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    scheduledTime.setHours(nextOptimalHour, 0, 0, 0);

    return scheduledTime;
  };

  const handleApprove = async (post: any) => {
    setIsProcessing(post.id);
    try {
      const optimalTime = getOptimalTime();
      if (onApprove) {
        await onApprove(post, optimalTime);
      } else {
        // Default: Update the post status in Jazz
        post.status = "approved";
        post.approvedAt = new Date().toISOString();
        post.scheduledFor = optimalTime.toISOString();
      }
      setNotification({ type: "success", message: "Post approved!" });
    } catch (error) {
      console.error("Error approving post:", error);
      setNotification({ type: "error", message: "Failed to approve post" });
    } finally {
      setIsProcessing(null);
    }
  };

  // Schedule post now via Ayrshare API
  const handleScheduleNow = async (post: any) => {
    if (!profileKey) {
      setNotification({ type: "error", message: "No profile key available for scheduling" });
      return;
    }

    // Validate required fields
    if (!post?.content || !post?.platform) {
      setNotification({ type: "error", message: "Post is missing content or platform" });
      return;
    }

    setIsProcessing(post.id);
    try {
      const response = await fetch("/api/automation/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          platform: post.platform,
          profileKey: profileKey,
          scheduledDate: getOptimalTime().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule");
      }

      const result = await response.json();
      
      // Update post status in Jazz
      post.status = "scheduled";
      post.scheduledFor = getOptimalTime().toISOString();
      post.ayrsharePostId = result.postId;
      
      setNotification({ type: "success", message: `Post scheduled for ${post.platform}!` });
    } catch (error) {
      console.error("Error scheduling post:", error);
      setNotification({ type: "error", message: error instanceof Error ? error.message : "Failed to schedule post" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (post: any) => {
    setIsProcessing(post.id);
    try {
      if (onReject) {
        await onReject(post, rejectReason);
      } else {
        // Default: Update the post status in Jazz
        post.status = "rejected";
        post.rejectedReason = rejectReason;
      }
      setShowRejectModal(null);
      setRejectReason("");
    } catch (error) {
      console.error("Error rejecting post:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDelete = async (post: any) => {
    if (!confirm("Are you sure you want to delete this post from the queue?"))
      return;

    setIsProcessing(post.id);
    try {
      if (onDelete) {
        await onDelete(post);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    const pendingPosts = queuedPosts.filter(
      (p: any) => p?.status === "pending"
    );
    for (const post of pendingPosts) {
      await handleApprove(post);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300">
            Approved
          </span>
        );
      case "scheduled":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
            Scheduled
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
            Rejected
          </span>
        );
      case "posted":
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300">
            Posted
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs bg-muted text-gray-800 dark:text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "📷",
      facebook: "📘",
      twitter: "🐦",
      x: "✖️",
      linkedin: "💼",
      youtube: "📺",
      tiktok: "🎵",
      pinterest: "📌",
    };
    return icons[platform?.toLowerCase()] || "📱";
  };

  // Notification component
  const NotificationBanner = () =>
    notification ? (
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
    ) : null;

  // Compact widget view for Growth Autopilot
  if (compact) {
    const pendingCount = statusCounts.pending;
    const scheduledCount = statusCounts.scheduled;
    const topPending = filteredPosts.slice(0, 3);

    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <NotificationBanner />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Inbox className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-foreground">Post Queue</h4>
          </div>
          <div className="flex items-center space-x-2">
            {scheduledCount > 0 && (
              <span className="px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                {scheduledCount} scheduled
              </span>
            )}
            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
              {pendingCount} pending
            </span>
          </div>
        </div>

        {pendingCount === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No posts awaiting approval
            </p>
            {scheduledCount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ {scheduledCount} posts already scheduled to publish
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Approve content from the Actions tab to add posts here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topPending.map((post: any, index: number) => (
              <div
                key={post?.id || index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span>{getPlatformIcon(post?.platform)}</span>
                  <p className="text-sm text-foreground truncate">
                    {post?.content?.slice(0, 50)}...
                  </p>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleApprove(post)}
                    disabled={isProcessing === post?.id}
                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowRejectModal(post?.id)}
                    disabled={isProcessing === post?.id}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {pendingCount > 3 && (
              <p className="text-xs text-muted-foreground text-center">
                +{pendingCount - 3} more pending
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full queue view
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="p-6 pb-0">
        <NotificationBanner />
      </div>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-lime-500 to-green-500 rounded-lg flex items-center justify-center">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Content Queue
              </h3>
              <p className="text-sm text-muted-foreground">
                Review and approve AI-generated posts
              </p>
            </div>
          </div>

          {statusCounts.pending > 0 && (
            <Button onClick={handleBulkApprove} intent="primary" size="2">
              <Sparkles className="w-4 h-4 mr-2" />
              Approve All ({statusCounts.pending})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(
            ["all", "pending", "approved", "scheduled", "rejected"] as const
          ).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} (
              {statusCounts[filter]})
            </button>
          ))}
        </div>
      </div>

      {/* Queue List */}
      <div className="p-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-medium text-foreground mb-2">
              {activeFilter === "pending"
                ? "No Pending Posts"
                : `No ${activeFilter} Posts`}
            </h4>
            <p className="text-muted-foreground">
              {activeFilter === "pending"
                ? "All caught up! Generate new content from the AI Autopilot."
                : "No posts match this filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post: any, index: number) => (
              <div
                key={post?.id || index}
                className="border border-border rounded-lg overflow-hidden hover:border-muted-foreground/30 transition-colors"
              >
                {/* Post Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() =>
                    setExpandedPost(expandedPost === post?.id ? null : post?.id)
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl">
                        {getPlatformIcon(post?.platform)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusBadge(post?.status)}
                          {post?.contentPillar && (
                            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              {post.contentPillar}
                            </span>
                          )}
                          {post?.confidenceScore && (
                            <span className="text-xs text-muted-foreground">
                              {post.confidenceScore}% confidence
                            </span>
                          )}
                        </div>
                        <p className="text-foreground line-clamp-2">
                          {post?.content}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Suggested:{" "}
                            {new Date(post?.suggestedAt).toLocaleDateString()}
                          </span>
                          {post?.scheduledFor && (
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Scheduled:{" "}
                              {new Date(post.scheduledFor).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {post?.status === "pending" && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(post);
                            }}
                            disabled={isProcessing === post?.id}
                            intent="success"
                            size="1"
                            title="Approve"
                          >
                            {isProcessing === post?.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleNow(post);
                            }}
                            disabled={isProcessing === post?.id || !profileKey}
                            intent="primary"
                            size="1"
                            title="Approve & Schedule Now"
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRejectModal(post?.id);
                            }}
                            disabled={isProcessing === post?.id}
                            intent="danger"
                            variant="outline"
                            size="1"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {post?.status === "approved" && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScheduleNow(post);
                          }}
                          disabled={isProcessing === post?.id || !profileKey}
                          intent="primary"
                          size="1"
                          title="Schedule Now"
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                      )}
                      <button className="p-1 text-muted-foreground hover:text-foreground">
                        {expandedPost === post?.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPost === post?.id && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">
                          Full Content
                        </h5>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded">
                          {post?.content}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {post?.reasoning && (
                          <div>
                            <h5 className="text-sm font-medium text-foreground mb-2">
                              AI Reasoning
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {post.reasoning}
                            </p>
                          </div>
                        )}
                        {post?.engagementPotential && (
                          <div>
                            <h5 className="text-sm font-medium text-foreground mb-2">
                              Engagement Potential
                            </h5>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{
                                    width: `${post.engagementPotential}%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium text-foreground">
                                {post.engagementPotential}%
                              </span>
                            </div>
                          </div>
                        )}
                        {post?.mediaUrls && post.mediaUrls.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-foreground mb-2">
                              Media
                            </h5>
                            <div className="flex items-center space-x-2">
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {post.mediaUrls.length} image(s) attached
                              </span>
                            </div>
                          </div>
                        )}
                        {post?.rejectedReason && (
                          <div>
                            <h5 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                              Rejection Reason
                            </h5>
                            <p className="text-sm text-muted-foreground">
                              {post.rejectedReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-2 mt-4 pt-4 border-t border-border">
                      {onEdit && (
                        <Button
                          onClick={() => onEdit(post)}
                          variant="outline"
                          size="1"
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          onClick={() => handleDelete(post)}
                          variant="outline"
                          intent="danger"
                          size="1"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-foreground">
                  Reject Post
                </h4>
                <p className="text-sm text-muted-foreground">
                  Provide a reason for rejection (optional)
                </p>
              </div>
            </div>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Tone doesn't match brand, Too promotional, etc."
              className="w-full p-3 border border-border rounded-lg bg-background text-foreground resize-none h-24 mb-4"
            />

            <div className="flex items-center justify-end space-x-2">
              <Button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason("");
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const post = queuedPosts.find(
                    (p: any) => p?.id === showRejectModal
                  );
                  if (post) handleReject(post);
                }}
                intent="danger"
                disabled={isProcessing !== null}
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Reject Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
