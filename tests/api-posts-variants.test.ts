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
});

describe("getPlatformOptionsKey", () => {
  it("handles known and fallback platforms", () => {
    expect(getPlatformOptionsKey("x")).toBe("twitterOptions");
    expect(getPlatformOptionsKey("reddit")).toBe("redditOptions");
    expect(getPlatformOptionsKey("myspace")).toBe("myspaceOptions");
  });
});
