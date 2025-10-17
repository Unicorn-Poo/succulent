import { AYRSHARE_API_URL, AYRSHARE_API_KEY } from './postConstants';
import { isBusinessPlanMode } from './ayrshareIntegration';

interface TimeSlot {
  hour: number;
  day: string;
  engagement: number;
  reach: number;
  postCount: number;
  averageEngagement: number;
}

interface OptimalTimingAnalysis {
  platform: string;
  timezone: string;
  bestTimes: {
    hour: number;
    day: string;
    score: number;
    engagement: number;
    reach: number;
    confidence: number;
  }[];
  weeklyPattern: {
    [key: string]: TimeSlot[];
  };
  insights: {
    peakEngagementHour: number;
    bestDays: string[];
    worstTimes: string[];
    audienceActiveHours: number[];
    recommendations: string[];
  };
  dataPoints: number;
  lastUpdated: string;
}

interface AudienceInsights {
  demographics: {
    ageGroups: Record<string, number>;
    gender: Record<string, number>;
    locations: Record<string, number>;
  };
  behavior: {
    activeHours: Record<number, number>;
    activeDays: Record<string, number>;
    deviceUsage: Record<string, number>;
  };
  preferences: {
    contentTypes: Record<string, number>;
    engagementTypes: Record<string, number>;
  };
}

export class OptimalTimingEngine {
  private profileKey?: string;
  private platform: string;

  constructor(platform: string, profileKey?: string) {
    this.platform = platform;
    this.profileKey = profileKey;
  }

  /**
   * Get comprehensive optimal timing analysis
   */
  async getOptimalTiming(): Promise<OptimalTimingAnalysis> {
    try {
      // Get historical post data for analysis
      const historicalData = await this.getHistoricalPostData();
      
      // Analyze timing patterns
      const timingPatterns = this.analyzeTimingPatterns(historicalData);
      
      // Get audience insights
      const audienceInsights = await this.getAudienceInsights();
      
      // Combine data for optimal timing recommendations
      const optimalTimes = this.calculateOptimalTimes(timingPatterns, audienceInsights);
      
      // Generate insights and recommendations
      const insights = this.generateTimingInsights(timingPatterns, audienceInsights);

      return {
        platform: this.platform,
        timezone: 'UTC', // This should be configurable based on user settings
        bestTimes: optimalTimes,
        weeklyPattern: timingPatterns,
        insights,
        dataPoints: historicalData.length,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in optimal timing analysis:', error);
      throw new Error(`Failed to analyze optimal timing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get historical post data from Ayrshare
   */
  private async getHistoricalPostData(): Promise<any[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    if (isBusinessPlanMode() && this.profileKey) {
      headers['Profile-Key'] = this.profileKey;
    }

    try {
      const response = await fetch(`${AYRSHARE_API_URL}/analytics/social`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          platforms: [this.platform],
          timeframe: '90d' // Get 90 days of data for better analysis
        })
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.statusText}`);
      }

      const data = await response.json();
      const platformData = data[this.platform] || data.posts?.[this.platform] || {};
      
      return platformData.posts || [];
    } catch (error) {
      console.warn('Could not fetch historical data, using simulated data for analysis');
      return this.generateSimulatedData();
    }
  }

  /**
   * Analyze timing patterns from historical data
   */
  private analyzeTimingPatterns(posts: any[]): Record<string, TimeSlot[]> {
    const patterns: Record<string, TimeSlot[]> = {};
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Initialize patterns for each day
    days.forEach(day => {
      patterns[day] = [];
      for (let hour = 0; hour < 24; hour++) {
        patterns[day].push({
          hour,
          day,
          engagement: 0,
          reach: 0,
          postCount: 0,
          averageEngagement: 0
        });
      }
    });

    // Analyze each post
    posts.forEach(post => {
      if (!post.publishedAt) return;

      const date = new Date(post.publishedAt);
      const dayName = days[date.getDay()];
      const hour = date.getHours();
      
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      const reach = post.reach || post.impressions || 0;

      if (patterns[dayName] && patterns[dayName][hour]) {
        patterns[dayName][hour].engagement += engagement;
        patterns[dayName][hour].reach += reach;
        patterns[dayName][hour].postCount += 1;
      }
    });

    // Calculate averages
    Object.keys(patterns).forEach(day => {
      patterns[day].forEach(timeSlot => {
        if (timeSlot.postCount > 0) {
          timeSlot.averageEngagement = timeSlot.engagement / timeSlot.postCount;
        }
      });
    });

    return patterns;
  }

