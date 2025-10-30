import { NextRequest, NextResponse } from 'next/server';
import { createLearningAutopilot, AILearningSystem } from '@/utils/aiLearningSystem';

/**
 * POST /api/ai-learning - AI Learning System endpoints
 * Actions: 'analyze', 'recommendations', 'predict', 'learn', 'stats'
 */
export async function POST(request: NextRequest) {
  try {
    const { action, accountGroupId, platforms, context, content, topic } = await request.json();

    if (!action || !accountGroupId) {
      return NextResponse.json(
        { success: false, error: 'Action and accountGroupId are required' },
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
            posts: { $each: { variants: { $each: true } } },
            accounts: { $each: true }
          }
        });
      }
    } catch (error) {
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

    switch (action) {
      case 'analyze':
        console.log(`🧠 Starting comprehensive post analysis for account group ${accountGroupId}`);
        
        const learningSystem = new AILearningSystem(accountGroupId, platforms || ['instagram', 'x']);
        const analysisReport = await learningSystem.analyzeAllPosts(accountGroup);

        return NextResponse.json({
          success: true,
          report: analysisReport,
          timestamp: new Date().toISOString()
        });

      case 'recommendations':
        if (!context) {
          return NextResponse.json(
            { success: false, error: 'Context is required for recommendations' },
            { status: 400 }
          );
        }

        const autopilot = await createLearningAutopilot(accountGroupId, platforms || ['instagram', 'x'], accountGroup);
        const recommendations = await autopilot.makeLearnedDecisions(context);

        return NextResponse.json({
          success: true,
          recommendations,
          timestamp: new Date().toISOString()
        });

      case 'predict':
        if (!content || !platforms) {
          return NextResponse.json(
            { success: false, error: 'Content and platforms are required for prediction' },
            { status: 400 }
          );
        }

        const predictionAutopilot = await createLearningAutopilot(accountGroupId, platforms, accountGroup);
        const prediction = await predictionAutopilot.learningSystem.predictContentPerformance(content, platforms);

        return NextResponse.json({
          success: true,
          prediction,
          timestamp: new Date().toISOString()
        });

      case 'generate':
        if (!topic) {
          return NextResponse.json(
            { success: false, error: 'Topic is required for content generation' },
            { status: 400 }
          );
        }

        try {
          const contentAutopilot = await createLearningAutopilot(accountGroupId, platforms || ['instagram', 'x'], accountGroup);
          const generatedContent = await contentAutopilot.generateOptimizedContent(topic);

          return NextResponse.json({
            success: true,
            content: generatedContent,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Content generation failed:', error);
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Content generation failed'
            },
            { status: 500 }
          );
        }

      case 'stats':
        const statsAutopilot = await createLearningAutopilot(accountGroupId, platforms || ['instagram', 'x'], accountGroup);
        const stats = statsAutopilot.getLearningStats();

        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ AI Learning error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI Learning failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-learning - Get learning system capabilities
 */
export async function GET() {
  return NextResponse.json({
    capabilities: [
      'Analyze all historical posts for patterns',
      'Learn from engagement data and performance',
      'Generate personalized recommendations',
      'Predict content performance before posting',
      'Continuous learning from new posts',
      'Memory-based strategy optimization',
      'Pattern recognition across platforms'
    ],
    actions: [
      {
        name: 'analyze',
        description: 'Analyze all past posts and extract learning insights',
        parameters: ['accountGroupId', 'platforms?']
      },
      {
        name: 'recommendations',
        description: 'Get personalized recommendations based on learned patterns',
        parameters: ['accountGroupId', 'context', 'platforms?']
      },
      {
        name: 'predict',
        description: 'Predict content performance based on historical data',
        parameters: ['accountGroupId', 'content', 'platforms']
      },
      {
        name: 'generate',
        description: 'Generate optimized content based on learned patterns',
        parameters: ['accountGroupId', 'topic', 'platforms?']
      },
      {
        name: 'stats',
        description: 'Get learning system statistics and memory info',
        parameters: ['accountGroupId', 'platforms?']
      }
    ],
    example: {
      analyze: {
        action: 'analyze',
        accountGroupId: 'your-account-group-id',
        platforms: ['instagram', 'x']
      },
      predict: {
        action: 'predict',
        accountGroupId: 'your-account-group-id',
        content: 'Check out my new product! 🎉 #newlaunch',
        platforms: ['instagram', 'x']
      }
    }
  });
}
