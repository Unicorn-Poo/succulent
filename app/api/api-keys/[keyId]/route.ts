import { NextRequest, NextResponse } from 'next/server';
import { z } from 'jazz-tools';
import {
  revokeAPIKey,
  updateAPIKey,
  getAPIKeyAnalytics,
} from '@/utils/apiKeyManager';

// =============================================================================
// 🔐 AUTHENTICATION FOR API KEY MANAGEMENT
// =============================================================================

async function authenticateWebSession(request: NextRequest) {
  const accountId = request.headers.get('X-Account-ID');
  
  if (!accountId) {
    return { success: false, error: 'Missing account ID. Please provide X-Account-ID header.' };
  }

  // Validate that the account ID looks like a valid Jazz ID
  if (!accountId.startsWith('co_')) {
    return { success: false, error: 'Invalid account ID format.' };
  }

  return {
    success: true,
    user: {
      id: accountId,
      account: null // Will be loaded by the server worker
    }
  };
}

// =============================================================================
// 📝 REQUEST VALIDATION SCHEMAS
// =============================================================================

const UpdateAPIKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.array(z.enum([
    'posts:create',
    'posts:read', 
    'posts:update',
    'posts:delete',
    'accounts:read',
    'analytics:read',
    'media:upload'
  ])).optional(),
  accountGroupIds: z.array(z.string()).optional(),
  allowedOrigins: z.array(z.string().url()).optional(),
  ipWhitelist: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// =============================================================================
// 🌐 API ENDPOINTS
// =============================================================================

/**
 * GET /api/api-keys/[keyId] - Get specific API key details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;

    // Authenticate user
    const authResult = await authenticateWebSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error, code: 'AUTHENTICATION_FAILED' },
        { status: 401 }
      );
    }

    // TODO: Get actual API key from Jazz
    // Mock response for now
    const mockAPIKey = {
      keyId: keyId,
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
    };

    return NextResponse.json({
      success: true,
      data: mockAPIKey
    });

  } catch (error) {
    console.error('❌ Error getting API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/api-keys/[keyId] - Update API key
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;

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
      requestData = UpdateAPIKeySchema.parse(body);
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

    // TODO: Update actual API key
    // await updateAPIKey(me, keyId, requestData);

    console.log('🔐 Updated API key:', keyId, requestData);

    // Mock response
    const updatedKey = {
      keyId,
      name: requestData.name || 'Updated API Key',
      status: requestData.status || 'active',
      permissions: requestData.permissions || ['posts:create', 'posts:read'],
      description: requestData.description,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'API key updated successfully',
      data: updatedKey
    });

  } catch (error) {
    console.error('❌ Error updating API key:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'UPDATE_FAILED'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/api-keys/[keyId] - Revoke API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    const { keyId } = params;

    // Authenticate user
    const authResult = await authenticateWebSession(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error, code: 'AUTHENTICATION_FAILED' },
        { status: 401 }
      );
    }

    // TODO: Revoke actual API key
    // await revokeAPIKey(me, keyId);

    console.log('🔐 Revoked API key:', keyId);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
      data: { 
        keyId,
        status: 'revoked',
        revokedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error revoking API key:', error);
    
    if (error instanceof Error && error.message === 'API key not found') {
      return NextResponse.json(
        { success: false, error: 'API key not found', code: 'KEY_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'REVOCATION_FAILED'
      },
      { status: 500 }
    );
  }
} 