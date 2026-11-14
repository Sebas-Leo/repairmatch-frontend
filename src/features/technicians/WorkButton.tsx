import { BriefcaseBusiness } from 'lucide-react';
import { useState } from 'react';
import { cx } from '../../shared/ui/cx';
import { useAvailability } from './availability';
import { WorkDrawer } from './WorkDrawer';

/** Navbar pill with the live availability dot; opens "Tu trabajo". */
export function WorkButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [available] = useAvailability();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cx(
          'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-200',
          available
            ? 'border-fresh/30 bg-fresh-soft text-fresh hover:border-fresh/60'
            : 'border-line bg-surface text-muted hover:bg-surface-2',
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            'size-2.5 rounded-full',
            available ? 'pulse-fresh bg-fresh' : 'bg-line',
          )}
        />
        {available ? 'Disponible' : 'Pausado'}
        <span aria-hidden="true" className="text-line">
          ·
        </span>
        <BriefcaseBusiness size={15} aria-hidden="true" />
        Tu trabajo
      </button>
      <WorkDrawer
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        name={name}
      />
    </>
  );
}
