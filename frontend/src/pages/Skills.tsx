import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, LoaderCircle, Target } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { NextStepCard } from '../components/demo/NextStepCard';
import { usePageState } from '../hooks/usePageState';
import { StateWrapper } from '../components/ui/StateWrapper';
import { EmptyState } from '../components/ui/EmptyState';
import { ListPageSkeleton } from '../components/ui/Skeleton';

type SkillMatch = {
  skill_name: string;
  status: 'HAVE' | 'LEARNING' | 'MISSING';
  relevance: number;
  confidence: number;
  proficiency: number;
  market_demand: number | null;
  gap_severity: number;
  priority_score: number;
};

type ReadinessPayload = {
  overall_score: { value: number; explanation: string };
  skill_matches?: SkillMatch[];
};

function whyItMatters(skill: SkillMatch) {
  const demand = skill.market_demand == null ? 'role requirement data' : `${skill.market_demand}% of observed postings`;
  if (skill.status === 'MISSING') {
    return `This skill is required for the target role (relevance ${skill.relevance}%). No supporting evidence yet. Demand signal: ${demand}.`;
  }
  if (skill.status === 'LEARNING') {
    return `Partial evidence exists (confidence ${skill.confidence}%, proficiency ${skill.proficiency}/5). Closing this gap raises the technical component of readiness.`;
  }
  return `Demonstrated with evidence (confidence ${skill.confidence}%). Keep this current; it already supports the score.`;
}

export default function Skills() {
  const { data, isLoading, error, retry } = usePageState(() =>
    api.get<ReadinessPayload>('/api/v1/readiness/breakdown')
  );

  const matches = [...(data?.skill_matches || [])].sort((a, b) => b.priority_score - a.priority_score);
  const have = matches.filter((item) => item.status === 'HAVE');
  const learning = matches.filter((item) => item.status === 'LEARNING');
  const missing = matches.filter((item) => item.status === 'MISSING');
  const nextGap = missing[0] || learning[0];

  return (
    <StateWrapper
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      skeleton={<ListPageSkeleton />}
      onRetry={retry}
      emptyState={
        <EmptyState
          title="No skill map yet"
          description="Complete resume analysis and choose a target role so CareerPro can compare evidence against role requirements."
          icon={<Target size={32} />}
          action={{ label: 'Open resume analysis', onClick: () => { window.location.href = '/resume'; } }}
        />
      }
    >
      <div className="space-y-8 pb-8 page-enter">
        <header className="border-b border-career-border/50 pb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Diagnose</p>
          <h1 className="text-3xl font-serif">Skill gap map</h1>
          <p className="mt-2 max-w-2xl text-sm text-career-muted">
            Readiness is {data?.overall_score.value ?? 0}/100 because required skills are either demonstrated, in progress, or missing. Gaps are ordered by how much they hold back the target role.
          </p>
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-r-xl border-l-4 border-rose-500 bg-career-surface p-4 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4"><p className="text-3xl font-serif">{have.length}</p><p className="text-xs font-medium text-career-primary">Have — evidenced</p></Card>
          <Card className="p-4"><p className="text-3xl font-serif">{learning.length}</p><p className="text-xs font-medium text-career-secondary">Learning — partial evidence</p></Card>
          <Card className="p-4"><p className="text-3xl font-serif">{missing.length}</p><p className="text-xs font-medium text-rose-700">Missing — no evidence</p></Card>
        </div>

        {nextGap && (
          <Card className="border-career-primary/20 bg-career-primary/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-career-primary">Highest-priority gap</p>
            <h2 className="mt-1 font-serif text-2xl">{nextGap.skill_name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-career-text">{whyItMatters(nextGap)}</p>
            <p className="mt-2 text-xs text-career-muted">Priority {nextGap.priority_score}/100 · gap severity {nextGap.gap_severity}/5</p>
            <Link to="/roadmap" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-career-primary">
              Plan the next 30 days around this gap <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { title: 'Have', items: have, empty: 'No demonstrated role skills yet.' },
            { title: 'Learning', items: learning, empty: 'No in-progress skills recorded.' },
            { title: 'Missing', items: missing, empty: 'No missing role skills identified.' },
          ].map((column) => (
            <Card key={column.title} className="flex flex-col">
              <h2 className="mb-4 font-serif text-xl">{column.title}</h2>
              {column.items.length ? (
                <ul className="space-y-3">
                  {column.items.map((skill) => (
                    <li key={skill.skill_name} className="rounded-xl border border-career-border bg-career-background/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{skill.skill_name}</span>
                        <span className="text-[10px] font-bold uppercase text-career-muted">P{skill.priority_score}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-career-muted">{whyItMatters(skill)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-career-muted">{column.empty}</p>
              )}
            </Card>
          ))}
        </div>

        {!matches.length && (
          <div className="flex items-center justify-center gap-2 text-sm text-career-muted">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Waiting for role skill requirements.
          </div>
        )}

        <NextStepCard
          phase="PLAN"
          title="Turn these gaps into a 30-day roadmap"
          description="The plan assigns weekly work to the missing and learning skills, with evidence required so the score can move."
          to="/roadmap"
          label="Generate the plan"
        />
      </div>
    </StateWrapper>
  );
}
