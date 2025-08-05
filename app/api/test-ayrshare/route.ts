import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileKey = searchParams.get('profileKey');
    
    const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;
    const AYRSHARE_API_URL = "https://api.ayrshare.com/api";

    if (!AYRSHARE_API_KEY) {
      return NextResponse.json(
        { error: 'AYRSHARE_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('🧪 Testing Ayrshare API connection...');

    // Test 1: Check user info
    const userHeaders: Record<string, string> = {
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    if (profileKey) {
      userHeaders['Profile-Key'] = profileKey;
    }

    const userResponse = await fetch(`${AYRSHARE_API_URL}/user`, {
      method: 'GET',
      headers: userHeaders,
    });

    const userResult = await userResponse.json();
    
    console.log('👤 User API response:', {
      status: userResponse.status,
      ok: userResponse.ok,
      data: userResult
    });

    // Test 2: Try simple history call
    const historyHeaders = { ...userHeaders };
    const historyResponse = await fetch(`${AYRSHARE_API_URL}/history?limit=5`, {
      method: 'GET',
      headers: historyHeaders,
    });

    const historyResult = await historyResponse.json();
    
    console.log('📜 History API response:', {
      status: historyResponse.status,
      ok: historyResponse.ok,
      data: historyResult
    });

    return NextResponse.json({
      success: true,
      apiKey: AYRSHARE_API_KEY ? `${AYRSHARE_API_KEY.substring(0, 8)}...` : 'missing',
      profileKey: profileKey ? `${profileKey.substring(0, 8)}...` : 'none',
      tests: {
        user: {
          status: userResponse.status,
          ok: userResponse.ok,
          data: userResult
        },
        history: {
          status: historyResponse.status,
          ok: historyResponse.ok,
          data: historyResult
        }
      }
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    return NextResponse.json(
      {
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 