  /**
   * Get audience insights for better timing optimization
   */
  private async getAudienceInsights(): Promise<AudienceInsights> {
    // This would integrate with Ayrshare's audience analytics when available
    // For now, provide platform-specific audience behavior patterns
    
    const platformDefaults: Record<string, AudienceInsights> = {
      instagram: {
        demographics: {
          ageGroups: { '18-24': 30, '25-34': 35, '35-44': 20, '45+': 15 },
          gender: { 'female': 55, 'male': 45 },
          locations: { 'US': 40, 'Europe': 30, 'Other': 30 }
        },
        behavior: {
          activeHours: { 6: 10, 7: 20, 8: 30, 9: 25, 11: 35, 12: 40, 17: 45, 18: 50, 19: 55, 20: 60, 21: 45 },
          activeDays: { 'Monday': 70, 'Tuesday': 75, 'Wednesday': 80, 'Thursday': 85, 'Friday': 60, 'Saturday': 40, 'Sunday': 50 },
          deviceUsage: { 'mobile': 85, 'desktop': 15 }
        },
        preferences: {
          contentTypes: { 'image': 60, 'video': 35, 'carousel': 5 },
          engagementTypes: { 'likes': 70, 'comments': 20, 'shares': 10 }
        }
      },
      twitter: {
        demographics: {
          ageGroups: { '18-24': 25, '25-34': 40, '35-44': 25, '45+': 10 },
          gender: { 'male': 55, 'female': 45 },
          locations: { 'US': 50, 'Europe': 25, 'Other': 25 }
        },
        behavior: {
          activeHours: { 7: 30, 8: 40, 9: 35, 12: 45, 13: 40, 17: 50, 18: 55, 19: 45, 20: 40 },
          activeDays: { 'Monday': 85, 'Tuesday': 90, 'Wednesday': 95, 'Thursday': 90, 'Friday': 70, 'Saturday': 30, 'Sunday': 40 },
          deviceUsage: { 'mobile': 70, 'desktop': 30 }
        },
        preferences: {
          contentTypes: { 'text': 50, 'image': 30, 'video': 20 },
          engagementTypes: { 'retweets': 40, 'likes': 35, 'replies': 25 }
        }
      },
      linkedin: {
        demographics: {
          ageGroups: { '25-34': 45, '35-44': 35, '45+': 20 },
          gender: { 'male': 52, 'female': 48 },
          locations: { 'US': 45, 'Europe': 35, 'Other': 20 }
        },
        behavior: {
          activeHours: { 8: 60, 9: 70, 10: 65, 11: 60, 12: 40, 13: 45, 14: 50, 15: 55, 16: 60, 17: 50 },
          activeDays: { 'Monday': 95, 'Tuesday': 100, 'Wednesday': 95, 'Thursday': 90, 'Friday': 70, 'Saturday': 10, 'Sunday': 15 },
          deviceUsage: { 'desktop': 60, 'mobile': 40 }
        },
        preferences: {
          contentTypes: { 'article': 40, 'image': 35, 'video': 25 },
          engagementTypes: { 'likes': 50, 'comments': 30, 'shares': 20 }
        }
      }
    };

    return platformDefaults[this.platform] || platformDefaults.instagram;
  }

