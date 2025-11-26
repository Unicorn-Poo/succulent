'use client';

import { useState } from 'react';
import { Button } from '../atoms/button';

interface PostStatusSyncProps {
  accountGroupId: string;
}

export default function PostStatusSync({ accountGroupId }: PostStatusSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    updated: number;
    errors: string[];
  } | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/sync-post-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountGroupId }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSyncResult({
          success: true,
          updated: result.data.updated,
          errors: result.data.errors || []
        });
        setLastSync(new Date());
      } else {
        setSyncResult({
          success: false,
          updated: 0,
          errors: [result.error || 'Sync failed']
        });
      }
    } catch (error) {
      setSyncResult({
        success: false,
        updated: 0,
        errors: [error instanceof Error ? error.message : 'Network error']
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-muted">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Post Status Sync</h3>
        <Button
          onClick={handleSync}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Syncing...' : 'Sync Status'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Sync post statuses from Ayrshare to ensure scheduled posts are marked as published when they go live.
      </p>

      {lastSync && (
        <p className="text-xs text-muted-foreground mb-2">
          Last sync: {lastSync.toLocaleString()}
        </p>
      )}

      {syncResult && (
        <div className={`p-3 rounded ${
          syncResult.success 
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 border border-red-300'
        }`}>
          {syncResult.success ? (
            <div className="text-green-800 dark:text-green-300">
              <p className="font-medium text-foreground">✅ Sync completed successfully</p>
              <p className="text-sm">Updated {syncResult.updated} posts</p>
            </div>
          ) : (
            <div className="text-red-800 dark:text-red-300">
              <p className="font-medium text-foreground">❌ Sync failed</p>
              {syncResult.errors.map((error, index) => (
                <p key={index} className="text-sm">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
