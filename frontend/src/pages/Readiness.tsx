import { useEffect, useState } from 'react';
import { AlertCircle, LoaderCircle, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { NextStepCard } from '../components/demo/NextStepCard';

type ScoreDetail = {
  value: number;
  weight: number;
  evidence: string[];
  explanation: string;
};

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
  overall_score: ScoreDetail;
  technical_score: ScoreDetail;
  projects_score: ScoreDetail;
  experience_score: ScoreDetail;
  problem_solving_score: ScoreDetail;
  communication_score: ScoreDetail;
  interview_score: ScoreDetail;
  skill_matches?: SkillMatch[];
};

type HistoryPoint = { id: string; value: number; created_at: string };

const categories: { key: keyof ReadinessPayload; label: string }[] = [
  { key: 'technical_score', label: 'Technical skills' },
  { key: 'projects_score', label: 'Projects' },
  { key: 'experience_score', label: 'Experience' },
  { key: 'problem_solving_score', label: 'Problem solving' },
  { key: 'communication_score', label: 'Communication' },
  { key: 'interview_score', label: 'Interview readiness' },
];

const statusStyle: Record<SkillMatch['status'], string> = {
  HAVE: 'bg-career-primary/10 text-career-primary border-career-primary/20',
  LEARNING: 'bg-career-accent/15 text-career-secondary border-career-secondary/20',
  MISSING: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function Readiness() {
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<ReadinessPayload>('/api/v1/readiness/breakdown'),
      api.get<{ history: HistoryPoint[] }>('/api/v1/readiness/history'),
    ])
      .then(([scoreData, historyData]) => {
        if (!active) return;
        setReadiness(scoreData);
        setHistory(historyData.history);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message || 'Readiness data could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Calculating readiness</div>;
  }

  if (error || !readiness) {
    return (
      <div className="mx-auto max-w-3xl mt-8">
        <Card className="border-l-4 border-l-rose-500 bg-career-surface p-6 flex items-start gap-4">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
          <p className="text-sm font-medium text-career-text leading-relaxed">{error || 'Readiness data is unavailable.'}</p>
        </Card>
      </div>
    );
  }

  const chartHistory = history.map((point) => ({
    ...point,
    date: new Date(point.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));
  const skillMatches = [...(readiness.skill_matches || [])].sort((left, right) => right.priority_score - left.priority_score);

  return (
    <div className="space-y-8 pb-8 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-6 pb-5 border-b border-career-border/50">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Career readiness</p>
          <h1 className="text-3xl font-serif">Your readiness score</h1>
          <p className="mt-2 max-w-xl text-sm text-career-muted leading-relaxed">{readiness.overall_score.explanation} Each category below is a weighted share of that total.</p>
        </div>
        <div className="flex items-center gap-4 bg-career-surface border border-career-border px-5 py-4 rounded-2xl shadow-[0_1px_3px_rgba(48,42,30,0.04)]">
          <div className="relative w-16 h-16 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90 drop-shadow-sm absolute inset-0" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(95, 107, 53, 0.14)" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="46" fill="none" stroke="var(--color-career-primary)" 
                  strokeWidth="8" strokeDasharray="289" 
                  strokeDashoffset={289 - (289 * readiness.overall_score.value) / 100} 
                  strokeLinecap="round" 
                  style={{ animation: 'score-ring 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
                />
             </svg>
             <span className="text-2xl font-serif font-semibold text-career-dark relative z-10 score-animate">{readiness.overall_score.value}</span>
          </div>
          <div>
             <p className="text-sm font-semibold text-career-dark uppercase tracking-wide">Overall Score</p>
             <p className="text-xs font-medium text-career-muted mt-0.5">out of 100</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Card hover className="flex flex-col">
          <div className="mb-6 flex items-center gap-2">
             <TrendingUp className="h-5 w-5 text-career-primary" />
             <h2 className="text-xl font-serif">Score history</h2>
          </div>
          {chartHistory.length > 1 ? (
            <div className="flex-1 min-h-[280px] w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 12, fontWeight: 500 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 12, fontWeight: 500 }} />
                  <Tooltip cursor={{ stroke: 'var(--color-career-border)', strokeWidth: 2, strokeDasharray: '4 4' }} formatter={(value) => [`${value}/100`, 'Readiness']} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-career-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-career-secondary)', strokeWidth: 0 }} activeDot={{ r: 7, fill: 'var(--color-career-secondary)' }} animationDuration={1200} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl bg-career-background/50 text-center min-h-[256px]">
               <TrendingUp className="w-8 h-8 text-career-muted mb-3" />
               <p className="text-sm font-medium text-career-dark">History will appear when your readiness evidence changes.</p>
            </div>
          )}
        </Card>

        <Card hover className="flex flex-col">
          <div className="mb-6 flex items-center gap-2">
             <Zap className="h-5 w-5 text-career-accent" />
             <h2 className="text-xl font-serif">Category breakdown</h2>
          </div>
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {categories.map(({ key, label }) => {
              const score = readiness[key] as ScoreDetail | undefined;
              if (!score) return null;
              return (
                <div key={key}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <span className="text-sm font-semibold text-career-dark">{label}</span>
                    <span className="text-sm font-bold tabular-nums text-career-dark">{score.value}<span className="ml-1.5 text-xs font-medium text-career-muted bg-career-border/30 px-1.5 py-0.5 rounded">{Math.round(score.weight * 100)}% wgt</span></span>
                  </div>
                  <div className="career-progress-track bg-career-background">
                     <div className="career-progress-fill bg-career-primary/80" style={{ width: `${score.value}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-career-muted font-medium bg-white/40 p-1.5 rounded-md border border-career-border/30 inline-block line-clamp-1">{score.explanation}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-center gap-2">
             <ShieldCheck className="w-5 h-5 text-career-primary" />
             <h2 className="text-xl font-serif">Required role skills</h2>
          </div>
          <p className="text-xs font-medium text-career-muted bg-career-surface px-3 py-1.5 rounded-lg border border-career-border shadow-sm">
            <Link to="/skills" className="text-career-primary font-semibold">Open the skill gap map</Link> for why missing skills matter.
          </p>
        </div>
        
        {skillMatches.length ? (
          <div className="overflow-x-auto rounded-xl border border-career-border/50">
            <table className="w-full min-w-[890px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-career-surface border-b-2 border-career-border text-[10px] uppercase tracking-wider font-bold text-career-muted">
                  <th className="py-3 px-4">Skill</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Proficiency</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Relevance</th>
                  <th className="py-3 px-4">Demand</th>
                  <th className="py-3 px-4">Gap Severity</th>
                  <th className="py-3 px-4 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="bg-white/40 divide-y divide-career-border/50">
                {skillMatches.map((skill) => (
                  <tr key={skill.skill_name} className="hover:bg-career-surface/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-career-dark">{skill.skill_name}</td>
                    <td className="py-3.5 px-4">
                       <span className={`inline-block px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${statusStyle[skill.status]}`}>
                          {skill.status}
                       </span>
                    </td>
                    <td className="py-3.5 px-4 text-career-dark font-medium">{skill.proficiency}/5</td>
                    <td className="py-3.5 px-4 text-career-muted font-medium">{skill.confidence}%</td>
                    <td className="py-3.5 px-4 text-career-muted font-medium">{skill.relevance}%</td>
                    <td className="py-3.5 px-4 text-career-muted font-medium">{skill.market_demand == null ? 'N/A' : `${skill.market_demand}%`}</td>
                    <td className="py-3.5 px-4">
                       <span className="bg-career-border/30 px-2 py-0.5 rounded text-xs font-semibold text-career-dark">{skill.gap_severity}/5</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold tabular-nums text-career-dark text-right text-base score-animate">
                       {skill.priority_score}<span className="text-xs text-career-muted font-medium">/100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-career-border rounded-xl bg-career-background/50 text-center">
             <ShieldCheck className="w-10 h-10 text-career-muted mb-4" />
             <p className="text-base font-medium text-career-dark mb-1">No role skill requirements are configured.</p>
             <p className="text-sm text-career-muted">Select a target role in your profile to generate skill requirements.</p>
          </div>
        )}
      </Card>

      <NextStepCard
        phase="DIAGNOSE"
        title="See which missing skills produced this score"
        description="The gap map explains why the number is not 100 and which skills would move it first."
        to="/skills"
        label="Open skill gap map"
      />
    </div>
  );
}