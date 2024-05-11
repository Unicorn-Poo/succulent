import {
  InstagramPosted,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from '@/sharedDataModel';
import { Button } from '../ui/button';
import { useState } from 'react';
import { DraftPostComponent } from '../draftPost/DraftPost';
import { PostComponent } from '../Post';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PostInsights } from '../PostInsights';
import { DropGap } from './DropGap';
import { PostImage } from '../PostImage';

export function PostTile({
  post,
  isFirst,
  olderPost,
  alwaysShowInsights,
  onDeleteDraft,
}: {
  post: Post<InstagramPosted | InstagramScheduleDesired | InstagramScheduled>;
  isFirst: boolean;
  olderPost?: Post<
    InstagramPosted | InstagramScheduleDesired | InstagramScheduled
  >;
  alwaysShowInsights: boolean;
  onDeleteDraft?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const olderPostDate =
    olderPost &&
    (olderPost.instagram.state === 'posted'
      ? olderPost.instagram.postedAt
      : olderPost.instagram.scheduledAt);

  return (
    <Dialog key={post.id}>
      <div className="col-span-1 aspect-square relative">
        {isFirst && (
          <DropGap
            isLeft
            after={
              post.instagram.state === 'posted'
                ? post.instagram.postedAt
                : post.instagram.scheduledAt
            }
          />
        )}
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="flex m-0 p-0 h-full w-full rounded-none relative"
            onMouseOver={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {(alwaysShowInsights ||
              hovered ||
              post.instagram.state === 'scheduleDesired') && (
              <PostInsights post={post} />
            )}
            <PostImage post={post} />
          </Button>
        </DialogTrigger>
        {post.instagram.state !== 'posted' && (
          <DropGap before={post.instagram.scheduledAt} after={olderPostDate} />
        )}
      </div>
      <DialogContent>
        {post?.instagram.state === 'posted' && (
          <PostComponent post={post!} border={false} />
        )}
        {post?.instagram.state !== 'posted' && (
          <DraftPostComponent
            post={post!}
            border={false}
            onDelete={onDeleteDraft}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
