import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function NextStepCard({
  phase,
  title,
  description,
  to,
  label,
}: {
  phase: string;
  title: string;
  description: string;
  to: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-career-primary/20 bg-career-dark p-5 text-career-surface md:flex-row md:items-center md:justify-between">
      <div>
        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-career-accent">{phase}</p>
        <p className="font-serif text-lg text-white">{title}</p>
        <p className="mt-1 max-w-2xl text-sm text-career-surface/70">{description}</p>
      </div>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-career-accent px-5 py-3 text-sm font-medium text-career-dark hover:bg-career-accent/90 btn-press"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
