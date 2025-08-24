import { NextRequest, NextResponse } from 'next/server';
import { quickSyncMedia } from '@/utils/ayrshareSync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, profileKey, accountGroupId, forceUpdate = true } = body;

    if (!platform || !profileKey) {
      return NextResponse.json(
        { error: 'Platform and profileKey are required' },
        { status: 400 }
      );
    }

    // TODO: Get Jazz account group by ID
    // For now, we'll return a structure that shows what would happen
    const mockJazzAccountGroup = {
      id: accountGroupId,
      posts: [] // This would be populated with actual Jazz posts
    };

    const result = await quickSyncMedia(platform, profileKey, mockJazzAccountGroup);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync media',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get('platform');
  const profileKey = searchParams.get('profileKey');

  if (!platform || !profileKey) {
    return NextResponse.json(
      { error: 'Platform and profileKey are required' },
      { status: 400 }
    );
  }

  try {
    // This could be used to get sync status or preview what would be synced
    return NextResponse.json({
      message: 'Sync preview endpoint',
      platform,
      profileKey: profileKey.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync preview error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync preview' },
      { status: 500 }
    );
  }
} 