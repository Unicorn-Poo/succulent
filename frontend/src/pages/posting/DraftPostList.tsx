import {
  InstagramNotScheduled,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from '@/sharedDataModel';
import { Draggable } from '@/lib/dragAndDrop';
import { PostComponent } from '@/components/PostComponent';
import { HashtagInsights } from '../insights/hashtags/collectHashtagInsights';

export function DraftPostList({
  posts,
  lastScheduledOrPostDate,
  allHashTags,
  allUserTags,
  draggable,
}: {
  posts?: (Post & {
    instagram:
      | InstagramNotScheduled
      | InstagramScheduleDesired
      | InstagramScheduled;
  })[];
  lastScheduledOrPostDate?: Date;
  allHashTags: HashtagInsights[];
  allUserTags: string[];
  deleteDraft: (post: Post) => void;
  draggable?: boolean;
}) {
  const DragHandle = (
    <div className="bg-stone-700 border-black w-[1rem] border-l-[1rem] border-b-[1rem] group-hover:border-l-[1.5rem] group-hover:border-b-[1.5rem] border-b-transparent transition-[border] rounded-br "></div>
  );

  return posts?.map(
    (post) =>
      post && (
        <div className="relative" key={`container-${post.id}`}>
          {draggable ? (
            <Draggable
              postId={post.id}
              className="group absolute top-0 left-0 right-0 z-10 cursor-grab"
            >
              {DragHandle}
            </Draggable>
          ) : (
            <div className="absolute top-0 left-0 right-0 z-10">
              {DragHandle}
            </div>
          )}
          <div className="p-6 border border-stone-700 rounded ">
            <PostComponent
              key={`drafts-${post.id}`}
              post={post}
              lastScheduledOrPostDate={lastScheduledOrPostDate}
              // onDelete={() => deleteDraft(post)}
              allHashtags={allHashTags}
              allUsertags={allUserTags}
            />
          </div>
        </div>
      )
  );
}
