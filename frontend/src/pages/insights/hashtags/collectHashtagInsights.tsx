import { Brand, Post } from '../../../sharedDataModel';

export type HashtagInsights = {
  hashtag: string;
  noOfPosts: number;
  combinedReach: number;
  relativeReachQuality: number;
  avgEngagement: number;
};

export function collectHashtagInsights(brand: Brand) {
  const hashtagsAndTheirPosts: { [hashtag: string]: Post[] } = {};

  for (const post of brand?.posts || []) {
    if (!post?.content) continue;
    const hashtags = post.content.match(/#[a-zA-Z0-9]+/g) || [];

    for (const hashtag of hashtags) {
      if (!hashtagsAndTheirPosts[hashtag]) {
        hashtagsAndTheirPosts[hashtag] = [];
      }

      hashtagsAndTheirPosts[hashtag].push(post);
    }
  }

  const hashtagsAndCombinedReach: { [hashtag: string]: number } =
    Object.fromEntries(
      Object.entries(hashtagsAndTheirPosts).map(([hashtag, posts]) => [
        hashtag,
        posts.reduce(
          (acc, post) => acc + (post?.insights?.instagram?.reach || 0),
          0
        ),
      ])
    );

  // Hashtag quality is defined as: avg reach per post with that hashtag / avg reach per post without that hashtag
  const hashtagsAndTheirQuality: [hashtag: string, number][] = Object.entries(
    hashtagsAndCombinedReach
  ).map(([hashtag, combinedReach]) => {
    const avgReachWithHashtag =
      combinedReach / hashtagsAndTheirPosts[hashtag].length;
    const postsWithoutThatHashtag =
      brand?.posts?.filter((post) => !post?.content?.includes(hashtag)) || [];
    const combinedReachWithoutHashtag = postsWithoutThatHashtag.reduce(
      (acc, post) => acc + (post?.insights?.instagram?.reach || 0),
      0
    );
    const avgReachWithoutHashtag =
      combinedReachWithoutHashtag / postsWithoutThatHashtag.length;
    return [hashtag, avgReachWithHashtag / avgReachWithoutHashtag] as const;
  });

  const hashtagsAndTheirAvgEngagement: { [hashtag: string]: number } =
    Object.fromEntries(
      Object.entries(hashtagsAndTheirPosts).map(([hashtag, posts]) => [
        hashtag,
        (100 *
          posts.reduce(
            (acc, post) =>
              acc +
              (post?.insights?.instagram?.totalInteractions || 0) /
                (post?.insights?.instagram?.reach || 1),
            0
          )) /
          posts.length,
      ])
    );

  const rows: HashtagInsights[] = hashtagsAndTheirQuality.map(
    ([hashtag, quality]) => ({
      hashtag,
      noOfPosts: hashtagsAndTheirPosts[hashtag].length,
      combinedReach: hashtagsAndCombinedReach[hashtag],
      relativeReachQuality: quality,
      avgEngagement: hashtagsAndTheirAvgEngagement[hashtag],
    })
  );
  return rows;
}
