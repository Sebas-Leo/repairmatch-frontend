import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pageWindow, rangeLabel } from './pageMath';
import { Pagination } from './Pagination';

describe('pageWindow', () => {
  it('lists every page when there are few', () => {
    expect(pageWindow(0, 1)).toEqual([0]);
    expect(pageWindow(1, 4)).toEqual([0, 1, 2, 3]);
  });

  it('keeps the ends and the neighbours of the current page, with gaps', () => {
    expect(pageWindow(5, 20)).toEqual([0, 'gap', 4, 5, 6, 'gap', 19]);
    expect(pageWindow(0, 20)).toEqual([0, 1, 'gap', 19]);
    expect(pageWindow(19, 20)).toEqual([0, 'gap', 18, 19]);
  });

  it('shows a single skipped page instead of a gap', () => {
    expect(pageWindow(3, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('returns nothing without pages', () => {
    expect(pageWindow(0, 0)).toEqual([]);
  });
});

describe('rangeLabel', () => {
  it('describes the visible range', () => {
    expect(rangeLabel(0, 10, 45)).toBe('Showing 1–10 of 45');
    expect(rangeLabel(4, 10, 45)).toBe('Showing 41–45 of 45');
    expect(rangeLabel(0, 10, 0)).toBe('No results');
    expect(rangeLabel(9, 10, 45)).toBe('No results on this page (45 in total)');
  });
});

describe('Pagination', () => {
  const base = { page: 1, size: 10, totalPages: 5, totalElements: 45 };

  it('moves between pages and marks the current one', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination {...base} onPageChange={onPageChange} />);

    expect(screen.getByText('Showing 11–20 of 45')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Page 5' }));
    expect(onPageChange.mock.calls).toEqual([[0], [2], [4]]);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(
      <Pagination {...base} page={0} onPageChange={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Previous page' }),
    ).toHaveAttribute('aria-disabled', 'true');
    rerender(<Pagination {...base} page={4} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('changes the page size', async () => {
    const user = userEvent.setup();
    const onSizeChange = vi.fn();
    render(
      <Pagination
        {...base}
        onPageChange={vi.fn()}
        onSizeChange={onSizeChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Per page'), '25');
    expect(onSizeChange).toHaveBeenCalledWith(25);
  });

  it('hides the page buttons when everything fits in one page', () => {
    render(
      <Pagination
        page={0}
        size={10}
        totalPages={1}
        totalElements={3}
        onPageChange={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument();
  });

  it('keeps focus and ignores clicks while a page loads', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onSizeChange = vi.fn();
    render(
      <Pagination
        {...base}
        disabled
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />,
    );
    const next = screen.getByRole('button', { name: 'Next page' });
    await user.click(next);
    expect(next).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Page 3' }));
    await user.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(onPageChange).not.toHaveBeenCalled();
    expect(onSizeChange).not.toHaveBeenCalled();
  });

  it('ignores the bounds and the current page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination {...base} page={0} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Page 1' }));
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
