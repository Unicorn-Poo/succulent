import { useParams } from 'react-router-dom';
import { Brand } from '../../../sharedDataModel';
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
} from '../../../components/ui/table';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { ID } from 'jazz-tools';
import { useCoState } from 'jazz-react';
import { LayoutWithNav } from '@/Nav';
import {
  HashtagInsights,
  collectHashtagInsights,
} from './collectHashtagInsights';
import { useDebouncedMemo } from '@/lib/debouncedUseMemo';

const columns: ColumnDef<HashtagInsights>[] = [
  {
    accessorKey: 'hashtag',
    header: 'Hashtag',
  },
  {
    accessorKey: 'noOfPosts',
    header: 'No of posts',
  },
  {
    accessorKey: 'combinedReach',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Combined Reach
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: 'relativeReachQuality',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          "Relative reach quality"
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) =>
      (row.getValue('relativeReachQuality') as number).toFixed(2),
  },
  {
    accessorKey: 'avgEngagement',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Avg Engagement
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) =>
      (row.getValue('relativeReachQuality') as number).toFixed(2) + '%',
  },
];

export function HashtagInsightsPage() {
  const brandId = useParams<{ brandId: ID<Brand> }>().brandId;

  const brand = useCoState(Brand, brandId);

  const rows: HashtagInsights[] = useDebouncedMemo(
    () => (brand ? collectHashtagInsights(brand) : []),
    [brand],
    5000
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'relativeReachQuality', desc: true },
  ]);

  const table = useReactTable<HashtagInsights>({
    data: rows,
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
      <Table className="max-w-[70rem] mx-auto max-h-auto">
        <TableHeader className="sticky top-0 bg-stone-950">
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
