import { createHash, randomBytes, createHmac } from 'crypto';
import { APIKey, APIKeyUsageLog, MyAppAccount } from '@/app/schema';
import { co } from 'jazz-tools';

// =============================================================================
// 🔐 API KEY GENERATION & SECURITY
// =============================================================================

/**
 * Generate a secure API key with proper format
 */
export function generateAPIKey(): string {
  // Format: sk_test_32randomchars or sk_live_32randomchars
  const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const randomPart = randomBytes(16).toString('hex'); // 32 characters
  return `sk_${environment}_${randomPart}`;
}

/**
 * Generate a unique key ID
 */
export function generateKeyId(): string {
  return `key_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

/**
 * Hash an API key for secure storage
 */
export function hashAPIKey(apiKey: string): string {
  const salt = process.env.API_KEY_SALT || 'succulent-default-salt-change-in-production';
  return createHmac('sha256', salt).update(apiKey).digest('hex');
}

/**
 * Verify an API key against its hash
 */
export function verifyAPIKey(apiKey: string, hashedKey: string): boolean {
  const computedHash = hashAPIKey(apiKey);
  return createHash('sha256').update(computedHash).digest('hex') === 
         createHash('sha256').update(hashedKey).digest('hex');
}

/**
 * Extract key prefix for display (first 8 chars)
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...'; // sk_test_abc... or sk_live_abc...
}

// =============================================================================
// 🎯 API KEY MANAGEMENT
// =============================================================================

export interface CreateAPIKeyOptions {
  name: string;
  description?: string;
  permissions?: Array<'posts:create' | 'posts:read' | 'posts:update' | 'posts:delete' | 'accounts:read' | 'analytics:read' | 'media:upload'>;
  accountGroupIds?: string[];
  expiresAt?: Date;
  allowedOrigins?: string[];
  ipWhitelist?: string[];
  rateLimitTier?: 'standard' | 'premium' | 'enterprise';
}

export interface APIKeyValidationResult {
  isValid: boolean;
  keyData?: any; // APIKey type from Jazz
  error?: string;
  account?: any; // MyAppAccount type
}

/**
 * Create a new API key for a user
 */
export async function createAPIKey(
  account: any, // MyAppAccount type
  options: CreateAPIKeyOptions
): Promise<{ apiKey: string; keyData: any }> {
  try {
    // Check if user has reached their API key limit
    const maxKeys = account.profile?.apiSettings?.maxKeysAllowed || 5;
    const currentKeyCount = account.profile?.apiKeys?.length || 0;
    
    if (currentKeyCount >= maxKeys) {
      throw new Error(`Maximum number of API keys reached (${maxKeys})`);
    }

    // Generate new API key
    const apiKey = generateAPIKey();
    const keyId = generateKeyId();
    const hashedKey = hashAPIKey(apiKey);
    const keyPrefix = getKeyPrefix(apiKey);
    
    // Set default expiration based on user settings
    const defaultExpiration = account.profile?.apiSettings?.defaultKeyExpiration || '1y';
    let expiresAt = options.expiresAt;
    
    if (!expiresAt && defaultExpiration !== 'never') {
      const now = new Date();
      switch (defaultExpiration) {
        case '30d':
          expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Create API key object
    const keyData = APIKey.create({
      keyId,
      name: options.name,
      keyPrefix,
      hashedKey,
      permissions: options.permissions || ['posts:create', 'posts:read'],
      accountGroupIds: options.accountGroupIds,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      usageCount: 0,
      rateLimitTier: options.rateLimitTier || 'standard',
      monthlyUsageCount: 0,
      monthlyUsageResetDate: new Date(),
      allowedOrigins: options.allowedOrigins,
      ipWhitelist: options.ipWhitelist,
      description: options.description,
      createdBy: account.id
    }, { owner: account });

    // Add to user's API keys
    if (!account.profile.apiKeys) {
      account.profile.apiKeys = co.list(APIKey).create([], { owner: account });
    }
    account.profile.apiKeys.push(keyData);
    
    console.log('🔐 Created new API key:', {
      keyId,
      name: options.name,
      permissions: options.permissions,
      expiresAt: expiresAt?.toISOString()
    });

    return { apiKey, keyData };
    
  } catch (error) {
    console.error('❌ Error creating API key:', error);
    throw error;
  }
}

/**
 * Validate API Key and return detailed error information
 * @param apiKey - The API key to validate
 * @param requiredPermission - Required permission for the operation
 * @param clientIP - Client IP address for rate limiting
 * @param userAgent - Client user agent
 * @returns Validation result with detailed error information
 */
export async function validateAPIKey(
  apiKey: string,
  requiredPermission: string,
  clientIP: string,
  userAgent: string
): Promise<{
  isValid: boolean;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  keyData?: any;
  accountId?: string;
  accountGroupOwner?: Record<string, string>;
}> {
  try {
    // Validate API key format
    if (!apiKey) {
      return {
        isValid: false,
        error: 'API key is required. Please provide a valid API key in the X-API-Key header.',
        errorCode: 'MISSING_API_KEY',
        statusCode: 401
      };
    }

    if (!apiKey.startsWith('sk_')) {
      return {
        isValid: false,
        error: 'Invalid API key format. API keys must start with "sk_".',
        errorCode: 'INVALID_API_KEY_FORMAT',
        statusCode: 401
      };
    }

    // Extract key components
    const keyComponents = apiKey.split('_');
    if (keyComponents.length < 3) {
      return {
        isValid: false,
        error: 'Malformed API key. Please check your API key format.',
        errorCode: 'MALFORMED_API_KEY',
        statusCode: 401
      };
    }

    const [prefix, environment, keyHash] = keyComponents;
    
    // Validate environment (test/live)
    if (!['test', 'live'].includes(environment)) {
      return {
        isValid: false,
        error: 'Invalid API key environment. Must be either "test" or "live".',
        errorCode: 'INVALID_ENVIRONMENT',
        statusCode: 401
      };
    }

    // In production, this would lookup the key in database
    // For demo purposes, accept any properly formatted key
    const mockKeyData = {
      keyId: 'mock_key_id',
      name: 'Demo API Key',
      permissions: ['posts:create', 'posts:read', 'posts:update', 'posts:delete'],
      status: 'active',
      environment: environment,
      rateLimits: {
        tier: environment === 'test' ? 'standard' : 'premium',
        requestsPerMinute: environment === 'test' ? 100 : 1000,
        requestsPerHour: environment === 'test' ? 1000 : 10000
      },
      // CRITICAL: Define which account groups this key can access
      // For demo purposes, allow both legacy IDs and Jazz IDs
      allowedAccountGroups: [
        'demo', 
        'test-group', 
        'user-' + keyHash.substring(0, 8),
        // Allow any Jazz ID pattern (starts with 'co_')
        'co_*'  // Wildcard pattern for Jazz IDs
      ]
    };

    // Check if key is active
    if (mockKeyData.status !== 'active') {
      return {
        isValid: false,
        error: 'API key is inactive. Please check your key status or create a new one.',
        errorCode: 'INACTIVE_API_KEY',
        statusCode: 401
      };
    }

    // Check permissions
    if (!mockKeyData.permissions.includes(requiredPermission)) {
      return {
        isValid: false,
        error: `Insufficient permissions. This API key does not have "${requiredPermission}" permission.`,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        statusCode: 403
      };
    }

    // Check rate limits
    const rateLimitResult = checkRateLimit(mockKeyData);
    if (!rateLimitResult.allowed) {
      return {
        isValid: false,
        error: `Rate limit exceeded. You've made too many requests. Please try again in ${Math.ceil(rateLimitResult.resetTime! / 60)} minutes.`,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        keyData: mockKeyData,
        accountId: keyHash
      };
    }

    // For demo purposes, map API keys to account group ownership
    // In production, this would be stored in a database
    const accountGroupOwnerMap: Record<string, string> = {
      'co_zoGYXV8cVVhsid7FewArNZCpqMT': 'user_account_id_for_demo', // Map account group to user
      'demo': 'user_account_id_for_demo'
    };
    
    return {
      isValid: true,
      keyData: mockKeyData,
      accountId: keyHash,
      // Add the account group owner mapping for post creation
      accountGroupOwner: accountGroupOwnerMap
    };

  } catch (error) {
    console.error('❌ Error validating API key:', error);
    return {
      isValid: false,
      error: 'Internal server error during API key validation. Please try again later.',
      errorCode: 'VALIDATION_ERROR',
      statusCode: 500
    };
  }
}

