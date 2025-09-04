import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/posts/jazz-list - Redirect to main posts list
 * This endpoint is deprecated - use /api/posts/list instead
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const accountGroupId = url.searchParams.get('accountGroupId');
  
  const redirectUrl = new URL('/api/posts/list', url.origin);
  if (accountGroupId) {
    redirectUrl.searchParams.set('accountGroupId', accountGroupId);
  }
  
  return NextResponse.redirect(redirectUrl, 301);
} 