import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '@/utils/postConstants';

/**
 * IMMEDIATE CHECK: Look for recent posts that may have been cross-posted
 * This is a quick check you can run right now to see if there are issues
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');
  
  try {
    console.log(`🔍 Checking posts from last ${hours} hours for cross-posting issues...`);
    
    // Get recent posts from default Ayrshare account (no Profile-Key header)
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
      // No Profile-Key = default account where cross-posts would appear
    };

    const response = await fetch(`${AYRSHARE_API_URL}/history?lastHours=${hours}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`Ayrshare API error: ${response.status}`);
    }

    const posts = await response.json();
    const recentPosts = Array.isArray(posts) ? posts : [];
    
    console.log(`📊 Found ${recentPosts.length} posts in default account from last ${hours} hours`);

    const analysis = {
      timeRange: `Last ${hours} hours`,
      defaultAccountPosts: recentPosts.length,
      posts: recentPosts.map(post => ({
        id: post.id,
        content: post.post?.substring(0, 150) + (post.post?.length > 150 ? '...' : ''),
        platform: post.platform,
        created: post.created,
        status: post.status,
        // This would be suspicious if you expect posts to go to specific profiles
        suspiciousIndicators: analyzeSuspiciousContent(post.post || '')
      })),
      summary: {
        totalPosts: recentPosts.length,
        platforms: [...new Set(recentPosts.map(p => p.platform))],
        suspiciousPosts: recentPosts.filter(p => analyzeSuspiciousContent(p.post || '').length > 0).length
      },
      recommendations: generateImmediateRecommendations(recentPosts)
    };

    return NextResponse.json({
      success: true,
      analysis,
      immediateActions: [
        recentPosts.length > 0 
          ? `🚨 FOUND ${recentPosts.length} posts in default account - these may be cross-posts!`
          : '✅ No recent posts in default account',
        'Check your Ayrshare dashboard at https://app.ayrshare.com/dashboard',
        'Verify which social media accounts received these posts',
        'If posts went to wrong accounts, contact affected users immediately'
      ],
      criticalNext: recentPosts.length > 0 ? [
        '1. IMMEDIATELY check Ayrshare dashboard to see which social accounts got these posts',
        '2. If posts went to wrong accounts, delete them manually from social media',
        '3. Run full audit: GET /api/audit-historical-posts?accountGroupId=<id>',
        '4. Consider notifying affected users'
      ] : [
        '1. The fix is working - no recent cross-posts detected',
        '2. Continue monitoring with enhanced logging',
        '3. Test posting from different account groups to verify isolation'
      ]
    });

  } catch (error) {
    console.error('❌ Error checking recent posts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Check failed',
      criticalActions: [
        '🚨 Could not check for cross-posts - manual verification required',
        'Check Ayrshare dashboard immediately: https://app.ayrshare.com/dashboard',
        'Look for any posts that appear on wrong social media accounts',
        'The profile key fix has been applied but historical posts may still be affected'
      ]
    }, { status: 500 });
  }
}

function analyzeSuspiciousContent(content: string): string[] {
  const indicators = [];
  const lowerContent = content.toLowerCase();
  
  // Look for business-specific patterns that suggest this belongs to a specific account group
  if (lowerContent.includes('our company') || lowerContent.includes('our business')) {
    indicators.push('Company-specific language');
  }
  
  if (lowerContent.includes('team') && (lowerContent.includes('excited') || lowerContent.includes('proud'))) {
    indicators.push('Team announcement pattern');
  }
  
  if (lowerContent.match(/#\w+business|#\w+company|#\w+brand/)) {
    indicators.push('Business hashtags');
  }
  
  if (lowerContent.includes('client') || lowerContent.includes('customer')) {
    indicators.push('Client/customer references');
  }
  
  return indicators;
}

function generateImmediateRecommendations(posts: any[]): string[] {
  const recommendations = [];
  
  if (posts.length === 0) {
    recommendations.push('✅ No recent posts in default account - profile key fix appears to be working');
    recommendations.push('Continue monitoring future posts');
  } else {
    recommendations.push(`🚨 ${posts.length} posts found in default account - investigate immediately`);
    recommendations.push('Check which social media accounts received these posts');
    recommendations.push('If posts went to wrong accounts, delete them manually');
    recommendations.push('Run full historical audit to check for more issues');
  }
  
  recommendations.push('Test posting from different account groups to verify isolation');
  recommendations.push('Monitor enhanced logging for profile key usage');
  
  return recommendations;
}
