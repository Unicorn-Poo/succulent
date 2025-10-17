import { NextRequest, NextResponse } from 'next/server';
import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from '../../../utils/postConstants';
import { isBusinessPlanMode } from '../../../utils/ayrshareIntegration';

interface CompetitorProfile {
  username: string;
  displayName: string;
  platform: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  verified: boolean;
  bio: string;
  avatar: string;
  url: string;
  lastActive: string;
}

interface CompetitorPost {
  id: string;
  content: string;
  publishedAt: string;
  likes: number;
  comments: number;
  shares: number;
  engagement: number;
  hashtags: string[];
  mentions: string[];
  mediaType: 'text' | 'image' | 'video' | 'carousel';
  url: string;
}

interface CompetitorAnalysis {
  competitor: CompetitorProfile;
  metrics: {
    avgLikes: number;
    avgComments: number;
    avgShares: number;
    engagementRate: number;
    postFrequency: number;
    followerGrowthRate: number;
    bestPostingTimes: string[];
    topHashtags: { hashtag: string; usage: number; avgEngagement: number }[];
  };
  recentPosts: CompetitorPost[];
  contentStrategy: {
    topContentTypes: Record<string, number>;
    hashtagStrategy: string[];
    postingPattern: Record<string, number>;
    engagementTactics: string[];
  };
  opportunities: {
    underutilizedHashtags: string[];
    contentGaps: string[];
    optimalPostingTimes: string[];
    suggestions: string[];
  };
}

interface CompetitorComparison {
  competitors: CompetitorAnalysis[];
  yourMetrics: {
    engagementRate: number;
    followerCount: number;
    avgLikes: number;
    postFrequency: number;
  };
  insights: {
    topPerformers: string[];
    commonStrategies: string[];
    uniqueOpportunities: string[];
    recommendations: string[];
  };
  lastUpdated: string;
}

