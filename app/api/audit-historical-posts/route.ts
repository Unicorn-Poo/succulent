import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '@/utils/postConstants';
import { generateRequestId, logAyrshareOperation } from '@/utils/ayrshareLogger';

/**
 * CRITICAL: Audit historical posts for cross-posting issues
 * GET /api/audit-historical-posts - Identify posts that may have been cross-posted
 * POST /api/audit-historical-posts - Fix identified issues (migration)
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const accountGroupId = searchParams.get('accountGroupId');
  const detailed = searchParams.get('detailed') === 'true';
  
  try {
    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Historical Posts Audit Started',
      status: 'started',
      data: { accountGroupId, detailed },
      requestId
    });

    const auditResults = {
      timestamp: new Date().toISOString(),
      accountGroupsAudited: [] as any[],
      suspiciousPosts: [] as any[],
      crossPostingRisk: [] as any[],
      orphanedAyrshareIds: [] as any[],
      recommendations: [] as string[],
      summary: {
        totalAccountGroups: 0,
        totalPostsChecked: 0,
        postsWithAyrshareIds: 0,
        suspiciousPatterns: 0,
        requiresMigration: false
      }
    };

    // Get Jazz server worker
    const { jazzServerWorker } = await import('@/utils/jazzServer');
    const { AccountGroup } = await import('@/app/schema');
    const worker = await jazzServerWorker;
    
    if (!worker) {
      throw new Error('Jazz server worker not available');
    }

    // Get all Ayrshare post history from the default account (where cross-posts would be)
    console.log('🔍 Fetching Ayrshare history from default account...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
      // NOTE: No Profile-Key header = default account
    };

    const historyResponse = await fetch(`${AYRSHARE_API_URL}/history?lastDays=30`, {
      method: 'GET',
      headers
    });

    let defaultAccountPosts = [];
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      defaultAccountPosts = Array.isArray(historyData) ? historyData : [];
      console.log(`📊 Found ${defaultAccountPosts.length} posts in default Ayrshare account`);
    }

    // If specific account group requested, audit just that one
    if (accountGroupId) {
      try {
        const accountGroup = await AccountGroup.load(accountGroupId, { 
          loadAs: worker,
          resolve: {
            posts: {
              $each: {
                variants: { $each: true }
              }
            }
          }
        });

        if (accountGroup) {
          const groupAudit = await auditAccountGroup(accountGroup, defaultAccountPosts, detailed);
          auditResults.accountGroupsAudited.push(groupAudit);
        }
      } catch (error) {
        console.error(`❌ Failed to audit account group ${accountGroupId}:`, error);
      }
    } else {
      // This is a simplified audit - in production you'd need admin access to iterate all groups
      auditResults.recommendations.push('⚠️ Limited audit: Specify accountGroupId for detailed group-specific audit');
      auditResults.recommendations.push('System admin access needed to audit all account groups');
    }

    // Analyze patterns in default account
    const suspiciousPatterns = analyzeSuspiciousPatterns(defaultAccountPosts);
    auditResults.suspiciousPosts = suspiciousPatterns.suspiciousPosts;
    auditResults.crossPostingRisk = suspiciousPatterns.crossPostingRisk;

    // Generate summary
    auditResults.summary = {
      totalAccountGroups: auditResults.accountGroupsAudited.length,
      totalPostsChecked: auditResults.accountGroupsAudited.reduce((sum, group) => sum + group.totalPosts, 0),
      postsWithAyrshareIds: auditResults.accountGroupsAudited.reduce((sum, group) => sum + group.postsWithAyrshareIds, 0),
      suspiciousPatterns: auditResults.suspiciousPosts.length,
      requiresMigration: auditResults.suspiciousPosts.length > 0 || auditResults.crossPostingRisk.length > 0
    };

    // Generate recommendations
    if (auditResults.summary.requiresMigration) {
      auditResults.recommendations.push('🚨 MIGRATION REQUIRED: Suspicious cross-posting patterns detected');
      auditResults.recommendations.push('Run POST /api/audit-historical-posts with fix=true to migrate posts');
      auditResults.recommendations.push('Verify social media accounts in Ayrshare dashboard before migration');
    } else {
      auditResults.recommendations.push('✅ No obvious cross-posting issues detected in audited groups');
    }

    auditResults.recommendations.push('Check Ayrshare dashboard for any unexpected posts on wrong accounts');
    auditResults.recommendations.push('Monitor future posts with enhanced logging to ensure proper isolation');

    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Historical Posts Audit Completed',
      status: auditResults.summary.requiresMigration ? 'warning' : 'success',
      data: auditResults.summary,
      requestId
    });

    return NextResponse.json({
      success: true,
      audit: auditResults,
      criticalFindings: auditResults.summary.requiresMigration,
      nextSteps: auditResults.summary.requiresMigration ? [
        'Review suspicious posts identified',
        'Verify which social media accounts received wrong posts',
        'Consider running migration to fix post associations',
        'Notify affected users if necessary'
      ] : [
        'Continue monitoring with enhanced logging',
        'Verify new posts use correct profile keys'
      ]
    }, { 
      status: 200,
      headers: {
        'X-Audit-Status': auditResults.summary.requiresMigration ? 'migration-required' : 'clean',
        'X-Suspicious-Posts': auditResults.suspiciousPosts.length.toString()
      }
    });

  } catch (error) {
    logAyrshareOperation({
      timestamp: new Date().toISOString(),
      operation: 'Historical Posts Audit Failed',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Audit failed'
    }, { status: 500 });
  }
}

/**
 * Audit a specific account group for cross-posting issues
 */
