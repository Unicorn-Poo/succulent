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

// For API key management, we use the account ID from headers since we have Jazz account on client
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

    // API keys are loaded on the client side where the user has access to their own account
    // The server cannot access user accounts directly - only account groups
    
    return NextResponse.json({
      success: false,
      error: 'API key listing must be done on the client side. Server cannot access user accounts directly.',
      code: 'SERVER_CANNOT_LIST_KEYS',
      details: 'Use the client-side API key management interface to view keys. The server can only validate existing keys.'
    }, { status: 400 });

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

    // Get account ID from authenticated user
    const accountId = authResult.user!.id;

    // API keys should be created on the client side where the user has access to their own account
    // The server worker doesn't have direct access to user accounts - only to account groups
    // This endpoint should not try to load user accounts directly
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'API key creation must be done on the client side. Server cannot access user accounts directly.',
        code: 'SERVER_CANNOT_CREATE_KEYS',
        details: 'Use the client-side API key management interface to create keys. The server can only validate existing keys.'
      },
      { status: 400 }
    );

    // This code is unreachable due to the early return above
    // API key creation is now handled client-side

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