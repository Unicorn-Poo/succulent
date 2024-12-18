import {
  Brand,
  Post,
  ListOfImages,
  Image,
  InstagramPosted,
} from '@/sharedDataModel';
import { createImage } from 'jazz-browser-media-images';

export async function importPostsHelper(
  brand: Brand,
  setImportProgress: (
    progress: { total: number; done: number } | undefined
  ) => void
) {
  const dataFromPages: ({
    caption: string;
    id: string;
    permalink: string;
    timestamp: string;
  } & (
    | { media_type: 'IMAGE'; media_url: string }
    | {
        media_type: 'CAROUSEL_ALBUM';
        children: { data: { media_url: string }[] };
      }
  ))[] = [];

  let paginatingDone = false;
  let url =
    `https://graph.facebook.com/v11.0/${brand?.instagramPage?.id}/media?fields=caption,media_type,media_url,children{media_url},permalink,timestamp&access_token=` +
    brand?.metaAPIConnection?.longLivedToken;

  while (!paginatingDone) {
    const dataFromPage = await fetch(url).then((response) => response.json());

    console.log('dataFromPage', dataFromPage);

    dataFromPages.push(...dataFromPage.data);

    if (dataFromPage?.paging.next) {
      url = dataFromPage.paging.next;
    } else {
      paginatingDone = true;
    }
  }

  let done = 0;

  for (const post of dataFromPages) {
    let imageUrls: string[] = [];
    if (post.media_type === 'IMAGE') {
      imageUrls = [post.media_url];
    } else if (post.media_type === 'CAROUSEL_ALBUM') {
      imageUrls = post.children.data.map(
        (child: { media_url: string }) => child.media_url
      );
    } else {
      console.log(
        'Unknown media type, skipping',
        (post as { media_type: string }).media_type
      );
    }

    console.log(imageUrls);

    if (imageUrls.length > 0) {
      const existingPosts =
        brand?.posts?.filter(
          (p) =>
            p?.instagram?.state === 'posted' && p?.instagram?.postId === post.id
        ) || [];

      console.log('existingPosts', post.id, existingPosts);

      if (existingPosts?.length > 1) {
        console.warn(
          'Multiple posts with same ID, deduplicating',
          existingPosts
        );

        for (const existingPost of existingPosts.slice(1)) {
          console.log('Deleting', existingPost?.id);
          const idx = brand.posts?.findIndex((p) => p?.id === existingPost?.id);
          typeof idx === 'number' && idx !== -1 && brand.posts?.splice(idx, 1);
        }

        existingPosts[0]!.instagram = {
          state: 'posted',
          postId: post.id,
          postedAt: post.timestamp,
          permalink: post.permalink,
        };
      }

      if (existingPosts.length === 0) {
        const brandGroup = brand._owner;
        const images = ListOfImages.create(
          await Promise.all(
            imageUrls.map(async (url) =>
              Image.create(
                {
                  imageFile: await createImage(
                    await fetch(url).then((response) => response.blob()),
                    { owner: brandGroup }
                  ),
                },
                { owner: brandGroup }
              )
            )
          ),
          { owner: brandGroup }
        );

        const succulentPost = Post.create(
          {
            content: post.caption,
            images: images,
            inBrand: brand,
            instagram: {
              state: 'posted',
              postId: post.id,
              postedAt: post.timestamp,
              permalink: post.permalink,
            },
          },
          { owner: brandGroup }
        );

        brand.posts?.push(succulentPost);
      }
    }
    done++;

    setImportProgress({
      total: dataFromPages.length,
      done,
    });
  }

  setTimeout(() => {
    setImportProgress(undefined);
  }, 1000);
}

export async function getPostInsightsHelper(brand: Brand) {
  const brandWithToken = await brand.ensureLoaded({ metaAPIConnection: {} });
  const accessToken = brandWithToken?.metaAPIConnection?.longLivedToken;

  if (!accessToken) {
    console.error('No access token found');
    return;
  }

  const posts = (
    [...(brand.posts || [])].filter(
      (p) => p?.instagram?.state === 'posted'
    ) as Post<InstagramPosted>[]
  ).sort((a, b) => (a.instagram.postedAt > b.instagram.postedAt ? -1 : 1));

  for (const post of posts) {
    if (post?.instagram?.state === 'posted') {
      const insights = await fetch(
        `https://graph.facebook.com/v11.0/${post.instagram.postId}/insights?metric=profile_visits,impressions,total_interactions,reach,likes,comments,saved,shares,follows&access_token=` +
          accessToken
      ).then((response) => response.json());

      console.log('insights', insights);
      if (!insights.data) continue;

      const profileActivity = await fetch(
        `https://graph.facebook.com/v11.0/${post.instagram.postId}/insights?metric=profile_activity&breakdown=action_type&access_token=` +
          accessToken
      ).then((response) => response.json());

      console.log('profileActivity', profileActivity);
      if (profileActivity?.data?.[0].total_value?.value > 0) {
        console.log(
          'profileActivity!!',
          profileActivity?.data?.[0].total_value?.breakdowns[0].results.map(
            (result: { value: number; dimension_values: string[] }) => [
              result.dimension_values?.join(','),
              result.value,
            ]
          )
        );
      }

      const restructuredProfileActivity = (profileActivity?.data?.[0]
        .total_value &&
        Object.fromEntries(
          profileActivity?.data?.[0].total_value?.breakdowns[0].results.map(
            (result: { value: number; dimension_values: string[] }) => [
              result.dimension_values?.join(','),
              result.value,
            ]
          )
        )) as
        | undefined
        | {
            [breakdown: string]: number | undefined;
          };

      console.warn('saving post insights not yet implemented again');

      // post.instagramInsights = {
      //   profileVisits: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'profile_visits'
      //   )?.values[0].value,
      //   impressions: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'impressions'
      //   )?.values[0].value,
      //   totalInteractions: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'total_interactions'
      //   )?.values[0].value,
      //   reach: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'reach'
      //   )?.values[0].value,
      //   likes: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'likes'
      //   )?.values[0].value,
      //   comments: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'comments'
      //   )?.values[0].value,
      //   saved: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'saved'
      //   )?.values[0].value,
      //   shares: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'shares'
      //   )?.values[0].value,
      //   follows: insights.data.find(
      //     (insight: { name: string }) => insight.name === 'follows'
      //   )?.values[0].value,
      //   profileActivity: restructuredProfileActivity,
      // };
    }
  }
}
