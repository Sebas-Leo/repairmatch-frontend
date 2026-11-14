import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: readonly Crumb[];
  /** Main actions of the page, shown to the right on wide screens. */
  actions?: ReactNode;
  /** Id for the <h1>, so the page section can be `aria-labelledby` it. */
  titleId?: string;
}

/** Breadcrumbs, title, description and actions at the top of a page. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  titleId,
}: PageHeaderProps) {
  return (
    <header className="grid gap-3 pb-8">
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h1
            id={titleId}
            tabIndex={-1}
            className="m-0 text-[clamp(1.85rem,4vw,2.75rem)] font-extrabold focus:outline-none"
          >
            {title}
          </h1>
          {description ? (
            <p className="m-0 max-w-2xl text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
