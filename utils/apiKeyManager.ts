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
 * Validate an API key and return associated user data
 */
export async function validateAPIKey(
  apiKey: string,
  requiredPermission?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<APIKeyValidationResult> {
  try {
    // Basic format validation
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return { isValid: false, error: 'Invalid API key format' };
    }

    // TODO: In production, you would query the Jazz collaborative system
    // to find the API key across all users. For now, this is a mock implementation
    // that would need to be replaced with actual Jazz queries.
    
    // This is where you'd implement the actual lookup:
    // 1. Query all users with API keys
    // 2. Find matching hashed key
    // 3. Validate permissions and restrictions
    // 4. Log usage
    
    // Mock validation for development
    const hashedKey = hashAPIKey(apiKey);
    
    // For demo purposes, accept any properly formatted key
    if (apiKey.startsWith('sk_test_') || apiKey.startsWith('sk_live_')) {
      // Mock key data
      const mockKeyData = {
        keyId: 'mock_key_id',
        name: 'Development Key',
        permissions: ['posts:create', 'posts:read', 'posts:update', 'posts:delete'],
        status: 'active',
        accountGroupIds: undefined, // No restrictions
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        ipWhitelist: undefined,
        allowedOrigins: undefined
      };

      // Mock account data
      const mockAccount = {
        id: apiKey.replace('sk_', '').split('_')[1] || 'mock_user',
        profile: {
          name: 'API User',
          email: 'user@example.com'
        }
      };

      return {
        isValid: true,
        keyData: mockKeyData,
        account: mockAccount
      };
    }

    return { isValid: false, error: 'API key not found or inactive' };
    
  } catch (error) {
    console.error('❌ Error validating API key:', error);
    return { isValid: false, error: 'Internal validation error' };
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
    if (!account.profile?.apiSettings?.enableUsageLogging) {
      return; // Usage logging disabled
    }

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

    console.log('📊 Logged API usage:', { keyId, endpoint, method, statusCode });
    
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