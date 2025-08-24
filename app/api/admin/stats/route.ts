import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Mock data for admin statistics
    // In a real implementation, you'd query your Jazz database or implement a Company schema
    // that tracks all users for admin purposes
    
    const totalUsers = 156;
    const activeSubscriptions = 23;
    const monthlyRevenue = 1247;
    const churnRate = 4.2;
    
    const subscriptionsByTier = {
      free: 133,
      premium: 18,
      business: 5,
      enterprise: 0
    };
    
    const recentActivity = [
      { user: 'john@example.com', action: 'Upgraded to premium', time: '2 hours ago' },
      { user: 'sarah@example.com', action: 'Account created', time: '3 hours ago' },
      { user: 'mike@example.com', action: 'Subscription canceled', time: '1 day ago' },
      { user: 'lisa@example.com', action: 'Upgraded to business', time: '1 day ago' },
      { user: 'tom@example.com', action: 'Account activity', time: '2 days ago' },
    ];
    
    const totalStorageUsed = 15847; // MB
    const monthlyPosts = 1247;

    return NextResponse.json({
      overview: {
        totalUsers,
        activeSubscriptions,
        monthlyRevenue,
        churnRate,
      },
      subscriptions: subscriptionsByTier,
      recentActivity,
      systemStats: {
        totalStorageUsed,
        monthlyPosts,
        apiCalls: 12459,
        uptime: '99.9%',
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
} 