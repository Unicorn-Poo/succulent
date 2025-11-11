import { NextRequest, NextResponse } from 'next/server';
import { fetchPlatformPostHistory } from '@/utils/postPerformance';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const searchParams = request.nextUrl.searchParams;
    const profileKey = searchParams.get('profileKey');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!profileKey) {
      return NextResponse.json(
        { error: 'profileKey parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 DEBUG API: Fetching ${platform} posts for profileKey: ${profileKey.substring(0, 8)}...`);

    // Fetch posts from Ayrshare
    const ayrshareData = await fetchPlatformPostHistory(platform, profileKey, {
      limit,
      lastDays: 30,
      status: 'success'
    });

    if (!ayrshareData?.history) {
      return NextResponse.json({
        success: false,
        message: 'No posts found in Ayrshare history',
        data: null
      });
    }

    // Analyze the posts to see what media fields are available
    const analysis = {
      totalPosts: ayrshareData.history.length,
      postsWithMediaUrls: ayrshareData.history.filter(p => p.mediaUrls && p.mediaUrls.length > 0).length,
      postsWithUrls: ayrshareData.history.filter(p => p.urls && p.urls.length > 0).length,
      samplePosts: ayrshareData.history.slice(0, 3).map(post => ({
        id: post.id,
        post: post.post.substring(0, 100) + '...',
        platforms: post.platforms,
        mediaUrls: post.mediaUrls,
        mediaUrlsCount: post.mediaUrls?.length || 0,
        urls: post.urls,
        urlsCount: post.urls?.length || 0,
        postIds: post.postIds.map(p => ({
          platform: p.platform,
          id: p.id,
          postUrl: p.postUrl,
          isVideo: p.isVideo
        })),
        allFieldsAvailable: Object.keys(post)
      }))
    };

    return NextResponse.json({
      success: true,
      platform,
      profileKey: profileKey.substring(0, 8) + '...',
      analysis,
      rawData: ayrshareData.history.slice(0, 2) // Include raw data for inspection
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to debug posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 