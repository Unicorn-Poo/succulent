import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '../../../utils/postConstants';
import { isBusinessPlanMode } from '../../../utils/ayrshareIntegration';

interface HashtagAnalysis {
  hashtag: string;
  usage: number;
  engagement: number;
  reach: number;
  trend: 'rising' | 'stable' | 'declining';
  difficulty: 'low' | 'medium' | 'high';
  relevanceScore: number;
}

interface TrendingHashtagsResponse {
  trending: HashtagAnalysis[];
  relevant: HashtagAnalysis[];
  competitive: HashtagAnalysis[];
  recommendations: string[];
  insights: {
    bestPerformingTags: string[];
    underutilizedTags: string[];
    competitorTags: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const { content, platform, profileKey, includeCompetitorAnalysis = false } = await request.json();

    if (!AYRSHARE_API_KEY) {
      return NextResponse.json(
        { error: 'Ayrshare API key not configured' },
        { status: 500 }
      );
    }

    if (!content || content.trim().length < 10) {
      return NextResponse.json(
        { error: 'Content must be at least 10 characters long' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (isBusinessPlanMode() && profileKey) {
      headers['Profile-Key'] = profileKey;
    }

    // Step 1: Analyze content and extract keywords
    const keywords = extractKeywords(content);
    
    // Step 2: Get trending hashtags (simulated - Ayrshare doesn't have direct hashtag API)
    const trendingHashtags = await generateTrendingHashtags(keywords, platform);
    
    // Step 3: Get relevant hashtags based on content
    const relevantHashtags = await generateRelevantHashtags(content, keywords, platform);
    
    // Step 4: Get competitive hashtags (if enabled and Business Plan)
    let competitiveHashtags: HashtagAnalysis[] = [];
    if (includeCompetitorAnalysis && isBusinessPlanMode()) {
      competitiveHashtags = await getCompetitiveHashtags(keywords, platform, profileKey);
    }

    // Step 5: Analyze hashtag performance using historical data
    const performanceData = await analyzeHashtagPerformance(
      [...trendingHashtags, ...relevantHashtags, ...competitiveHashtags],
      platform,
      profileKey
    );

    // Step 6: Generate recommendations
    const recommendations = generateHashtagRecommendations(performanceData, platform);

    const response: TrendingHashtagsResponse = {
      trending: performanceData.filter(h => h.trend === 'rising').slice(0, 15),
      relevant: performanceData.filter(h => h.relevanceScore > 0.7).slice(0, 20),
      competitive: competitiveHashtags.slice(0, 10),
      recommendations: recommendations.slice(0, 30),
      insights: {
        bestPerformingTags: performanceData
          .sort((a, b) => b.engagement - a.engagement)
          .slice(0, 5)
          .map(h => h.hashtag),
        underutilizedTags: performanceData
          .filter(h => h.difficulty === 'low' && h.relevanceScore > 0.6)
          .slice(0, 5)
          .map(h => h.hashtag),
        competitorTags: competitiveHashtags
          .slice(0, 5)
          .map(h => h.hashtag)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Hashtag research error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to research hashtags',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function extractKeywords(content: string): string[] {
  // Extract meaningful keywords from content
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['this', 'that', 'with', 'from', 'they', 'them', 'were', 'been', 'have', 'will', 'your', 'what', 'when', 'where', 'would', 'could', 'should'].includes(word));

  // Get unique words and sort by frequency
  const wordFreq: Record<string, number> = {};
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  return Object.entries(wordFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

async function generateTrendingHashtags(keywords: string[], platform?: string): Promise<HashtagAnalysis[]> {
  // Platform-specific trending hashtag patterns
  const platformTrends: Record<string, string[]> = {
    instagram: ['reels', 'explore', 'viral', 'trending', 'aesthetic', 'lifestyle', 'inspiration', 'motivation'],
    twitter: ['breaking', 'news', 'thread', 'viral', 'trending', 'discussion', 'opinion', 'update'],
    linkedin: ['professional', 'career', 'business', 'networking', 'industry', 'leadership', 'growth', 'innovation'],
    tiktok: ['fyp', 'viral', 'trending', 'challenge', 'duet', 'dance', 'comedy', 'tutorial'],
    facebook: ['community', 'family', 'friends', 'local', 'events', 'news', 'sharing', 'memories']
  };

  const baseTrends = platformTrends[platform || 'instagram'] || platformTrends.instagram;
  
  // Combine keywords with trending patterns
  const hashtags: HashtagAnalysis[] = [];
  
  // Add keyword-based hashtags
  keywords.forEach(keyword => {
    hashtags.push({
      hashtag: keyword,
      usage: Math.floor(Math.random() * 100000) + 10000,
      engagement: Math.floor(Math.random() * 5000) + 1000,
      reach: Math.floor(Math.random() * 50000) + 10000,
      trend: Math.random() > 0.6 ? 'rising' : Math.random() > 0.3 ? 'stable' : 'declining',
      difficulty: Math.random() > 0.7 ? 'low' : Math.random() > 0.4 ? 'medium' : 'high',
      relevanceScore: 0.8 + Math.random() * 0.2
    });
  });

  // Add platform-specific trending hashtags
  baseTrends.forEach(trend => {
    hashtags.push({
      hashtag: trend,
      usage: Math.floor(Math.random() * 200000) + 50000,
      engagement: Math.floor(Math.random() * 10000) + 2000,
      reach: Math.floor(Math.random() * 100000) + 20000,
      trend: 'rising',
      difficulty: 'high',
      relevanceScore: 0.6 + Math.random() * 0.3
    });
  });

  return hashtags;
}

async function generateRelevantHashtags(content: string, keywords: string[], platform?: string): Promise<HashtagAnalysis[]> {
  const hashtags: HashtagAnalysis[] = [];
  
  // Content-based hashtag generation
  const contentThemes = analyzeContentThemes(content);
  
  contentThemes.forEach(theme => {
    hashtags.push({
      hashtag: theme,
      usage: Math.floor(Math.random() * 50000) + 5000,
      engagement: Math.floor(Math.random() * 3000) + 500,
      reach: Math.floor(Math.random() * 25000) + 5000,
      trend: Math.random() > 0.5 ? 'stable' : 'rising',
      difficulty: Math.random() > 0.6 ? 'medium' : 'low',
      relevanceScore: 0.9 + Math.random() * 0.1
    });
  });

  return hashtags;
}

function analyzeContentThemes(content: string): string[] {
  const themes: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Business themes
  if (lowerContent.includes('business') || lowerContent.includes('entrepreneur')) {
    themes.push('business', 'entrepreneur', 'startup', 'success');
  }
  
  // Lifestyle themes
  if (lowerContent.includes('life') || lowerContent.includes('daily')) {
    themes.push('lifestyle', 'daily', 'motivation', 'inspiration');
  }
  
  // Tech themes
  if (lowerContent.includes('tech') || lowerContent.includes('digital')) {
    themes.push('technology', 'digital', 'innovation', 'future');
  }
  
  // Creative themes
  if (lowerContent.includes('create') || lowerContent.includes('design')) {
    themes.push('creative', 'design', 'art', 'inspiration');
  }
  
  // Default themes if none detected
  if (themes.length === 0) {
    themes.push('content', 'social', 'community', 'engagement');
  }
  
  return themes;
}

async function getCompetitiveHashtags(keywords: string[], platform?: string, profileKey?: string): Promise<HashtagAnalysis[]> {
  // This would integrate with Ayrshare's competitor analysis API when available
  // For now, simulate competitive hashtag analysis
  const competitiveHashtags: HashtagAnalysis[] = [];
  
  keywords.forEach(keyword => {
    // Generate competitive variations
    const variations = [
      `${keyword}tips`,
      `${keyword}strategy`,
      `${keyword}expert`,
      `${keyword}community`,
      `${keyword}inspiration`
    ];
    
    variations.forEach(variation => {
      competitiveHashtags.push({
        hashtag: variation,
        usage: Math.floor(Math.random() * 30000) + 5000,
        engagement: Math.floor(Math.random() * 2000) + 300,
        reach: Math.floor(Math.random() * 15000) + 3000,
        trend: 'stable',
        difficulty: 'medium',
        relevanceScore: 0.7 + Math.random() * 0.2
      });
    });
  });
  
  return competitiveHashtags.slice(0, 10);
}

async function analyzeHashtagPerformance(hashtags: HashtagAnalysis[], platform?: string, profileKey?: string): Promise<HashtagAnalysis[]> {
  // This would use real Ayrshare analytics data to analyze hashtag performance
  // For now, enhance the simulated data with more realistic performance metrics
  
  return hashtags.map(hashtag => ({
    ...hashtag,
    // Adjust metrics based on hashtag characteristics
    engagement: hashtag.difficulty === 'low' 
      ? hashtag.engagement * 1.5 
      : hashtag.difficulty === 'high' 
        ? hashtag.engagement * 0.7 
        : hashtag.engagement,
    reach: hashtag.trend === 'rising' 
      ? hashtag.reach * 1.3 
      : hashtag.trend === 'declining' 
        ? hashtag.reach * 0.8 
        : hashtag.reach
  }));
}

function generateHashtagRecommendations(hashtags: HashtagAnalysis[], platform?: string): string[] {
  // Sort hashtags by a composite score considering relevance, engagement, and difficulty
  const scoredHashtags = hashtags.map(h => ({
    hashtag: h.hashtag,
    score: (h.relevanceScore * 0.4) + 
           ((h.engagement / 10000) * 0.3) + 
           (h.difficulty === 'low' ? 0.3 : h.difficulty === 'medium' ? 0.2 : 0.1) +
           (h.trend === 'rising' ? 0.2 : h.trend === 'stable' ? 0.1 : 0)
  }));

  return scoredHashtags
    .sort((a, b) => b.score - a.score)
    .map(h => h.hashtag);
}
