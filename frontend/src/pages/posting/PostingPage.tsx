import { useCallback, useMemo, useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

import { Brand, ListOfImages, Post } from '@/sharedDataModel';
import {
  filterDraftPosts,
  filterAndSortScheduledAndPostedPosts,
} from '@/lib/filterAndSortPosts';
import { useDeleteDraft } from '@/lib/deleteDraft';

import { DragToScheduleContext } from './DragToScheduleContext';
import { FeedGrid } from './feed/FeedGrid';
import { DraftPostList } from './DraftPostList';
import { ID } from 'jazz-tools';
import { useCoState } from '@/main';
import {
  CalendarIcon,
  EyeIcon,
  FileEditIcon,
  Grid3X3Icon,
  ListFilterIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlusIcon,
} from 'lucide-react';
import { LayoutWithNav } from '@/Nav';
import { FilterBar } from '../../components/FilterBar';
import { CalendarView } from './calendar/CalendarView';
import { collectHashtagInsights } from '../insights/hashtags/collectHashtagInsights';
import { useBreakpoint } from '@/lib/useBreakpoint';
import { getPostInsightsHelper } from '@/lib/importPostsHelper';
import { useDebouncedMemo } from '@/lib/debouncedUseMemo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// let lastInstanceIds: any;

export function PostingPage() {
  const location = useLocation();
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;
  const brand = useCoState(Brand, brandId, {
    posts: [{}],
  });

  const [filter, setFilter] = useState<string>();
  const [mobileShowFilterBar, setMobileShowFilterBar] =
    useState<boolean>(false);
  const filteredPosts = useMemo(
    () =>
      brand?.posts?.filter(
        (post): post is NonNullable<typeof post> =>
          !filter ||
          post?.content?.toLowerCase().includes(filter.toLowerCase()) ||
          false
      ),
    [brand?.posts, filter]
  );

  const lastScheduledOrPostDateMs = useMemo(
    () =>
      new Date(
        brand?.posts?.reduce((acc, post) => {
          if (
            post?.instagram?.state === 'scheduled' ||
            post.instagram.state === 'scheduleDesired'
          ) {
            return Math.max(
              acc,
              new Date(post.instagram?.scheduledAt).getTime()
            );
          } else if (post?.instagram?.state === 'posted') {
            return Math.max(acc, new Date(post.instagram?.postedAt).getTime());
          }
          return acc;
        }, 0) || new Date(0)
      ).getTime(),
    [brand?.posts]
  );

  const lastScheduledOrPostDate = useMemo(
    () => new Date(lastScheduledOrPostDateMs),
    [lastScheduledOrPostDateMs]
  );

  const allUserTags = useMemo(
    () => [
      ...new Set(
        brand?.posts?.flatMap((post) => Object.keys(post?.userTags || {}))
      ),
    ],
    [brand?.posts]
  );

  const allHashTags = useDebouncedMemo(
    () =>
      brand
        ? collectHashtagInsights(brand).sort(
            (a, b) => b.relativeReachQuality - a.relativeReachQuality
          )
        : [],
    [brand, brand?.posts],
    5000
  );

  // const instanceIds = Object.fromEntries(
  //   brand?.posts?.map((p) => [p?.id, p?._instanceID]) || []
  // );
  // const diff = lastInstanceIds
  //   ? Object.keys(instanceIds).filter(
  //       (id) => lastInstanceIds[id] !== instanceIds[id]
  //     )
  //   : [];
  // lastInstanceIds = instanceIds;

  // console.log(new Date(), diff);

  const createDraft = useCallback(() => {
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
  }, [brand]);

  const deleteDraft = useDeleteDraft(brand);

  const feedPosts = useMemo(
    () => filterAndSortScheduledAndPostedPosts(filteredPosts),
    [filteredPosts]
  );

  const { isMd } = useBreakpoint('md');

  const [showDraftSidebar, setShowDraftSidebar] = useState(true);

  const ToolbarProps = {
    isMd,
    mobileShowFilterBar,
    brand,
    filter,
    setFilter,
    setMobileShowFilterBar,
  };

  const NewDraftButton = (
    <Button
      variant="secondary"
      size="sm"
      className="gap-1 py-0 h-8"
      onClick={createDraft}
    >
      <PlusIcon size={15} /> New Draft
    </Button>
  );

  return (
    <LayoutWithNav>
      <DragToScheduleContext brand={brand}>
        <div className="relative h-full">
          <div className="flex gap-4  h-full">
            {location.pathname.endsWith('feed') ? (
              <div className="flex-1 flex flex-col h-full max-w-[50rem] mx-auto">
                <PostingToolbar
                  {...ToolbarProps}
                  extraItems={
                    <>
                      <Button
                        variant={showInsights ? 'default' : 'outline'}
                        size="sm"
                        className="text-sm gap-1 p-2 h-8 overflow-ellipsis text-nowrap"
                        onClick={() => {
                          setShowInsights(!showInsights);
                          if (brand && !showInsights) {
                            getPostInsightsHelper(brand);
                          }
                        }}
                      >
                        <EyeIcon size={15} />
                        <span className="hidden md:inline">Compare</span>
                        Stats
                      </Button>
                      {!showDraftSidebar && (
                        <Button
                          variant="outline"
                          className="ml-auto gap-1 p-2 h-8 overflow-ellipsis text-nowrap"
                          onClick={() => setShowDraftSidebar(!showDraftSidebar)}
                        >
                          <PanelRightOpenIcon size="1em" /> Drafts
                        </Button>
                      )}
                    </>
                  }
                />
                <div className="flex-1 min-h-0 overflow-y-scroll w-full">
                  <FeedGrid
                    posts={feedPosts}
                    showInsights={showInsights}
                    createDraft={createDraft}
                    deleteDraft={deleteDraft}
                    allHashtags={allHashTags}
                    allUsertags={allUserTags}
                  />
                </div>
              </div>
            ) : location.pathname.endsWith('calendar') ? (
              <div className="flex-1 ">
                <PostingToolbar
                  {...ToolbarProps}
                  extraItems={
                    !showDraftSidebar && (
                      <Button
                        variant="outline"
                        className="ml-auto gap-1 p-2 h-8 overflow-ellipsis text-nowrap"
                        onClick={() => setShowDraftSidebar(!showDraftSidebar)}
                      >
                        <PanelRightOpenIcon size="1em" /> Drafts
                      </Button>
                    )
                  }
                />
                <CalendarView />
              </div>
            ) : null}{' '}
            {(isMd && showDraftSidebar) ||
            location.pathname.endsWith('drafts') ? (
              <div className="flex-1 flex flex-col h-full">
                {location.pathname.endsWith('drafts') ? (
                  <PostingToolbar
                    {...ToolbarProps}
                    extraItems={NewDraftButton}
                  />
                ) : null}
                {location.pathname.endsWith('drafts') ? null : (
                  <div className="flex-none uppercase text-xs tracking-wider font-semibold text-stone-500 mb-2 flex items-center justify-between">
                    <Button
                      variant="outline"
                      className="gap-1 p-2 h-8 overflow-ellipsis text-nowrap"
                      onClick={() => setShowDraftSidebar(!showDraftSidebar)}
                    >
                      <PanelRightCloseIcon size="1em" /> Drafts
                    </Button>
                    {NewDraftButton}
                  </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-scroll">
                  <div className="flex flex-col gap-4 min-h-0 ">
                    <DraftPostList
                      posts={filterDraftPosts(filteredPosts)}
                      deleteDraft={deleteDraft}
                      lastScheduledOrPostDate={lastScheduledOrPostDate}
                      allHashTags={allHashTags}
                      allUserTags={allUserTags}
                      draggable={showDraftSidebar}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1 h-full min-h-28"
                      onClick={createDraft}
                    >
                      <PlusIcon /> New Draft
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DragToScheduleContext>
    </LayoutWithNav>
  );
}

function PostingToolbar({
  isMd,
  mobileShowFilterBar,
  brand,
  filter,
  setFilter,
  setMobileShowFilterBar,
  extraItems,
}: {
  isMd: boolean;
  mobileShowFilterBar: boolean;
  brand: Brand | undefined;
  filter: string | undefined;
  setFilter: (filter: string | undefined) => void;
  setMobileShowFilterBar: (show: boolean) => void;
  extraItems?: React.ReactNode;
}) {
  return (
    <div
      className={
        'flex-none mt-2 md:mt-0 mb-2 flex items-center justify-between gap-2 order-1 md:order-none' +
        (mobileShowFilterBar ? ' mb-12' : '')
      }
    >
      <div className="rounded-lg bg-stone-800 border border-stone-700 p-0.5 flex gap-1">
        <NavLink
          to={`/brand/${brand?.id}/posting/feed`}
          className="text-sm flex gap-2 py-0.5 px-2 h-auto items-center rounded text-stone-400 hover:text-white [&.active]:bg-stone-950 [&.active]:text-white"
        >
          <Grid3X3Icon size="1em" /> Feed
        </NavLink>
        <NavLink
          to={`/brand/${brand?.id}/posting/calendar`}
          className="text-sm flex gap-2 py-0.5 px-2 h-auto items-center rounded text-stone-400 hover:text-white [&.active]:bg-stone-950 [&.active]:text-white"
        >
          <CalendarIcon size="1em" />{' '}
          <span className="inline md:hidden">Cal</span>
          <span className="hidden md:inline">Calendar</span>
        </NavLink>
        {isMd ? null : (
          <NavLink
            to={`/brand/${brand?.id}/posting/drafts`}
            className="text-sm flex gap-2 py-0.5 px-2 h-auto items-center rounded text-stone-400 hover:text-white [&.active]:bg-stone-950 [&.active]:text-white"
          >
            <FileEditIcon size="1em" /> Drafts
          </NavLink>
        )}
      </div>
      <FilterBar
        filter={filter}
        setFilter={setFilter}
        className={
          mobileShowFilterBar
            ? 'absolute bottom-12 left-0 right-0 z-10 text-base '
            : 'hidden md:block'
        }
        autoFocus={mobileShowFilterBar}
        key={mobileShowFilterBar + ''}
      />
      <div className="flex gap-2">
        <Button
          variant={mobileShowFilterBar ? 'default' : 'outline'}
          size="sm"
          className="text-sm md:hidden gap-1 p-2 h-8 overflow-ellipsis text-nowrap "
          onClick={() => {
            if (mobileShowFilterBar) {
              setMobileShowFilterBar(false);
              setFilter(undefined);
            } else {
              setMobileShowFilterBar(true);
            }
          }}
        >
          <ListFilterIcon size={15} />
          <span className="hidden md:inline"> Filter</span>
        </Button>
        {extraItems}
      </div>
    </div>
  );
}
