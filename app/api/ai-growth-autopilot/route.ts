import { NextRequest, NextResponse } from 'next/server';
import { executeAIGrowthActions } from '../../../utils/aiGrowthEngine';

export async function POST(request: NextRequest) {
  try {
    const { platform, profileKey, aggressiveness = 'moderate', executeActions = false } = await request.json();

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    // Get AI recommendations and execute if requested
    const result = await executeAIGrowthActions(platform, profileKey, aggressiveness);

    // Add timestamp and additional metadata
    const response = {
      ...result,
      timestamp: new Date().toISOString(),
      platform,
      aggressiveness,
      summary: {
        totalRecommendations: result.recommendations.length,
        highPriorityActions: result.recommendations.filter(r => r.priority === 'high').length,
        averageConfidence: result.recommendations.reduce((sum, r) => sum + r.confidence, 0) / result.recommendations.length,
        executedActions: result.executedActions.executed,
        contentSuggestions: result.contentSuggestions.length
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('AI Growth Autopilot error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate AI growth recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    // Return autopilot status and quick insights
    const status = {
      isActive: true,
      platform,
      lastRun: new Date().toISOString(),
      nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      quickStats: {
        actionsToday: Math.floor(Math.random() * 10) + 5,
        growthRate: (Math.random() * 5 + 10).toFixed(1), // 10-15%
        engagementRate: (Math.random() * 2 + 3).toFixed(1), // 3-5%
        pendingActions: Math.floor(Math.random() * 5) + 2
      },
      features: {
        autoScheduling: true,
        autoReplies: true,
        hashtagOptimization: true,
        contentGeneration: true,
        competitorAnalysis: true
      }
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('Autopilot status error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get autopilot status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
