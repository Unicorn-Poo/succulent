import { NextRequest, NextResponse } from 'next/server';
import { fetchPlatformPostHistory } from '@/utils/postPerformance';

// Force dynamic rendering to prevent build-time static analysis issues
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileKey = searchParams.get('profileKey');
    const limit = parseInt(searchParams.get('limit') || '5');

    console.log('🔍 DEBUG API: Fetching Instagram post history...');
    
    const response = await fetchPlatformPostHistory('instagram', profileKey || undefined, { 
      limit: limit 
    });

    if (!response || !response.history) {
      return NextResponse.json({ 
        error: 'No history data found',
        response: response 
      });
    }

    // Detailed analysis of the first post
    const firstPost = response.history[0];
    
    const analysis = {
      totalPosts: response.history.length,
      firstPostAnalysis: {
        allKeys: Object.keys(firstPost),
        id: firstPost.id,
        post: firstPost.post?.substring(0, 100) + '...',
        
        // Check all possible media fields
        mediaFields: {
          mediaUrls: firstPost.mediaUrls,
          urls: firstPost.urls,
          media: (firstPost as any).media,
          fullPicture: (firstPost as any).fullPicture,
          picture: (firstPost as any).picture,
          imageUrl: (firstPost as any).imageUrl,
          thumbnailUrl: (firstPost as any).thumbnailUrl,
          postIds: firstPost.postIds
        },
        
        // Raw first post (truncated for readability)
        rawPost: firstPost
      },
      
      // Sample of first 3 posts
      samplePosts: response.history.slice(0, 3).map(post => ({
        id: post.id,
        availableKeys: Object.keys(post),
        hasMediaUrls: !!(post.mediaUrls && post.mediaUrls.length > 0),
        hasUrls: !!(post.urls && post.urls.length > 0),
        hasMedia: !!((post as any).media),
        hasFullPicture: !!((post as any).fullPicture),
        postContent: post.post?.substring(0, 50) + '...'
      }))
    };

    return NextResponse.json(analysis, { status: 200 });
    
  } catch (error) {
    console.error('❌ DEBUG API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 