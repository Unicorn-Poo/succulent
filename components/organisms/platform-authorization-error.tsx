import React from 'react';
import { Button } from '../atoms/button';

interface PlatformAuthError {
  platform: string;
  code: number;
  message: string;
  resolution?: {
    relink?: boolean;
    platform?: string;
  };
}

interface PlatformAuthorizationErrorProps {
  errors: PlatformAuthError[];
  onClose: () => void;
  onRetry?: () => void;
}

export function PlatformAuthorizationError({ 
  errors, 
  onClose, 
  onRetry 
}: PlatformAuthorizationErrorProps) {
  const getReconnectionSteps = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return [
          '1. Go to Ayrshare Dashboard',
          '2. Navigate to Social Accounts',
          '3. Unlink your X/Twitter account',
          '4. Relink your X/Twitter account',
          '5. Verify account status on x.com'
        ];
      case 'facebook':
        return [
          '1. Go to Ayrshare Dashboard',
          '2. Navigate to Social Accounts', 
          '3. Unlink your Facebook account',
          '4. Relink your Facebook account',
          '5. Check Facebook business permissions'
        ];
      case 'instagram':
        return [
          '1. Go to Ayrshare Dashboard',
          '2. Navigate to Social Accounts',
          '3. Unlink your Instagram account',
          '4. Relink your Instagram account',
          '5. Ensure account is a business/creator account'
        ];
      default:
        return [
          '1. Go to Ayrshare Dashboard',
          '2. Navigate to Social Accounts',
          `3. Unlink your ${platform} account`,
          `4. Relink your ${platform} account`
        ];
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-4">
          Account Authorization Required
        </h3>
        
        <div className="space-y-4">
          {errors.map((error, index) => (
            <div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 dark:text-red-400 dark:text-red-400 font-medium">
                  {error.platform.toUpperCase()}
                </span>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 dark:bg-red-900 text-red-800 dark:text-red-300 dark:text-red-200 px-2 py-1 rounded">
                  Code: {error.code}
                </span>
              </div>
              
              <p className="text-sm text-foreground mb-3">
                {error.message}
              </p>
              
              <div className="bg-muted dark:bg-muted rounded p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  To fix this issue:
                </p>
                <ol className="text-xs text-muted-foreground space-y-1">
                  {getReconnectionSteps(error.platform).map((step, stepIndex) => (
                    <li key={stepIndex}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button
            onClick={() => window.open('https://app.ayrshare.com/social-accounts', '_blank')}
            className="flex-1"
          >
            Open Ayrshare Dashboard
          </Button>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="flex-1"
            >
              Retry
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 