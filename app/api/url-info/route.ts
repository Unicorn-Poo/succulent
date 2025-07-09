import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  // Use Twitter's oEmbed API for Twitter/X URLs
  if (url.includes('twitter.com') || url.includes('x.com')) {
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedResponse = await fetch(oembedUrl);
      
      if (!oembedResponse.ok) {
        throw new Error(`Failed to fetch from Twitter oEmbed API, status: ${oembedResponse.status}`);
      }
      
      const oembedData = await oembedResponse.json();
      
      const responseData = {
        author: oembedData.author_name || 'Unknown Author',
        authorUsername: oembedData.author_url.split('/').pop() || 'unknown',
        authorPostContent: oembedData.html, // Pass the raw HTML
        authorAvatar: '', // oEmbed doesn't provide a direct avatar URL
      };
      
      return NextResponse.json(responseData);
    } catch (error) {
      console.error('Error fetching from Twitter oEmbed API:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return NextResponse.json({ error: 'Failed to process Twitter URL', details: errorMessage }, { status: 500 });
    }
  }

  // Fallback for other platforms (simplified)
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch the URL, status: ${response.status}`);
    }

    const html = await response.text();
    
    // A very basic parser for generic pages
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/);
    const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);

    const responseData = {
      author: titleMatch ? titleMatch[1] : 'Unknown Author',
      authorUsername: 'unknown',
      authorPostContent: descriptionMatch ? descriptionMatch[1] : 'No description found.',
      authorAvatar: imageMatch ? imageMatch[1] : '',
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in generic URL processing:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process URL', details: errorMessage }, { status: 500 });
  }
}
