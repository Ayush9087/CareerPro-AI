import { useEffect, useState } from 'react';
import { Building2, LoaderCircle, ShieldCheck, Users, Briefcase, GraduationCap, Target, AlertCircle } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';

type InstitutionOption = { id: string; name: string; parent_institution_id: string | null };
type DashboardData = {
  institution: { id: string; name: string; parent_institution_id: string | null };
  metrics: {
    students_assessed: number;
    student_members: number;
    average_readiness: number | null;
    interview_ready: number;
    interview_ready_threshold: number;
    top_skill_gaps: { skill: string; students_with_gap: number; missing: number; learning: number; have: number; average_priority: number; students_covered: number }[];
    most_in_demand_skills: { skill: string; demand_percent: number | null; postings_or_roles: number }[];
    demand_source: 'analyzed_job_postings' | 'seeded_role_requirements' | 'unavailable';
    analyzed_postings: number;
    roadmap_completion_percent: number | null;
    roadmaps_with_tasks: number;
    average_interview_score: number | null;
    completed_interviews: number;
  };
  charts: {
    readiness_distribution: { band: string; students: number }[];
    skill_gap_distribution: { skill: string; missing: number; learning: number; have: number }[];
    skill_demand_vs_readiness: { skill: string; demand_percent: number | null; readiness_percent: number | null }[];
    progress_over_time: { month: string; average_readiness: number | null; tasks_completed: number }[];
  };
};

const emptyCopy = 'No aggregate data for this chart yet. Add student memberships and relevant assessments or activity to begin tracking.';

