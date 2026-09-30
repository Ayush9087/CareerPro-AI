import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquareText,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { StateWrapper } from '../components/ui/StateWrapper';
import { EmptyState } from '../components/ui/EmptyState';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { usePageState } from '../hooks/usePageState';

type ScoreCategory = {
  category: string;
  value: number;
  weight: number;
  explanation: string;
};

type DashboardData = {
  name: string;
  target_role: string | null;
  readiness: {
    score: number;
    change_this_month: number;
    categories: ScoreCategory[];
    history: { value: number; created_at: string }[];
    as_of: string;
  };
  skill_gaps: {
    have_count: number;
    gap_count: number;
    strengths: { skill: string; proficiency: number; confidence: number }[];
    critical: { skill: string; status: string; priority_score: number; gap_severity: number; market_demand: number | null }[];
  };
  todays_priorities: { id: string; title: string; skill: string | null; estimated_minutes: number | null; status: string; priority_score: number }[];
  roadmap_progress: { completed: number; total: number; percent: number; title: string | null; week_count: number };
  interview_performance: { completed_count: number; average_score: number | null; latest_score: number | null; latest_feedback: string | null };
  recommendation: { title: string; description: string; task_id: string | null };
  recent_activity: { id: string; event_type: string; metadata: Record<string, unknown>; created_at: string }[];
};

const categoryLabels: Record<string, string> = {
  technical: 'Technical skills',
  projects: 'Projects',
  experience: 'Experience',
  problem_solving: 'Problem solving',
  communication: 'Communication',
  interview: 'Interview readiness',
};

const activityLabels: Record<string, string> = {
  roadmap_task_completed: 'Completed a roadmap task',
  roadmap_task_status_changed: 'Updated roadmap progress',
  roadmap_task_evidence_added: 'Added skill evidence',
  interview_completed: 'Completed a practice interview',
  resume_uploaded: 'Uploaded a resume',
};

function greetingName(name: string) {
  return name.trim().split(/\s+/)[0] || 'there';
}

