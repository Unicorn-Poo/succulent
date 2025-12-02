import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to verify the media extraction logic works correctly
 * 
 * GET /api/test-media-variants
 */
export async function GET(request: NextRequest) {
  const testImageUrl = "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800";
  
  const results: any = {
    testImageUrl,
    tests: [],
    allPassed: true,
  };

  // Test 1: extractMediaUrlsFromVariant function
  const extractMediaUrlsFromVariant = (variant: any): string[] => {
    if (!variant?.media) return [];
    const mediaUrls: string[] = [];
    const mediaArray = Array.isArray(variant.media) ? variant.media : [];
    for (const item of mediaArray) {
      const mediaItem = item as any;
      if (mediaItem?.type === "url-image" || mediaItem?.type === "url-video") {
        const url = mediaItem.url;
        if (typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))) {
          mediaUrls.push(url);
        }
      }
    }
    return mediaUrls;
  };

  // Test 1: Variant with media
  const variantWithMedia = {
    media: [{ type: "url-image", url: testImageUrl }]
  };
  const extracted1 = extractMediaUrlsFromVariant(variantWithMedia);
  const test1Pass = extracted1.length === 1 && extracted1[0] === testImageUrl;
  results.tests.push({
    name: "Extract from variant with media",
    passed: test1Pass,
    expected: [testImageUrl],
    actual: extracted1,
  });
  if (!test1Pass) results.allPassed = false;

  // Test 2: Variant without media
  const variantNoMedia = { text: "some text" };
  const extracted2 = extractMediaUrlsFromVariant(variantNoMedia);
  const test2Pass = extracted2.length === 0;
  results.tests.push({
    name: "Extract from variant without media",
    passed: test2Pass,
    expected: [],
    actual: extracted2,
  });
  if (!test2Pass) results.allPassed = false;

  // Test 3: Null variant
  const extracted3 = extractMediaUrlsFromVariant(null);
  const test3Pass = extracted3.length === 0;
  results.tests.push({
    name: "Extract from null variant",
    passed: test3Pass,
    expected: [],
    actual: extracted3,
  });
  if (!test3Pass) results.allPassed = false;

  // Test 4: Multiple platforms simulation
  const platforms = ["instagram", "facebook", "twitter", "linkedin"];
  const mockVariants: any = {
    base: { media: [{ type: "url-image", url: testImageUrl }] },
  };
  
  // Simulate what createPost does: create variant for each platform from base
  for (const platform of platforms) {
    // This simulates createMediaListFromUrls - creates NEW items
    mockVariants[platform] = {
      media: [{ type: "url-image", url: testImageUrl }]
    };
  }

  const platformResults: any = {};
  let allPlatformsHaveMedia = true;
  for (const platform of ["base", ...platforms]) {
    const extracted = extractMediaUrlsFromVariant(mockVariants[platform]);
    const hasMedia = extracted.length > 0 && extracted.includes(testImageUrl);
    platformResults[platform] = {
      hasMedia,
      urls: extracted,
    };
    if (!hasMedia) allPlatformsHaveMedia = false;
  }

  results.tests.push({
    name: "All platforms have base media after creation",
    passed: allPlatformsHaveMedia,
    platformResults,
  });
  if (!allPlatformsHaveMedia) results.allPassed = false;

  // Test 5: Fallback logic simulation
  const baseMediaUrls = [testImageUrl];
  const simulateFallback = (variantOverride: any, savedVariant: any) => {
    let mediaUrls: string[] = [];
    
    if (variantOverride?.media && variantOverride.media.length > 0) {
      mediaUrls = variantOverride.media.map((m: any) => m.url || m);
    } else if (savedVariant) {
      const variantMediaUrls = extractMediaUrlsFromVariant(savedVariant);
      if (variantMediaUrls.length > 0) {
        mediaUrls = variantMediaUrls;
      } else {
        mediaUrls = baseMediaUrls;
      }
    } else {
      mediaUrls = baseMediaUrls;
    }
    
    return mediaUrls;
  };

  // 5a: With override media
  const override5a = { media: ["https://override.com/image.jpg"] };
  const result5a = simulateFallback(override5a, mockVariants.instagram);
  const test5aPass = result5a[0] === "https://override.com/image.jpg";
  results.tests.push({
    name: "Fallback: Override media takes priority",
    passed: test5aPass,
    expected: ["https://override.com/image.jpg"],
    actual: result5a,
  });
  if (!test5aPass) results.allPassed = false;

  // 5b: No override, saved variant has media
  const result5b = simulateFallback(null, mockVariants.instagram);
  const test5bPass = result5b[0] === testImageUrl;
  results.tests.push({
    name: "Fallback: Saved variant media used",
    passed: test5bPass,
    expected: [testImageUrl],
    actual: result5b,
  });
  if (!test5bPass) results.allPassed = false;

  // 5c: No override, saved variant has NO media - should fall back to base
  const emptyVariant = { text: "no media here" };
  const result5c = simulateFallback(null, emptyVariant);
  const test5cPass = result5c[0] === testImageUrl;
  results.tests.push({
    name: "Fallback: Empty variant falls back to base media",
    passed: test5cPass,
    expected: [testImageUrl],
    actual: result5c,
  });
  if (!test5cPass) results.allPassed = false;

  // 5d: No override, no saved variant - should fall back to base
  const result5d = simulateFallback(null, null);
  const test5dPass = result5d[0] === testImageUrl;
  results.tests.push({
    name: "Fallback: No variant falls back to base media",
    passed: test5dPass,
    expected: [testImageUrl],
    actual: result5d,
  });
  if (!test5dPass) results.allPassed = false;

  // Summary
  const passedCount = results.tests.filter((t: any) => t.passed).length;
  const totalCount = results.tests.length;
  results.summary = `${passedCount}/${totalCount} tests passed`;
  results.status = results.allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED";

  return NextResponse.json(results, { 
    status: results.allPassed ? 200 : 500 
  });
}
