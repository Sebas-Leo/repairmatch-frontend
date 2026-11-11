export const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * Page numbers to show around `current` (zero-based), with `'gap'` where
 * pages are skipped: 0 … 4 5 6 … 19. Always includes the first and last page.
 */
export function pageWindow(
  current: number,
  totalPages: number,
  radius = 1,
): Array<number | 'gap'> {
  if (totalPages <= 0) return [];
  const pages = new Set<number>([0, totalPages - 1]);
  for (let p = current - radius; p <= current + radius; p++) {
    if (p >= 0 && p < totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | 'gap'> = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) {
      // A single skipped page is shown instead of a gap.
      if (page - previous === 2) result.push(previous + 1);
      else result.push('gap');
    }
    result.push(page);
  });
  return result;
}

/** "Showing 11–20 of 45" for a zero-based page. */
export function rangeLabel(
  page: number,
  size: number,
  totalElements: number,
): string {
  if (totalElements === 0) return 'No results';
  const from = page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);
  if (from > totalElements)
    return `No results on this page (${totalElements} in total)`;
  return `Showing ${from}–${to} of ${totalElements}`;
}
