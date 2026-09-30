import { useEffect, useState, type ReactNode } from 'react';
import { Activity, AlertCircle, Flame, LoaderCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

type ProgressData = {
  readiness_history: { value: number; created_at: string }[];
  completed_tasks: { id: string; title: string; skill: string | null; week_number: number | null; completed_at: string }[];
  task_completion: { week_start: string; tasks_completed: number }[];
  interview_performance: { score: number; interview_type: string; difficulty: string; created_at: string }[];
  skill_growth: { date: string; skills_with_evidence: number; evidence_entries_added: number }[];
  skill_evidence: { skill: string; proficiency: number; evidence_type: string; classification: string | null; confidence: number | null; description: string; created_at: string }[];
  learning_streak_days: number;
  activity_history: { id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }[];
  counts: { readiness_snapshots: number; completed_tasks: number; completed_interviews: number; skills_with_evidence: number };
};

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const activityNames: Record<string, string> = {
  roadmap_task_completed: 'Roadmap task completed',
  roadmap_task_status_changed: 'Roadmap task updated',
  roadmap_task_evidence_added: 'Skill evidence added',
  interview_completed: 'Practice interview completed',
};

export default function Progress() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<ProgressData>('/api/v1/progress/summary')
      .then((result) => { if (active) setData(result); })
      .catch((requestError: Error) => { if (active) setError(requestError.message || 'Progress could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading progress</div>;
  if (error || !data) return <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-500 bg-career-surface p-5 rounded-r-xl shadow-sm text-sm text-career-text"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />{error || 'Progress data is unavailable.'}</div>;

  const readiness = data.readiness_history.map((point) => ({ ...point, date: dateLabel(point.created_at) }));
  const tasks = data.task_completion.map((point) => ({ ...point, week: dateLabel(point.week_start) }));
  const interviews = data.interview_performance.map((point) => ({ ...point, date: dateLabel(point.created_at) }));
  const growth = data.skill_growth.map((point) => ({ ...point, date: dateLabel(point.date) }));

  return (
    <div className="space-y-8 pb-8 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-career-border/50">
        <div>
           <p className="text-xs font-semibold uppercase tracking-widest text-career-primary">Your learning record</p>
           <h1 className="mt-1 text-3xl font-serif">Progress</h1>
           <p className="mt-2 text-sm text-career-muted">CareerPro measures improvement from saved readiness snapshots, completed roadmap tasks, interview scores, and new skill evidence — not from guesses.</p>
        </div>
        <div className="flex items-center gap-3 bg-career-surface border border-career-border px-4 py-2.5 rounded-xl shadow-[0_1px_3px_rgba(48,42,30,0.04)]">
           <div className="w-8 h-8 rounded-full bg-career-secondary/15 text-career-secondary flex items-center justify-center">
              <Flame className="h-4 w-4" />
           </div>
           <div>
              <div className="flex items-baseline gap-1">
                 <span className="text-lg font-bold tabular-nums text-career-dark score-animate">{data.learning_streak_days}</span>
                 <span className="text-xs font-semibold text-career-muted uppercase tracking-wider">Days</span>
              </div>
              <span className="text-[10px] text-career-muted font-medium uppercase block -mt-1">Active Streak</span>
           </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartSection title="Readiness Trend" subtitle="Saved readiness snapshots over time." empty={data.readiness_history.length ? null : 'No readiness history yet. Complete your first assessment to start tracking progress.'}>
          {readiness.length > 0 && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={readiness} margin={{ top: 12, right: 12, bottom: 0, left: -24 }}><defs><linearGradient id="progressReadiness" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-career-primary)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--color-career-primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ stroke: 'var(--color-career-border)', strokeWidth: 2, strokeDasharray: '4 4' }} formatter={(value) => [`${value}/100`, 'Readiness']} /><Area type="monotone" dataKey="value" stroke="var(--color-career-primary)" strokeWidth={3} fill="url(#progressReadiness)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-career-primary)' }} /></AreaChart></ResponsiveContainer></div>}
        </ChartSection>

        <ChartSection title="Task Completion" subtitle="Tasks with a recorded completion timestamp, grouped by week." empty={tasks.length ? null : 'No completed roadmap tasks yet. Completed tasks will appear here with their recorded dates.'}>
          {tasks.length > 0 && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={tasks} margin={{ top: 12, right: 12, bottom: 0, left: -24 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} formatter={(value) => [value, 'Tasks completed']} /><Bar dataKey="tasks_completed" fill="var(--color-career-secondary)" maxBarSize={48} radius={[4, 4, 0, 0]} animationDuration={1000} /></BarChart></ResponsiveContainer></div>}
        </ChartSection>

        <ChartSection title="Interview Performance" subtitle="Final scores from completed mock interview sessions." empty={interviews.length ? null : 'No interview scores yet. Complete a mock interview to start this trend.'}>
          {interviews.length > 0 && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={interviews} margin={{ top: 12, right: 12, bottom: 0, left: -24 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ stroke: 'var(--color-career-border)', strokeWidth: 2, strokeDasharray: '4 4' }} formatter={(value, _name, entry) => [`${value}/100 · ${entry.payload.interview_type} · ${entry.payload.difficulty}`, 'Interview']} /><Line type="monotone" dataKey="score" stroke="var(--color-career-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-career-secondary)', strokeWidth: 0 }} activeDot={{ r: 7, fill: 'var(--color-career-secondary)' }} animationDuration={1200} /></LineChart></ResponsiveContainer></div>}
        </ChartSection>

        <ChartSection title="Skill Growth" subtitle="Distinct skills with recorded evidence over time, not inferred proficiency changes." empty={growth.length ? null : 'No skill evidence history yet. Add evidence through your resume or roadmap tasks to start tracking skill growth.'}>
          {growth.length > 0 && <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth} margin={{ top: 12, right: 12, bottom: 0, left: -24 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ stroke: 'var(--color-career-border)', strokeWidth: 2, strokeDasharray: '4 4' }} formatter={(value, name) => [value, name === 'skills_with_evidence' ? 'Skills with evidence' : 'Evidence entries added']} /><Line type="monotone" dataKey="skills_with_evidence" name="skills_with_evidence" stroke="var(--color-career-primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--color-career-primary)', strokeWidth: 0 }} animationDuration={1200} /><Line type="monotone" dataKey="evidence_entries_added" name="evidence_entries_added" stroke="var(--color-career-secondary)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 4, fill: 'var(--color-career-secondary)', strokeWidth: 0 }} animationDuration={1200} /></LineChart></ResponsiveContainer></div>}
        </ChartSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card hover>
          <div className="flex items-center gap-2 mb-6"><Activity className="h-5 w-5 text-career-primary" /><h2 className="text-xl font-serif">Completed roadmap tasks</h2></div>
          {data.completed_tasks.length ? <ul className="space-y-3">{data.completed_tasks.slice(0, 10).map((task) => <li key={task.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-career-border bg-career-background/50 hover:bg-career-surface transition-colors"><div className="flex-1"><p className="text-sm font-medium text-career-dark line-clamp-1">{task.title}</p>{task.skill && <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-career-primary bg-career-primary/10 px-2 py-0.5 rounded-md">{task.skill}</span>}</div><span className="text-xs font-medium text-career-muted whitespace-nowrap">{new Date(task.completed_at).toLocaleDateString()}</span></li>)}</ul> : <div className="border-2 border-dashed border-career-border rounded-xl p-8 text-center bg-career-background/50"><p className="text-sm font-medium text-career-dark">No roadmap tasks have been completed yet.</p><p className="text-xs text-career-muted mt-1">Start executing your roadmap to build your track record.</p></div>}
        </Card>
        <Card hover>
          <div className="mb-6">
             <h2 className="text-xl font-serif flex items-center gap-2"><Flame className="h-5 w-5 text-career-accent" />Skill improvements</h2>
             <p className="mt-1.5 text-xs text-career-muted">Newly recorded evidence; historical proficiency values are not currently stored.</p>
          </div>
          {data.skill_evidence.length ? <ul className="space-y-3">{data.skill_evidence.slice(0, 10).map((item, index) => <li key={`${item.skill}-${item.created_at}-${index}`} className="p-4 rounded-xl border border-career-border bg-career-background/50 hover:border-career-accent/30 transition-colors"><div className="flex flex-wrap items-center justify-between gap-2 mb-2"><div className="flex items-center gap-2"><span className="text-sm font-bold text-career-dark">{item.skill}</span><span className="text-[10px] font-semibold text-career-accent bg-career-accent/15 px-2 py-0.5 rounded-md uppercase tracking-wider">Level {item.proficiency}/5</span></div><span className="text-xs font-medium text-career-muted">{new Date(item.created_at).toLocaleDateString()}</span></div><p className="line-clamp-2 text-xs leading-relaxed text-career-text italic bg-white/40 p-2 rounded-lg border border-career-border/50">"{item.description}"</p></li>)}</ul> : <div className="border-2 border-dashed border-career-border rounded-xl p-8 text-center bg-career-background/50"><p className="text-sm font-medium text-career-dark">No skill evidence updates yet.</p><p className="text-xs text-career-muted mt-1">Updates to your skills will be logged here.</p></div>}
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-serif mb-6">Activity history</h2>
        {data.activity_history.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.activity_history.map((event) => <li key={event.id} className="p-4 rounded-xl border border-career-border bg-career-surface hover:bg-career-background transition-colors"><p className="text-sm font-medium text-career-dark">{activityNames[event.event_type] || event.event_type.replaceAll('_', ' ')}</p><p className="mt-1.5 text-xs font-medium text-career-muted">{new Date(event.created_at).toLocaleString()}</p></li>)}</ul> : <div className="border-2 border-dashed border-career-border rounded-xl p-8 text-center bg-career-background/50"><p className="text-sm font-medium text-career-dark">No learning activity recorded yet.</p><p className="text-xs text-career-muted mt-1">Roadmap completions and interviews will appear here.</p></div>}
      </Card>

      <NextStepCard
        phase="TRACK"
        title="Ask why the score moved"
        description="The Career Advisor answers from this same evidence: profile, gaps, plan, and interviews."
        to="/chat"
        label="Open Career AI Advisor"
      />
    </div>
  );
}

function ChartSection({ title, subtitle, empty, children }: { title: string; subtitle: string; empty: string | null; children: ReactNode }) {
  return (
    <Card hover className="flex flex-col">
      <div className="mb-6">
         <h2 className="text-xl font-serif">{title}</h2>
         <p className="mt-1 text-xs leading-relaxed text-career-muted">{subtitle}</p>
      </div>
      {empty ? (
         <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl bg-career-background/50 text-center min-h-[256px]">
            <p className="text-sm font-medium text-career-dark max-w-[250px]">{empty}</p>
         </div>
      ) : (
         <div className="flex-1 min-h-[256px] w-full">{children}</div>
      )}
    </Card>
  );
}