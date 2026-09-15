"use client"

import * as React from "react"
import {
  createColumnHelper,
  createPaginatedRowModel,
  FlexRender,
  rowPaginationFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dataTableFeatures = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
})

export type DataTableFeatures = typeof dataTableFeatures

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

type DataTableProps<TData extends RowData> = {
  columns: ColumnDef<DataTableFeatures, TData, any>[] // eslint-disable-line @typescript-eslint/no-explicit-any
  data: TData[]
  emptyMessage?: React.ReactNode
  getRowId: (row: TData) => string
  pageSize?: number
  toolbar?: React.ReactNode
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = "Aucun résultat.",
  getRowId,
  pageSize = 10,
  toolbar,
}: DataTableProps<TData>) {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize })

  const [previousData, setPreviousData] = React.useState(data)

  // Filters produce a new array: go back to the first page (state adjusted during render).
  if (previousData !== data) {
    setPreviousData(data)
    setPagination((current) => ({ ...current, pageIndex: 0 }))
  }

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    state: { pagination },
    onPaginationChange: setPagination,
  })
  const pageCount = Math.max(1, table.getPageCount())

  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : <FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data.length > pagination.pageSize ? (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {data.length} élément{data.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <span className="mr-2 font-medium">
              Page {pagination.pageIndex + 1} sur {pageCount}
            </span>
            <PagerButton
              label="Première page"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.setPageIndex(0)}
            >
              <ChevronsLeftIcon />
            </PagerButton>
            <PagerButton
              label="Page précédente"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              <ChevronLeftIcon />
            </PagerButton>
            <PagerButton
              label="Page suivante"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              <ChevronRightIcon />
            </PagerButton>
            <PagerButton
              label="Dernière page"
              disabled={!table.getCanNextPage()}
              onClick={() => table.setPageIndex(pageCount - 1)}
            >
              <ChevronsRightIcon />
            </PagerButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function PagerButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-8"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="sr-only">{label}</span>
      {children}
    </Button>
  )
}
