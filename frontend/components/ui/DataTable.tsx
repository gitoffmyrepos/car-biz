'use client';

/**
 * GigWheels - Data Table Component
 * Weekly car rentals for gig drivers
 *
 * Reusable data table with pagination, sorting, and filtering.
 */

import { useState, useMemo, useCallback, ReactNode } from 'react';
import { clsx } from 'clsx';

// Column definition
export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: unknown, row: T, index: number) => ReactNode;
  className?: string;
}

// Sort state
export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

// Pagination props
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

// Table props
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  // Sorting
  sortable?: boolean;
  defaultSort?: SortState;
  onSort?: (sort: SortState) => void;
  // Pagination
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  serverSidePagination?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  // Filtering
  filterable?: boolean;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterPlaceholder?: string;
  // UI
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  // Row actions
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: (row: T, index: number) => string;
}

/**
 * Sort icon component
 */
const SortIcon = ({ direction }: { direction: SortDirection }) => {
  return (
    <span className="ml-1 inline-flex flex-col items-center">
      <svg
        className={clsx(
          'w-3 h-3 -mb-1',
          direction === 'asc' ? 'text-gold' : 'text-gray-300'
        )}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
      </svg>
      <svg
        className={clsx(
          'w-3 h-3 -mt-1',
          direction === 'desc' ? 'text-gold' : 'text-gray-300'
        )}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" />
      </svg>
    </span>
  );
};

/**
 * Pagination component
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600">entries</span>
      </div>

      {/* Page info */}
      <div className="text-sm text-gray-600">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      {/* Pagination controls */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
          aria-label="Previous page"
        >
          &laquo;
        </button>

        {getPageNumbers().map((page, idx) =>
          typeof page === 'number' ? (
            <button
              key={idx}
              onClick={() => onPageChange(page)}
              className={clsx(
                'px-3 py-1 rounded text-sm font-medium transition-colors',
                currentPage === page
                  ? 'bg-gold text-charcoal'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              aria-current={currentPage === page ? 'page' : undefined}
            >
              {page}
            </button>
          ) : (
            <span key={idx} className="px-2 text-gray-400">
              {page}
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
          aria-label="Next page"
        >
          &raquo;
        </button>
      </nav>
    </div>
  );
};

/**
 * Loading skeleton row
 */
const SkeletonRow = ({ columns }: { columns: number }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, idx) => (
      <td key={idx} className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

/**
 * Empty state component
 */
const EmptyState = ({
  message,
  colSpan,
}: {
  message: string;
  colSpan: number;
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center">
      <div className="flex flex-col items-center text-gray-500">
        <svg
          className="w-12 h-12 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-lg font-medium">{message}</p>
      </div>
    </td>
  </tr>
);

/**
 * Main DataTable component
 */
export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  sortable = true,
  defaultSort,
  onSort,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  serverSidePagination = false,
  totalItems: serverTotalItems,
  currentPage: serverCurrentPage,
  onPageChange: serverOnPageChange,
  onPageSizeChange: serverOnPageSizeChange,
  filterable = true,
  filterValue: externalFilterValue,
  onFilterChange: externalOnFilterChange,
  filterPlaceholder = 'Search...',
  loading = false,
  emptyMessage = 'No data available',
  className,
  compact = false,
  striped = true,
  hoverable = true,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  // Local state for client-side operations
  const [localSort, setLocalSort] = useState<SortState>(
    defaultSort || { column: null, direction: null }
  );
  const [localFilter, setLocalFilter] = useState('');
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);

  // Use external or local values
  const filterValue = externalFilterValue ?? localFilter;
  const currentPage = serverSidePagination ? (serverCurrentPage ?? 1) : localPage;
  const pageSize = localPageSize;

  // Handle sort
  const handleSort = useCallback(
    (columnKey: string) => {
      if (!sortable) return;

      const column = columns.find((c) => c.key === columnKey);
      if (!column?.sortable) return;

      const newSort: SortState = {
        column: columnKey,
        direction:
          localSort.column === columnKey
            ? localSort.direction === 'asc'
              ? 'desc'
              : localSort.direction === 'desc'
              ? null
              : 'asc'
            : 'asc',
      };

      setLocalSort(newSort);
      onSort?.(newSort);
    },
    [sortable, columns, localSort, onSort]
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    (value: string) => {
      if (externalOnFilterChange) {
        externalOnFilterChange(value);
      } else {
        setLocalFilter(value);
        setLocalPage(1); // Reset to first page on filter
      }
    },
    [externalOnFilterChange]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      if (serverSidePagination && serverOnPageChange) {
        serverOnPageChange(page);
      } else {
        setLocalPage(page);
      }
    },
    [serverSidePagination, serverOnPageChange]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setLocalPageSize(size);
      setLocalPage(1);
      serverOnPageSizeChange?.(size);
    },
    [serverOnPageSizeChange]
  );

  // Process data (filter, sort, paginate) for client-side
  const processedData = useMemo(() => {
    if (serverSidePagination) {
      return data;
    }

    let result = [...data];

    // Filter
    if (filterValue && filterable) {
      const lowerFilter = filterValue.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          if (!col.filterable) return false;
          const value = row[col.key];
          return String(value ?? '').toLowerCase().includes(lowerFilter);
        })
      );
    }

    // Sort
    if (localSort.column && localSort.direction) {
      result.sort((a, b) => {
        const aVal = a[localSort.column!];
        const bVal = b[localSort.column!];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return localSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filterValue, filterable, columns, localSort, serverSidePagination]);

  // Paginate
  const totalItems = serverSidePagination
    ? (serverTotalItems ?? data.length)
    : processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    if (serverSidePagination) {
      return processedData;
    }
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, serverSidePagination]);

  // Get cell value
  const getCellValue = (row: T, column: Column<T>, index: number) => {
    const value = row[column.key];
    if (column.render) {
      return column.render(value, row, index);
    }
    return value === null || value === undefined ? '-' : String(value);
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Filter input */}
      {filterable && (
        <div className="mb-4">
          <div className="relative max-w-xs">
            <input
              type="text"
              value={filterValue}
              onChange={(e) => handleFilterChange(e.target.value)}
              placeholder={filterPlaceholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={clsx(
                    'text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    compact ? 'px-3 py-2' : 'px-4 py-3',
                    column.sortable && sortable && 'cursor-pointer select-none hover:bg-gray-100',
                    column.className
                  )}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && sortable && (
                      <SortIcon
                        direction={
                          localSort.column === column.key
                            ? localSort.direction
                            : null
                        }
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, idx) => (
                <SkeletonRow key={idx} columns={columns.length} />
              ))
            ) : paginatedData.length === 0 ? (
              // Empty state
              <EmptyState message={emptyMessage} colSpan={columns.length} />
            ) : (
              // Data rows
              paginatedData.map((row, index) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row, index)}
                  className={clsx(
                    striped && index % 2 === 1 && 'bg-gray-50',
                    hoverable && 'hover:bg-gold/5',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row, index)
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'text-sm text-gray-900',
                        compact ? 'px-3 py-2' : 'px-4 py-3',
                        column.className
                      )}
                    >
                      {getCellValue(row, column, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
}

export default DataTable;
