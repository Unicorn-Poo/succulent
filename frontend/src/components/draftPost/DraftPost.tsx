import { AccountRoot } from '@/dataModel';
import { Post, Tag } from '@/sharedDataModel';
import { Profile, CoStream, CoID } from 'cojson';
import { Resolved, ResolvedCoMap, useJazz } from 'jazz-react';
import { useCallback, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { cn } from '@/lib/utils';
import { DraftPostImage } from './DraftPostImage';
import { DraftPostScheduler } from './DraftPostScheduler';
import { ImageUploader } from './ImageUploader';
import { useOutletContext } from 'react-router-dom';
import { PostLocation } from './Location';
import { Tags } from './Tags';

const scheduledPostsStreamId = 'co_zNHLSfAEVwmcE1oJiszREJzeHEy' as CoID<
  CoStream<Post['id']>
>;

export function DraftPostComponent({
  post,
  border = true,
  styling,
  onDelete,
}: {
  post: Resolved<Post>;
  border?: boolean;
  styling?: string;
  onDelete?: () => void;
}) {
  const { me, localNode } = useJazz<Profile, AccountRoot>();
  const [desiredScheduleDate, setDesiredScheduleDate] = useState<Date>();
  const [locationName, setLocationName] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [activeDraftPost, setActiveDraftPost] = useOutletContext();

  const schedule = useCallback(
    async (scheduleAt: Date) => {
      post.set('instagram', {
        state: 'scheduleDesired',
        scheduledAt: scheduleAt.toISOString(),
      });

      const scheduledPostsStream = await localNode.load(scheduledPostsStreamId);

      if (scheduledPostsStream === 'unavailable') {
        throw new Error('scheduledPostsStream unavailable');
      }

      if (
        ![...scheduledPostsStream.itemsBy(me.id)].some(
          (entry) => entry.value === post.id
        )
      ) {
        scheduledPostsStream.push(post.id);
      }
    },
    [post]
  );

  const onDeletePhoto = (activeImageId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    post.images?.delete(post.images.findIndex((i) => i?.id === activeImageId));
  };

  const onClickPhoto = async (post: ResolvedCoMap<Post>) => {
    setActiveDraftPost(post);
  };

  return (
    <div
      className={cn('rounded p-4 flex flex-col gap-4', styling, {
        'border bg-neutral-900': border,
      })}
    >
      <div className="flex gap-2 overflow-x-scroll w-full">
        {post?.images?.map(
          (image) =>
            image && (
              <DraftPostImage
                image={image}
                onDeletePhoto={onDeletePhoto}
                onClickPhoto={() => onClickPhoto(post)}
                key={image.id}
              />
            )
        )}
        <ImageUploader post={post} />
      </div>
      <Textarea
        className="text-lg min-h-[5rem]"
        value={post?.content}
        onChange={(event) => {
          if (!post) return;
          post.set('content', event.target.value);
        }}
        placeholder="Post content"
      />
      <div className="flex gap-2 items-center flex-wrap">
        <DraftPostScheduler
          post={post}
          desiredScheduleDate={desiredScheduleDate}
          setDesiredScheduleDate={setDesiredScheduleDate}
          unschedulePost={() => {
            post.set('instagram', {
              state: 'notScheduled',
            });
          }}
          schedulePost={schedule}
        />
        <PostLocation
          locationName={locationName}
          setLocationName={setLocationName}
        />
        <Tags tags={tags} setTags={setTags} />
        <Button variant="destructive" onClick={onDelete}>
          Delete Post
        </Button>
      </div>
      {/* <div className="text-xs">Succulent post id: {post.id}</div> */}
    </div>
  );
}
