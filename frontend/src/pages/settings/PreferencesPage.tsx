import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/pages/settings/SortableItem';
import { LayoutWithNav } from '../../Nav';
import { useParams } from 'react-router-dom';
import { ID } from 'jazz-tools';
import { Brand } from '@/sharedDataModel';
import { PersonalBrandSettings } from '@/dataModel';
import { useAccount } from 'jazz-react';

export const insightTypes = [
  'likes',
  'totalInteractions',
  'impressions',
  'profileVisits',
  'reach',
  'comments',
  'saved',
  'shares',
  'follows',
  'profileActivity',
] as const;

export function PreferencesPage() {
  const { me } = useAccount();

  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;

  if (!brandId || !me.root?.settings?.perBrand) {
    return null;
  }

  const insightsOrder = me.root.settings.perBrand[brandId]
    ?.postInsightsOrder || [...insightTypes];

  return (
    <LayoutWithNav>
      <h3 className="text-xl mt-10">Post Insight Order:</h3>
      <div className="relative border px-2 rounded max-w-sm">
        <div className="absolute top-0 left-0 right-0 h-[4.5rem] bg-stone-900 -z-10"></div>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={insightsOrder}
            strategy={verticalListSortingStrategy}
          >
            {insightsOrder.map((insightType) => (
              <SortableItem
                key={insightType}
                id={insightType}
                label={insightType}
                className="cursor-grab"
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </LayoutWithNav>
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !active) return;

    if (active.id !== over.id) {
      if (!brandId || !me.root?.settings?.perBrand) return;
      if (!me.root.settings.perBrand?._refs[brandId]) {
        me.root.settings.perBrand[brandId] = PersonalBrandSettings.create(
          {
            postInsightsOrder: [...insightTypes],
          },
          { owner: me }
        );
      }

      const oldIndex = insightsOrder.findIndex((item) => item === active.id);
      const newIndex = insightsOrder.findIndex((item) => item === over.id);

      me.root.settings.perBrand[brandId]!.postInsightsOrder = arrayMove(
        insightsOrder,
        oldIndex,
        newIndex
      );
    }
  }
}
