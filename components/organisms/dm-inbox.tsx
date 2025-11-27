"use client";

import { Card, Text, Button, Badge, Avatar } from "@radix-ui/themes";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Filter,
  Search,
  Check,
  CheckCheck,
  Clock,
  X,
  ChevronRight,
  User,
  Mail,
  MailOpen,
} from "lucide-react";
import { useState, useEffect } from "react";

interface Message {
  id: string;
  platform: string;
  senderId: string;
  senderUsername: string;
  senderProfileUrl?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  conversationId?: string;
  attachments?: any[];
}

interface Conversation {
  id: string;
  platform: string;
  participant: {
    id: string;
    username: string;
    profileUrl?: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface DMInboxProps {
  profileKey?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "blue",
  instagram: "pink",
  facebook: "indigo",
  linkedin: "cyan",
};

const PLATFORM_ICONS: Record<string, string> = {
  twitter: "𝕏",
  instagram: "📸",
  facebook: "f",
  linkedin: "in",
};

export default function DMInbox({ profileKey }: DMInboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch messages from API
  const fetchMessages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.append("platform", filter);
      if (profileKey) params.append("profileKey", profileKey);

      const response = await fetch(`/api/messages?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      setMessages(data.messages || []);

      // Group messages into conversations
      const grouped = groupMessagesIntoConversations(data.messages || []);
      setConversations(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  };

  // Group messages by sender/conversation
  const groupMessagesIntoConversations = (msgs: Message[]): Conversation[] => {
    const conversationMap = new Map<string, Conversation>();

    msgs.forEach((msg) => {
      const key = msg.conversationId || `${msg.platform}-${msg.senderId}`;

      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: key,
          platform: msg.platform,
          participant: {
            id: msg.senderId,
            username: msg.senderUsername,
            profileUrl: msg.senderProfileUrl,
          },
          lastMessage: msg.content,
          lastMessageTime: msg.timestamp,
          unreadCount: msg.isRead ? 0 : 1,
          messages: [msg],
        });
      } else {
        const conv = conversationMap.get(key)!;
        conv.messages.push(msg);
        if (!msg.isRead) conv.unreadCount++;
        if (new Date(msg.timestamp) > new Date(conv.lastMessageTime)) {
          conv.lastMessage = msg.content;
          conv.lastMessageTime = msg.timestamp;
        }
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
  };

  // Send reply message
  const handleSendReply = async () => {
    if (!selectedConversation || !replyMessage.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedConversation.platform,
          recipientId: selectedConversation.participant.id,
          recipientUsername: selectedConversation.participant.username,
          message: replyMessage,
          conversationId: selectedConversation.id,
          profileKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Add message to conversation locally
      const newMessage: Message = {
        id: data.messageId || `local-${Date.now()}`,
        platform: selectedConversation.platform,
        senderId: "me",
        senderUsername: "You",
        content: replyMessage,
        timestamp: new Date().toISOString(),
        isRead: true,
      };

      setSelectedConversation({
        ...selectedConversation,
        messages: [...selectedConversation.messages, newMessage],
        lastMessage: replyMessage,
        lastMessageTime: newMessage.timestamp,
      });

      setReplyMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Mark messages as read
  const markAsRead = async (messageIds: string[]) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageIds,
          profileKey,
        }),
      });

      // Update local state
      setMessages((prev) =>
        prev.map((m) => (messageIds.includes(m.id) ? { ...m, isRead: true } : m))
      );

      if (selectedConversation) {
        setSelectedConversation({
          ...selectedConversation,
          unreadCount: 0,
          messages: selectedConversation.messages.map((m) =>
            messageIds.includes(m.id) ? { ...m, isRead: true } : m
          ),
        });
      }
    } catch {
      // Silent fail for read status
    }
  };

  // Select a conversation
  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);

    // Mark unread messages as read
    const unreadIds = conv.messages.filter((m) => !m.isRead).map((m) => m.id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  useEffect(() => {
    fetchMessages();
  }, [filter, profileKey]);

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

  return (
    <div className="flex h-[600px] gap-4">
      {/* Conversation List */}
      <Card className="w-80 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <Text size="4" weight="bold">
                Messages
              </Text>
              {totalUnread > 0 && (
                <Badge color="red" variant="solid" size="1">
                  {totalUnread}
                </Badge>
              )}
            </div>
            <Button size="1" variant="ghost" onClick={fetchMessages} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-1">
            {["all", "twitter", "instagram", "facebook"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-4 text-center">
              <Text size="2" color="red">
                {error}
              </Text>
            </div>
          )}

          {isLoading && conversations.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <Text size="2" color="gray" className="mt-2">
                Loading messages...
              </Text>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <Text size="2" color="gray">
                No messages found
              </Text>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-3 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedConversation?.id === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar
                      size="2"
                      src={conv.participant.profileUrl}
                      fallback={conv.participant.username.charAt(0).toUpperCase()}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        conv.platform === "twitter"
                          ? "bg-black text-white"
                          : conv.platform === "instagram"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                          : conv.platform === "facebook"
                          ? "bg-blue-600 text-white"
                          : "bg-blue-700 text-white"
                      }`}
                    >
                      {PLATFORM_ICONS[conv.platform] || "?"}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <Text
                        size="2"
                        weight={conv.unreadCount > 0 ? "bold" : "regular"}
                        className="truncate"
                      >
                        @{conv.participant.username}
                      </Text>
                      <Text size="1" color="gray">
                        {formatTime(conv.lastMessageTime)}
                      </Text>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text
                        size="1"
                        color={conv.unreadCount > 0 ? undefined : "gray"}
                        weight={conv.unreadCount > 0 ? "medium" : "regular"}
                        className="truncate flex-1"
                      >
                        {conv.lastMessage}
                      </Text>
                      {conv.unreadCount > 0 && (
                        <Badge color="blue" variant="solid" size="1">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Message Thread / Empty State */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  size="3"
                  src={selectedConversation.participant.profileUrl}
                  fallback={selectedConversation.participant.username.charAt(0).toUpperCase()}
                />
                <div>
                  <Text size="3" weight="bold">
                    @{selectedConversation.participant.username}
                  </Text>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="soft"
                      color={PLATFORM_COLORS[selectedConversation.platform] as any || "gray"}
                      size="1"
                    >
                      {selectedConversation.platform}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                size="1"
                variant="ghost"
                onClick={() => setSelectedConversation(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === "me" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-2xl ${
                      msg.senderId === "me"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <Text size="2" className={msg.senderId === "me" ? "text-white" : ""}>
                      {msg.content}
                    </Text>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        msg.senderId === "me" ? "justify-end" : ""
                      }`}
                    >
                      <Text
                        size="1"
                        className={msg.senderId === "me" ? "text-blue-200" : "text-muted-foreground"}
                      >
                        {formatTime(msg.timestamp)}
                      </Text>
                      {msg.senderId === "me" && (
                        <CheckCheck className="w-3 h-3 text-blue-200" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendReply()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <Text size="4" weight="medium" className="block mb-1">
                  Select a Conversation
                </Text>
                <Text size="2" color="gray">
                  Choose a message thread from the left to view and reply
                </Text>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

