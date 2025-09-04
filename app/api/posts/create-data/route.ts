import { NextRequest, NextResponse } from 'next/server';
import { z } from 'jazz-tools';
import { validateAPIKey, logAPIKeyUsage, checkRateLimit, validateAccountGroupAccess } from '@/utils/apiKeyManager';

const CreatePostDataSchema = z.object({
  accountGroupId: z.string(),
  content: z.string(),
  title: z.string().optional(),
  platforms: z.array(z.enum(['instagram', 'facebook', 'x', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'reddit', 'telegram', 'threads', 'bluesky', 'google'])),
  publishImmediately: z.boolean().optional().default(false),
  saveAsDraft: z.boolean().optional().default(true),
  scheduledDate: z.string().datetime().optional(),
  media: z.array(z.object({
    type: z.enum(['image', 'video']),
    url: z.string().url(),
    alt: z.string().optional(),
    filename: z.string().optional()
  })).optional(),
  replyTo: z.object({
    url: z.string().url(),
    platform: z.string()
  }).optional()
});

type CreatePostDataRequest = z.infer<typeof CreatePostDataSchema>;

// Simple in-memory storage for post data (UI will create Jazz posts)
const postDataStorage = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requestData = CreatePostDataSchema.parse(body);
    
    // Validate API key
    const clientIP = request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    const authResult = await validateAPIKey(
      request.headers.get('X-API-Key') || '',
      'posts:create',
      clientIP,
      userAgent
    );

    if (!authResult.isValid) {
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    // Validate account group access
    const groupAccess = validateAccountGroupAccess(authResult.keyData, requestData.accountGroupId);
    if (!groupAccess.hasAccess) {
      return NextResponse.json(
        { success: false, error: groupAccess.error },
        { status: groupAccess.statusCode || 403 }
      );
    }

    // Create post data object
    const postId = `api_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const postData = {
      id: postId,
      ...requestData,
      createdAt: new Date().toISOString(),
      createdViaAPI: true
    };

    // Store post data for UI to retrieve and create Jazz posts
    postDataStorage.set(postId, postData);

    // Log usage
    await logAPIKeyUsage(
      authResult.user?.account || null,
      authResult.keyData?.keyId || 'unknown',
      '/api/posts/create-data',
      'POST',
      201,
      { ipAddress: clientIP, userAgent }
    );

    return NextResponse.json({
      success: true,
      message: 'Post data created - UI will create Jazz post',
      data: {
        postId,
        accountGroupId: requestData.accountGroupId,
        platforms: requestData.platforms,
        hasMedia: requestData.media && requestData.media.length > 0
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create post data' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const accountGroupId = url.searchParams.get('accountGroupId');
  
  const posts = Array.from(postDataStorage.values())
    .filter(post => !accountGroupId || post.accountGroupId === accountGroupId);
    
  return NextResponse.json({
    success: true,
    data: { posts }
  });
} 