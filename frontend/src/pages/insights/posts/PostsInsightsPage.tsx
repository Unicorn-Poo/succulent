import { useParams } from 'react-router-dom';
import { ID } from 'jazz-tools';
import { Brand, Post } from '@/sharedDataModel';
import { LayoutWithNav } from '@/Nav';

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAccount, useCoState } from 'jazz-react';
import { useMemo, useState } from 'react';
import { PostImage } from '@/components/PostImage';
import { formatDateTime } from '@/lib/dates';
import { insightMeta, insightsForPost } from '@/lib/postInsights';
import { Button } from '@/components/ui/button';

export function PostsInsightsPage() {
  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;
  const brand = useCoState(Brand, brandId, {
    resolve: { posts: { $each: true } },
  });
  const { me } = useAccount({
    resolve: {
      root: { settings: { perBrand: { [brandId || '']: true } } },
    },
  });
  //   const brand2 = useCoState(Brand, brandId, { });

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'scheduledAt',
      desc: true,
    },
  ]);

  const columns: ColumnDef<Post>[] = useMemo(
    () => [
      {
        header: 'Image',
        cell: (cell) => {
          const post = cell.row.original;
          return (
            <div className="h-12 w-12 -my-6">
              <PostImage post={post} />
            </div>
          );
        },
      },
      {
        accessorKey: 'content',
        header: 'Content',
        cell: ({ row }) => (
          <div className="h-[1rem] max-w-xs overflow-hidden whitespace-pre">
            {row.getValue('content')}
          </div>
        ),
      },
      {
        accessorFn: (post) =>
          'scheduledAt' in post.instagram
            ? post.instagram.scheduledAt
            : 'postedAt' in post.instagram
              ? post.instagram.postedAt
              : undefined,
        id: 'scheduledAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            className={
              'p-0 px-2 -ml-2 transition-transform ' +
              (column.getIsSorted() === 'desc'
                ? 'text-white bg-stone-800'
                : column.getIsSorted() === 'asc'
                  ? 'text-white bg-stone-800 -scale-y-100'
                  : '')
            }
            onClick={() => column.toggleSorting()}
          >
            Date
          </Button>
        ),
        cell: ({ row }) => {
          const datetime = row.getValue('scheduledAt') as string;
          return (
            <div className="whitespace-nowrap">
              {datetime && formatDateTime(new Date(datetime))}
            </div>
          );
        },
        sortUndefined: 'last',
        sortDescFirst: true,
      },
      {
        accessorFn: (post) => post.instagram?.state,
        header: 'State',
      },
      ...Object.entries(insightMeta).map(
        ([insightType, meta]) =>
          ({
            accessorFn: (post) =>
              insightsForPost(post)?.[insightType as keyof typeof insightMeta],
            id: insightType,
            header: ({ column }) => (
              <Button
                variant="ghost"
                className={
                  'p-0 px-2 -ml-2 transition-transform ' +
                  (column.getIsSorted() === 'desc'
                    ? 'text-white bg-stone-800'
                    : column.getIsSorted() === 'asc'
                      ? 'text-white bg-stone-800 -scale-y-100'
                      : '')
                }
                onClick={() => column.toggleSorting()}
              >
                <meta.icon size={'1.5em'} />
              </Button>
            ),
            sortUndefined: 'last',
            sortDescFirst: true,
          }) satisfies ColumnDef<Post>
      ),
      {
        accessorKey: 'id',
        header: 'ID',
      },
    ],
    [brandId, me?.root.settings.perBrand]
  );

  const table = useReactTable({
    data: useMemo(() => brand?.posts || ([] as Post[]), [brand?.posts]),
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <LayoutWithNav>
      <Table>
        <TableHeader className="sticky top-0 bg-black">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </LayoutWithNav>
  );
}
