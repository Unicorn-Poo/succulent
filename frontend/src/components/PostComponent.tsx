import { Post, UserTagMap } from '@/sharedDataModel';
import { PostImage } from './PostImage';
import { Textarea } from './ui/textarea';
import { Trash2Icon } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DraftPostScheduler } from './draftPost/DraftPostScheduler';
import { ImageUploader } from './draftPost/ImageUploader';
import { Button } from './ui/button';
import { useDeleteDraft } from '@/lib/deleteDraft';
import { HashtagInsights } from '@/pages/insights/hashtags/collectHashtagInsights';
import { HashtagManager } from './HashtagManager';
import { LargePopoverOrDialog } from './PopoverOrDialog';
import { UsertagManager } from './UsertagManager';

export function PostComponent({
  post,
  lastScheduledOrPostDate,
  allHashtags,
  allUsertags,
  tagsAlwaysModal,
}: {
  post: Post;
  lastScheduledOrPostDate?: Date;
  allHashtags?: HashtagInsights[];
  allUsertags?: string[];
  tagsAlwaysModal?: boolean;
}) {
  const [desiredScheduleDate, setDesiredScheduleDate] = useState<Date>();

  const editable = post.instagram.state !== 'posted';

  useEffect(() => {
    if (lastScheduledOrPostDate) {
      const baseDate =
        lastScheduledOrPostDate < new Date()
          ? new Date()
          : lastScheduledOrPostDate;
      // next monday or wednesday after lastScheduledOrPostDate, 11:50 AM
      const nextMonday = new Date(baseDate);
      nextMonday.setDate(
        baseDate.getDate() + ((1 + 7 - baseDate.getDay()) % 7)
      );
      nextMonday.setHours(11, 50, 0, 0);

      const nextWednesday = new Date(baseDate);
      nextWednesday.setDate(
        baseDate.getDate() + ((3 + 7 - baseDate.getDay()) % 7)
      );
      nextWednesday.setHours(11, 50, 0, 0);

      if (nextMonday < nextWednesday) {
        setDesiredScheduleDate(nextMonday);
      } else {
        setDesiredScheduleDate(nextWednesday);
      }
    }
  }, [lastScheduledOrPostDate]);

  const deleteDraft = useDeleteDraft(post.inBrand);

  const [contentWithoutHashTags, currentHashTags] = useMemo(
    () =>
      post.content
        ? [
            post.content.split('#')[0],
            (post.content.match(/(#[a-zA-Z_]+\b)/g) || []).map((tag) =>
              tag.replace('#', '')
            ),
          ]
        : ['', []],
    [post.content]
  );

  const contentInputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    // auto-resize textarea
    if (!contentInputRef.current) return;
    contentInputRef.current.style.height = '0';
    contentInputRef.current.style.height =
      contentInputRef.current?.scrollHeight + 'px';
  }, [contentWithoutHashTags]);

  return (
    <div className="grid grid-cols-3 max-w-full gap-2 relative">
      {/* <div className='text-xs whitespace-pre col-span-3'>{post.content}</div> */}
      <div
        key={post.images?.length}
        className="w-full max-w-52 aspect-square md:row-span-2 overflow-x-scroll flex snap-mandatory snap-x"
      >
        {post.images?.map((_, idx) => (
          <div
            key={idx}
            className="group shrink-0 h-full aspect-square snap-center relative"
          >
            <PostImage post={post} idx={idx} />
            {editable && (
              <Button
                className="hidden group-hover:flex absolute top-1 right-1 text-white hover:bg-red-500 p-0 h-8 aspect-square justify-center"
                variant="ghost"
                onClick={() => {
                  if (!post.images) return;
                  post.images.splice(idx, 1);
                }}
              >
                <Trash2Icon size={20} />
              </Button>
            )}
          </div>
        ))}
        {editable && (
          <div className="shrink-0 h-full aspect-square snap-center">
            <ImageUploader post={post} />
          </div>
        )}
      </div>
      <div className="col-span-2 border rounded-xl p-px">
        <Textarea
          value={contentWithoutHashTags.replace(/\n/g, '↵')}
          onChange={(event) => {
            post.content =
              event.target.value.replace(/↵/g, '\n') +
              currentHashTags.map((tag) => '#' + tag).join(' ');
          }}
          className={
            'text-base min-h-0 h-fit border-transparent p-2' +
            (!editable &&
              ' focus-visible:ring-offset-0 focus-visible:ring-transparent')
          }
          readOnly={!editable}
          ref={contentInputRef}
        />
        <div className="text-sm border-t">
          <div className="flex gap-1 items-center mt-3">
            <LargePopoverOrDialog
              side="left"
              alwaysModal={tagsAlwaysModal}
              trigger={
                <div className="min-w-full overflow-x-scroll whitespace-nowrap px-2 cursor-text pb-4 -mb-6">
                  {currentHashTags.length ? (
                    currentHashTags.map((tag) => '#' + tag).join(' ')
                  ) : (
                    <span className="opacity-50">(Tap to add hashtags)</span>
                  )}
                </div>
              }
            >
              {(open) => (
                <HashtagManager
                  focusTrigger={open}
                  contextHint={'Hashtags on ' + contentWithoutHashTags}
                  hashtagGroupsId={post.inBrand?._refs.hashtagGroups.id}
                  selected={currentHashTags}
                  hashtagInsights={allHashtags}
                  onSelectedChange={(newSelected) => {
                    post.content =
                      contentWithoutHashTags +
                      newSelected.map((tag) => '#' + tag).join(' ');
                  }}
                />
              )}
            </LargePopoverOrDialog>
          </div>
          <div className="flex gap-1 items-center mt-5 pt-3 -mb-1 border-t">
            <LargePopoverOrDialog
              side="left"
              alwaysModal={tagsAlwaysModal}
              trigger={
                <div className="min-w-full overflow-x-scroll whitespace-nowrap px-2 cursor-text pb-4 -mb-6">
                  {Object.keys(post.userTags || {}).length ? (
                    Object.keys(post.userTags || {})
                      .map((tag) => '@' + tag)
                      .join(' ')
                  ) : (
                    <span className="opacity-50">(Tap to add usertags)</span>
                  )}
                </div>
              }
            >
              {(open) => (
                <UsertagManager
                  focusTrigger={open}
                  contextHint={'Usertags on ' + contentWithoutHashTags}
                  usertagGroupIds={post.inBrand?._refs.usertagGroups.id}
                  selected={Object.keys(post.userTags || {})}
                  allUsertags={allUsertags}
                  onSelectedChange={(newUserTags) => {
                    if (!post.userTags) {
                      post.userTags = UserTagMap.create(
                        {},
                        { owner: post._owner }
                      );
                    }
                    for (const newUserTag of newUserTags) {
                      if (!post.userTags[newUserTag]) {
                        post.userTags[newUserTag] = {
                          x: Math.random(),
                          y: Math.random(),
                        };
                      }
                    }
                    for (const maybeDeletedUser of Object.keys(
                      post.userTags || {}
                    )) {
                      if (
                        !newUserTags.find((tag) => tag === maybeDeletedUser)
                      ) {
                        delete post.userTags[maybeDeletedUser];
                      }
                    }
                  }}
                />
              )}
            </LargePopoverOrDialog>
          </div>
          {/* <div className="flex gap-1 items-center mt-2 opacity-50">
            <MapPinIcon size="1em" />{' '}
            <Input value={'Location'} className="px-2 py-0.5 h-auto" disabled />
          </div> */}
        </div>
      </div>
      <div className="col-span-3 md:col-span-2 md:col-start-2">
        <div>
          <div className="mt-3 flex gap-2 items-center">
            <DraftPostScheduler
              post={post}
              desiredScheduleDate={desiredScheduleDate}
              setDesiredScheduleDate={setDesiredScheduleDate}
              schedulePost={(date) => {
                post.instagram = {
                  state: 'scheduleDesired',
                  scheduledAt: date.toISOString(),
                };
              }}
              unschedulePost={() => {
                post.instagram = {
                  state: 'notScheduled',
                };
              }}
            />
            {true && (
              <Button
                variant="ghost"
                className="p-0 aspect-square hover:bg-red-500"
                onClick={() => {
                  deleteDraft(post);
                }}
              >
                <Trash2Icon size={20} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
