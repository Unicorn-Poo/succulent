import { Brand, Post, ListOfImages, Image } from '@/sharedDataModel';
import { Resolved } from 'jazz-react';
import { createImage } from 'jazz-browser-media-images';

export async function importPostsHelper(
  brand: Resolved<Brand>,
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
    brand?.instagramAccessToken;

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
          brand.posts?.delete(
            brand.posts.findIndex((p) => p?.id === existingPost?.id)
          );
        }
      }

      if (existingPosts.length === 0) {
        const images = brand.meta.group.createList<ListOfImages>(
          await Promise.all(
            imageUrls.map(
              async (url) =>
                brand.meta.group.createMap<Image>({
                  imageFile: (
                    await createImage(
                      await fetch(url).then((response) => response.blob()),
                      brand.meta.group
                    )
                  ).id,
                }).id
            )
          )
        );

        const succulentPost = brand.meta.group.createMap<Post>({
          content: post.caption,
          images: images.id,
          inBrand: brand.id,
          instagram: {
            state: 'posted',
            postId: post.id,
            postedAt: post.timestamp,
            permalink: post.permalink,
          },
        });

        brand.posts?.append(succulentPost.id);
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
