import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId } from 'react';
import { cx } from './cx';
import { PAGE_SIZES, pageWindow, rangeLabel } from './pageMath';

interface PaginationProps {
  /** Zero-based, as the backend returns it. */
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  onPageChange(page: number): void;
  onSizeChange?(size: number): void;
  sizes?: readonly number[];
  /** Disables the controls, for example while the next page loads. */
  disabled?: boolean;
}

const CONTROL =
  'inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-line bg-surface px-2 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** Previous/next, page numbers, the visible range and the page size. */
export function Pagination({
  page,
  size,
  totalPages,
  totalElements,
  onPageChange,
  onSizeChange,
  sizes = PAGE_SIZES,
  disabled = false,
}: PaginationProps) {
  const sizeId = useId();
  const pages = pageWindow(page, totalPages);
  // aria-disabled instead of disabled: a disabled button drops keyboard focus,
  // so the user would lose their place every time a page starts loading.
  function go(next: number) {
    if (disabled || next < 0 || next >= totalPages || next === page) return;
    onPageChange(next);
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm">
      <p className="m-0 text-muted" aria-live="polite">
        {rangeLabel(page, size, totalElements)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onSizeChange ? (
          <label
            htmlFor={sizeId}
            className="flex items-center gap-2 text-muted"
          >
            Per page
            <select
              id={sizeId}
              value={size}
              aria-disabled={disabled || undefined}
              onChange={(event) => {
                if (!disabled) onSizeChange(Number(event.target.value));
              }}
              className="min-h-9 rounded-lg border border-line bg-surface px-2 text-ink"
            >
              {sizes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {totalPages > 1 ? (
          <nav aria-label="Pagination">
            <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
              <li>
                <button
                  type="button"
                  className={CONTROL}
                  onClick={() => go(page - 1)}
                  aria-disabled={disabled || page <= 0 || undefined}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
              </li>
              {pages.map((item, index) =>
                item === 'gap' ? (
                  <li
                    key={`gap-${index}`}
                    aria-hidden="true"
                    className="px-1 text-muted"
                  >
                    …
                  </li>
                ) : (
                  <li key={item}>
                    <button
                      type="button"
                      className={cx(
                        CONTROL,
                        item === page && 'border-brand bg-brand text-on-brand',
                      )}
                      onClick={() => go(item)}
                      aria-disabled={disabled || undefined}
                      aria-label={`Page ${item + 1}`}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item + 1}
                    </button>
                  </li>
                ),
              )}
              <li>
                <button
                  type="button"
                  className={CONTROL}
                  onClick={() => go(page + 1)}
                  aria-disabled={
                    disabled || page >= totalPages - 1 || undefined
                  }
                  aria-label="Next page"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </li>
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
