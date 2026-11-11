import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface SearchInputProps {
  label: string;
  /** The applied search (for example from the URL). */
  value: string;
  /** Called with the trimmed text once typing pauses for `delayMs`. */
  onSearch(value: string): void;
  placeholder?: string;
  delayMs?: number;
}

/** A search box that waits for the user to pause before searching. */
export function SearchInput({
  label,
  value,
  onSearch,
  placeholder,
  delayMs = 350,
}: SearchInputProps) {
  const id = useId();
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, delayMs);
  const onSearchRef = useRef(onSearch);
  const appliedRef = useRef(value);

  useEffect(() => {
    onSearchRef.current = onSearch;
  });
  useEffect(() => {
    appliedRef.current = value;
  }, [value]);

  useEffect(() => {
    const next = debounced.trim();
    if (next !== appliedRef.current) {
      appliedRef.current = next;
      onSearchRef.current(next);
    }
  }, [debounced]);

  return (
    <div className="relative w-full max-w-sm">
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        type="search"
        value={text}
        placeholder={placeholder}
        onChange={(event) => setText(event.target.value)}
        className="min-h-11 w-full rounded-[10px] border border-line bg-surface py-2 pr-10 pl-9 text-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          onClick={() => setText('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 inline-flex min-h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-md border-0 bg-transparent text-muted hover:text-ink"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
