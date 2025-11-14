import { findExistingPost } from "@/utils/postListHelpers";

describe("findExistingPost", () => {
  it("returns undefined when posts array is missing or targetId is falsy", () => {
    expect(findExistingPost(undefined, "123")).toBeUndefined();
    expect(
      findExistingPost(
        [{ id: "123" }, { id: "456" }] as Array<{ id: string } | null>,
        undefined
      )
    ).toBeUndefined();
  });

  it("ignores null/undefined/primitive entries when searching", () => {
    const posts = [
      null,
      undefined,
      "not-a-post",
      { id: "keep-me", extra: true },
    ] as Array<any>;

    expect(findExistingPost(posts, "keep-me")).toEqual({
      id: "keep-me",
      extra: true,
    });
  });

  it("does not match entries without a valid id property", () => {
    const posts = [{ id: null }, { id: 123 }, { other: "value" }] as any[];

    expect(findExistingPost(posts, "123")).toBeUndefined();
  });
});
