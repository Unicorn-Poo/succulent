"use client";

import { Card, Text, Button, Badge, Avatar, Tooltip } from "@radix-ui/themes";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Search,
  Check,
  CheckCheck,
  X,
  Mail,
  Sparkles,
  CheckSquare,
  Square,
  MailOpen,
  Loader2,
  MessageCircle,
  Star,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

// Unified engagement item type
interface EngagementItem {
  id: string;
  type: "dm" | "comment" | "review";
  platform: string;
  sender: {
    id: string;
    username: string;
    displayName?: string;
    profileUrl?: string;
    avatar?: string;
  };
  content: string;
  timestamp: string;
  isRead: boolean;
  postId?: string;
  rating?: number;
  conversationId?: string;
  sentiment?: "positive" | "negative" | "neutral";
  replied?: boolean;
  requiresResponse?: boolean;
  attachments?: any[];
}

interface EngagementStats {
  total: number;
  unread: number;
  byType: {
    dm: number;
    comment: number;
    review: number;
  };
  byPlatform: Record<string, number>;
  needsResponse: number;
}

interface SuggestedReply {
  id: string;
  content: string;
  tone: "casual" | "professional" | "friendly";
  confidence: number;
}

interface EngagementInboxProps {
  profileKey?: string;
  brandPersona?: {
    tone: string;
    personality: string[];
    writingStyle?: string;
    emojiUsage?: string;
  };
  pollInterval?: number;
}

const TYPE_ICONS: Record<string, any> = {
  dm: MessageSquare,
  comment: MessageCircle,
  review: Star,
};

const TYPE_COLORS: Record<string, string> = {
  dm: "blue",
  comment: "orange",
  review: "yellow",
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏",
  instagram: "📸",
  facebook: "f",
  linkedin: "in",
  google: "G",
  yelp: "Y",
};

const SENTIMENT_CONFIG = {
  positive: { icon: ThumbsUp, color: "green", label: "Positive" },
  negative: { icon: ThumbsDown, color: "red", label: "Negative" },
  neutral: { icon: Minus, color: "gray", label: "Neutral" },
};

