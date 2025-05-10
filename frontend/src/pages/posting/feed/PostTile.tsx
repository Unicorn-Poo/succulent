import {
  InstagramPosted,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from '@/sharedDataModel';
import { Button } from '../../../components/ui/button';
import { useCallback, useState } from 'react';
import { PostComponent } from '../../../components/PostComponent';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PostInsights } from '../../../components/PostInsights';
import { DropGap } from './DropGap';
import { PostImage } from '../../../components/PostImage';
import { formatDateOnly } from '@/lib/dates';
import { HashtagInsights } from '@/pages/insights/hashtags/collectHashtagInsights';

export function PostTile({
  post,
  isFirst,
  olderPost,
  allHashtags,
  allUsertags,
  alwaysShowInsights,
}: {
  post: Post & {
    instagram: InstagramPosted | InstagramScheduleDesired | InstagramScheduled;
  };
  isFirst: boolean;
  olderPost?: Post & {
    instagram: InstagramPosted | InstagramScheduleDesired | InstagramScheduled;
  };
  alwaysShowInsights: boolean;
  allHashtags?: HashtagInsights[];
  allUsertags?: string[];
  onDeleteDraft?: (post: Post) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const onHover = useCallback(() => setHovered(true), []);
  const onLeave = useCallback(() => setHovered(false), []);

  const olderPostDate =
    olderPost &&
    (olderPost.instagram.state === 'posted'
      ? olderPost.instagram.postedAt
      : olderPost.instagram.scheduledAt);

  return (
    <Dialog>
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
            className={
              'flex m-0 p-0 h-full w-full rounded-none relative' +
              (post.instagram.state === 'posted'
                ? ''
                : ' border border-stone-700')
            }
            onMouseOver={onHover}
            onMouseLeave={onLeave}
          >
            {(alwaysShowInsights ||
              hovered ||
              post.instagram.state === 'scheduleDesired') && (
              <div className="absolute bg-neutral-800/80 md:bg-neutral-800/65 md:backdrop-blur bottom-2 left-2 right-2 top-auto max-h-1/2 p-2 rounded-lg z-10">
                <PostInsights post={post} />
              </div>
            )}
            {post.instagram.state !== 'posted' && (
              <div className="absolute -top-px -left-px bg-stone-700 border-black w-[1rem] border-l-[1rem] border-b-[1rem] group-hover:border-l-[1.5rem] group-hover:border-b-[1.5rem] border-b-transparent transition-[border] rounded-br "></div>
            )}
            <PostImage post={post} />
            <div className="showOnScroll opacity-0 pointer-events-none transition-opacity absolute top-0 right-2 text-lg md:text-xl [text-shadow:_0_1px_2px_rgb(0_0_0_/_80%)]">
              {post.instagram.state === 'posted'
                ? formatDateOnly(new Date(post.instagram.postedAt))
                : formatDateOnly(new Date(post.instagram.scheduledAt))}
            </div>
          </Button>
        </DialogTrigger>
        {post.instagram.state !== 'posted' && (
          <DropGap before={post.instagram.scheduledAt} after={olderPostDate} />
        )}
      </div>
      <DialogContent className="max-w-2xl">
        <PostComponent
          post={post!}
          tagsAlwaysModal={true}
          allHashtags={allHashtags}
          allUsertags={allUsertags}
        />
        {post?.instagram.state === 'posted' && (
          <PostInsights post={post} full />
        )}
      </DialogContent>
    </Dialog>
  );
}
