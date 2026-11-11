import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { Badge } from './Badge';
import { Button, ButtonLink } from './Button';
import { Card } from './Card';
import { cx } from './cx';
import { EmptyState } from './EmptyState';
import { PageHeader } from './PageHeader';
import { SelectField } from './SelectField';
import { ListSkeleton, Skeleton } from './Skeleton';
import { Spinner } from './Spinner';
import { StatCard } from './StatCard';
import { TextAreaField } from './TextAreaField';

describe('cx', () => {
  it('joins the truthy class names', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('Button', () => {
  it('never submits by default and runs its handler', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} icon={<Plus aria-hidden="true" />}>
        Add
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Add' });
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is busy and disabled while loading', () => {
    render(
      <Button loading variant="danger" size="sm">
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('renders a router link that looks like a button', () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/client/requests/new" variant="secondary">
          New request
        </ButtonLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'New request' })).toHaveAttribute(
      'href',
      '/client/requests/new',
    );
  });
});

describe('display components', () => {
  it('renders a badge, a card and spinners', () => {
    render(
      <Card as="article" aria-label="Item">
        <Badge tone="success">Accepted</Badge>
        <Spinner label="Loading item" />
        <Spinner />
        <Skeleton />
      </Card>,
    );
    expect(screen.getByRole('article', { name: 'Item' })).toHaveTextContent(
      'Accepted',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading item');
  });

  it('announces a loading list', () => {
    render(<ListSkeleton rows={2} label="Loading requests" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading requests');
  });

  it('explains an empty list and offers the next step', () => {
    render(
      <EmptyState
        title="No requests yet"
        description="Publish your first repair request."
        action={<button type="button">New request</button>}
      />,
    );
    expect(screen.getByText('No requests yet')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'New request' }),
    ).toBeInTheDocument();
  });

  it('shows breadcrumbs, title and actions in the page header', () => {
    render(
      <MemoryRouter>
        <PageHeader
          titleId="t"
          title="Request #7"
          description="Fridge"
          breadcrumbs={[
            { label: 'Dashboard', to: '/client' },
            { label: 'Request #7' },
          ]}
          actions={<button type="button">Cancel request</button>}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Request #7' }),
    ).toHaveAttribute('id', 't');
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toContainElement(
      screen.getByRole('link', { name: 'Dashboard' }),
    );
    expect(screen.getAllByText('Request #7').at(0)).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders a stat card as a link, and a placeholder while loading', () => {
    const { rerender } = render(
      <MemoryRouter>
        <StatCard
          label="Open requests"
          value={3}
          to="/client/requests"
          hint="Waiting for offers"
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: /Open requests/ }),
    ).toHaveTextContent('3');
    rerender(
      <MemoryRouter>
        <StatCard label="Open requests" value={undefined} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('form fields', () => {
  it('wires a select to its label, hint and error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField
        id="status"
        label="Status"
        hint="Filter the list"
        error="Pick one"
        placeholder="All statuses"
        options={[{ value: 'PUBLICADA', label: 'Published' }]}
        value=""
        onChange={onChange}
      />,
    );
    const select = screen.getByLabelText('Status');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAccessibleDescription('Filter the list Pick one');
    await user.selectOptions(select, 'PUBLICADA');
    expect(onChange).toHaveBeenCalled();
  });

  it('counts characters in a text area', () => {
    render(
      <TextAreaField
        id="d"
        label="Description"
        maxLength={50}
        value="Leaks water"
        onChange={vi.fn()}
        error="Too short"
      />,
    );
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription(
      '11/50 Too short',
    );
  });
});
