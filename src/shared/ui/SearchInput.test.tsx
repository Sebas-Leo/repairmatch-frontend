import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('searches once typing pauses, with the trimmed text', () => {
    const onSearch = vi.fn();
    render(
      <SearchInput
        label="Search requests"
        value=""
        onSearch={onSearch}
        delayMs={300}
      />,
    );
    const input = screen.getByRole('searchbox', { name: 'Search requests' });

    fireEvent.change(input, { target: { value: 'fr' } });
    fireEvent.change(input, { target: { value: ' fridge ' } });
    act(() => vi.advanceTimersByTime(299));
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('fridge');
  });

  it('does not search again for the value already applied', () => {
    const onSearch = vi.fn();
    render(
      <SearchInput
        label="Search"
        value="lg"
        onSearch={onSearch}
        delayMs={300}
      />,
    );
    act(() => vi.advanceTimersByTime(500));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('clears the text with the clear button', () => {
    const onSearch = vi.fn();
    render(
      <SearchInput
        label="Search"
        value="lg"
        onSearch={onSearch}
        delayMs={300}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('');
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('shows a search applied from outside, such as the back button', () => {
    const onSearch = vi.fn();
    const { rerender } = render(
      <SearchInput label="Search" value="lg" onSearch={onSearch} />,
    );
    rerender(<SearchInput label="Search" value="" onSearch={onSearch} />);
    expect(screen.getByRole('searchbox')).toHaveValue('');
    act(() => vi.advanceTimersByTime(500));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('keeps what the user types when its own search comes back trimmed', () => {
    const onSearch = vi.fn();
    const { rerender } = render(
      <SearchInput label="Search" value="" onSearch={onSearch} delayMs={300} />,
    );
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'no ' } });
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenCalledWith('no');
    rerender(
      <SearchInput
        label="Search"
        value="no"
        onSearch={onSearch}
        delayMs={300}
      />,
    );
    expect(input).toHaveValue('no ');
  });
});
