import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '@/utils/postConstants';
import { isBusinessPlanMode } from '@/utils/ayrshareIntegration';

/**
 * Comprehensive post debugging endpoint
 * GET /api/debug-posts - Debug post publishing issues
 * 
 * Query parameters:
 * - type: 'api' | 'bulk' | 'ayrshare' | 'all'
 * - platform: specific platform to debug (optional)
 * - postId: specific post ID to debug (optional)
 * - ayrsharePostId: specific Ayrshare post ID to debug (optional)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const debugType = searchParams.get('type') || 'all';
  const platform = searchParams.get('platform');
  const postId = searchParams.get('postId');
  const ayrsharePostId = searchParams.get('ayrsharePostId');

  console.log('🔍 [DEBUG-POSTS] Starting comprehensive post debugging...', {
    debugType,
    platform,
    postId,
    ayrsharePostId,
    timestamp: new Date().toISOString()
  });

  const debugResults = {
    timestamp: new Date().toISOString(),
    debugType,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasAyrshareApiKey: !!AYRSHARE_API_KEY,
      apiKeyLength: AYRSHARE_API_KEY?.length || 0,
      apiUrl: AYRSHARE_API_URL,
      businessPlanMode: isBusinessPlanMode(),
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      vercelUrl: process.env.VERCEL_URL || 'localhost'
    },
    ayrshareConnection: null as any,
    recentPosts: null as any,
    platformStatus: null as any,
    errors: [] as string[],
    warnings: [] as string[],
    recommendations: [] as string[]
  };

  try {
    // Test Ayrshare API connection
    if (debugType === 'all' || debugType === 'ayrshare') {
      console.log('🔗 Testing Ayrshare API connection...');
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AYRSHARE_API_KEY}`
        };

        // Test basic connectivity
        const testResponse = await fetch(`${AYRSHARE_API_URL}/user`, {
          method: 'GET',
          headers
        });

        const testResult = await testResponse.json();
        
        debugResults.ayrshareConnection = {
          status: testResponse.status,
          statusText: testResponse.statusText,
          success: testResponse.ok,
          response: testResult,
          responseTime: 'measured',
          connectedPlatforms: testResult?.activeSocialAccounts || testResult?.user?.activeSocialAccounts || [],
          displayNames: testResult?.displayNames || testResult?.user?.displayNames || []
        };

        console.log('✅ Ayrshare API connection test completed:', {
          status: testResponse.status,
          success: testResponse.ok,
          platforms: debugResults.ayrshareConnection.connectedPlatforms
        });

        if (!testResponse.ok) {
          debugResults.errors.push(`Ayrshare API connection failed: ${testResult.message || 'Unknown error'}`);
          debugResults.recommendations.push('Check AYRSHARE_API_KEY in environment variables');
        }

      } catch (connectionError) {
        debugResults.errors.push(`Ayrshare API connection error: ${connectionError instanceof Error ? connectionError.message : 'Unknown error'}`);
        debugResults.ayrshareConnection = { error: connectionError instanceof Error ? connectionError.message : 'Unknown error' };
      }
    }

    // Get recent post history from Ayrshare
    if (debugType === 'all' || debugType === 'ayrshare') {
      console.log('📊 Fetching recent Ayrshare post history...');
      
      try {
        const historyResponse = await fetch(`${AYRSHARE_API_URL}/history`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AYRSHARE_API_KEY}`
          }
        });

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          debugResults.recentPosts = {
            success: true,
            totalPosts: historyData?.length || 0,
            recentPosts: historyData?.slice(0, 10) || [], // Last 10 posts
            platforms: [...new Set(historyData?.map((p: any) => p.platform) || [])],
            failedPosts: historyData?.filter((p: any) => p.status === 'error' || p.errors) || []
          };

          console.log('📊 Recent posts summary:', {
            total: debugResults.recentPosts.totalPosts,
            platforms: debugResults.recentPosts.platforms,
            failed: debugResults.recentPosts.failedPosts.length
          });

          // Check for X/Twitter specific issues
          const twitterPosts = historyData?.filter((p: any) => p.platform === 'twitter') || [];
          const failedTwitterPosts = twitterPosts.filter((p: any) => p.status === 'error' || p.errors);
          
          if (failedTwitterPosts.length > 0) {
            debugResults.warnings.push(`Found ${failedTwitterPosts.length} failed Twitter/X posts`);
            debugResults.recommendations.push('Check Twitter/X account connection in Ayrshare dashboard');
          }

        } else {
          debugResults.recentPosts = { error: 'Failed to fetch post history' };
          debugResults.errors.push('Unable to fetch Ayrshare post history');
        }

      } catch (historyError) {
        debugResults.recentPosts = { error: historyError instanceof Error ? historyError.message : 'Unknown error' };
        debugResults.errors.push(`Post history fetch error: ${historyError instanceof Error ? historyError.message : 'Unknown error'}`);
      }
    }

    // Platform-specific debugging
    if (platform) {
      console.log(`🎯 Platform-specific debugging for: ${platform}`);
      
      try {
        // Check platform connectivity
        const platformResponse = await fetch(`${AYRSHARE_API_URL}/history?platform=${platform}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AYRSHARE_API_KEY}`
          }
        });

        if (platformResponse.ok) {
          const platformData = await platformResponse.json();
          debugResults.platformStatus = {
            platform,
            success: true,
            recentPosts: platformData?.slice(0, 5) || [],
            totalPosts: platformData?.length || 0,
            lastPost: platformData?.[0] || null,
            failedPosts: platformData?.filter((p: any) => p.status === 'error' || p.errors) || []
          };

          console.log(`📊 ${platform} status:`, {
            total: debugResults.platformStatus.totalPosts,
            failed: debugResults.platformStatus.failedPosts.length,
            lastPost: debugResults.platformStatus.lastPost?.created || 'none'
          });

        } else {
          debugResults.platformStatus = { platform, error: 'Failed to fetch platform data' };
          debugResults.errors.push(`Unable to fetch ${platform} post data`);
        }

      } catch (platformError) {
        debugResults.platformStatus = { 
          platform, 
          error: platformError instanceof Error ? platformError.message : 'Unknown error' 
        };
        debugResults.errors.push(`Platform ${platform} debug error: ${platformError instanceof Error ? platformError.message : 'Unknown error'}`);
      }
    }

    // Add general recommendations
    if (debugResults.errors.length === 0) {
      debugResults.recommendations.push('All basic checks passed - monitor post creation logs for detailed debugging');
    }

    if (debugResults.ayrshareConnection?.connectedPlatforms?.length === 0) {
      debugResults.warnings.push('No connected social media accounts found');
      debugResults.recommendations.push('Visit Ayrshare dashboard to connect social media accounts');
    }

    // X/Twitter specific recommendations
    if (platform === 'x' || platform === 'twitter' || debugType === 'all') {
      debugResults.recommendations.push('For X/Twitter issues: Check if account is connected and has proper permissions');
      debugResults.recommendations.push('Verify post content length and media requirements for X/Twitter');
    }

    console.log('✅ [DEBUG-POSTS] Debugging completed:', {
      errors: debugResults.errors.length,
      warnings: debugResults.warnings.length,
      recommendations: debugResults.recommendations.length
    });

    return NextResponse.json(debugResults, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Debug-Timestamp': new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-POSTS] Critical error during debugging:', error);
    
    debugResults.errors.push(`Critical debugging error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return NextResponse.json(debugResults, { 
      status: 500,
      headers: {
        'X-Debug-Error': 'true',
        'X-Debug-Timestamp': new Date().toISOString()
      }
    });
  }
}

/**
 * POST /api/debug-posts - Test post creation with detailed logging
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { testType = 'simple', platforms = ['x'], content = 'Test post from debug endpoint' } = body;

  console.log('🧪 [DEBUG-POSTS] Starting test post creation...', {
    testType,
    platforms,
    contentLength: content.length,
    timestamp: new Date().toISOString()
  });

  const testResults = {
    timestamp: new Date().toISOString(),
    testType,
    platforms,
    content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
    steps: [] as any[],
    success: false,
    error: null as string | null,
    ayrshareResponse: null as any,
    recommendations: [] as string[]
  };

  try {
    // Step 1: Validate input
    testResults.steps.push({
      step: 'Input Validation',
      status: 'success',
      data: { platforms, contentLength: content.length }
    });

    // Step 2: Prepare request
    const requestBody = {
      post: content,
      platforms: platforms.map((p: string) => p === 'x' ? 'twitter' : p), // Map x to twitter for Ayrshare
      publishImmediately: false // Test mode - don't actually publish
    };

    testResults.steps.push({
      step: 'Request Preparation',
      status: 'success',
      data: { mappedPlatforms: requestBody.platforms }
    });

    // Step 3: Make API call to Ayrshare
    console.log('📡 Making test API call to Ayrshare...');
    
    const response = await fetch(`${AYRSHARE_API_URL}/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AYRSHARE_API_KEY}`
      },
      body: JSON.stringify({
        ...requestBody,
        test: true // Add test flag if supported
      })
    });

    const result = await response.json();
    
    testResults.steps.push({
      step: 'Ayrshare API Call',
      status: response.ok ? 'success' : 'error',
      data: {
        httpStatus: response.status,
        statusText: response.statusText,
        response: result
      }
    });

    testResults.ayrshareResponse = result;
    testResults.success = response.ok;

    if (!response.ok) {
      testResults.error = result.message || result.error || 'API call failed';
      testResults.recommendations.push('Check API credentials and account permissions');
      
      if (result.errors?.twitter) {
        testResults.recommendations.push('Twitter/X specific error - check account connection');
      }
    } else {
      testResults.recommendations.push('Test successful - API connection is working');
    }

    console.log('✅ [DEBUG-POSTS] Test post creation completed:', {
      success: testResults.success,
      error: testResults.error
    });

    return NextResponse.json(testResults, { 
      status: testResults.success ? 200 : 400,
      headers: {
        'X-Test-Result': testResults.success ? 'success' : 'failure'
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-POSTS] Test post creation failed:', error);
    
    testResults.error = error instanceof Error ? error.message : 'Unknown error';
    testResults.steps.push({
      step: 'Error Handling',
      status: 'error',
      data: { error: testResults.error }
    });

    return NextResponse.json(testResults, { 
      status: 500,
      headers: {
        'X-Test-Error': 'true'
      }
    });
  }
}
