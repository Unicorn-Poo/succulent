import { NextRequest, NextResponse } from 'next/server';
import { z } from 'jazz-tools';

// Force dynamic rendering to prevent build-time static analysis issues
export const dynamic = 'force-dynamic';

const CreateAPIKeySchema = z.object({
  accountId: z.string(),
  name: z.string().min(1, 'API key name is required'),
  description: z.string().optional(),
  permissions: z.array(z.enum([
    'posts:create',
    'posts:read', 
    'posts:update',
    'posts:delete',
    'accounts:read',
    'analytics:read',
    'media:upload'
  ])).optional(),
  rateLimitTier: z.enum(['standard', 'premium', 'enterprise']).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const requestData = CreateAPIKeySchema.parse(body);

    // Get the Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      return NextResponse.json(
        { success: false, error: 'Jazz server worker not available' },
        { status: 500 }
      );
    }

    console.log('🔐 Creating API key server-side for account:', requestData.accountId);

    // Load the user's account
    const { MyAppAccount } = await import('@/app/schema');
    const userAccount = await MyAppAccount.load(requestData.accountId, { 
      loadAs: worker,
      resolve: {
        profile: {
          apiKeys: { $each: true }
        }
      }
    });
    
    if (!userAccount) {
      return NextResponse.json(
        { success: false, error: 'User account not found' },
        { status: 404 }
      );
    }

    // Create API key using server worker (which we know persists)
    const { createAPIKey } = await import('@/utils/apiKeyManager');
    
    // Override the account owner to use server worker for persistence
    const serverWorkerAsAccount = {
      ...userAccount,
      id: worker.id,
      _owner: worker,
      profile: {
        ...userAccount.profile,
        _owner: worker,
        apiKeys: userAccount.profile?.apiKeys
      }
    };

    const { apiKey, keyData } = await createAPIKey(serverWorkerAsAccount as any, {
      name: requestData.name,
      description: requestData.description,
      permissions: requestData.permissions || ['posts:create', 'posts:read'],
      rateLimitTier: requestData.rateLimitTier || 'standard',
      expiresAt: requestData.expiresAt ? new Date(requestData.expiresAt) : undefined
    });

    // Now add the API key to the user's actual profile
    if (!userAccount.profile?.apiKeys) {
      const { co, APIKey } = await import('@/app/schema');
      userAccount.profile!.apiKeys = co.list(APIKey).create([], { owner: worker });
    }

    // Add the key data to the user's profile (owned by server worker for persistence)
    userAccount.profile.apiKeys.push(keyData);

    console.log('✅ API key created server-side and added to user profile');

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
    });

  } catch (error) {
    console.error('❌ Error creating API key server-side:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Server-side API key creation endpoint',
    usage: 'POST with API key details to create persistent keys'
  });
} 