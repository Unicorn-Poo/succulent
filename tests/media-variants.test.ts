/**
 * Unit tests for base media being applied to all platform variants
 * 
 * Run with: pnpm test tests/media-variants.test.ts
 */

// Mock the extractMediaUrlsFromVariant function (same logic as in posts/route.ts)
function extractMediaUrlsFromVariant(variant: any): string[] {
  if (!variant?.media) return [];

  const mediaUrls: string[] = [];
  const mediaArray = Array.isArray(variant.media) ? variant.media : Array.from(variant.media || []);

  for (const item of mediaArray) {
    const mediaItem = item as any;
    if (mediaItem?.type === "url-image" || mediaItem?.type === "url-video") {
      const url = mediaItem.url;
      if (
        typeof url === "string" &&
        (url.startsWith("http://") || url.startsWith("https://"))
      ) {
        mediaUrls.push(url);
      }
    }
  }

  return mediaUrls;
}

// Mock the media fallback logic (same as in preparePublishRequests)
function resolveMediaForPlatform(
  variantOverride: any,
  savedVariant: any,
  baseMediaUrls: string[]
): string[] {
  let mediaUrls: string[] = [];

  if (variantOverride?.media && variantOverride.media.length > 0) {
    // Variant override explicitly specifies media - use ONLY that
    mediaUrls = variantOverride.media
      .map((m: any) => (typeof m === "string" ? m : m?.url))
      .filter(
        (url: any): url is string =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      );
  } else if (savedVariant) {
    // Extract from saved variant
    const variantMediaUrls = extractMediaUrlsFromVariant(savedVariant);
    if (variantMediaUrls.length > 0) {
      mediaUrls = variantMediaUrls;
    } else {
      // No variant media found, fall back to base
      mediaUrls = baseMediaUrls;
    }
  } else {
    // No variant at all, use base media
    mediaUrls = baseMediaUrls;
  }

  return mediaUrls;
}

// Simulate createMediaListFromUrls (creates new media items)
function createMediaItems(urls: string[]): Array<{ type: string; url: string }> {
  return urls.map(url => ({
    type: "url-image",
    url: url,
  }));
}

// Simulate post creation - creates variants for all platforms
function simulatePostCreation(
  content: string,
  platforms: string[],
  baseMediaUrls: string[],
  variantOverrides?: Record<string, { content?: string; media?: string[] }>
) {
  const variants: Record<string, any> = {};

  // Create base variant
  variants.base = {
    text: content,
    media: createMediaItems(baseMediaUrls),
  };

  // Create platform variants
  for (const platform of platforms) {
    const override = variantOverrides?.[platform];

    if (override?.media && override.media.length > 0) {
      // Use override media
      variants[platform] = {
        text: override.content || content,
        media: createMediaItems(override.media),
      };
    } else {
      // Create NEW media items from base URLs (not references!)
      variants[platform] = {
        text: override?.content || content,
        media: createMediaItems(baseMediaUrls),
      };
    }
  }

  return { variants };
}

