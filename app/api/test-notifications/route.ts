import { NextRequest, NextResponse } from 'next/server';
import { 
  testPushoverConfig, 
  notifyPostPublished, 
  notifyBulkUploadComplete,
  getPushoverConfig 
} from '@/utils/pushoverNotifications';

export const dynamic = 'force-dynamic';

/**
 * POST /api/test-notifications - Test notification system
 * Body: { accountGroupId: string, testType: 'config' | 'publish' | 'schedule' | 'failure' | 'bulk' }
 */
export async function POST(request: NextRequest) {
  try {
    const { accountGroupId, testType } = await request.json();
    
    if (!accountGroupId || !testType) {
      return NextResponse.json(
        { success: false, error: 'accountGroupId and testType are required' },
        { status: 400 }
      );
    }

    // Load account group
    let accountGroup = null;
    try {
      const { jazzServerWorker } = await import('@/utils/jazzServer');
      const { AccountGroup } = await import('@/app/schema');
      const worker = await jazzServerWorker;
      
      if (worker) {
        accountGroup = await AccountGroup.load(accountGroupId, { 
          loadAs: worker,
          resolve: {
            accounts: { $each: true }
          }
        });
      }
    } catch (error) {
      console.error('❌ Failed to load account group:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to load account group' },
        { status: 500 }
      );
    }

    if (!accountGroup) {
      return NextResponse.json(
        { success: false, error: 'Account group not found' },
        { status: 404 }
      );
    }

    const pushoverConfig = getPushoverConfig(accountGroup);

    if (!pushoverConfig.enabled) {
      return NextResponse.json(
        { success: false, error: 'Pushover notifications are not enabled for this account group' },
        { status: 400 }
      );
    }

    let result;

    switch (testType) {
      case 'config':
        result = await testPushoverConfig(pushoverConfig);
        break;

      case 'publish':
        result = await notifyPostPublished(pushoverConfig, {
          postTitle: 'Test Post - Published',
          platforms: ['x', 'instagram'],
          accountGroupName: accountGroup.name,
          status: 'published',
          socialUrls: {
            x: 'https://twitter.com/test/status/123456789',
            instagram: 'https://instagram.com/p/test123/'
          }
        });
        break;

      case 'schedule':
        result = await notifyPostPublished(pushoverConfig, {
          postTitle: 'Test Post - Scheduled',
          platforms: ['linkedin', 'facebook'],
          accountGroupName: accountGroup.name,
          scheduledDate: new Date(Date.now() + 3600000).toLocaleString(), // 1 hour from now
          status: 'scheduled'
        });
        break;

      case 'failure':
        result = await notifyPostPublished(pushoverConfig, {
          postTitle: 'Test Post - Failed',
          platforms: ['threads', 'bluesky'],
          accountGroupName: accountGroup.name,
          status: 'failed',
          errorMessage: 'Test error: API rate limit exceeded'
        });
        break;

      case 'bulk':
        result = await notifyBulkUploadComplete(pushoverConfig, {
          totalPosts: 10,
          successCount: 8,
          scheduledCount: 2,
          failedCount: 0,
          accountGroupName: accountGroup.name
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown test type: ${testType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      testType,
      notificationResult: result,
      pushoverConfig: {
        enabled: pushoverConfig.enabled,
        hasApiToken: !!pushoverConfig.apiToken,
        hasUserKey: !!pushoverConfig.userKey
      }
    });

  } catch (error) {
    console.error('❌ Test notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test notification failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-notifications - Get notification test options
 */
export async function GET() {
  return NextResponse.json({
    availableTests: [
      {
        type: 'config',
        description: 'Test basic Pushover configuration'
      },
      {
        type: 'publish',
        description: 'Test post published notification'
      },
      {
        type: 'schedule',
        description: 'Test post scheduled notification'
      },
      {
        type: 'failure',
        description: 'Test post failure notification'
      },
      {
        type: 'bulk',
        description: 'Test bulk upload completion notification'
      }
    ],
    usage: 'POST /api/test-notifications with { accountGroupId: string, testType: string }'
  });
}

