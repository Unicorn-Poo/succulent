import { NextRequest, NextResponse } from 'next/server';

const AYRSHARE_API_URL = 'https://app.ayrshare.com/api';
const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileKey = searchParams.get('profileKey');

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

    if (profileKey && profileKey !== 'undefined') {
      headers['Profile-Key'] = profileKey;
    }

    console.log('🔗 Fetching Ayrshare user info:', { profileKey });

    const response = await fetch(`${AYRSHARE_API_URL}/user`, {
      method: 'GET',
      headers
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch user info from Ayrshare',
          details: result.message || 'Unknown error'
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching Ayrshare user info:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 