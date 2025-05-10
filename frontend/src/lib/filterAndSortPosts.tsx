import {
  InstagramNotScheduled,
  InstagramPosted,
  InstagramScheduleDesired,
  InstagramScheduled,
  Post,
} from '@/sharedDataModel';
import { compareDesc } from 'date-fns';

const scheduledOrPostedStates = ['scheduleDesired', 'scheduled', 'posted'];
const draftStates = ['notScheduled'];
const allDraftStates = ['notScheduled', 'scheduleDesired', 'scheduled'];

export function filterAndSortScheduledAndPostedPosts(
  posts?: (Post | undefined | null)[]
) {
  return [...(posts || [])]
    .filter(
      (
        post
      ): post is Post & {
        instagram:
          | InstagramScheduleDesired
          | InstagramScheduled
          | InstagramPosted;
      } =>
        !!(
          post &&
          post.instagram &&
          scheduledOrPostedStates.includes(post.instagram.state)
        )
    )
    .sort((a, b) => {
      const dateA = new Date(
        a.instagram.state === 'posted'
          ? a.instagram.postedAt
          : a.instagram.scheduledAt
      );
      const dateB = new Date(
        b.instagram.state === 'posted'
          ? b.instagram.postedAt
          : b.instagram.scheduledAt
      );

      return compareDesc(dateA, dateB);
    });
}

export function filterDraftPosts(posts?: (Post | null)[] | null) {
  return posts?.filter(
    (post): post is Post & { instagram: InstagramNotScheduled } =>
      draftStates.includes(post?.instagram.state as string)
  );
}

export function filterDraftAndScheduledPosts(posts?: (Post | null)[] | null) {
  return posts?.filter(
    (
      post
    ): post is Post & {
      instagram:
        | InstagramNotScheduled
        | InstagramScheduleDesired
        | InstagramScheduled;
    } => allDraftStates.includes(post?.instagram.state as string)
  );
}
