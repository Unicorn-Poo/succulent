import { useState, useEffect, useCallback, useRef } from "react";

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
 * @param pollInterval - Polling interval in ms (default: 1800000 = 30 minutes)
 * @param enabled - Whether polling is enabled (default: true)
 */
export function useUnreadMessages(
  profileKey?: string,
  pollInterval: number = 1800000,
  enabled: boolean = true
): UnreadMessagesResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [byPlatform, setByPlatform] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isVisibleRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    // Don't fetch if tab is hidden or disabled
    if (!enabled || !isVisibleRef.current) {
      return;
    }

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
      // Reset retry count on success
      retryCountRef.current = 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      
      // Exponential backoff: increase interval on errors
      retryCountRef.current += 1;
      const backoffMultiplier = Math.min(Math.pow(2, retryCountRef.current), 8); // Max 8x
      
      // Clear existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Set up retry with backoff (but only if still enabled and visible)
      if (enabled && isVisibleRef.current && pollInterval > 0) {
        const backoffInterval = pollInterval * backoffMultiplier;
        console.warn(`Unread count fetch failed, retrying in ${backoffInterval}ms`);
        retryTimeoutRef.current = setTimeout(() => {
          fetchUnreadCount();
        }, backoffInterval);
      }
    } finally {
      setIsLoading(false);
    }
  }, [profileKey, enabled, pollInterval]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount, enabled]);

  // Page Visibility API - pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (document.hidden) {
        // Tab is hidden - clear interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      } else {
        // Tab is visible - resume polling
        if (enabled && pollInterval > 0 && !intervalRef.current) {
          fetchUnreadCount(); // Immediate fetch when tab becomes visible
          intervalRef.current = setInterval(fetchUnreadCount, pollInterval);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pollInterval, fetchUnreadCount]);

  // Set up polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0 || !isVisibleRef.current) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(fetchUnreadCount, pollInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [fetchUnreadCount, pollInterval, enabled]);

  return {
    unreadCount,
    byPlatform,
    isLoading,
    error,
    refetch: fetchUnreadCount,
  };
}

