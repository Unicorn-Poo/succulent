import { Brand, ISODate, Post } from '@/sharedDataModel';
import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { cn } from '@/lib/utils';
import { smartSchedule } from '@/lib/smartSchedule';
import { PostImage } from '../../components/PostImage';
import { ID } from 'jazz-tools';
import { useBreakpoint } from '@/lib/useBreakpoint';

export function DragToScheduleContext({
  brand,
  children,
}: {
  brand: Brand | undefined | null;
  children: React.ReactNode;
}) {
  const { isMd } = useBreakpoint('md');

  const [draggedPostId, setDraggedPostId] = useState<ID<Post>>();
  const draggedPost = brand?.posts?.find((post) => post?.id === draggedPostId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [schedulePreview, setSchedulePreview] = useState<{
    before?: ISODate;
    after?: ISODate;
  }>();

  if (!isMd) {
    return children;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        setDraggedPostId(event.active.id as ID<Post>);
      }}
      onDragOver={(event) => {
        setSchedulePreview(event.over?.data?.current);
      }}
      onDragEnd={(event) => {
        setDraggedPostId(undefined);
        if (!event.over?.data.current) return;
        const post = brand?.posts?.find((p) => p?.id === event.active.id);
        if (!post) return;
        post.instagram = {
          state: 'scheduleDesired',
          scheduledAt: smartSchedule(
            event.over.data.current as { before?: ISODate; after?: ISODate }
          ),
        };
      }}
      modifiers={[snapCenterToCursor]}
    >
      {children}
      <DragOverlay>
        {draggedPost && (
          <div
            className={cn('w-32 h-32 transition-transform duration-75', {
              'scale-75': !!schedulePreview,
            })}
          >
            <div className="w-32 h-32 shadow-2xl opacity-70">
              <PostImage post={draggedPost} />
            </div>
            {schedulePreview && (
              <div className="bg-background p-4 rounded mt-2 -mx-24">
                Schedule:
                <br />
                {schedulePreview.before && (
                  <p>
                    Before: {new Date(schedulePreview.before).toLocaleString()}
                  </p>
                )}
                {schedulePreview.after && (
                  <p>
                    After: {new Date(schedulePreview.after).toLocaleString()}
                  </p>
                )}
                <p>
                  ✨ Schedule:{' '}
                  {new Date(smartSchedule(schedulePreview)).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