function ChartSection({ title, description, empty, children }: { title: string; description: string; empty: string | null; children: React.ReactNode }) {
  return (
    <Card hover className="flex flex-col">
      <div className="mb-6">
         <h2 className="text-xl font-serif">{title}</h2>
         <p className="mt-1 text-xs leading-relaxed text-career-muted">{description}</p>
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

export default function Institution() {
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<{ institutions: InstitutionOption[] }>('/api/v1/institutions')
      .then((result) => {
        if (!active) return;
        setInstitutions(result.institutions);
        if (result.institutions.length) setSelectedId(result.institutions[0].id);
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    api.get<DashboardData>(`/api/v1/institutions/${selectedId}/dashboard`)
      .then((result) => { if (active) { setDashboard(result); setError(null); } })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
    return () => { active = false; };
  }, [selectedId]);

  if (loading) return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Checking institution access</div>;

  if (error && !institutions.length) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="border-l-4 border-l-career-primary bg-gradient-to-r from-career-primary/10 to-transparent flex items-start gap-4 p-8">
          <ShieldCheck className="h-8 w-8 shrink-0 text-career-primary" />
          <div>
            <h1 className="text-2xl font-serif text-career-dark">Institution access</h1>
            <p className="mt-2 text-sm leading-relaxed text-career-text">Institution analytics are available only to authorized institution administrators.</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && (!dashboard || dashboard.institution.id !== selectedId)) return <div role="alert" className="border-l-4 border-rose-500 bg-career-surface p-5 rounded-r-xl shadow-sm text-sm text-career-text flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />{error}</div>;
  if ((selectedId && (!dashboard || dashboard.institution.id !== selectedId)) || !dashboard) return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading aggregate analytics</div>;

  const { metrics, charts } = dashboard;
  const readinessEmpty = charts.readiness_distribution.every((item) => item.students === 0);
  const gapsEmpty = charts.skill_gap_distribution.length === 0;
  const demandEmpty = charts.skill_demand_vs_readiness.length === 0;
  const progressEmpty = charts.progress_over_time.length === 0;
  const demandDescription = metrics.demand_source === 'analyzed_job_postings'
    ? `Based on analyzed job postings (${metrics.analyzed_postings}); readiness is the share of assessed students who have demonstrated each skill.`
    : metrics.demand_source === 'seeded_role_requirements'
      ? 'Demand proxy uses seeded role requirements, not analyzed job market postings; readiness shows the share of assessed students who have demonstrated each skill.'
      : 'Neither analyzed job postings nor seeded role requirements are available for the student target roles.';

  return (
    <div className="space-y-8 pb-8 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-career-border/50">
        <div>
           <p className="text-xs font-semibold uppercase tracking-widest text-career-primary">Institution analytics</p>
           <h1 className="mt-1 text-3xl font-serif">{dashboard.institution.name}</h1>
           <p className="mt-2 text-sm text-career-muted">Aggregate trends across authorized student memberships. No individual student records are shown.</p>
        </div>
        <div className="flex items-center gap-3">
           {institutions.length > 1 && (
             <label className="text-xs font-medium text-career-muted flex items-center gap-2">
                Institution
                <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setError(null); }} className="min-h-[40px] rounded-xl border border-career-border bg-white px-3 py-1.5 text-sm font-medium text-career-dark focus:ring-2 focus:ring-career-primary focus:outline-none shadow-sm cursor-pointer hover:border-career-primary/40 transition-colors">
                   {institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
             </label>
           )}
           <div className="w-10 h-10 rounded-full bg-career-primary/10 text-career-primary flex items-center justify-center">
              <Building2 className="h-5 w-5" />
           </div>
        </div>
      </header>

      {error && <div role="alert" className="border-l-4 border-rose-500 bg-career-surface p-4 rounded-r-xl shadow-sm text-sm text-career-text">{error}</div>}

      <section aria-label="Institution aggregate metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Students Assessed" value={`${metrics.students_assessed}`} detail={`of ${metrics.student_members} student members`} icon={<Users className="h-4 w-4 text-career-primary" />} />
        <Metric label="Avg Readiness" value={metrics.average_readiness == null ? 'N/A' : `${metrics.average_readiness}/100`} detail={metrics.students_assessed ? 'Latest saved score per assessed student' : 'No readiness scores yet'} icon={<Target className="h-4 w-4 text-career-secondary" />} />
        <Metric label="Roadmap Comp" value={metrics.roadmap_completion_percent == null ? 'N/A' : `${metrics.roadmap_completion_percent}%`} detail={`${metrics.roadmaps_with_tasks} active roadmaps with tasks`} icon={<GraduationCap className="h-4 w-4 text-career-accent" />} />
        <Metric label="Avg Interview" value={metrics.average_interview_score == null ? 'N/A' : `${metrics.average_interview_score}/100`} detail={`${metrics.completed_interviews} completed practice interviews`} icon={<Briefcase className="h-4 w-4 text-career-primary" />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartSection title="Readiness Distribution" description="Latest saved readiness score per assessed student." empty={readinessEmpty ? 'No readiness history for institution members yet.' : null}>
          {!readinessEmpty && <ResponsiveContainer width="100%" height="100%"><BarChart data={charts.readiness_distribution} margin={{ top: 12, right: 12, bottom: 0, left: -24 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="band" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} formatter={(value) => [value, 'Students']} /><Bar dataKey="students" fill="var(--color-career-primary)" maxBarSize={48} radius={[4, 4, 0, 0]} animationDuration={1000} /></BarChart></ResponsiveContainer>}
        </ChartSection>

        <ChartSection title="Skill Gap Distribution" description="Current HAVE, LEARNING, and MISSING status counts for the most common role skills." empty={gapsEmpty ? emptyCopy : null}>
          {!gapsEmpty && <ResponsiveContainer width="100%" height="100%"><BarChart data={charts.skill_gap_distribution} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 16 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis type="category" dataKey="skill" width={100} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-dark)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} /><Bar dataKey="have" stackId="status" name="Have" fill="var(--color-career-primary)" animationDuration={1000} /><Bar dataKey="learning" stackId="status" name="Learning" fill="var(--color-career-accent)" animationDuration={1000} /><Bar dataKey="missing" stackId="status" name="Missing" fill="#b65b52" radius={[0, 4, 4, 0]} animationDuration={1000} /></BarChart></ResponsiveContainer>}
        </ChartSection>

        <ChartSection title="Skill Demand vs Readiness" description={demandDescription} empty={demandEmpty ? emptyCopy : null}>
          {!demandEmpty && <ResponsiveContainer width="100%" height="100%"><BarChart data={charts.skill_demand_vs_readiness} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 16 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" horizontal={false} /><XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis type="category" dataKey="skill" width={100} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-dark)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} formatter={(value, name) => [`${value ?? 'N/A'}%`, name === 'demand_percent' ? 'Posting demand / seeded requirement' : 'Students with demonstrated skill']} /><Bar dataKey="demand_percent" name="Demand" fill="var(--color-career-secondary)" maxBarSize={16} radius={[0, 2, 2, 0]} animationDuration={1000} /><Bar dataKey="readiness_percent" name="Readiness" fill="var(--color-career-primary)" maxBarSize={16} radius={[0, 2, 2, 0]} animationDuration={1000} /></BarChart></ResponsiveContainer>}
        </ChartSection>

        <ChartSection title="Progress Over Time" description="Monthly average readiness and completed roadmap tasks across student members." empty={progressEmpty ? emptyCopy : null}>
          {!progressEmpty && <ResponsiveContainer width="100%" height="100%"><ComposedChart data={charts.progress_over_time} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}><CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis yAxisId="readiness" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><YAxis yAxisId="tasks" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} /><Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} /><Bar yAxisId="tasks" dataKey="tasks_completed" name="Tasks completed" fill="var(--color-career-secondary)" maxBarSize={32} radius={[4, 4, 0, 0]} animationDuration={1000} /><Line yAxisId="readiness" type="monotone" dataKey="average_readiness" name="Average readiness" stroke="var(--color-career-primary)" strokeWidth={3} connectNulls dot={{ r: 5, fill: 'var(--color-career-primary)', strokeWidth: 0 }} animationDuration={1200} /></ComposedChart></ResponsiveContainer>}
        </ChartSection>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
         <Card className="flex flex-col">
           <h2 className="text-xl font-serif mb-5">Top Skill Gaps</h2>
           {metrics.top_skill_gaps.length ? (
             <div className="flex-1 overflow-x-auto">
               <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                 <thead>
                   <tr className="border-b-2 border-career-border text-xs uppercase tracking-wider text-career-muted">
                     <th className="py-3 px-2 font-semibold">Skill</th>
                     <th className="py-3 px-2 font-semibold text-center">Students w/ Gap</th>
                     <th className="py-3 px-2 font-semibold text-center">Missing</th>
                     <th className="py-3 px-2 font-semibold text-center">Learning</th>
                     <th className="py-3 px-2 font-semibold text-right">Avg. Priority</th>
                   </tr>
                 </thead>
                 <tbody>
                   {metrics.top_skill_gaps.map((gap) => (
                     <tr key={gap.skill} className="border-b border-career-border/50 hover:bg-career-primary/[0.02] transition-colors">
                       <td className="py-4 px-2 font-medium text-career-dark">{gap.skill}</td>
                       <td className="py-4 px-2 text-center text-career-text">{gap.students_with_gap} / {gap.students_covered}</td>
                       <td className="py-4 px-2 text-center font-medium text-rose-700/80">{gap.missing}</td>
                       <td className="py-4 px-2 text-center font-medium text-career-secondary">{gap.learning}</td>
                       <td className="py-4 px-2 text-right">
                          <span className="inline-block bg-career-border/30 px-2 py-0.5 rounded text-xs font-semibold">{gap.average_priority}/100</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl bg-career-background/50 text-center min-h-[200px]">
                <p className="text-sm font-medium text-career-dark">No skill gap records are available yet.</p>
             </div>
           )}
         </Card>

         <Card className="flex flex-col">
           <div className="mb-5">
             <h2 className="text-xl font-serif">Most In-Demand Skills</h2>
             <p className="mt-1 text-xs text-career-muted">
               {metrics.demand_source === 'analyzed_job_postings' ? `Based on analyzed job postings (${metrics.analyzed_postings}); this sample does not represent the entire job market.` : metrics.demand_source === 'seeded_role_requirements' ? 'Based on seeded role requirements, not analyzed job market postings.' : 'No market or seeded role-demand data is available.'}
             </p>
           </div>
           
           {metrics.most_in_demand_skills.length ? (
             <div className="flex-1 space-y-3">
               {metrics.most_in_demand_skills.slice(0, 10).map((skill, index) => (
                 <div key={skill.skill} className="flex items-center gap-4 p-3 rounded-xl border border-career-border bg-career-background/50 hover:border-career-primary/30 transition-colors">
                   <div className="w-6 h-6 rounded-full bg-career-surface border border-career-border flex items-center justify-center shrink-0 text-xs font-bold text-career-muted">
                      {index + 1}
                   </div>
                   <span className="font-medium text-sm text-career-dark flex-1 line-clamp-1">{skill.skill}</span>
                   <span className="text-xs font-semibold text-career-secondary bg-career-secondary/10 px-2 py-1 rounded-md whitespace-nowrap">
                      {skill.demand_percent == null ? 'N/A' : `${skill.demand_percent}%`}
                   </span>
                 </div>
               ))}
             </div>
           ) : (
             <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl bg-career-background/50 text-center min-h-[200px]">
                <p className="text-sm font-medium text-career-dark">No role-skill demand data yet.</p>
             </div>
           )}
         </Card>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon?: React.ReactNode }) {
  return (
    <Card hover className="bg-gradient-to-br from-career-surface to-career-background border-career-primary/10">
      <div className="flex items-center gap-2 mb-3">
         <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-career-border flex items-center justify-center shrink-0">
            {icon}
         </div>
         <p className="text-xs font-semibold uppercase tracking-wide text-career-muted">{label}</p>
      </div>
      <p className="mt-1 text-3xl font-serif text-career-dark score-animate">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-career-muted font-medium bg-white/40 p-1.5 rounded-lg border border-career-border/30">{detail}</p>
    </Card>
  );
}