import { NextRequest, NextResponse } from 'next/server';
import { handleStandardPost, PostData } from '@/utils/apiHandlers';
import { generateRequestId, logAyrshareOperation } from '@/utils/ayrshareLogger';

/**
 * Test endpoint to verify scheduling works correctly
 * POST /api/test-scheduling
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const body = await request.json();
    const { 
      content = 'Test scheduled post - ' + new Date().toISOString(),
      platforms = ['x'],
      minutesFromNow = 15 // Default to 15 minutes from now
    } = body;

    // Calculate future date
    const now = new Date();
    const scheduledDate = new Date(now.getTime() + minutesFromNow * 60 * 1000);

    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Schedule Test Started',
      status: 'started',
      data: {
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        platforms,
        scheduledDate: scheduledDate.toISOString(),
        minutesFromNow,
        currentTime: now.toISOString()
      },
      requestId
    });

    // Create test post data with proper scheduling
    const testPostData: PostData = {
      post: content,
      platforms,
      scheduleDate: scheduledDate.toISOString(), // Using correct field name
      mediaUrls: undefined // Ensure no media URLs are sent
    };

    console.log('🧪 Test Post Data being sent to Ayrshare:', {
      ...testPostData,
      scheduleDate: testPostData.scheduleDate,
      isScheduled: !!testPostData.scheduleDate,
      scheduledFor: scheduledDate.toISOString(),
      minutesFromNow
    });

    // Test the post creation
    const result = await handleStandardPost(testPostData);

    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Schedule Test Completed',
      status: 'success',
      data: {
        ayrshareResponse: result,
        postIds: result.postIds || {},
        scheduled: !!result.postIds || !!result.id,
        recovered: !!result.recovered
      },
      requestId
    });

    return NextResponse.json({
      success: true,
      message: 'Scheduling test completed',
      testData: {
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        platforms,
        scheduledFor: scheduledDate.toISOString(),
        minutesFromNow,
        currentTime: now.toISOString()
      },
      ayrshareResponse: result,
      postIds: result.postIds || {},
      wasScheduled: !!testPostData.scheduleDate,
      wasRecovered: !!result.recovered,
      recommendations: [
        result.recovered ? 'Post was recovered from duplicate - this indicates the scheduling fix is working' : 'Post was created/scheduled normally',
        'Check Ayrshare dashboard to verify the post appears in scheduled posts',
        'Monitor logs for detailed scheduling information'
      ]
    }, { status: 200 });

  } catch (error) {
    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Schedule Test Failed',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Scheduling test failed',
      recommendations: [
        'Check API credentials and Ayrshare connection',
        'Verify scheduling parameters are correct',
        'Check server logs for detailed error information'
      ]
    }, { status: 500 });
  }
}

/**
 * GET /api/test-scheduling - Get scheduled posts from Ayrshare
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  
  try {
    const { AYRSHARE_API_URL, AYRSHARE_API_KEY } = await import('@/utils/postConstants');
    
    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Get Scheduled Posts',
      status: 'started',
      data: {},
      requestId
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    // Get scheduled posts from Ayrshare
    const response = await fetch(`${AYRSHARE_API_URL}/post/scheduled`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch scheduled posts: ${response.status} ${response.statusText}`);
    }

    const scheduledPosts = await response.json();

    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Get Scheduled Posts Completed',
      status: 'success',
      data: {
        scheduledPostsCount: Array.isArray(scheduledPosts) ? scheduledPosts.length : 0,
        hasScheduledPosts: Array.isArray(scheduledPosts) && scheduledPosts.length > 0
      },
      requestId
    });

    return NextResponse.json({
      success: true,
      scheduledPosts: Array.isArray(scheduledPosts) ? scheduledPosts : [],
      count: Array.isArray(scheduledPosts) ? scheduledPosts.length : 0,
      message: Array.isArray(scheduledPosts) && scheduledPosts.length > 0 
        ? `Found ${scheduledPosts.length} scheduled posts`
        : 'No scheduled posts found'
    }, { status: 200 });

  } catch (error) {
    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Get Scheduled Posts Failed',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get scheduled posts',
      scheduledPosts: [],
      count: 0
    }, { status: 500 });
  }
}
