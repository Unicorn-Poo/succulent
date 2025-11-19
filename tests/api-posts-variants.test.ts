import { describe, expect, it, beforeEach } from "@jest/globals";

jest.mock("@/app/schema", () => ({
  PlatformNames: ["base", "instagram", "reddit", "pinterest", "x", "bluesky"],
}));

import {
  preparePublishRequests,
  normalizeRequestOptionAliases,
  getPlatformOptionsKey,
} from "@/app/api/posts/route";

const baseText = (value: string) => ({
  toString: () => value,
});

describe("normalizeRequestOptionAliases", () => {
  it("moves reddit alias into redditOptions", () => {
    const request: any = {
      reddit: { title: "alias", subreddit: "foo" },
      variants: {
        instagram: {
          reddit: { title: "variant alias" },
        },
      },
    };

    normalizeRequestOptionAliases(request);

    expect(request.redditOptions).toEqual({ title: "alias", subreddit: "foo" });
    expect(request.reddit).toBeUndefined();
    expect(request.variants.instagram.redditOptions).toEqual({
      title: "variant alias",
    });
    expect(request.variants.instagram.reddit).toBeUndefined();
  });
});

describe("preparePublishRequests", () => {
  beforeEach(() => {
    process.env.PINTEREST_BOARD_ID = "lunaryapp/lunary"; // force boardName fallback
    process.env.PINTEREST_BOARD_NAME = "Lunary";
  });

  const makePostObject = () => ({
    variants: {
      base: {
        text: baseText("Base text from post"),
        media: [
          {
            type: "url-image",
            url: "https://base.example/image.jpg",
          },
        ],
        platformOptions: JSON.stringify({
          redditOptions: { title: "Saved base title", subreddit: "saved" },
        }),
      },
      instagram: {
        text: baseText("Saved IG text"),
        media: [
          {
            type: "url-image",
            url: "https://legacy.example/old.jpg",
          },
        ],
      },
    },
  });

  const baseRequest = {
    accountGroupId: "group",
    content: "Base content",
    platforms: ["reddit", "pinterest"],
    media: [
      {
        type: "image" as const,
        url: "https://base.example/image.jpg",
      },
    ],
    title: "Base Title",
    redditOptions: { title: "Base Title", subreddit: "base" },
    pinterestOptions: { boardName: "BaseBoard" },
    variants: {
      instagram: {
        content: "IG override",
        media: [
          "https://cdn.example/ig1.jpg",
          "https://cdn.example/ig2.jpg",
        ],
      },
      reddit: {
        redditOptions: { title: "Variant Title", subreddit: "variants" },
      },
    },
  } as any;

  it("includes variant-only platforms and uses variant media", async () => {
    const publishRequests = await preparePublishRequests(
      { ...baseRequest },
      makePostObject(),
      "profile-key"
    );

    const instagramRequest = publishRequests.find((req) =>
      req.platforms.includes("instagram")
    );
    expect(instagramRequest).toBeDefined();
    expect(instagramRequest?.postData.mediaUrls).toEqual([
      "https://cdn.example/ig1.jpg",
      "https://cdn.example/ig2.jpg",
    ]);
  });

  it("gives priority to variant overrides for platform options", async () => {
    const publishRequests = await preparePublishRequests(
      { ...baseRequest },
      makePostObject(),
      "profile-key"
    );

    const redditRequest = publishRequests.find((req) =>
      req.platforms.includes("reddit")
    );
    expect(redditRequest?.postData.redditOptions).toEqual({
      title: "Variant Title",
      subreddit: "variants",
    });

    const envFallbackRequest = {
      ...baseRequest,
      pinterestOptions: undefined,
    };
    const envResults = await preparePublishRequests(
      envFallbackRequest,
      makePostObject(),
      "profile-key"
    );
    const pinterestRequest = envResults.find((req) =>
      req.platforms.includes("pinterest")
    );
    expect(pinterestRequest?.postData.pinterestOptions).toEqual({
      boardName: "lunaryapp/lunary",
    });
  });

  it("routes Lunary OG media through the convert-media-url proxy", async () => {
    const lunaryUrl = "https://lunary.app/api/og/cosmic/2025-11-19";
    const proxiedUrl = `https://api.test.com/api/convert-media-url?url=${encodeURIComponent(
      lunaryUrl
    )}`;

    const publishRequests = await preparePublishRequests(
      {
        ...baseRequest,
        platforms: ["instagram"],
        variants: {
          instagram: {
            media: [
              lunaryUrl,
              "https://lunary.app/api/og/crystal?date=2025-11-19",
            ],
          },
        },
      },
      makePostObject(),
      "profile-key"
    );

    const instagramRequest = publishRequests.find((req) =>
      req.platforms.includes("instagram")
    );

    expect(instagramRequest?.postData.mediaUrls).toEqual([
      proxiedUrl,
      "https://api.test.com/api/convert-media-url?url=https%3A%2F%2Flunary.app%2Fapi%2Fog%2Fcrystal%3Fdate%3D2025-11-19",
    ]);
  });

  it("limits Bluesky media attachments to four items", async () => {
    const publishRequests = await preparePublishRequests(
      {
        ...baseRequest,
        platforms: ["bluesky"],
        variants: {
          bluesky: {
            media: [
              "https://example.com/a.png",
              "https://example.com/b.png",
              "https://example.com/c.png",
              "https://example.com/d.png",
              "https://example.com/e.png",
            ],
          },
        },
      },
      makePostObject(),
      "profile-key"
    );

    const blueskyRequest = publishRequests.find((req) =>
      req.platforms.includes("bluesky")
    );

    expect(blueskyRequest?.postData.mediaUrls).toHaveLength(4);
    expect(blueskyRequest?.postData.mediaUrls).toEqual([
      "https://example.com/a.png",
      "https://example.com/b.png",
      "https://example.com/c.png",
      "https://example.com/d.png",
    ]);
  });

  it("uses ONLY variant media when variant override specifies media (no base media)", async () => {
    const publishRequests = await preparePublishRequests(
      {
        ...baseRequest,
        platforms: ["x"],
        imageUrls: [
          "https://base.example/base1.jpg",
          "https://base.example/base2.jpg",
          "https://base.example/base3.jpg",
        ],
        variants: {
          x: {
            content: "X variant content",
            media: [
              "https://x.example/x1.jpg",
              "https://x.example/x2.jpg",
              "https://x.example/x3.jpg",
            ],
          },
        },
      },
      makePostObject(),
      "profile-key"
    );

    const xRequest = publishRequests.find((req) =>
      req.platforms.includes("x")
    );

    expect(xRequest).toBeDefined();
    // Should use ONLY variant media, not base media
    expect(xRequest?.postData.mediaUrls).toEqual([
      "https://x.example/x1.jpg",
      "https://x.example/x2.jpg",
      "https://x.example/x3.jpg",
    ]);
    expect(xRequest?.postData.mediaUrls).not.toContain(
      "https://base.example/base1.jpg"
    );
    // Should use ONLY variant content, not base content
    expect(xRequest?.postData.post).toBe("X variant content");
    expect(xRequest?.postData.post).not.toBe("Base content");
  });

  it("limits X/Twitter media attachments to four items", async () => {
    const publishRequests = await preparePublishRequests(
      {
        ...baseRequest,
        platforms: ["x"],
        variants: {
          x: {
            media: [
              "https://example.com/a.png",
              "https://example.com/b.png",
              "https://example.com/c.png",
              "https://example.com/d.png",
              "https://example.com/e.png",
              "https://example.com/f.png",
              "https://example.com/g.png",
              "https://example.com/h.png",
              "https://example.com/i.png",
            ],
          },
        },
      },
      makePostObject(),
      "profile-key"
    );

    const xRequest = publishRequests.find((req) =>
      req.platforms.includes("x")
    );

    expect(xRequest?.postData.mediaUrls).toHaveLength(4);
    expect(xRequest?.postData.mediaUrls).toEqual([
      "https://example.com/a.png",
      "https://example.com/b.png",
      "https://example.com/c.png",
      "https://example.com/d.png",
    ]);
  });
});

describe("getPlatformOptionsKey", () => {
  it("handles known and fallback platforms", () => {
    expect(getPlatformOptionsKey("x")).toBe("twitterOptions");
    expect(getPlatformOptionsKey("reddit")).toBe("redditOptions");
    expect(getPlatformOptionsKey("myspace")).toBe("myspaceOptions");
  });
});