  /**
   * Calculate optimal posting times based on patterns and audience insights
   */
  private calculateOptimalTimes(
    patterns: Record<string, TimeSlot[]>, 
    audienceInsights: AudienceInsights
  ): OptimalTimingAnalysis['bestTimes'] {
    const optimalTimes: OptimalTimingAnalysis['bestTimes'] = [];
    
    // Combine historical performance with audience behavior
    Object.entries(patterns).forEach(([day, timeSlots]) => {
      timeSlots.forEach(slot => {
        const audienceActivity = audienceInsights.behavior.activeHours[slot.hour] || 0;
        const dayActivity = audienceInsights.behavior.activeDays[day] || 0;
        
        // Calculate composite score
        const performanceScore = slot.averageEngagement > 0 ? slot.averageEngagement / 100 : 0;
        const audienceScore = (audienceActivity / 100) * (dayActivity / 100);
        const confidenceScore = Math.min(slot.postCount / 5, 1); // Higher confidence with more data points
        
        const compositeScore = (performanceScore * 0.4) + (audienceScore * 0.4) + (confidenceScore * 0.2);
        
        if (compositeScore > 0.3) { // Only include times with decent scores
          optimalTimes.push({
            hour: slot.hour,
            day,
            score: compositeScore,
            engagement: slot.averageEngagement,
            reach: slot.reach / Math.max(slot.postCount, 1),
            confidence: confidenceScore
          });
        }
      });
    });

    // Sort by score and return top times
    return optimalTimes
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }

  /**
   * Generate insights and recommendations
   */
  private generateTimingInsights(
    patterns: Record<string, TimeSlot[]>, 
    audienceInsights: AudienceInsights
  ): OptimalTimingAnalysis['insights'] {
    // Find peak engagement hour
    let peakEngagementHour = 12;
    let maxEngagement = 0;
    
    Object.values(patterns).flat().forEach(slot => {
      if (slot.averageEngagement > maxEngagement) {
        maxEngagement = slot.averageEngagement;
        peakEngagementHour = slot.hour;
      }
    });

    // Find best days
    const dayTotals: Record<string, number> = {};
    Object.entries(patterns).forEach(([day, slots]) => {
      dayTotals[day] = slots.reduce((sum, slot) => sum + slot.averageEngagement, 0);
    });
    
    const bestDays = Object.entries(dayTotals)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Find worst times (for avoidance)
    const worstTimes = Object.values(patterns)
      .flat()
      .filter(slot => slot.postCount > 0)
      .sort((a, b) => a.averageEngagement - b.averageEngagement)
      .slice(0, 5)
      .map(slot => `${slot.day} ${slot.hour}:00`);

    // Get audience active hours
    const audienceActiveHours = Object.entries(audienceInsights.behavior.activeHours)
      .filter(([, activity]) => activity > 40)
      .map(([hour]) => parseInt(hour))
      .sort((a, b) => a - b);

    // Generate recommendations
    const recommendations = [
      `Peak engagement occurs at ${peakEngagementHour}:00`,
      `Best days to post: ${bestDays.join(', ')}`,
      `Your audience is most active between ${Math.min(...audienceActiveHours)}:00 and ${Math.max(...audienceActiveHours)}:00`,
      `Avoid posting during: ${worstTimes.slice(0, 2).join(', ')}`,
      `${this.platform === 'linkedin' ? 'Business hours show highest engagement' : 'Evening hours typically perform better'}`
    ];

    return {
      peakEngagementHour,
      bestDays,
      worstTimes,
      audienceActiveHours,
      recommendations
    };
  }

  /**
   * Generate simulated data when real data is not available
   */
  private generateSimulatedData(): any[] {
    const posts = [];
    const now = new Date();
    
    // Generate 60 days of simulated posts
    for (let i = 0; i < 60; i++) {
      const postDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Simulate posting at different times with varying engagement
      const hour = 8 + Math.floor(Math.random() * 12); // Posts between 8 AM and 8 PM
      postDate.setHours(hour, Math.floor(Math.random() * 60));
      
      const baseEngagement = this.getBaseEngagementForTime(hour, postDate.getDay());
      
      posts.push({
        id: `sim_${i}`,
        publishedAt: postDate.toISOString(),
        likes: Math.floor(baseEngagement * (0.7 + Math.random() * 0.6)),
        comments: Math.floor(baseEngagement * 0.1 * (0.5 + Math.random())),
        shares: Math.floor(baseEngagement * 0.05 * (0.3 + Math.random())),
        reach: Math.floor(baseEngagement * 10 * (0.8 + Math.random() * 0.4)),
        impressions: Math.floor(baseEngagement * 15 * (0.9 + Math.random() * 0.2))
      });
    }
    
    return posts;
  }