/**
 * Log API key usage
 */
export async function logAPIKeyUsage(
  account: any,
  keyId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  options: {
    responseTime?: number;
    ipAddress?: string;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    // Skip usage logging if account is not available or logging is disabled
    if (!account?.profile?.apiSettings?.enableUsageLogging) {
      // For demo/mock accounts without full profile, we can skip detailed logging
      // In production, you might want to log to a different system
      console.log(`📊 API Usage: ${method} ${endpoint} - ${statusCode} (${options.responseTime}ms)`);
      return;
    }

    // Only create Jazz collaborative objects if we have a valid account with profile
    if (account && account.profile) {
      const logEntry = APIKeyUsageLog.create({
        keyId,
        timestamp: new Date(),
        endpoint,
        method: method as any,
        statusCode,
        responseTime: options.responseTime,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        requestSize: options.requestSize,
        responseSize: options.responseSize,
        errorMessage: options.errorMessage,
      }, { owner: account });

      // Add to usage logs
      if (!account.profile.apiKeyUsageLogs) {
        account.profile.apiKeyUsageLogs = co.list(APIKeyUsageLog).create([], { owner: account });
      }
      account.profile.apiKeyUsageLogs.push(logEntry);

      // Update key usage count
      const apiKey = account.profile.apiKeys?.find((key: any) => key.keyId === keyId);
      if (apiKey) {
        apiKey.usageCount = (apiKey.usageCount || 0) + 1;
        apiKey.lastUsedAt = new Date();
        apiKey.lastUsedFromIP = options.ipAddress;
        apiKey.lastUsedUserAgent = options.userAgent;
        
        // Update monthly usage
        const now = new Date();
        const resetDate = new Date(apiKey.monthlyUsageResetDate);
        if (now > resetDate) {
          // Reset monthly counter
          apiKey.monthlyUsageCount = 1;
          apiKey.monthlyUsageResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else {
          apiKey.monthlyUsageCount = (apiKey.monthlyUsageCount || 0) + 1;
        }
      }
      
      console.log('📊 Logged API usage to Jazz:', { keyId, endpoint, method, statusCode });
    } else {
      // For API-only users without Jazz account, log to console
      console.log('📊 API Usage:', { 
        keyId, 
        endpoint, 
        method, 
        statusCode, 
        responseTime: options.responseTime,
        ipAddress: options.ipAddress 
      });
    }
    
  } catch (error) {
    console.error('❌ Error logging API usage:', error);
    // Don't throw - logging failures shouldn't break API calls
  }
}

/**
 * Revoke an API key
 */
export async function revokeAPIKey(account: any, keyId: string): Promise<void> {
  try {
    const apiKey = account.profile.apiKeys?.find((key: any) => key.keyId === keyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.status = 'revoked';
    console.log('🔐 Revoked API key:', keyId);
    
  } catch (error) {
    console.error('❌ Error revoking API key:', error);
    throw error;
  }
}

/**
 * Update API key settings
 */
export async function updateAPIKey(
  account: any,
  keyId: string,
  updates: Partial<{
    name: string;
    description: string;
    permissions: string[];
    accountGroupIds: string[];
    allowedOrigins: string[];
    ipWhitelist: string[];
    status: 'active' | 'inactive';
  }>
): Promise<void> {
  try {
    const apiKey = account.profile.apiKeys?.find((key: any) => key.keyId === keyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    // Update allowed fields
    Object.keys(updates).forEach(field => {
      if (updates[field as keyof typeof updates] !== undefined) {
        (apiKey as any)[field] = updates[field as keyof typeof updates];
      }
    });

    console.log('🔐 Updated API key:', keyId, updates);
    
  } catch (error) {
    console.error('❌ Error updating API key:', error);
    throw error;
  }
}

// =============================================================================
// 🚦 RATE LIMITING
// =============================================================================

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check rate limits for an API key
 */
export function checkRateLimit(keyData: any): RateLimitResult {
  const tier = keyData.rateLimitTier || 'standard';
  
  // Rate limit tiers (requests per hour)
  const limits = {
    standard: 1000,
    premium: 5000,
    enterprise: 25000
  };
  
  const limit = limits[tier as keyof typeof limits];
  const used = keyData.monthlyUsageCount || 0;
  const remaining = Math.max(0, limit - used);
  const resetTime = new Date(keyData.monthlyUsageResetDate).getTime();
  
  const allowed = remaining > 0;
  const retryAfter = allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000);
  
  return {
    allowed,
    limit,
    remaining,
    resetTime,
    retryAfter
  };
}

/**
 * Validate that an API key has access to a specific account group
 * @param keyData - The validated API key data
 * @param accountGroupId - The account group ID to check access for
 * @returns Validation result with specific error information
 */
export function validateAccountGroupAccess(
  keyData: any,
  accountGroupId: string
): {
  hasAccess: boolean;
  error?: string;
  errorCode?: string;
  statusCode?: number;
} {
  try {
    if (!keyData) {
      return {
        hasAccess: false,
        error: 'Invalid API key data for account group validation',
        errorCode: 'INVALID_KEY_DATA',
        statusCode: 500
      };
    }

    if (!accountGroupId) {
      return {
        hasAccess: false,
        error: 'Account Group ID is required',
        errorCode: 'MISSING_ACCOUNT_GROUP',
        statusCode: 400
      };
    }

    // Check if the key has access to this account group
    const allowedGroups = keyData.allowedAccountGroups || [];
    
    // Check for exact match or wildcard patterns
    const hasAccess = allowedGroups.some((allowedGroup: string) => {
      if (allowedGroup === accountGroupId) return true;
      // Handle wildcard patterns (e.g., 'co_*' matches any Jazz ID starting with 'co_')
      if (allowedGroup.endsWith('*')) {
        const prefix = allowedGroup.slice(0, -1);
        return accountGroupId.startsWith(prefix);
      }
      return false;
    });
    
    if (!hasAccess) {
      return {
        hasAccess: false,
        error: `Access denied. This API key does not have permission to post to account group "${accountGroupId}". Allowed patterns: ${allowedGroups.join(', ')}`,
        errorCode: 'INSUFFICIENT_ACCOUNT_GROUP_ACCESS',
        statusCode: 403
      };
    }

    return {
      hasAccess: true
    };

  } catch (error) {
    console.error('❌ Error validating account group access:', error);
    return {
      hasAccess: false,
      error: 'Internal error during account group validation',
      errorCode: 'VALIDATION_ERROR',
      statusCode: 500
    };
  }
}

// =============================================================================
// 🎛️ API KEY UTILITIES
// =============================================================================

/**
 * Get API key analytics
 */
export function getAPIKeyAnalytics(account: any, keyId?: string) {
  const logs = account.profile?.apiKeyUsageLogs || [];
  const filteredLogs = keyId ? logs.filter((log: any) => log.keyId === keyId) : logs;
  
  const totalRequests = filteredLogs.length;
  const last24Hours = filteredLogs.filter((log: any) => 
    new Date(log.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;
  
  const errorCount = filteredLogs.filter((log: any) => log.statusCode >= 400).length;
  const successRate = totalRequests > 0 ? ((totalRequests - errorCount) / totalRequests) * 100 : 100;
  
  const avgResponseTime = filteredLogs
    .filter((log: any) => log.responseTime)
    .reduce((sum: number, log: any, _index: number, arr: any[]) => sum + log.responseTime / arr.length, 0);
  
  return {
    totalRequests,
    last24Hours,
    errorCount,
    successRate,
    avgResponseTime: Math.round(avgResponseTime)
  };
}

/**
 * Get popular endpoints for an API key
 */
export function getPopularEndpoints(account: any, keyId?: string, limit = 10) {
  const logs = account.profile?.apiKeyUsageLogs || [];
  const filteredLogs = keyId ? logs.filter((log: any) => log.keyId === keyId) : logs;
  
  const endpointCounts: Record<string, number> = {};
  filteredLogs.forEach((log: any) => {
    const key = `${log.method} ${log.endpoint}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  });
  
  return Object.entries(endpointCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([endpoint, count]) => ({ endpoint, count }));
} 