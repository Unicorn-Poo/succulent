import { NextRequest, NextResponse } from 'next/server';

const AYRSHARE_API_URL = 'https://api.ayrshare.com/api';
const AYRSHARE_API_KEY = process.env.NEXT_PUBLIC_AYRSHARE_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileKey = searchParams.get('profileKey');
    let refId = searchParams.get('refId');
    const title = searchParams.get('title');
    const hasActive = searchParams.get('hasActiveSocialAccounts');

    if (!AYRSHARE_API_KEY) {
      return NextResponse.json(
        { error: 'Ayrshare API key not configured' },
        { status: 500 }
      );
    }

    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AYRSHARE_API_KEY}`
    };

    // If we only have a profileKey, translate it to refId via /user, then use /profiles
    if (!refId && profileKey) {
      try {
        const userHeaders: Record<string, string> = {
          ...baseHeaders,
          'Profile-Key': profileKey
        };
        const userRes = await fetch(`${AYRSHARE_API_URL}/user`, {
          method: 'GET',
          headers: userHeaders
        });
        const userJson: any = await userRes.json();
        if (userRes.ok && userJson?.refId) {
          refId = userJson.refId;
        }
      } catch {}
    }

    // Prefer /profiles per docs; filter by refId or title when available
    const profilesUrl = new URL(`${AYRSHARE_API_URL}/profiles`);
    if (refId) profilesUrl.searchParams.set('refId', refId);
    if (!refId && title) profilesUrl.searchParams.set('title', title);
    if (hasActive) profilesUrl.searchParams.set('hasActiveSocialAccounts', hasActive);

    const profilesRes = await fetch(profilesUrl.toString(), {
      method: 'GET',
      headers: baseHeaders
    });

    const profilesJson: any = await profilesRes.json();
    if (!profilesRes.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch profiles from Ayrshare',
          details: profilesJson?.message || 'Unknown error'
        },
        { status: profilesRes.status }
      );
    }

    return NextResponse.json({ success: true, data: profilesJson });

  } catch (error) {
    console.error('❌ Error in Ayrshare profiles proxy:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 