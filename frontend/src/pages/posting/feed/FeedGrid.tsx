import {
  InstagramPosted,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from '@/sharedDataModel';
import { PostTile } from './PostTile';
import { HashtagInsights } from '@/pages/insights/hashtags/collectHashtagInsights';

export function FeedGrid({
  posts,
  showInsights,
  deleteDraft,
  allHashtags,
  allUsertags,
}: {
  posts: (Post & {
    instagram: InstagramPosted | InstagramScheduleDesired | InstagramScheduled;
  })[];
  showInsights: boolean;
  deleteDraft: (post: Post) => void;
  createDraft: () => void;
  allHashtags?: HashtagInsights[];
  allUsertags?: string[];
}) {
  return (
    <div className="grid grid-cols-3 gap-0.5 w-full">
      {posts.map((post, i) => {
        return (
          post && (
            <PostTile
              key={post.id}
              post={post}
              isFirst={i === 0}
              olderPost={posts[i + 1]}
              alwaysShowInsights={showInsights}
              onDeleteDraft={deleteDraft}
              allHashtags={allHashtags}
              allUsertags={allUsertags}
            />
          )
        );
      })}
    </div>
  );
}
