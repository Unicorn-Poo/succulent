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

    // TODO: Create actual API key using user's account
    // const { apiKey, keyData } = await createAPIKey(me, requestData);
    
    // Mock API key creation
    const mockAPIKey = 'sk_test_' + Array(32).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    const mockKeyData = {
      keyId: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: requestData.name,
      keyPrefix: mockAPIKey.substring(0, 12) + '...',
      permissions: requestData.permissions || ['posts:create', 'posts:read'],
      status: 'active',
      createdAt: new Date().toISOString(),
      rateLimitTier: requestData.rateLimitTier || 'standard',
      description: requestData.description
    };

    console.log('🔐 Created new API key:', {
      name: requestData.name,
      permissions: requestData.permissions
    });

    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      data: {
        apiKey: mockAPIKey, // Only returned once during creation
        keyData: mockKeyData
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