import { act, renderHook } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useDebounce } from './useDebounce';
import { usePageParams } from './usePageParams';

function setup(url: string) {
  let location = '';
  function RouterWrapper({ children }: { children: ReactNode }) {
    const [router] = useState(() =>
      createMemoryRouter([{ path: '/list', element: children }], {
        initialEntries: [url],
      }),
    );
    return <RouterProvider router={router} />;
  }
  const hook = renderHook(
    () => {
      const params = usePageParams();
      const current = useLocation();
      location = current.search;
      return params;
    },
    { wrapper: RouterWrapper },
  );
  return { ...hook, search: () => location };
}

describe('usePageParams', () => {
  it('reads one-based pages from the URL and gives zero-based ones', () => {
    const { result } = setup('/list?page=3&size=25&search=lg&status=PUBLICADA');
    expect(result.current.page).toBe(2);
    expect(result.current.size).toBe(25);
    expect(result.current.search).toBe('lg');
    expect(result.current.get('status')).toBe('PUBLICADA');
    expect(result.current.get('sort')).toBe('');
  });

  it('falls back to the defaults for invalid values', () => {
    const { result } = setup('/list?page=-2&size=7');
    expect(result.current.page).toBe(0);
    expect(result.current.size).toBe(10);
  });

  it('writes the page, and a filter change returns to the first page', () => {
    const { result, search } = setup('/list?page=2');
    act(() => result.current.setPage(4));
    expect(search()).toBe('?page=5');
    act(() => result.current.setFilter('status', 'CANCELADA'));
    expect(search()).toBe('?status=CANCELADA');
    act(() => result.current.setSize(50));
    expect(result.current.size).toBe(50);
    act(() => result.current.setSearch('fridge'));
    expect(result.current.search).toBe('fridge');
    act(() => result.current.setFilter('status', ''));
    act(() => result.current.setSize(10));
    act(() => result.current.setPage(0));
    expect(search()).toBe('?search=fridge');
  });
});

describe('useDebounce', () => {
  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebounce('a', 100));
    expect(result.current).toBe('a');
  });
});
