import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LOOP_PHASES, stepForPath } from '../../lib/demoJourney';

export function DemoJourneyBar() {
  const { pathname } = useLocation();
  const step = stepForPath(pathname);
  if (!step) return null;

  return (
    <div className="mb-6 rounded-2xl border border-career-primary/20 bg-career-surface/90 p-4 shadow-[0_1px_8px_rgba(48,42,30,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        {LOOP_PHASES.map((phase, index) => {
          const active = phase.id === step.phase;
          return (
            <div key={phase.id} className="flex items-center gap-2">
              {index > 0 && <span className="hidden text-career-muted sm:inline">→</span>}
              <span
                className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  active
                    ? 'bg-career-primary text-career-surface'
                    : 'bg-career-background text-career-muted'
                }`}
              >
                {phase.id}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-career-text">
          <span className="font-semibold text-career-dark">{step.label}.</span> {step.judgeCue}
        </p>
        <Link
          to={step.nextPath}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-career-primary px-4 py-2 text-sm font-medium text-career-surface transition-colors hover:bg-career-primary/90 btn-press"
        >
          {step.nextLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