  /**
   * Get base engagement for simulation based on time and platform
   */
  private getBaseEngagementForTime(hour: number, dayOfWeek: number): number {
    let baseEngagement = 100;
    
    // Platform-specific patterns
    if (this.platform === 'instagram') {
      // Instagram peaks in evening
      if (hour >= 18 && hour <= 21) baseEngagement *= 1.5;
      else if (hour >= 11 && hour <= 13) baseEngagement *= 1.3;
      else if (hour < 8 || hour > 22) baseEngagement *= 0.5;
    } else if (this.platform === 'linkedin') {
      // LinkedIn peaks during business hours
      if (hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5) baseEngagement *= 1.4;
      else if (dayOfWeek === 0 || dayOfWeek === 6) baseEngagement *= 0.3;
    } else if (this.platform === 'twitter') {
      // Twitter has multiple peaks
      if (hour >= 7 && hour <= 9) baseEngagement *= 1.3;
      else if (hour >= 12 && hour <= 13) baseEngagement *= 1.2;
      else if (hour >= 17 && hour <= 19) baseEngagement *= 1.4;
    }
    
    // Weekend adjustments
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      baseEngagement *= this.platform === 'linkedin' ? 0.3 : 0.8;
    }
    
    return Math.floor(baseEngagement * (0.7 + Math.random() * 0.6));
  }
}

/**
 * Get optimal timing analysis for a platform
 */
export async function getEnhancedOptimalTiming(
  platform: string, 
  profileKey?: string
): Promise<OptimalTimingAnalysis> {
  const engine = new OptimalTimingEngine(platform, profileKey);
  return engine.getOptimalTiming();
}

/**
 * Get quick optimal times recommendation
 */
export async function getQuickOptimalTimes(
  platform: string, 
  profileKey?: string
): Promise<string[]> {
  try {
    const analysis = await getEnhancedOptimalTiming(platform, profileKey);
    return analysis.bestTimes
      .slice(0, 5)
      .map(time => {
        const hour = time.hour === 0 ? 12 : time.hour > 12 ? time.hour - 12 : time.hour;
        const ampm = time.hour >= 12 ? 'PM' : 'AM';
        return `${time.day} ${hour}:00 ${ampm}`;
      });
  } catch (error) {
    console.error('Error getting quick optimal times:', error);
    // Return platform-specific defaults
    const defaults: Record<string, string[]> = {
      instagram: ['Tuesday 8:00 PM', 'Wednesday 7:00 PM', 'Thursday 8:00 PM', 'Friday 12:00 PM', 'Sunday 11:00 AM'],
      twitter: ['Wednesday 9:00 AM', 'Tuesday 12:00 PM', 'Thursday 6:00 PM', 'Monday 8:00 AM', 'Friday 5:00 PM'],
      linkedin: ['Tuesday 10:00 AM', 'Wednesday 9:00 AM', 'Thursday 11:00 AM', 'Tuesday 2:00 PM', 'Wednesday 3:00 PM'],
      facebook: ['Wednesday 3:00 PM', 'Thursday 1:00 PM', 'Friday 12:00 PM', 'Saturday 12:00 PM', 'Sunday 2:00 PM'],
      tiktok: ['Tuesday 6:00 AM', 'Thursday 7:00 AM', 'Friday 9:00 AM', 'Saturday 11:00 AM', 'Sunday 7:00 AM']
    };
    
    return defaults[platform] || defaults.instagram;
  }
}
