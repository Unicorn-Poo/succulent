export type PostLike = {
  id?: string | null;
  [key: string]: unknown;
} | null;

/**
 * Finds an existing post in a list while tolerating null/undefined/primitive entries.
 * Mirrors the safety checks we use before pushing into accountGroup.posts.
 */
export function findExistingPost<T extends PostLike>(
  posts: T[] | undefined,
  targetId: string | undefined
): T | undefined {
  if (!Array.isArray(posts) || !targetId) {
    return undefined;
  }

  return posts.find(
    (post): post is T =>
      !!post &&
      typeof post === "object" &&
      "id" in post &&
      typeof post.id === "string" &&
      post.id === targetId
  );
}
