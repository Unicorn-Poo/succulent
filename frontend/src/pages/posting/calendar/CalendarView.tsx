import { Brand, Post, ListOfImages } from '@/sharedDataModel';
import { Button } from '../../../components/ui/button';
import { useParams } from 'react-router-dom';
import { DraftPostComponent } from '../../../components/draftPost/DraftPost';
import { useCallback, useState } from 'react';
import { importPostsHelper } from '../../../lib/importPostsHelper';
import { ID } from 'jazz-tools';
import { useCoState } from 'jazz-react';

export function CalendarView() {
  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;
  const brand = useCoState(Brand, brandId);

  const importPosts = useCallback(async () => {
    if (!brand) return;
    await importPostsHelper(brand, setImportProgress);
  }, [brand]);

  const [importProgress, setImportProgress] = useState<{
    total: number;
    done: number;
  }>();

  return (
    <>
      <Button onClick={importPosts} disabled={!!importProgress}>
        Import posts{' '}
        {importProgress && importProgress.done + '/' + importProgress.total}
      </Button>
      <Button
        variant="outline"
        className="h-20"
        onClick={() => {
          if (!brand) return;
          const draftPost = Post.create(
            {
              instagram: {
                state: 'notScheduled',
              },
              images: ListOfImages.create([], { owner: brand._owner }),
              inBrand: brand,
            },
            { owner: brand._owner }
          );
          brand.posts?.push(draftPost);
        }}
      >
        + Add draft post
      </Button>
      <div className="flex flex-col gap-4">
        {brand?.posts?.map(
          (post) =>
            post && (
              <DraftPostComponent
                key={post.id}
                post={post}
                onDelete={() => {
                  if (!confirm('Are you sure you want to delete this post?'))
                    return;
                  post.instagram = {
                    state: 'notScheduled',
                  };
                  const idx = brand.posts?.findIndex((p) => p?.id === post.id);
                  typeof idx === 'number' &&
                    idx !== -1 &&
                    brand.posts?.splice(idx, 1);
                }}
              />
            )
        )}
      </div>
    </>
  );
}
