import { NextRequest, NextResponse } from 'next/server';
import { createAIAutopilot, getQuickAutopilotDecision } from '@/utils/aiAutopilot';

/**
 * POST /api/ai-autopilot - Control and interact with AI autopilot
 * Actions: 'start', 'stop', 'analyze', 'decision', 'status'
 */
export async function POST(request: NextRequest) {
  try {
    const { action, config, context, options } = await request.json();

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'start':
        if (!config || !config.accountGroupId) {
          return NextResponse.json(
            { success: false, error: 'Config with accountGroupId is required' },
            { status: 400 }
          );
        }

        const autopilot = await createAIAutopilot(config);
        const initialAnalysis = await autopilot.makeAutopilotDecisions();

        return NextResponse.json({
          success: true,
          message: 'AI Autopilot started successfully',
          status: autopilot.getStatus(),
          initialAnalysis
        });

      case 'analyze':
        if (!config || !config.accountGroupId) {
          return NextResponse.json(
            { success: false, error: 'Config with accountGroupId is required' },
            { status: 400 }
          );
        }

        const analysisAutopilot = await createAIAutopilot(config);
        const analysis = await analysisAutopilot.makeAutopilotDecisions();

        return NextResponse.json({
          success: true,
          analysis,
          timestamp: new Date().toISOString()
        });

      case 'decision':
        if (!context || !options) {
          return NextResponse.json(
            { success: false, error: 'Context and options are required for decisions' },
            { status: 400 }
          );
        }

        const decision = await getQuickAutopilotDecision(context, options);

        return NextResponse.json({
          success: true,
          decision,
          timestamp: new Date().toISOString()
        });

      case 'quick-content':
        const contentPrompt = context || 'Generate engaging social media content';
        
        try {
          // Create a temporary autopilot for content generation
          const contentAutopilot = await createAIAutopilot({
            aggressiveness: 'moderate',
            maxPostsPerDay: 5,
            enableAutoPosting: false,
            enableAutoEngagement: false,
            enableContentOptimization: true,
            platforms: ['instagram', 'x'],
            accountGroupId: config?.accountGroupId || 'temp'
          });

          const contentStream = await contentAutopilot.generateContentWithStreaming(contentPrompt);
          
          // Convert stream to string for response with timeout
          let content = '';
          const streamTimeout = setTimeout(() => {
            throw new Error('Content generation stream timeout');
          }, 60000); // 60 second timeout
          
          try {
            for await (const chunk of contentStream) {
              content += chunk;
            }
            clearTimeout(streamTimeout);
          } catch (streamError) {
            clearTimeout(streamTimeout);
            throw streamError;
          }

          return NextResponse.json({
            success: true,
            content,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('❌ Quick content generation failed:', error);
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Content generation failed'
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ AI Autopilot error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI Autopilot failed'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-autopilot - Get autopilot capabilities and status
 */
export async function GET() {
  return NextResponse.json({
    capabilities: [
      'Real-time performance analysis',
      'AI-powered content generation',
      'Automated engagement optimization', 
      'Smart posting time recommendations',
      'Brand-aware decision making',
      'Risk assessment and mitigation',
      'Streaming content generation',
      'Image analysis and captioning'
    ],
    actions: [
      {
        name: 'start',
        description: 'Start autopilot with configuration',
        parameters: ['config']
      },
      {
        name: 'analyze', 
        description: 'Get AI analysis and recommendations',
        parameters: ['config']
      },
      {
        name: 'decision',
        description: 'Get quick AI decision for specific context',
        parameters: ['context', 'options']
      },
      {
        name: 'quick-content',
        description: 'Generate content with streaming AI',
        parameters: ['context']
      }
    ],
    example: {
      start: {
        action: 'start',
        config: {
          aggressiveness: 'moderate',
          maxPostsPerDay: 3,
          enableAutoPosting: true,
          enableAutoEngagement: true,
          enableContentOptimization: true,
          platforms: ['instagram', 'x'],
          accountGroupId: 'your-account-group-id'
        }
      },
      decision: {
        action: 'decision',
        context: 'Should I post now or wait 2 hours?',
        options: ['post_now', 'wait_2_hours', 'schedule_optimal_time']
      }
    }
  });
}