function formatCategory(category: string) {
  return categoryLabels[category] || category.replaceAll('_', ' ');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function thisMonthLabel(change: number) {
  if (change > 0) return `+${change} this month`;
  if (change < 0) return `${change} this month`;
  return 'No score change yet this month';
}

export default function Dashboard() {
  const { data, isLoading, error, retry } = usePageState(() =>
    api.get<DashboardData>('/api/v1/dashboard/summary')
  );

  const safeData = data || {
    name: 'User',
    target_role: '',
    readiness: { score: 0, change_this_month: 0, categories: [], history: [], as_of: '' },
    skill_gaps: { have_count: 0, gap_count: 0, strengths: [], critical: [] },
    todays_priorities: [],
    roadmap_progress: { completed: 0, total: 0, percent: 0, title: null, week_count: 0 },
    interview_performance: { completed_count: 0, average_score: null, latest_score: null, latest_feedback: null },
    recommendation: { title: '', description: '', task_id: null },
    recent_activity: [],
  };

  const trend = safeData.readiness.history.map((point) => ({ ...point, date: formatDate(point.created_at) }));
  const priorities = safeData.todays_priorities;
  const gapPreview = safeData.skill_gaps.critical.slice(0, 3);

  return (
    <StateWrapper
      isLoading={isLoading}
      error={error}
      isEmpty={!data}
      skeleton={<DashboardSkeleton />}
      onRetry={retry}
      emptyState={
        <EmptyState
          title="Welcome back! Let's get started."
          description="Your dashboard is currently empty. Start by analyzing your profile to see your career readiness score and a personalized roadmap."
          icon={<Sparkles size={32} />}
          action={{
            label: "Analyze my Profile",
            onClick: () => {
              window.location.assign('/resume');
            }
          }}
        />
      }
    >
      <div className="space-y-8 pb-8 page-enter">
        <header className="pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-career-primary">Your career workspace</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-serif">Good morning, {greetingName(safeData.name)}.</h1>
          <p className="mt-2 text-sm text-career-muted">Here's where you stand, why the score is that number, and what to do next.</p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Score Card */}
          <Card hover className="order-1 lg:col-span-7 flex flex-col justify-between">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-2">Career Readiness</p>
                <h2 id="career-score-title" className="text-xl font-serif">Your current score</h2>
                <p className="mt-1 text-sm text-career-muted min-w-0">Target role: <span className="font-medium text-career-dark">{safeData.target_role || 'Choose a target role'}</span></p>
                <p className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg ${safeData.readiness.change_this_month > 0 ? 'bg-career-primary/10 text-career-primary' : 'bg-career-border/30 text-career-muted'}`}>
                  {safeData.readiness.change_this_month > 0 ? <ArrowUpRight className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  {thisMonthLabel(safeData.readiness.change_this_month)}
                </p>
              </div>
              <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center shrink-0">
                 <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(95, 107, 53, 0.14)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="45" fill="none" stroke="var(--color-career-primary)"
                      strokeWidth="8" strokeDasharray="283"
                      strokeDashoffset={283 - (283 * safeData.readiness.score) / 100}
                      strokeLinecap="round"
                      style={{ animation: 'score-ring 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center score-animate">
                    <span className="text-4xl font-serif text-career-dark tracking-tight">{safeData.readiness.score}</span>
                    <span className="text-xs font-semibold tracking-wider text-career-muted">/ 100</span>
                 </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-career-border/50">
              <Link to="/readiness" className="inline-flex items-center gap-2 text-sm font-medium text-career-primary hover:text-career-dark transition-colors">
                View full readiness assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>

          {/* Today's Priorities */}
          <Card hover className="order-2 lg:col-span-5 lg:row-span-2 flex flex-col bg-gradient-to-br from-career-surface to-career-background border-career-primary/20">
            <div className="flex items-baseline justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-1">Move forward today</p>
                <h2 id="today-title" className="text-xl font-serif">Today's priorities</h2>
              </div>
              <Link to="/roadmap" className="text-xs font-medium text-career-primary hover:text-career-dark transition-colors">Full plan</Link>
            </div>
            {priorities.length ? (
              <ol className="flex-1 flex flex-col gap-4">
                {priorities.map((task, index) => (
                  <li key={task.id} className="flex gap-4 p-4 rounded-xl bg-career-background/50 border border-career-border hover:border-career-primary/30 transition-colors group">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-career-primary/10 text-xs font-semibold tabular-nums text-career-primary group-hover:bg-career-primary group-hover:text-career-surface transition-colors">0{index + 1}</span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <Link to="/roadmap" className="font-medium text-career-dark hover:text-career-primary transition-colors block truncate">{task.title}</Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-career-muted">
                        {task.estimated_minutes != null && <span className="inline-flex items-center gap-1 bg-career-border/40 px-2 py-0.5 rounded-md"><Clock3 className="h-3 w-3" />{task.estimated_minutes} min</span>}
                        {task.skill && <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-career-border/20 border border-career-border/50">{task.skill}</span>}
                        {task.status === 'in_progress' && <span className="font-medium text-career-accent flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-career-accent animate-pulse"></div>In progress</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-career-border rounded-xl bg-career-background/30">
                <Sparkles className="h-8 w-8 text-career-muted mb-3" />
                <p className="text-sm font-medium text-career-dark">No open roadmap tasks yet.</p>
                <p className="text-xs text-career-muted mt-1 mb-4">You're all caught up for now.</p>
                <Link to="/roadmap" className="inline-flex items-center gap-2 text-sm font-medium bg-career-primary text-career-surface px-4 py-2 rounded-lg hover:bg-career-primary/90 transition-colors btn-press">Build today's plan <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </Card>

          {/* Skill Gap Summary */}
          <Card hover className="order-9 lg:order-3 lg:col-span-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4"><Target className="h-5 w-5 text-career-primary" /><h2 id="gap-summary-title" className="text-lg font-serif">Skill gap summary</h2></div>
            <div className="mt-2 mb-5 grid grid-cols-2 gap-4">
              <div className="bg-career-primary/5 rounded-xl p-4 border border-career-primary/10">
                 <p className="text-3xl font-serif text-career-dark score-animate">{safeData.skill_gaps.have_count}</p>
                 <p className="text-xs font-medium text-career-primary mt-1">Demonstrated</p>
              </div>
              <div className="bg-career-secondary/5 rounded-xl p-4 border border-career-secondary/10">
                 <p className="text-3xl font-serif text-career-secondary score-animate">{safeData.skill_gaps.gap_count}</p>
                 <p className="text-xs font-medium text-career-secondary mt-1">To develop</p>
              </div>
            </div>
            {gapPreview.length > 0 && <p className="text-sm text-career-muted mb-4 px-1">Next focus: <span className="font-semibold text-career-dark border-b border-career-border pb-0.5">{gapPreview[0].skill}</span></p>}
            <div className="mt-auto pt-4 border-t border-career-border/50">
              <Link to="/skills" className="inline-flex items-center gap-2 text-sm font-medium text-career-primary hover:text-career-dark transition-colors">Review skill matches <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </Card>

          {/* Roadmap Progress */}
          <Card hover className="order-5 lg:order-4 lg:col-span-3 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 id="roadmap-progress-title" className="text-lg font-serif">30-day roadmap</h2>
              <BookOpenCheck className="h-5 w-5 text-career-primary" />
            </div>
            {safeData.roadmap_progress.total ? (
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-end justify-between gap-3 mb-2">
                   <p className="text-3xl font-serif text-career-dark score-animate">{safeData.roadmap_progress.percent}%</p>
                   <p className="text-xs font-medium text-career-muted pb-1">{safeData.roadmap_progress.completed} of {safeData.roadmap_progress.total} tasks</p>
                </div>
                <div className="career-progress-track mb-6">
                   <div className="career-progress-fill" style={{ width: `${safeData.roadmap_progress.percent}%` }} />
                </div>
                <div className="mt-auto pt-4 border-t border-career-border/50">
                   <Link to="/roadmap" className="inline-flex items-center gap-2 text-sm font-medium text-career-primary hover:text-career-dark transition-colors">Continue roadmap <ArrowRight className="h-4 w-4" /></Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center">
                <p className="text-sm text-career-muted mb-4">Your four-week plan is ready to create.</p>
                <Link to="/roadmap" className="inline-flex items-center gap-2 text-sm font-medium bg-career-primary/10 text-career-primary px-4 py-2 rounded-lg hover:bg-career-primary/20 transition-colors">Generate roadmap <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </Card>

          {/* AI Recommendation */}
          <Card hover className="order-8 lg:order-5 lg:col-span-8 bg-career-dark text-career-surface flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-career-accent/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex-1 relative z-10">
               <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-career-accent" />
                  <h2 id="recommendation-title" className="text-sm font-semibold uppercase tracking-widest text-career-accent">AI recommendation</h2>
               </div>
               <p className="text-lg font-serif text-white mb-2">{safeData.recommendation.title}</p>
               <p className="text-sm text-career-surface/70 leading-relaxed max-w-2xl">{safeData.recommendation.description}</p>
            </div>
            <Link to={safeData.recommendation.task_id ? '/roadmap' : '/skills'} className="shrink-0 relative z-10 w-full md:w-auto inline-flex items-center justify-center gap-2 text-sm font-medium bg-career-accent text-career-dark px-6 py-3 rounded-xl hover:bg-career-accent/90 transition-colors btn-press">
              Take the next step <ArrowRight className="h-4 w-4" />
            </Link>
          </Card>

          {/* Breakdown & Trends */}
          <div className="order-6 lg:order-6 lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card hover className="flex flex-col">
               <h2 id="breakdown-title" className="text-lg font-serif mb-5">Score breakdown</h2>
               <div className="flex-1 flex flex-col justify-center gap-5">
                 {safeData.readiness.categories.map((category) => (
                   <div key={category.category}>
                     <div className="mb-2 flex items-center justify-between gap-3">
                       <span className="text-sm font-medium text-career-dark">{formatCategory(category.category)}</span>
                       <span className="text-xs font-semibold tabular-nums text-career-primary bg-career-primary/10 px-2 py-0.5 rounded-md">{category.value} <span className="text-career-primary/50 mx-1">·</span> {Math.round(category.weight * 100)}% weight</span>
                     </div>
                     <div className="career-progress-track bg-career-background">
                       <div className="career-progress-fill bg-career-primary/80" style={{ width: `${category.value}%` }} />
                     </div>
                   </div>
                 ))}
               </div>
             </Card>
             <Card hover className="flex flex-col">
               <div className="flex items-center justify-between mb-2">
                  <h2 id="trend-title" className="text-lg font-serif">Readiness trend</h2>
                  <Link to="/readiness" aria-label="Open readiness history" className="w-8 h-8 rounded-full bg-career-primary/10 text-career-primary flex items-center justify-center hover:bg-career-primary/20 transition-colors"><TrendingUp className="h-4 w-4" /></Link>
               </div>
               {trend.length > 1 ? (
                 <div className="flex-1 min-h-[220px] w-full min-w-0 pt-4 chart-frame">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={trend} margin={{ top: 6, right: 0, bottom: 0, left: -24 }}>
                       <defs><linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-career-primary)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--color-career-primary)" stopOpacity={0} /></linearGradient></defs>
                       <CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} />
                       <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} />
                       <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} />
                       <Tooltip cursor={{ stroke: 'var(--color-career-border)', strokeWidth: 2 }} />
                       <Area type="monotone" dataKey="value" stroke="var(--color-career-primary)" strokeWidth={3} fill="url(#readinessFill)" activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--color-career-primary)' }} />
                     </AreaChart>
                   </ResponsiveContainer>
                 </div>
               ) : <div className="flex-1 flex items-center justify-center text-center p-6 border-2 border-dashed border-career-border rounded-xl mt-4"><p className="text-sm text-career-muted">Your trend will become visible as relevant evidence changes over time.</p></div>}
             </Card>
           </div>

           {/* Bottom Row */}
           <Card hover className="order-7 lg:order-8 lg:col-span-4 flex flex-col">
             <div className="flex items-center gap-2 mb-5"><MessageSquareText className="h-5 w-5 text-career-primary" /><h2 id="interview-title" className="text-lg font-serif">Interview performance</h2></div>
             {safeData.interview_performance.completed_count ? (
               <div className="flex items-end gap-6 mb-5">
                 <div className="bg-career-primary/5 border border-career-primary/10 rounded-xl p-4 flex-1">
                   <p className="text-3xl font-serif text-career-dark score-animate">{safeData.interview_performance.average_score}</p>
                   <p className="text-xs font-medium text-career-primary mt-1">Average score</p>
                 </div>
                 <div className="bg-career-background border border-career-border rounded-xl p-4 flex-1">
                   <p className="text-3xl font-serif text-career-dark score-animate">{safeData.interview_performance.completed_count}</p>
                   <p className="text-xs font-medium text-career-muted mt-1">Completed</p>
                 </div>
               </div>
             ) : <p className="text-sm text-career-muted mb-5">No completed practice interviews yet.</p>}
             {safeData.interview_performance.latest_feedback && (
               <div className="bg-career-surface border border-career-border rounded-xl p-3 mb-5 relative">
                  <div className="absolute top-3 left-3 w-1 h-full bg-career-primary/30 rounded-full"></div>
                  <p className="line-clamp-3 text-xs leading-relaxed text-career-dark pl-4 italic">"{safeData.interview_performance.latest_feedback}"</p>
               </div>
             )}
             <div className="mt-auto pt-4 border-t border-career-border/50">
               <Link to="/interview" className="inline-flex items-center gap-2 text-sm font-medium text-career-primary hover:text-career-dark transition-colors">Practice an interview <ArrowRight className="h-4 w-4" /></Link>
             </div>
           </Card>

           <Card hover className="order-10 lg:order-9 lg:col-span-4 flex flex-col">
             <div className="flex items-center gap-2 mb-5"><Award className="h-5 w-5 text-career-secondary" /><h2 id="strengths-title" className="text-lg font-serif">Top strengths</h2></div>
             {safeData.skill_gaps.strengths.length ? (
               <ul className="flex-1 space-y-3">
                  {safeData.skill_gaps.strengths.slice(0, 4).map((item) => (
                    <li key={item.skill} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-career-border bg-career-background/50 hover:border-career-secondary/40 transition-colors">
                      <span className="font-medium text-sm text-career-dark min-w-0">{item.skill}</span>
                      <span className="text-xs font-semibold text-career-secondary bg-career-secondary/10 px-2 py-1 rounded-md shrink-0">Lvl {item.proficiency}</span>
                    </li>
                  ))}
               </ul>
             ) : <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-career-border rounded-xl text-center mb-5"><p className="text-sm text-career-muted">Strengths will appear as you gain supporting evidence.</p></div>}
             </Card>

             <Card hover className="order-3 lg:order-10 lg:col-span-4 flex flex-col">
               <div className="flex items-center gap-2 mb-5"><CircleAlert className="h-5 w-5 text-rose-700" /><h2 id="critical-gaps-title" className="text-lg font-serif">Critical gaps</h2></div>
               {gapPreview.length ? (
                 <ul className="flex-1 space-y-3">
                   {gapPreview.map((item) => (
                     <li key={item.skill} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/60">
                       <span className="font-medium text-sm text-career-dark min-w-0">{item.skill}</span>
                       <span className="text-xs font-semibold text-rose-800 shrink-0">P{Math.round(item.priority_score)}</span>
                     </li>
                   ))}
                 </ul>
               ) : (
                 <div className="flex-1 flex flex-col justify-center items-center text-center p-6 border-2 border-dashed border-career-border rounded-xl mb-5">
                    <p className="text-sm text-career-muted">No current role-skill gaps were identified.</p>
                 </div>
               )}
               <div className="mt-auto pt-4 border-t border-career-border/50">
                 <Link to="/skills" className="inline-flex items-center gap-2 text-sm font-medium text-career-primary hover:text-career-dark transition-colors">Open skill gap map <ArrowRight className="h-4 w-4" /></Link>
               </div>
             </Card>

             <Card className="order-11 lg:col-span-12">
               <div className="flex items-center gap-2 mb-6"><Activity className="h-5 w-5 text-career-primary" /><h2 id="activity-title" className="text-lg font-serif">Recent activity</h2></div>
               {safeData.recent_activity.length ? (
                 <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                   {safeData.recent_activity.map((item) => {
                     const label = activityLabels[item.event_type] || item.event_type.replaceAll('_', ' ');
                     const taskTitle = typeof item.metadata.task_title === 'string' ? item.metadata.task_title : null;
                     return (
                       <li key={item.id} className="flex items-start gap-3 p-4 rounded-xl border border-career-border bg-career-surface hover:bg-career-background transition-colors">
                         <div className="w-8 h-8 rounded-full bg-career-primary/10 text-career-primary flex items-center justify-center shrink-0 mt-0.5">
                           <CheckCircle2 className="h-4 w-4" />
                         </div>
                         <div className="min-w-0">
                           <p className="font-medium text-sm text-career-dark leading-snug">{taskTitle || label}</p>
                           <p className="mt-1 text-xs font-medium text-career-muted">{formatDate(item.created_at)}</p>
                         </div>
                       </li>
                     );
                   })}
                 </ul>
               ) : (
                 <div className="p-8 text-center border-2 border-dashed border-career-border rounded-xl bg-career-background/50">
                   <p className="text-sm text-career-muted">Activity will appear as you work through your roadmap and practice interviews.</p>
                 </div>
               )}
             </Card>
        </div>
      </div>
    </StateWrapper>
  );
}