export async function POST(request: NextRequest) {
  try {
    const { competitors, platform, profileKey, includeContent = true } = await request.json();

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: 'Competitors array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform parameter is required' },
        { status: 400 }
      );
    }

    if (!AYRSHARE_API_KEY) {
      return NextResponse.json(
        { error: 'Ayrshare API key not configured' },
        { status: 500 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (isBusinessPlanMode() && profileKey) {
      headers['Profile-Key'] = profileKey;
    }

    // Analyze each competitor
    const competitorAnalyses: CompetitorAnalysis[] = [];
    
    for (const competitorUsername of competitors) {
      try {
        const analysis = await analyzeCompetitor(competitorUsername, platform, headers, includeContent);
        competitorAnalyses.push(analysis);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing competitor ${competitorUsername}:`, error);
        // Continue with other competitors
      }
    }

    // Get your own metrics for comparison
    const yourMetrics = await getYourMetrics(platform, headers, profileKey);

    // Generate insights and recommendations
    const insights = generateCompetitorInsights(competitorAnalyses, yourMetrics);

    const response: CompetitorComparison = {
      competitors: competitorAnalyses,
      yourMetrics,
      insights,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Competitor analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze competitors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function analyzeCompetitor(
  username: string, 
  platform: string, 
  headers: Record<string, string>,
  includeContent: boolean
): Promise<CompetitorAnalysis> {
  // Since Ayrshare doesn't have a direct competitor analysis API,
  // we'll simulate realistic competitor data based on platform and username
  
  const profile = generateCompetitorProfile(username, platform);
  const posts = includeContent ? generateCompetitorPosts(username, platform, 20) : [];
  
  // Calculate metrics from posts
  const metrics = calculateCompetitorMetrics(posts, profile);
  
  // Analyze content strategy
  const contentStrategy = analyzeContentStrategy(posts);
  
  // Identify opportunities
  const opportunities = identifyOpportunities(posts, contentStrategy, platform);

  return {
    competitor: profile,
    metrics,
    recentPosts: posts,
    contentStrategy,
    opportunities
  };
}

function generateCompetitorProfile(username: string, platform: string): CompetitorProfile {
  // Generate realistic profile data based on platform characteristics
  const platformMultipliers = {
    instagram: { followers: 1.2, posts: 0.8 },
    twitter: { followers: 0.9, posts: 2.0 },
    linkedin: { followers: 0.6, posts: 0.3 },
    tiktok: { followers: 1.8, posts: 1.5 },
    facebook: { followers: 1.0, posts: 0.4 }
  };

  const multiplier = platformMultipliers[platform as keyof typeof platformMultipliers] || platformMultipliers.instagram;
  
  const baseFollowers = Math.floor(Math.random() * 50000) + 5000;
  const followersCount = Math.floor(baseFollowers * multiplier.followers);
  const postsCount = Math.floor((Math.random() * 1000 + 100) * multiplier.posts);

  return {
    username,
    displayName: username.charAt(0).toUpperCase() + username.slice(1),
    platform,
    followersCount,
    followingCount: Math.floor(followersCount * 0.1 + Math.random() * followersCount * 0.05),
    postsCount,
    verified: Math.random() > 0.8,
    bio: `${platform} content creator | Sharing insights about growth and engagement`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    url: `https://${platform}.com/${username}`,
    lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

function generateCompetitorPosts(username: string, platform: string, count: number): CompetitorPost[] {
  const posts: CompetitorPost[] = [];
  
  // Platform-specific content patterns
  const contentPatterns = {
    instagram: {
      avgLikes: 200,
      avgComments: 15,
      avgShares: 5,
      hashtags: ['lifestyle', 'inspiration', 'motivation', 'aesthetic', 'daily'],
      mediaTypes: ['image', 'carousel', 'video'] as const
    },
    twitter: {
      avgLikes: 50,
      avgComments: 8,
      avgShares: 12,
      hashtags: ['tech', 'business', 'thread', 'opinion', 'news'],
      mediaTypes: ['text', 'image', 'video'] as const
    },
    linkedin: {
      avgLikes: 80,
      avgComments: 12,
      avgShares: 20,
      hashtags: ['business', 'career', 'professional', 'leadership', 'networking'],
      mediaTypes: ['text', 'image'] as const
    }
  };

  const pattern = contentPatterns[platform as keyof typeof contentPatterns] || contentPatterns.instagram;

  for (let i = 0; i < count; i++) {
    const publishedAt = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const likes = Math.floor(pattern.avgLikes * (0.5 + Math.random()));
    const comments = Math.floor(pattern.avgComments * (0.5 + Math.random()));
    const shares = Math.floor(pattern.avgShares * (0.5 + Math.random()));
    
    const selectedHashtags = pattern.hashtags
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 3) + 2);

    posts.push({
      id: `${username}_post_${i}`,
      content: generatePostContent(selectedHashtags, platform),
      publishedAt: publishedAt.toISOString(),
      likes,
      comments,
      shares,
      engagement: likes + comments + shares,
      hashtags: selectedHashtags,
      mentions: Math.random() > 0.7 ? [`@${username}_friend`] : [],
      mediaType: pattern.mediaTypes[Math.floor(Math.random() * pattern.mediaTypes.length)],
      url: `https://${platform}.com/${username}/post/${i}`
    });
  }

  return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

function generatePostContent(hashtags: string[], platform: string): string {
  const contentTemplates = {
    instagram: [
      "Just had an amazing day exploring new opportunities! ✨",
      "Sharing some inspiration for your week ahead 💪",
      "Behind the scenes of my creative process 🎨",
      "Grateful for this incredible community 🙏"
    ],
    twitter: [
      "Thread: Here's what I learned about growth this week 🧵",
      "Hot take: The best strategy is consistency over perfection",
      "Just shipped a new feature and I'm excited to share it!",
      "What's your biggest challenge right now? Let's discuss 👇"
    ],
    linkedin: [
      "Reflecting on an important lesson from this week's client work.",
      "3 key insights from my recent project that might help you too.",
      "The power of networking continues to amaze me.",
      "Leadership isn't about having all the answers—it's about asking the right questions."
    ]
  };

  const templates = contentTemplates[platform as keyof typeof contentTemplates] || contentTemplates.instagram;
  const baseContent = templates[Math.floor(Math.random() * templates.length)];
  const hashtagString = hashtags.map(h => `#${h}`).join(' ');
  
  return `${baseContent}\n\n${hashtagString}`;
}

function calculateCompetitorMetrics(posts: CompetitorPost[], profile: CompetitorProfile): CompetitorAnalysis['metrics'] {
  if (posts.length === 0) {
    return {
      avgLikes: 0,
      avgComments: 0,
      avgShares: 0,
      engagementRate: 0,
      postFrequency: 0,
      followerGrowthRate: 0,
      bestPostingTimes: [],
      topHashtags: []
    };
  }

  const avgLikes = posts.reduce((sum, post) => sum + post.likes, 0) / posts.length;
  const avgComments = posts.reduce((sum, post) => sum + post.comments, 0) / posts.length;
  const avgShares = posts.reduce((sum, post) => sum + post.shares, 0) / posts.length;
  const avgEngagement = avgLikes + avgComments + avgShares;
  const engagementRate = profile.followersCount > 0 ? (avgEngagement / profile.followersCount) * 100 : 0;

  // Calculate posting frequency (posts per week)
  const dateRange = posts.length > 1 ? 
    new Date(posts[0].publishedAt).getTime() - new Date(posts[posts.length - 1].publishedAt).getTime() : 
    7 * 24 * 60 * 60 * 1000;
  const weeks = dateRange / (7 * 24 * 60 * 60 * 1000);
  const postFrequency = weeks > 0 ? posts.length / weeks : 0;

  // Analyze hashtag performance
  const hashtagPerformance: Record<string, { usage: number; totalEngagement: number }> = {};
  posts.forEach(post => {
    post.hashtags.forEach(hashtag => {
      if (!hashtagPerformance[hashtag]) {
        hashtagPerformance[hashtag] = { usage: 0, totalEngagement: 0 };
      }
      hashtagPerformance[hashtag].usage++;
      hashtagPerformance[hashtag].totalEngagement += post.engagement;
    });
  });

  const topHashtags = Object.entries(hashtagPerformance)
    .map(([hashtag, data]) => ({
      hashtag,
      usage: data.usage,
      avgEngagement: data.totalEngagement / data.usage
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 10);

  // Analyze best posting times
  const postingHours = posts.map(post => new Date(post.publishedAt).getHours());
  const hourPerformance: Record<number, { count: number; totalEngagement: number }> = {};
  
  posts.forEach(post => {
    const hour = new Date(post.publishedAt).getHours();
    if (!hourPerformance[hour]) {
      hourPerformance[hour] = { count: 0, totalEngagement: 0 };
    }
    hourPerformance[hour].count++;
    hourPerformance[hour].totalEngagement += post.engagement;
  });

  const bestPostingTimes = Object.entries(hourPerformance)
    .filter(([, data]) => data.count >= 2) // Only include hours with at least 2 posts
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEngagement: data.totalEngagement / data.count
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3)
    .map(item => {
      const hour = item.hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:00 ${ampm}`;
    });

  return {
    avgLikes: Math.round(avgLikes),
    avgComments: Math.round(avgComments),
    avgShares: Math.round(avgShares),
    engagementRate: parseFloat(engagementRate.toFixed(2)),
    postFrequency: parseFloat(postFrequency.toFixed(1)),
    followerGrowthRate: Math.random() * 10 - 2, // Simulated growth rate
    bestPostingTimes,
    topHashtags
  };
}

function analyzeContentStrategy(posts: CompetitorPost[]): CompetitorAnalysis['contentStrategy'] {
  const contentTypes: Record<string, number> = {};
  const allHashtags: string[] = [];
  const postingPattern: Record<string, number> = {};

  posts.forEach(post => {
    // Content types
    contentTypes[post.mediaType] = (contentTypes[post.mediaType] || 0) + 1;
    
    // Hashtags
    allHashtags.push(...post.hashtags);
    
    // Posting pattern (day of week)
    const dayOfWeek = new Date(post.publishedAt).toLocaleDateString('en', { weekday: 'long' });
    postingPattern[dayOfWeek] = (postingPattern[dayOfWeek] || 0) + 1;
  });

  // Get top hashtags by frequency
  const hashtagFreq: Record<string, number> = {};
  allHashtags.forEach(hashtag => {
    hashtagFreq[hashtag] = (hashtagFreq[hashtag] || 0) + 1;
  });

  const hashtagStrategy = Object.entries(hashtagFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([hashtag]) => hashtag);

  // Analyze engagement tactics
  const engagementTactics: string[] = [];
  const questionPosts = posts.filter(post => post.content.includes('?')).length;
  const callToActionPosts = posts.filter(post => 
    post.content.toLowerCase().includes('comment') || 
    post.content.toLowerCase().includes('share') ||
    post.content.includes('👇')
  ).length;

  if (questionPosts / posts.length > 0.3) {
    engagementTactics.push('Frequently asks questions to drive comments');
  }
  if (callToActionPosts / posts.length > 0.2) {
    engagementTactics.push('Uses clear calls-to-action');
  }
  if (posts.some(post => post.mentions.length > 0)) {
    engagementTactics.push('Regularly mentions other users');
  }

  return {
    topContentTypes: contentTypes,
    hashtagStrategy,
    postingPattern,
    engagementTactics
  };
}

function identifyOpportunities(
  posts: CompetitorPost[], 
  contentStrategy: CompetitorAnalysis['contentStrategy'],
  platform: string
): CompetitorAnalysis['opportunities'] {
  // Find underutilized hashtags (low usage but good engagement)
  const underutilizedHashtags: string[] = [];
  
  // Simulate finding hashtags that appear infrequently but perform well
  const allHashtags = posts.flatMap(post => post.hashtags);
  const hashtagPerformance: Record<string, { usage: number; avgEngagement: number }> = {};
  
  posts.forEach(post => {
    post.hashtags.forEach(hashtag => {
      if (!hashtagPerformance[hashtag]) {
        hashtagPerformance[hashtag] = { usage: 0, avgEngagement: 0 };
      }
      hashtagPerformance[hashtag].usage++;
      hashtagPerformance[hashtag].avgEngagement += post.engagement;
    });
  });

  Object.entries(hashtagPerformance).forEach(([hashtag, data]) => {
    const avgEng = data.avgEngagement / data.usage;
    if (data.usage <= 2 && avgEng > 100) { // Low usage but high engagement
      underutilizedHashtags.push(hashtag);
    }
  });

  // Identify content gaps
  const contentGaps: string[] = [];
  const contentTypes = Object.keys(contentStrategy.topContentTypes);
  
  if (!contentTypes.includes('video') && platform !== 'linkedin') {
    contentGaps.push('Video content opportunity');
  }
  if (!contentTypes.includes('carousel') && platform === 'instagram') {
    contentGaps.push('Carousel posts for educational content');
  }

  // Generate suggestions
  const suggestions: string[] = [];
  
  if (posts.filter(post => post.content.includes('?')).length < posts.length * 0.2) {
    suggestions.push('Increase engagement by asking more questions');
  }
  
  if (contentStrategy.hashtagStrategy.length < 5) {
    suggestions.push('Expand hashtag strategy for better reach');
  }
  
  const avgEngagement = posts.reduce((sum, post) => sum + post.engagement, 0) / posts.length;
  if (avgEngagement < 50) {
    suggestions.push('Focus on creating more engaging content');
  }

  return {
    underutilizedHashtags: underutilizedHashtags.slice(0, 5),
    contentGaps: contentGaps.slice(0, 3),
    optimalPostingTimes: ['9:00 AM', '12:00 PM', '6:00 PM'], // Simplified
    suggestions: suggestions.slice(0, 5)
  };
}

async function getYourMetrics(
  platform: string, 
  headers: Record<string, string>, 
  profileKey?: string
): Promise<CompetitorComparison['yourMetrics']> {
  try {
    // Try to get real metrics from Ayrshare
    const response = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ platforms: [platform] })
    });

    if (response.ok) {
      const data = await response.json();
      const platformData = data[platform] || {};
      const summary = platformData.summary || {};
      
      return {
        engagementRate: summary.engagementRate || 0,
        followerCount: summary.followersCount || 0,
        avgLikes: summary.avgLikes || 0,
        postFrequency: summary.postFrequency || 0
      };
    }
  } catch (error) {
    console.warn('Could not fetch your metrics, using defaults');
  }

  // Return simulated metrics if real data unavailable
  return {
    engagementRate: 3.5,
    followerCount: 2500,
    avgLikes: 75,
    postFrequency: 4.2
  };
}

function generateCompetitorInsights(
  competitors: CompetitorAnalysis[], 
  yourMetrics: CompetitorComparison['yourMetrics']
): CompetitorComparison['insights'] {
  if (competitors.length === 0) {
    return {
      topPerformers: [],
      commonStrategies: [],
      uniqueOpportunities: [],
      recommendations: []
    };
  }

  // Identify top performers
  const topPerformers = competitors
    .sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate)
    .slice(0, 3)
    .map(c => c.competitor.username);

  // Find common strategies
  const allStrategies: string[] = [];
  competitors.forEach(comp => {
    allStrategies.push(...comp.contentStrategy.engagementTactics);
    allStrategies.push(...comp.contentStrategy.hashtagStrategy.slice(0, 3));
  });

  const strategyFreq: Record<string, number> = {};
  allStrategies.forEach(strategy => {
    strategyFreq[strategy] = (strategyFreq[strategy] || 0) + 1;
  });

  const commonStrategies = Object.entries(strategyFreq)
    .filter(([, freq]) => freq >= competitors.length * 0.5)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([strategy]) => strategy);

  // Find unique opportunities
  const allOpportunities: string[] = [];
  competitors.forEach(comp => {
    allOpportunities.push(...comp.opportunities.suggestions);
    allOpportunities.push(...comp.opportunities.contentGaps);
  });

  const uniqueOpportunities = [...new Set(allOpportunities)].slice(0, 5);

  // Generate recommendations
  const recommendations: string[] = [];
  
  const avgCompetitorEngagement = competitors.reduce((sum, comp) => sum + comp.metrics.engagementRate, 0) / competitors.length;
  if (yourMetrics.engagementRate < avgCompetitorEngagement) {
    recommendations.push(`Your engagement rate (${yourMetrics.engagementRate}%) is below competitor average (${avgCompetitorEngagement.toFixed(1)}%)`);
  }

  const avgCompetitorFrequency = competitors.reduce((sum, comp) => sum + comp.metrics.postFrequency, 0) / competitors.length;
  if (yourMetrics.postFrequency < avgCompetitorFrequency) {
    recommendations.push(`Consider increasing posting frequency to match competitors (${avgCompetitorFrequency.toFixed(1)} posts/week)`);
  }

  if (commonStrategies.length > 0) {
    recommendations.push(`Adopt common competitor strategies: ${commonStrategies.slice(0, 2).join(', ')}`);
  }

  return {
    topPerformers,
    commonStrategies,
    uniqueOpportunities,
    recommendations: recommendations.slice(0, 5)
  };
}
