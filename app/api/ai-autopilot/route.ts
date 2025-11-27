import { NextRequest, NextResponse } from 'next/server';
import { createAIAutopilot, getQuickAutopilotDecision, getNextScheduledDate } from '@/utils/aiAutopilot';

export const dynamic = 'force-dynamic';
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
          // Create autopilot for content generation
          const contentAutopilot = await createAIAutopilot({
            aggressiveness: 'moderate',
            maxPostsPerDay: 5,
            enableAutoPosting: false,
            enableAutoEngagement: false,
            enableContentOptimization: true,
            platforms: config?.platforms || ['instagram', 'x'],
            accountGroupId: config?.accountGroupId || 'temp'
          });

          // Set brand persona from the extracted data (not from Jazz object)
          if (config?.brandPersona) {
            const persona = config.brandPersona;
            contentAutopilot.setBrandPersona({
              id: `persona_${Date.now()}`,
              name: persona.name || 'My Brand',
              description: persona.description || '',
              voice: {
                tone: persona.tone || 'friendly',
                personality: persona.personality || [],
                writingStyle: persona.writingStyle || 'conversational',
                emojiUsage: persona.emojiUsage || 'moderate',
                languageLevel: persona.languageLevel || 'intermediate',
              },
              messaging: {
                keyMessages: persona.keyMessages || [],
                valueProposition: persona.valueProposition || '',
                targetAudience: persona.targetAudience || '',
                contentPillars: persona.contentPillars || [],
                avoidTopics: persona.avoidTopics || [],
              },
              engagement: {
                commentStyle: 'supportive',
                dmApproach: 'friendly',
                hashtagStrategy: 'mixed',
                mentionStyle: 'active',
              },
              contentGuidelines: {
                postLength: 'medium',
                contentMix: { educational: 40, entertainment: 30, promotional: 20, personal: 10 },
                callToActionStyle: persona.callToActionStyle || 'direct',
                questionFrequency: 'frequent',
              },
              platformCustomization: {},
              examples: {
                samplePosts: persona.samplePosts || [],
                sampleReplies: [],
                sampleDMs: [],
              },
            });
          }

          // Use structured content generation
          const structuredContent = await contentAutopilot.generateStructuredContent(contentPrompt);
          
          // Calculate the actual scheduled date from the AI's suggestion
          const scheduledDate = getNextScheduledDate(
            structuredContent.suggestedPostTime.day,
            structuredContent.suggestedPostTime.hour
          );

          // Format the hour properly
          const hour = structuredContent.suggestedPostTime.hour;
          const formattedHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const amPm = hour >= 12 ? 'PM' : 'AM';

          return NextResponse.json({
            success: true,
            // The actual post content (no metadata)
            content: structuredContent.content,
            // Structured scheduling data
            suggestedPostTime: {
              day: structuredContent.suggestedPostTime.day,
              hour: structuredContent.suggestedPostTime.hour,
              scheduledDate: scheduledDate.toISOString(),
              formattedTime: `${structuredContent.suggestedPostTime.day} at ${formattedHour} ${amPm}`
            },
            // Content metadata
            contentPillar: structuredContent.contentPillar,
            engagementPotential: structuredContent.engagementPotential,
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
      'AI-powered content generation with structured output',
      'Automated engagement optimization', 
      'Smart posting time recommendations with auto-scheduling',
      'Brand-aware decision making',
      'Risk assessment and mitigation',
      'Content pillar rotation for topic variety',
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
        description: 'Generate structured content with optimal timing',
        parameters: ['context', 'config.accountGroup (optional)', 'config.platforms (optional)'],
        returns: {
          content: 'The actual post content (ready to post)',
          suggestedPostTime: {
            day: 'Day of week',
            hour: 'Hour in 24h format',
            scheduledDate: 'ISO date string for scheduling',
            formattedTime: 'Human-readable time'
          },
          contentPillar: 'Which topic/pillar the content is about',
          engagementPotential: 'Predicted engagement score (0-100)'
        }
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
      'quick-content': {
        action: 'quick-content',
        context: 'Generate content for my brand',
        config: {
          platforms: ['instagram'],
          accountGroup: '(pass your account group object to use brand persona)'
        }
      }
    }
  });
}