describe('Media Variants', () => {
  const TEST_BASE_IMAGE = 'https://example.com/base-image.jpg';
  const TEST_OVERRIDE_IMAGE = 'https://example.com/override-image.jpg';
  const PLATFORMS = ['instagram', 'facebook', 'twitter', 'linkedin'];

  describe('extractMediaUrlsFromVariant', () => {
    it('extracts URLs from variant with url-image media', () => {
      const variant = {
        media: [{ type: 'url-image', url: TEST_BASE_IMAGE }]
      };
      expect(extractMediaUrlsFromVariant(variant)).toEqual([TEST_BASE_IMAGE]);
    });

    it('extracts URLs from variant with url-video media', () => {
      const variant = {
        media: [{ type: 'url-video', url: 'https://example.com/video.mp4' }]
      };
      expect(extractMediaUrlsFromVariant(variant)).toEqual(['https://example.com/video.mp4']);
    });

    it('returns empty array for variant without media', () => {
      const variant = { text: 'some text' };
      expect(extractMediaUrlsFromVariant(variant)).toEqual([]);
    });

    it('returns empty array for null variant', () => {
      expect(extractMediaUrlsFromVariant(null)).toEqual([]);
    });

    it('returns empty array for undefined variant', () => {
      expect(extractMediaUrlsFromVariant(undefined)).toEqual([]);
    });

    it('filters out invalid URLs', () => {
      const variant = {
        media: [
          { type: 'url-image', url: TEST_BASE_IMAGE },
          { type: 'url-image', url: 'not-a-url' },
          { type: 'url-image', url: '' },
          { type: 'url-image', url: null },
        ]
      };
      expect(extractMediaUrlsFromVariant(variant)).toEqual([TEST_BASE_IMAGE]);
    });

    it('extracts multiple URLs', () => {
      const variant = {
        media: [
          { type: 'url-image', url: 'https://example.com/1.jpg' },
          { type: 'url-image', url: 'https://example.com/2.jpg' },
          { type: 'url-image', url: 'https://example.com/3.jpg' },
        ]
      };
      expect(extractMediaUrlsFromVariant(variant)).toEqual([
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ]);
    });
  });

  describe('resolveMediaForPlatform (fallback logic)', () => {
    const baseMediaUrls = [TEST_BASE_IMAGE];

    it('uses override media when provided', () => {
      const override = { media: [TEST_OVERRIDE_IMAGE] };
      const savedVariant = { media: [{ type: 'url-image', url: TEST_BASE_IMAGE }] };
      
      expect(resolveMediaForPlatform(override, savedVariant, baseMediaUrls))
        .toEqual([TEST_OVERRIDE_IMAGE]);
    });

    it('uses saved variant media when no override', () => {
      const savedVariant = { media: [{ type: 'url-image', url: TEST_BASE_IMAGE }] };
      
      expect(resolveMediaForPlatform(null, savedVariant, baseMediaUrls))
        .toEqual([TEST_BASE_IMAGE]);
    });

    it('falls back to base when saved variant has no media', () => {
      const savedVariant = { text: 'no media here' };
      
      expect(resolveMediaForPlatform(null, savedVariant, baseMediaUrls))
        .toEqual([TEST_BASE_IMAGE]);
    });

    it('falls back to base when no variant at all', () => {
      expect(resolveMediaForPlatform(null, null, baseMediaUrls))
        .toEqual([TEST_BASE_IMAGE]);
    });

    it('handles override with media objects (not just strings)', () => {
      const override = { 
        media: [
          { url: TEST_OVERRIDE_IMAGE },
          TEST_OVERRIDE_IMAGE + '2'  // string URL
        ] 
      };
      
      expect(resolveMediaForPlatform(override, null, baseMediaUrls))
        .toEqual([TEST_OVERRIDE_IMAGE, TEST_OVERRIDE_IMAGE + '2']);
    });
  });

  describe('Post Creation (simulatePostCreation)', () => {
    it('creates base variant with media', () => {
      const post = simulatePostCreation('Test content', PLATFORMS, [TEST_BASE_IMAGE]);
      
      expect(post.variants.base.media).toHaveLength(1);
      expect(post.variants.base.media[0].url).toBe(TEST_BASE_IMAGE);
    });

    it('creates variants for ALL platforms with base media', () => {
      const post = simulatePostCreation('Test content', PLATFORMS, [TEST_BASE_IMAGE]);
      
      for (const platform of PLATFORMS) {
        expect(post.variants[platform]).toBeDefined();
        expect(post.variants[platform].media).toHaveLength(1);
        expect(post.variants[platform].media[0].url).toBe(TEST_BASE_IMAGE);
      }
    });

    it('each platform variant has its OWN media items (not references)', () => {
      const post = simulatePostCreation('Test content', PLATFORMS, [TEST_BASE_IMAGE]);
      
      // Verify each variant has different media array objects
      const mediaArrays = PLATFORMS.map(p => post.variants[p].media);
      for (let i = 0; i < mediaArrays.length; i++) {
        for (let j = i + 1; j < mediaArrays.length; j++) {
          expect(mediaArrays[i]).not.toBe(mediaArrays[j]); // Different array references
        }
      }
    });

    it('uses override media for specific platform', () => {
      const post = simulatePostCreation(
        'Test content',
        PLATFORMS,
        [TEST_BASE_IMAGE],
        { instagram: { media: [TEST_OVERRIDE_IMAGE] } }
      );
      
      // Instagram should have override
      expect(post.variants.instagram.media[0].url).toBe(TEST_OVERRIDE_IMAGE);
      
      // Other platforms should have base
      expect(post.variants.facebook.media[0].url).toBe(TEST_BASE_IMAGE);
      expect(post.variants.twitter.media[0].url).toBe(TEST_BASE_IMAGE);
      expect(post.variants.linkedin.media[0].url).toBe(TEST_BASE_IMAGE);
    });

    it('platforms without override get base media even when other platforms have overrides', () => {
      const post = simulatePostCreation(
        'Test content',
        PLATFORMS,
        [TEST_BASE_IMAGE],
        { 
          instagram: { media: [TEST_OVERRIDE_IMAGE] },
          facebook: { content: 'Custom content but no media override' }
        }
      );
      
      // Instagram has override media
      expect(post.variants.instagram.media[0].url).toBe(TEST_OVERRIDE_IMAGE);
      
      // Facebook has custom content but should still get base media
      expect(post.variants.facebook.text).toBe('Custom content but no media override');
      expect(post.variants.facebook.media[0].url).toBe(TEST_BASE_IMAGE);
      
      // Twitter and LinkedIn get base everything
      expect(post.variants.twitter.media[0].url).toBe(TEST_BASE_IMAGE);
      expect(post.variants.linkedin.media[0].url).toBe(TEST_BASE_IMAGE);
    });

    it('handles multiple base images', () => {
      const baseImages = [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
      ];
      const post = simulatePostCreation('Test content', PLATFORMS, baseImages);
      
      for (const platform of PLATFORMS) {
        expect(post.variants[platform].media).toHaveLength(3);
        expect(post.variants[platform].media.map((m: any) => m.url)).toEqual(baseImages);
      }
    });
  });

  describe('End-to-End: Create then Publish', () => {
    it('base media is available when publishing after creation', () => {
      // Step 1: Create post
      const post = simulatePostCreation('Test content', PLATFORMS, [TEST_BASE_IMAGE]);
      
      // Step 2: Simulate publish - resolve media for each platform
      for (const platform of PLATFORMS) {
        const mediaUrls = resolveMediaForPlatform(
          null, // no override during publish
          post.variants[platform],
          [TEST_BASE_IMAGE]
        );
        
        expect(mediaUrls).toEqual([TEST_BASE_IMAGE]);
      }
    });

    it('override during publish replaces saved media', () => {
      // Step 1: Create post with base media
      const post = simulatePostCreation('Test content', PLATFORMS, [TEST_BASE_IMAGE]);
      
      // Step 2: Publish with override for instagram
      const instagramOverride = { media: [TEST_OVERRIDE_IMAGE] };
      const instagramMedia = resolveMediaForPlatform(
        instagramOverride,
        post.variants.instagram,
        [TEST_BASE_IMAGE]
      );
      
      expect(instagramMedia).toEqual([TEST_OVERRIDE_IMAGE]);
      
      // Other platforms still use saved media
      const facebookMedia = resolveMediaForPlatform(
        null,
        post.variants.facebook,
        [TEST_BASE_IMAGE]
      );
      expect(facebookMedia).toEqual([TEST_BASE_IMAGE]);
    });
  });
});