async function auditAccountGroup(accountGroup: any, defaultAccountPosts: any[], detailed: boolean) {
  const audit = {
    accountGroupId: accountGroup.id,
    accountGroupName: accountGroup.name?.toString() || 'Unknown',
    profileKey: accountGroup.ayrshareProfileKey,
    totalPosts: 0,
    postsWithAyrshareIds: 0,
    suspiciousPosts: [] as any[],
    orphanedReferences: [] as any[],
    recommendations: [] as string[]
  };

  console.log(`🔍 Auditing account group: ${audit.accountGroupName}`);

  if (!accountGroup.posts) {
    audit.recommendations.push('No posts found in this account group');
    return audit;
  }

  const posts = Array.from(accountGroup.posts);
  audit.totalPosts = posts.length;

  for (const post of posts) {
    if (!post?.variants) continue;

    // Check each variant for ayrsharePostId
    for (const [platform, variant] of Object.entries(post.variants)) {
      if (!variant || typeof variant !== 'object') continue;
      
      const ayrsharePostId = (variant as any).ayrsharePostId;
      if (ayrsharePostId) {
        audit.postsWithAyrshareIds++;
        
        // Check if this ayrsharePostId appears in the default account history
        const foundInDefault = defaultAccountPosts.find(p => p.id === ayrsharePostId);
        
        if (foundInDefault) {
          audit.suspiciousPosts.push({
            jazzPostId: post.id,
            platform,
            ayrsharePostId,
            postContent: foundInDefault.post?.substring(0, 100) + '...',
            createdDate: foundInDefault.created,
            suspicionLevel: 'high',
            reason: 'Post found in default account - likely cross-posted'
          });
        }
        
        // If detailed audit, check against the account group's profile
        if (detailed && audit.profileKey) {
          // TODO: Check if post exists in the account group's profile
          // This would require making API calls with the profile key
        }
      }
    }
  }

  if (audit.suspiciousPosts.length > 0) {
    audit.recommendations.push(`🚨 ${audit.suspiciousPosts.length} posts may have been cross-posted to default account`);
    audit.recommendations.push('Verify these posts in Ayrshare dashboard');
    audit.recommendations.push('Consider migrating post references to correct profile');
  }

  return audit;
}

/**
 * Analyze suspicious patterns in default account posts
 */
function analyzeSuspiciousPatterns(defaultAccountPosts: any[]) {
  const suspiciousPosts = [];
  const crossPostingRisk = [];

  // Look for posts that might belong to specific account groups
  for (const post of defaultAccountPosts) {
    const suspicionFactors = [];
    
    // Check for business-specific content patterns
    if (post.post) {
      const content = post.post.toLowerCase();
      
      // Look for business names, specific hashtags, etc.
      if (content.includes('#') && content.includes('business')) {
        suspicionFactors.push('Business-specific hashtags');
      }
      
      if (content.includes('our company') || content.includes('our team')) {
        suspicionFactors.push('Company-specific language');
      }
    }
    
    // Check posting patterns (frequency, timing)
    if (suspicionFactors.length > 0) {
      suspiciousPosts.push({
        ayrsharePostId: post.id,
        content: post.post?.substring(0, 100) + '...',
        platform: post.platform,
        created: post.created,
        suspicionFactors,
        riskLevel: suspicionFactors.length > 1 ? 'high' : 'medium'
      });
    }
  }

  return { suspiciousPosts, crossPostingRisk };
}

/**
 * POST - Fix identified cross-posting issues
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, accountGroupId, dryRun = true } = body;
  
  if (action !== 'migrate') {
    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use action: "migrate"'
    }, { status: 400 });
  }

  // For now, return a plan rather than actually migrating
  return NextResponse.json({
    success: true,
    migrationPlan: {
      dryRun,
      accountGroupId,
      steps: [
        '1. Identify all posts with ayrsharePostIds in default account',
        '2. For each account group with profileKey:',
        '   - Check if posts exist in their Ayrshare profile',
        '   - Update Jazz post ayrsharePostId references if needed',
        '3. Optionally delete posts from default account (manual step)',
        '4. Update post performance data to use correct profile'
      ],
      warnings: [
        '⚠️ This migration is complex and should be tested carefully',
        '⚠️ Consider manual verification before automated migration',
        '⚠️ Backup data before proceeding with actual migration'
      ],
      recommendation: 'Manual review recommended before automated migration'
    }
  });
}
