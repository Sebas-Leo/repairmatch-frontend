import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { PAGE_SIZES } from '../ui/pageMath';

export interface PageParams {
  /** Zero-based page, ready for the backend. The URL shows it one-based. */
  page: number;
  size: number;
  search: string;
  /** Any other query parameter (`status`, `sort`...), or '' when absent. */
  get(name: string): string;
  setPage(page: number): void;
  setSize(size: number): void;
  setSearch(search: string): void;
  /** Sets or clears a filter; changing a filter goes back to the first page. */
  setFilter(name: string, value: string): void;
  /**
   * Several filters in one URL update (two separate setters in one handler
   * would overwrite each other). '' clears a filter.
   */
  setFilters(changes: Readonly<Record<string, string>>): void;
}

interface PageParamsOptions {
  defaultSize?: number;
  sizes?: readonly number[];
}

/**
 * Pagination, search and filters stored in the URL (`?page=2&size=25&search=lg`),
 * so a list can be shared, bookmarked and restored with the back button.
 * Invalid values in the URL fall back to the defaults.
 */
export function usePageParams({
  defaultSize = PAGE_SIZES[0],
  sizes = PAGE_SIZES,
}: PageParamsOptions = {}): PageParams {
  const [params, setParams] = useSearchParams();

  const pageNumber = Number.parseInt(params.get('page') ?? '', 10);
  const page =
    Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber - 1 : 0;
  const sizeNumber = Number.parseInt(params.get('size') ?? '', 10);
  const size = sizes.includes(sizeNumber) ? sizeNumber : defaultSize;
  const search = params.get('search') ?? '';

  const update = useCallback(
    (
      changes: Record<string, string | null>,
      resetPage: boolean,
      replace = false,
    ) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(name);
            else next.set(name, value);
          }
          if (resetPage) next.delete('page');
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  return {
    page,
    size,
    search,
    get: (name) => params.get(name) ?? '',
    setPage: (next) =>
      update({ page: next > 0 ? String(next + 1) : null }, false),
    setSize: (next) =>
      update({ size: next === defaultSize ? null : String(next) }, true),
    // Typing must not flood the history, so a new search replaces the entry.
    setSearch: (next) => update({ search: next }, true, true),
    setFilter: (name, value) => update({ [name]: value }, true),
    setFilters: (changes) => update({ ...changes }, true),
  };
}
