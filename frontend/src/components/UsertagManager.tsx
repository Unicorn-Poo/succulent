import {
  ListOfUsertagGroups,
  UsertagGroup,
  UsertagList,
} from '@/sharedDataModel';
import { Input } from './ui/input';
import { ID } from 'jazz-tools';
import { useCoState } from 'jazz-react';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function UsertagManager({
  usertagGroupIds,
  selected,
  onSelectedChange,
  contextHint,
  focusTrigger,
  allUsertags,
}: {
  usertagGroupIds: ID<ListOfUsertagGroups> | undefined | null;
  selected?: string[];
  onSelectedChange?: (newSelected: string[]) => void;
  contextHint: string;
  focusTrigger: boolean;
  allUsertags?: string[];
}) {
  const usertagGroups = useCoState(
    ListOfUsertagGroups,
    usertagGroupIds || undefined,
    { resolve: { $each: { usertags: true } } }
  );

  const mainInputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (focusTrigger) {
      mainInputRef.current?.focus();
      mainInputRef.current?.setSelectionRange(9999, 9999);
    }
  }, [focusTrigger]);

  const stringifiedSelected = useMemo(
    () => selected?.join(' ') || '',
    [selected]
  );

  const [tempValue, setTempValue] = useState<string | undefined>(
    stringifiedSelected ? stringifiedSelected + ' ' : ''
  );

  useLayoutEffect(() => {
    setTempValue(stringifiedSelected ? stringifiedSelected + ' ' : '');
    mainInputRef.current?.focus();
    mainInputRef.current?.setSelectionRange(9999, 9999);
  }, [stringifiedSelected]);

  const added = useMemo(
    () =>
      tempValue
        ?.split(/[,\s]+/g)
        .map((tag) => tag.replace('@', ''))
        .filter((tag) => tag && !selected?.includes(tag)),

    [tempValue, selected]
  );

  const [tagsInSelection, setTagsInSelection] = useState<
    string[] | undefined
  >();

  const usertagGroupsWithAll = useMemo(() => {
    return [
      ...(usertagGroups || []),
      {
        id: '_all',
        name: 'Previously used',
        usertags: allUsertags || [],
      },
    ];
  }, [usertagGroups, allUsertags]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none">
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <h1 className="text-xl mr-auto">{contextHint}</h1>
          {tagsInSelection?.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  Add{' '}
                  {tagsInSelection.length === 1
                    ? tagsInSelection[0]
                    : tagsInSelection.length + ' tags'}{' '}
                  to...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {usertagGroups?.map((group) => (
                  <DropdownMenuItem
                    className="flex gap-1"
                    onClick={() => {
                      for (const usertag of tagsInSelection) {
                        if (!group.usertags.includes(usertag)) {
                          group.usertags.push(usertag);
                        }
                      }
                    }}
                  >
                    <ArrowRightIcon size={12} />
                    {group.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  className="flex gap-1"
                  onClick={() => {
                    usertagGroups?.push(
                      UsertagGroup.create(
                        {
                          name: '',
                          usertags: UsertagList.create(tagsInSelection, {
                            owner: usertagGroups._owner,
                          }),
                        },
                        { owner: usertagGroups._owner }
                      )
                    );
                  }}
                >
                  <PlusIcon size={12} />
                  New Usertag Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => {
              onSelectedChange?.(
                selected?.toSorted(() => Math.random() - 0.5) || []
              );
            }}
          >
            Shuffle
          </Button>
        </div>
        <Textarea
          ref={mainInputRef}
          className="mb-2 text-base"
          placeholder="Add usertag(s)"
          value={tempValue}
          onChange={(e) => {
            setTempValue(e.target.value);
          }}
          autoCorrect="false"
          spellCheck="false"
          onSelect={(e) => {
            const elem = e.target as HTMLTextAreaElement;
            // determine which tags overlap the selection
            const selectionStart = Math.min(
              elem.selectionStart,
              elem.selectionEnd
            );
            const selectionEnd = Math.max(
              elem.selectionStart,
              elem.selectionEnd
            );
            let newSelectionStart = selectionStart;
            let newSelectionEnd = selectionEnd;
            if (
              elem.value[newSelectionStart - 1] !== ' ' &&
              elem.value[newSelectionEnd] !== ' '
            ) {
              while (
                newSelectionStart > 0 &&
                elem.value[newSelectionStart - 1] !== ' '
              ) {
                newSelectionStart--;
              }
              while (
                newSelectionEnd < elem.value.length &&
                elem.value[newSelectionEnd] !== ' '
              ) {
                newSelectionEnd++;
              }
            }
            const tags = elem.value
              .substring(newSelectionStart, newSelectionEnd)
              .split(/[,\s]+/g)
              .filter((tag) => tag);
            setTagsInSelection(tags);
          }}
          onKeyDown={(e) => {
            const elem = e.target as HTMLTextAreaElement;
            if (e.key === 'Backspace') {
              const selectionStart = Math.min(
                elem.selectionStart,
                elem.selectionEnd
              );
              const selectionEnd = Math.max(
                elem.selectionStart,
                elem.selectionEnd
              );
              if (selectionEnd > stringifiedSelected.length) {
                return;
              }
              let newSelectionStart = selectionStart;
              let newSelectionEnd = selectionEnd;
              if (elem.value[newSelectionStart - 1] !== ' ') {
                while (
                  newSelectionStart > 0 &&
                  elem.value[newSelectionStart - 1] !== ' '
                ) {
                  newSelectionStart--;
                }
                while (
                  newSelectionEnd < elem.value.length &&
                  elem.value[newSelectionEnd] !== ' '
                ) {
                  newSelectionEnd++;
                }
              }
              if (
                newSelectionStart !== selectionStart ||
                newSelectionEnd !== selectionEnd
              ) {
                elem.setSelectionRange(
                  newSelectionStart,
                  newSelectionEnd,
                  elem.selectionDirection
                );
                e.preventDefault();
              } else {
                if (tagsInSelection?.length) {
                  console.log('delete', tagsInSelection);
                  onSelectedChange?.(
                    selected?.filter((tag) => !tagsInSelection.includes(tag)) ||
                      []
                  );
                  e.preventDefault();
                }
              }
            } else if (e.key === ' ' || e.key === 'Enter') {
              console.log('Add', added);
              if (added?.length) {
                onSelectedChange?.([...(selected || []), ...added]);
                e.preventDefault();
              }
            }
          }}
        />
        <div className="text-xs">
          {added?.length
            ? 'Press space or return to add "' +
              added.join(', ') +
              '" or tap existing tags below.'
            : ''}
        </div>
      </div>
      <div className="flex-grow min-h-0">
        <div className="h-full overflow-y-scroll">
          {usertagGroupsWithAll?.map((group) => (
            <div key={group.id} className="mb-4">
              <Input
                className="text-xl border-none -mx-2 p-2 bg-stone-950 z-10"
                value={group?.name}
                disabled={group.id === '_all'}
                placeholder="Enter Group Name"
                onChange={(e) => {
                  group.name = e.target.value;
                }}
              />
              <div className="flex flex-wrap text-xs gap-3">
                {group.usertags
                  .filter(
                    (usertag) => !added?.[0] || usertag.includes(added[0])
                  )
                  .toSorted((a, b) =>
                    selected?.includes(a)
                      ? selected?.includes(b)
                        ? 0
                        : -1
                      : selected?.includes(b)
                        ? 1
                        : 0
                  )
                  .map((usertag) => (
                    <div
                      className={
                        'p-2 -m-2 flex items-center gap-1 cursor-pointer ' +
                        (selected?.includes(usertag)
                          ? 'opacity-100 hover:opacity-70'
                          : 'opacity-50 hover:opacity-70')
                      }
                    >
                      <Checkbox
                        id={group.id + usertag}
                        checked={selected?.includes(usertag)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectedChange?.([...(selected || []), usertag]);
                          } else {
                            onSelectedChange?.(
                              selected?.filter((h) => h !== usertag) || []
                            );
                          }
                        }}
                      />
                      <label
                        htmlFor={group.id + usertag}
                        className="cursor-pointer"
                      >
                        {usertag}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
