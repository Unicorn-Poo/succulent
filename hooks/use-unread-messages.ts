import { useState, useEffect, useCallback } from "react";

interface UnreadMessagesResult {
  unreadCount: number;
  byPlatform: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and track unread message counts
 * @param profileKey - Optional Ayrshare profile key
 * @param pollInterval - Polling interval in ms (default: 60000 = 1 minute)
 */
export function useUnreadMessages(
  profileKey?: string,
  pollInterval: number = 60000
): UnreadMessagesResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (profileKey) params.append("profileKey", profileKey);

      const response = await fetch(`/api/messages/unread-count?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch unread count");
      }

      setUnreadCount(data.unreadCount || 0);
      setByPlatform(data.byPlatform || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [profileKey]);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Set up polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  return {
    unreadCount,
    byPlatform,
    isLoading,
    error,
    refetch: fetchUnreadCount,
  };
}

