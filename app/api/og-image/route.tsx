import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Templates for different content types
type TemplateType = 'quote' | 'tip' | 'stat' | 'announcement';

interface TemplateProps {
  text: string;
  headline?: string;
  subtext?: string;
  brandName?: string;
  brandColor?: string;
  platform?: string;
}

// Quote Card Template
function QuoteTemplate({ text, brandName, brandColor = '#84cc16' }: TemplateProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        padding: '60px',
      }}
    >
      {/* Decorative quote mark */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '40px',
          fontSize: '180px',
          color: brandColor,
          opacity: 0.2,
          fontFamily: 'Georgia',
        }}
      >
        "
      </div>
      
      {/* Main text */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '900px',
        }}
      >
        <p
          style={{
            fontSize: text.length > 200 ? '36px' : text.length > 100 ? '48px' : '56px',
            color: 'white',
            lineHeight: 1.4,
            margin: 0,
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      </div>
      
      {/* Brand name at bottom */}
      {brandName && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: brandColor,
              borderRadius: '2px',
            }}
          />
          <span style={{ color: '#9ca3af', fontSize: '24px' }}>{brandName}</span>
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: brandColor,
              borderRadius: '2px',
            }}
          />
        </div>
      )}
    </div>
  );
}

// Tip Card Template
function TipTemplate({ text, headline, brandName, brandColor = '#84cc16' }: TemplateProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#111827',
        padding: '60px',
      }}
    >
      {/* Top bar with brand color */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '8px',
          backgroundColor: brandColor,
        }}
      />
      
      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <span style={{ fontSize: '48px' }}>💡</span>
        <span style={{ color: brandColor, fontSize: '24px', fontWeight: 600 }}>
          {headline || 'Pro Tip'}
        </span>
      </div>
      
      {/* Main text */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
        }}
      >
        <p
          style={{
            fontSize: text.length > 150 ? '40px' : '48px',
            color: 'white',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
      
      {/* Brand at bottom */}
      {brandName && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ color: '#6b7280', fontSize: '20px' }}>@{brandName}</span>
        </div>
      )}
    </div>
  );
}

// Stat Card Template
function StatTemplate({ text, headline, subtext, brandColor = '#84cc16' }: TemplateProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111827',
        padding: '60px',
      }}
    >
      {/* Big stat number/text */}
      <div
        style={{
          fontSize: '140px',
          fontWeight: 700,
          color: brandColor,
          lineHeight: 1,
          marginBottom: '24px',
        }}
      >
        {headline || text}
      </div>
      
      {/* Context text */}
      <p
        style={{
          fontSize: '36px',
          color: 'white',
          textAlign: 'center',
          margin: 0,
          maxWidth: '800px',
        }}
      >
        {subtext || text}
      </p>
    </div>
  );
}

// Announcement Card Template
function AnnouncementTemplate({ text, headline, brandName, brandColor = '#84cc16' }: TemplateProps) {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${brandColor}20 0%, #111827 50%, ${brandColor}10 100%)`,
        padding: '60px',
      }}
    >
      {/* Badge */}
      <div
        style={{
          display: 'flex',
          padding: '12px 24px',
          backgroundColor: brandColor,
          borderRadius: '9999px',
          marginBottom: '32px',
        }}
      >
        <span style={{ color: 'white', fontSize: '20px', fontWeight: 600 }}>
          {headline || '📣 Announcement'}
        </span>
      </div>
      
      {/* Main text */}
      <p
        style={{
          fontSize: text.length > 100 ? '44px' : '56px',
          color: 'white',
          textAlign: 'center',
          lineHeight: 1.3,
          margin: 0,
          maxWidth: '900px',
          fontWeight: 500,
        }}
      >
        {text}
      </p>
      
      {/* Brand */}
      {brandName && (
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '28px' }}>🌱</span>
          <span style={{ color: '#9ca3af', fontSize: '24px' }}>{brandName}</span>
        </div>
      )}
    </div>
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const text = searchParams.get('text') || 'Your content here';
  const template = (searchParams.get('template') || 'quote') as TemplateType;
  const headline = searchParams.get('headline') || undefined;
  const subtext = searchParams.get('subtext') || undefined;
  const brandName = searchParams.get('brand') || undefined;
  const brandColor = searchParams.get('color') || '#84cc16';
  const platform = searchParams.get('platform') || 'instagram';
  
  // Platform-specific dimensions
  const dimensions: Record<string, { width: number; height: number }> = {
    instagram: { width: 1080, height: 1080 },
    facebook: { width: 1200, height: 630 },
    twitter: { width: 1200, height: 675 },
    x: { width: 1200, height: 675 },
    linkedin: { width: 1200, height: 627 },
    pinterest: { width: 1000, height: 1500 },
  };
  
  const { width, height } = dimensions[platform.toLowerCase()] || dimensions.instagram;
  
  const props: TemplateProps = {
    text,
    headline,
    subtext,
    brandName,
    brandColor,
    platform,
  };
  
  let content;
  switch (template) {
    case 'tip':
      content = <TipTemplate {...props} />;
      break;
    case 'stat':
      content = <StatTemplate {...props} />;
      break;
    case 'announcement':
      content = <AnnouncementTemplate {...props} />;
      break;
    case 'quote':
    default:
      content = <QuoteTemplate {...props} />;
  }

  return new ImageResponse(content, {
    width,
    height,
  });
}

