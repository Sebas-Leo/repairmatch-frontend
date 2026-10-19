import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast, type ToastApi } from './toastContext';

function Probe({ onReady }: { onReady: (api: ToastApi) => void }) {
  const api = useToast();
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return null;
}

/** Renders a provider and hands back the toast API its children get. */
function setup(
  props: Omit<ComponentProps<typeof ToastProvider>, 'children'> = {},
) {
  let api!: ToastApi;
  const view = render(
    <ToastProvider {...props}>
      <Probe
        onReady={(value) => {
          api = value;
        }}
      />
    </ToastProvider>,
  );
  return { toast: () => api, ...view };
}

describe('ToastProvider', () => {
  it('shows a success toast in a polite live region', () => {
    const { toast } = setup();
    act(() => {
      toast().success('Profile saved');
    });

    const message = screen.getByText('Profile saved');
    expect(message).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(message.closest('[aria-live]')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  it('shows an info toast in the polite live region too', () => {
    const { toast } = setup();
    act(() => {
      toast().info('Syncing in the background');
    });
    expect(
      screen.getByText('Syncing in the background').closest('[aria-live]'),
    ).toHaveAttribute('aria-live', 'polite');
  });

  it('announces an error toast at once with role="alert"', () => {
    const { toast } = setup();
    act(() => {
      toast().error('Could not save');
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error: Could not save');
    expect(alert.closest('[aria-live="polite"]')).toBeNull();
  });

  it('says the kind in words, not only with color', () => {
    const { toast } = setup();
    act(() => {
      toast().success('One');
      toast().info('Two');
    });
    expect(screen.getByText('One')).toHaveTextContent('Success: One');
    expect(screen.getByText('Two')).toHaveTextContent('Notice: Two');
  });

  it('keeps the live region in the document when empty, ready to announce', () => {
    const { container } = setup();
    expect(
      container.querySelector('[aria-live="polite"]'),
    ).toBeEmptyDOMElement();
  });

  it('closes with its dismiss button', async () => {
    const user = userEvent.setup();
    const { toast } = setup();
    act(() => {
      toast().info('Bye');
      toast().info('Still here');
    });

    const [first] = screen.getAllByRole('button', {
      name: 'Dismiss notification',
    });
    await user.click(first!);

    expect(screen.queryByText('Bye')).not.toBeInTheDocument();
    expect(screen.getByText('Still here')).toBeInTheDocument();
  });

  it('can be reached and dismissed from the keyboard', async () => {
    const user = userEvent.setup();
    const { toast } = setup();
    act(() => {
      toast().error('Keyboard');
    });

    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByText('Keyboard')).not.toBeInTheDocument();
  });

  it('closes by id through dismiss and ignores unknown ids', () => {
    const { toast } = setup();
    let id = '';
    act(() => {
      id = toast().info('Dismiss me');
      toast().info('Keep me');
    });

    act(() => {
      toast().dismiss('toast-999');
      toast().dismiss(id);
    });

    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
    expect(screen.getByText('Keep me')).toBeInTheDocument();
  });

  it('shows three toasts by default and drops the oldest first', () => {
    const { toast } = setup();
    act(() => {
      for (const name of ['A', 'B', 'C', 'D']) toast().info(name);
    });
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Dismiss notification' }),
    ).toHaveLength(3);
  });

  it('honours maxVisible across kinds', () => {
    const { toast } = setup({ maxVisible: 2 });
    act(() => {
      toast().info('First');
      toast().info('Second');
      toast().error('Third');
    });

    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('keeps the same API object between renders', () => {
    const seen = new Set<ToastApi>();
    const { rerender } = render(
      <ToastProvider>
        <Probe onReady={(api) => seen.add(api)} />
      </ToastProvider>,
    );
    rerender(
      <ToastProvider>
        <Probe onReady={(api) => seen.add(api)} />
      </ToastProvider>,
    );
    expect(seen.size).toBe(1);
  });
});

// Testing Library only knows how to wait under Jest's fake timers, so these
// tests drive the DOM with fireEvent instead of user-event.
describe('toast timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('closes by itself after 5 seconds, errors after 8', () => {
    const { toast } = setup();
    act(() => {
      toast().success('Saved');
      toast().error('Failed');
    });

    advance(4_999);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();

    advance(2_999);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    advance(1);
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });

  it('uses the duration given to the provider, and a toast can override it', () => {
    const { toast } = setup({ durationMs: 1_000 });
    act(() => {
      toast().info('Quick');
      toast().error('Quick error');
      toast().info('Slow', { durationMs: 3_000 });
    });

    advance(1_000);
    expect(screen.queryByText('Quick')).not.toBeInTheDocument();
    expect(screen.queryByText('Quick error')).not.toBeInTheDocument();
    expect(screen.getByText('Slow')).toBeInTheDocument();
    advance(2_000);
    expect(screen.queryByText('Slow')).not.toBeInTheDocument();
  });

  it('keeps a toast with durationMs 0 until it is dismissed', () => {
    const { toast } = setup();
    act(() => {
      toast().info('Stays', { durationMs: 0 });
    });
    advance(10 * 60_000);
    expect(screen.getByText('Stays')).toBeInTheDocument();
  });

  it('holds the countdown while the toast is hovered', () => {
    const { toast } = setup();
    act(() => {
      toast().info('Reading time');
    });
    const item = screen.getByText('Reading time').closest('.toast')!;

    fireEvent.mouseEnter(item);
    advance(60_000);
    expect(screen.getByText('Reading time')).toBeInTheDocument();

    fireEvent.mouseLeave(item);
    advance(5_000);
    expect(screen.queryByText('Reading time')).not.toBeInTheDocument();
  });

  it('holds the countdown while the toast has keyboard focus', () => {
    const { toast } = setup();
    act(() => {
      toast().info('Focused');
    });
    const close = screen.getByRole('button', { name: 'Dismiss notification' });

    act(() => close.focus());
    advance(60_000);
    expect(screen.getByText('Focused')).toBeInTheDocument();

    act(() => close.blur());
    advance(5_000);
    expect(screen.queryByText('Focused')).not.toBeInTheDocument();
  });

  it('clears its timers when it unmounts', () => {
    const { toast, unmount } = setup();
    act(() => {
      toast().info('One');
      toast().error('Two');
    });
    expect(vi.getTimerCount()).toBe(2);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not leave a timer behind for a toast closed by hand', () => {
    const { toast } = setup();
    let id = '';
    act(() => {
      id = toast().info('Gone soon');
    });

    act(() => toast().dismiss(id));

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('useToast', () => {
  it('explains the missing provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe onReady={() => {}} />)).toThrow(
      'useToast must be used inside <ToastProvider>',
    );
  });

  it('is available to nested components', () => {
    function Button() {
      const toast = useToast();
      return (
        <button type="button" onClick={() => toast.success('From a button')}>
          Notify
        </button>
      );
    }
    render(
      <ToastProvider>
        <Button />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));

    expect(screen.getByText('From a button')).toBeInTheDocument();
  });
});
