import { NextRequest, NextResponse } from 'next/server';
import { z } from 'jazz-tools';
import { useAccount } from 'jazz-tools/react';
import { MyAppAccount } from '@/app/schema';
import {
  createAPIKey,
  getAPIKeyAnalytics,
  getPopularEndpoints,
  CreateAPIKeyOptions
} from '@/utils/apiKeyManager';

// =============================================================================
// 🔐 AUTHENTICATION FOR API KEY MANAGEMENT
// =============================================================================

// For API key management, we need to authenticate using the web session
// This is different from the posts API which uses API key authentication
async function authenticateWebSession(request: NextRequest) {
  // TODO: Implement proper session authentication
  // For now, we'll use a simple header check
  // In production, you'd verify the user's session/JWT token
  
  const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!sessionToken) {
    return { success: false, error: 'Missing authentication token' };
  }

  // Mock user authentication - replace with actual implementation
  return {
    success: true,
    user: {
      id: 'mock_user_id',
      // This would be the actual MyAppAccount instance from Jazz
      account: null
    }
  };
}

// =============================================================================
// 📝 REQUEST VALIDATION SCHEMAS
// =============================================================================

const CreateAPIKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  permissions: z.array(z.enum([
    'posts:create',
    'posts:read', 
    'posts:update',
    'posts:delete',
    'accounts:read',
    'analytics:read',
    'media:upload'
  ])).min(1, 'At least one permission required').optional(),
  accountGroupIds: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  allowedOrigins: z.array(z.string().url()).optional(),
  ipWhitelist: z.array(z.string()).optional(), // Basic string validation for IP addresses
  rateLimitTier: z.enum(['standard', 'premium', 'enterprise']).optional(),
});

// =============================================================================
// 🌐 API ENDPOINTS
// =============================================================================

/**
 * GET /api/api-keys - List user's API keys
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateWebSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error, code: 'AUTHENTICATION_FAILED' },
        { status: 401 }
      );
    }

    // TODO: Load actual user account from Jazz
    // const { me } = useAccount(MyAppAccount);
    // For now, we'll mock the response
    
    const mockAPIKeys = [
      {
        keyId: 'key_1703123456789_abc123def',
        name: 'Development Key',
        keyPrefix: 'sk_test_a1b2c3d4...',
        permissions: ['posts:create', 'posts:read'],
        status: 'active',
        createdAt: '2024-01-15T10:30:00.000Z',
        lastUsedAt: '2024-01-20T14:22:00.000Z',
        usageCount: 145,
        monthlyUsageCount: 45,
        rateLimitTier: 'standard',
        description: 'API key for development and testing'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: mockAPIKeys,
        summary: {
          totalKeys: mockAPIKeys.length,
          activeKeys: mockAPIKeys.filter(k => k.status === 'active').length,
          totalUsage: mockAPIKeys.reduce((sum, k) => sum + k.usageCount, 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error listing API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/api-keys - Create new API key
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateWebSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error, code: 'AUTHENTICATION_FAILED' },
        { status: 401 }
      );
    }

    // Parse and validate request
    let requestData;
    try {
      const body = await request.json();
      requestData = CreateAPIKeySchema.parse(body);
    } catch (error) {
      if (error && typeof error === 'object' && 'errors' in error) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Invalid request data',
            code: 'VALIDATION_ERROR',
            details: (error as any).errors
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid JSON', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    // Get the Jazz server worker to create API keys
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available', code: 'WORKER_UNAVAILABLE' },
        { status: 500 }
      );
    }

    // Get account ID from request headers (should be passed from authenticated session)
    const accountId = request.headers.get('X-Account-ID');
    
    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required. Please provide X-Account-ID header.', code: 'MISSING_ACCOUNT_ID' },
        { status: 400 }
      );
    }

    // Load the user's account
    const { MyAppAccount } = await import('@/app/schema');
    const userAccount = await MyAppAccount.load(accountId, { 
      loadAs: worker,
      resolve: {
        profile: {
          apiKeys: true
        }
      }
    });
    
    if (!userAccount) {
      return NextResponse.json(
        { success: false, error: 'User account not found', code: 'ACCOUNT_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Create the API key using the utility function
    const { apiKey, keyData } = await createAPIKey(userAccount, {
      name: requestData.name,
      description: requestData.description,
      permissions: requestData.permissions || ['posts:create', 'posts:read'],
      rateLimitTier: requestData.rateLimitTier || 'standard',
      accountGroupIds: requestData.accountGroupIds,
      allowedOrigins: requestData.allowedOrigins,
      ipWhitelist: requestData.ipWhitelist,
      expiresAt: requestData.expiresAt ? new Date(requestData.expiresAt) : undefined
    });

    console.log('🔐 Created new API key:', {
      keyId: keyData.keyId,
      name: requestData.name,
      permissions: requestData.permissions,
      accountId: userAccount.id
    });

    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey: apiKey, // Full API key - only shown once
        keyData: {
          keyId: keyData.keyId,
          name: keyData.name,
          keyPrefix: keyData.keyPrefix,
          permissions: keyData.permissions,
          status: keyData.status,
          createdAt: keyData.createdAt.toISOString(),
          rateLimitTier: keyData.rateLimitTier,
          description: keyData.description,
          expiresAt: keyData.expiresAt?.toISOString()
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating API key:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'CREATION_FAILED'
      },
      { status: 500 }
    );
  }
} 