export default function EngagementInbox({
  profileKey,
  brandPersona,
  pollInterval = 30000,
}: EngagementInboxProps) {
  const [items, setItems] = useState<EngagementItem[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<EngagementItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, unread, needsResponse
  const [searchQuery, setSearchQuery] = useState("");

  // Reply state
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // AI Suggestions
  const [suggestedReplies, setSuggestedReplies] = useState<SuggestedReply[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Bulk Actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Polling state
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Fetch engagement items
  const fetchEngagement = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (platformFilter !== "all") params.append("platform", platformFilter);
      if (statusFilter === "unread") params.append("unreadOnly", "true");
      if (statusFilter === "needsResponse") params.append("needsResponse", "true");
      if (profileKey) params.append("profileKey", profileKey);

      const response = await fetch(`/api/engagement?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch engagement");
      }

      setItems(data.items || []);
      setStats(data.stats || null);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load engagement");
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, platformFilter, statusFilter, profileKey]);

  // Initial fetch
  useEffect(() => {
    fetchEngagement();
  }, [fetchEngagement]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(() => {
      if (!isLoading) {
        fetchEngagement();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, isLoading, fetchEngagement]);

  // Fetch AI suggestions
  const fetchAISuggestions = async () => {
    if (!selectedItem) return;

    setIsLoadingSuggestions(true);
    setSuggestedReplies([]);

    try {
      const response = await fetch("/api/automation/message-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageContent: selectedItem.content,
          senderUsername: selectedItem.sender.username,
          platform: selectedItem.platform,
          brandPersona,
          numberOfSuggestions: 3,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      setSuggestedReplies(data.suggestions || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Failed to fetch AI suggestions:", err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Use a suggested reply
  const applySuggestedReply = (suggestion: SuggestedReply) => {
    setReplyMessage(suggestion.content);
    setShowSuggestions(false);
  };

  // Send reply
  const handleSendReply = async () => {
    if (!selectedItem || !replyMessage.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      let endpoint = "/api/messages";
      let body: any = {
        platform: selectedItem.platform,
        message: replyMessage,
        profileKey,
      };

      if (selectedItem.type === "dm") {
        body.recipientId = selectedItem.sender.id;
        body.recipientUsername = selectedItem.sender.username;
        body.conversationId = selectedItem.conversationId;
      } else if (selectedItem.type === "comment") {
        endpoint = "/api/automation/reply";
        body = {
          commentId: selectedItem.id,
          commentText: selectedItem.content,
          commentAuthor: selectedItem.sender.username,
          postId: selectedItem.postId,
          platform: selectedItem.platform,
          profileKey,
        };
      } else if (selectedItem.type === "review") {
        endpoint = "/api/reviews";
        body = {
          reviewId: selectedItem.id,
          platform: selectedItem.platform,
          reply: replyMessage,
          profileKey,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reply");
      }

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, replied: true, requiresResponse: false }
            : item
        )
      );

      setReplyMessage("");
      setShowSuggestions(false);
      setSuggestedReplies([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map((item) => item.id)));
    }
  };

  // Bulk mark as read
  const handleBulkMarkAsRead = async () => {
    if (selectedItems.size === 0) return;

    setIsBulkActionLoading(true);
    try {
      // Mark DMs as read
      const dmIds = items
        .filter((item) => selectedItems.has(item.id) && item.type === "dm" && !item.isRead)
        .map((item) => item.id);

      if (dmIds.length > 0) {
        await fetch("/api/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds: dmIds, profileKey }),
        });
      }

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          selectedItems.has(item.id) ? { ...item, isRead: true } : item
        )
      );

      setSelectedItems(new Set());
    } catch (err) {
      console.error("Bulk mark as read error:", err);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  // Filter items by search
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.sender.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (hours < 168) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] || MessageSquare;
    return <Icon className="w-3 h-3" />;
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case "casual": return "orange";
      case "professional": return "blue";
      case "friendly": return "green";
      default: return "gray";
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[650px] gap-4">
      {/* Left Panel - List */}
      <Card className="w-96 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-lime-600" />
              <Text size="4" weight="bold">Engagement</Text>
              {stats && stats.unread > 0 && (
                <Badge color="red" variant="solid" size="1">
                  {stats.unread}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastRefreshed && pollInterval > 0 && (
                <Tooltip content={`Auto-refreshing every ${Math.round(pollInterval / 1000)}s`}>
                  <Text size="1" color="gray" className="text-[10px]">
                    {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Tooltip>
              )}
              <Button size="1" variant="ghost" onClick={fetchEngagement} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="flex gap-2 mb-3 text-xs">
              <Badge color="blue" variant="soft">
                💬 {stats.byType.dm} DMs
              </Badge>
              <Badge color="orange" variant="soft">
                💭 {stats.byType.comment} Comments
              </Badge>
              <Badge color="yellow" variant="soft">
                ⭐ {stats.byType.review} Reviews
              </Badge>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between bg-lime-50 dark:bg-lime-950 rounded-md p-2 mb-3">
              <Text size="1" weight="medium" className="text-lime-700 dark:text-lime-300">
                {selectedItems.size} selected
              </Text>
              <div className="flex gap-1">
                <Tooltip content="Mark all as read">
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={handleBulkMarkAsRead}
                    disabled={isBulkActionLoading}
                  >
                    {isBulkActionLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <MailOpen className="w-3 h-3" />
                    )}
                  </Button>
                </Tooltip>
                <Tooltip content="Clear selection">
                  <Button size="1" variant="ghost" onClick={() => setSelectedItems(new Set())}>
                    <X className="w-3 h-3" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search engagement..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background"
            />
          </div>

          {/* Type Filters */}
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "All", count: stats?.total || 0 },
              { key: "dm", label: "DMs", count: stats?.byType.dm || 0 },
              { key: "comment", label: "Comments", count: stats?.byType.comment || 0 },
              { key: "review", label: "Reviews", count: stats?.byType.review || 0 },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setTypeFilter(filter.key)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                  typeFilter === filter.key
                    ? "bg-lime-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {filter.label}
                <span className="opacity-75">({filter.count})</span>
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "needsResponse", label: "Needs Reply" },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  statusFilter === filter.key
                    ? "bg-gray-800 text-white dark:bg-white dark:text-gray-800"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Select All */}
          {filteredItems.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {selectedItems.size === filteredItems.length ? (
                <CheckSquare className="w-3 h-3" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              {selectedItems.size === filteredItems.length ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 text-center">
              <Text size="2" color="red">{error}</Text>
            </div>
          )}

          {isLoading && items.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <Text size="2" color="gray" className="mt-2">Loading engagement...</Text>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <Text size="2" color="gray">No engagement found</Text>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-2 p-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${
                  selectedItem?.id === item.id ? "bg-muted" : ""
                } ${!item.isRead ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleItemSelection(item.id, e)}
                  className="mt-1 text-muted-foreground hover:text-foreground"
                >
                  {selectedItems.has(item.id) ? (
                    <CheckSquare className="w-4 h-4 text-lime-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                {/* Content */}
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowSuggestions(false);
                    setSuggestedReplies([]);
                  }}
                  className="flex-1 text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar
                        size="2"
                        src={item.sender.avatar || item.sender.profileUrl}
                        fallback={item.sender.username.charAt(0).toUpperCase()}
                      />
                      {/* Type indicator */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] bg-${TYPE_COLORS[item.type]}-500 text-white`}
                      >
                        {getTypeIcon(item.type)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Text
                            size="2"
                            weight={!item.isRead ? "bold" : "regular"}
                            className="truncate"
                          >
                            @{item.sender.username}
                          </Text>
                          {/* Platform badge */}
                          <span className="text-[10px] text-muted-foreground">
                            {PLATFORM_ICONS[item.platform] || item.platform}
                          </span>
                        </div>
                        <Text size="1" color="gray">
                          {formatTime(item.timestamp)}
                        </Text>
                      </div>

                      {/* Type-specific content */}
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="soft" color={TYPE_COLORS[item.type] as any} size="1">
                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        </Badge>
                        {item.type === "review" && item.rating && renderStars(item.rating)}
                        {item.sentiment && (
                          <Badge
                            variant="soft"
                            color={SENTIMENT_CONFIG[item.sentiment].color as any}
                            size="1"
                          >
                            {SENTIMENT_CONFIG[item.sentiment].label}
                          </Badge>
                        )}
                      </div>

                      <Text
                        size="1"
                        color={!item.isRead ? undefined : "gray"}
                        weight={!item.isRead ? "medium" : "regular"}
                        className="truncate block"
                      >
                        {item.content}
                      </Text>

                      {/* Status indicators */}
                      <div className="flex items-center gap-2 mt-1">
                        {item.requiresResponse && !item.replied && (
                          <Badge color="red" variant="soft" size="1">
                            Needs Reply
                          </Badge>
                        )}
                        {item.replied && (
                          <Badge color="green" variant="soft" size="1">
                            Replied
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Right Panel - Detail/Reply */}
      <Card className="flex-1 flex flex-col">
        {selectedItem ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  size="3"
                  src={selectedItem.sender.avatar || selectedItem.sender.profileUrl}
                  fallback={selectedItem.sender.username.charAt(0).toUpperCase()}
                />
                <div>
                  <Text size="3" weight="bold">
                    @{selectedItem.sender.username}
                  </Text>
                  <div className="flex items-center gap-2">
                    <Badge variant="soft" color={TYPE_COLORS[selectedItem.type] as any} size="1">
                      {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)}
                    </Badge>
                    <Badge variant="soft" size="1">
                      {selectedItem.platform}
                    </Badge>
                    {selectedItem.type === "review" && selectedItem.rating && (
                      <div className="flex">{renderStars(selectedItem.rating)}</div>
                    )}
                  </div>
                </div>
              </div>
              <Button size="1" variant="ghost" onClick={() => setSelectedItem(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-muted rounded-2xl rounded-tl-sm p-4 max-w-[85%]">
                <Text size="2">{selectedItem.content}</Text>
                <div className="flex items-center gap-2 mt-2">
                  <Text size="1" color="gray">
                    {new Date(selectedItem.timestamp).toLocaleString()}
                  </Text>
                  {selectedItem.sentiment && (
                    <Badge variant="soft" color={SENTIMENT_CONFIG[selectedItem.sentiment].color as any} size="1">
                      {SENTIMENT_CONFIG[selectedItem.sentiment].label}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedItem.postId && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <Text size="1" color="gray">
                    In response to post: <span className="font-mono">{selectedItem.postId}</span>
                  </Text>
                </div>
              )}
            </div>

            {/* AI Suggestions Panel */}
            {showSuggestions && suggestedReplies.length > 0 && (
              <div className="px-4 pb-2 border-t border-border bg-gradient-to-b from-lime-50/50 to-transparent dark:from-lime-950/30">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-lime-600" />
                    <Text size="2" weight="medium" className="text-lime-700 dark:text-lime-300">
                      AI Suggestions
                    </Text>
                  </div>
                  <Button size="1" variant="ghost" onClick={() => setShowSuggestions(false)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {suggestedReplies.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => applySuggestedReply(suggestion)}
                      className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-border hover:border-lime-400 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Text size="2" className="flex-1">
                          {suggestion.content}
                        </Text>
                        <Badge variant="soft" color={getToneColor(suggestion.tone) as any} size="1">
                          {suggestion.tone}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                          <div
                            className="bg-lime-500 h-1 rounded-full"
                            style={{ width: `${suggestion.confidence}%` }}
                          />
                        </div>
                        <Text size="1" color="gray">
                          {suggestion.confidence}%
                        </Text>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Tooltip content="Get AI suggestions">
                  <Button
                    size="2"
                    variant="soft"
                    onClick={fetchAISuggestions}
                    disabled={isLoadingSuggestions}
                    className="shrink-0"
                  >
                    {isLoadingSuggestions ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </Button>
                </Tooltip>
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                  placeholder={`Reply to ${selectedItem.type}...`}
                  className="flex-1 px-4 py-2 border border-border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-lime-500"
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || isSending}
                  className="rounded-full"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <Text size="4" weight="medium" className="block mb-1">
                  Select an Item
                </Text>
                <Text size="2" color="gray">
                  Choose a DM, comment, or review to view and respond
                </Text>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

