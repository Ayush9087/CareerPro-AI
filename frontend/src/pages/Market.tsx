import { useEffect, useState } from 'react';
import { AlertCircle, BriefcaseBusiness, LoaderCircle, MapPin, RefreshCw, BarChart2, Clock3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type MarketSkill = {
  name: string;
  demand_percent: number | null;
  requirement_strength: number | null;
  posting_count: number;
};

type JobPosting = {
  title: string;
  company: string;
  location: string | null;
  description: string;
  url: string;
  required_skills: string[];
  experience_requirements: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
};

type MarketData = {
  target_role: string;
  data_source: 'adzuna' | 'seeded';
  basis_label: string;
  market_demand_available: boolean;
  analyzed_postings: number;
  analyzed_at: string | null;
  skills: MarketSkill[];
  jobs: JobPosting[];
};

function formatSalary(job: JobPosting) {
  if (job.salary_min == null && job.salary_max == null) return 'Salary not listed';
  const currency = job.salary_currency || '';
  const minimum = job.salary_min?.toLocaleString();
  const maximum = job.salary_max?.toLocaleString();
  if (minimum && maximum) return `${currency} ${minimum}–${maximum}`.trim();
  return `${currency} ${minimum || maximum}+`.trim();
}

function requestMarket(forceRefresh = false) {
  return forceRefresh
    ? api.post<MarketData>('/api/v1/market/refresh', {})
    : api.get<MarketData>('/api/v1/market/intelligence');
}

export default function Market() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    requestMarket()
      .then((result) => { if (active) setMarket(result); })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refreshMarket = async () => {
    setError(null);
    setRefreshing(true);
    try {
      setMarket(await requestMarket(true));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Market intelligence could not be refreshed.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading job market data</div>;
  }

  if (error && !market) {
    return <div className="border-l-4 border-rose-500 bg-career-surface p-5 rounded-r-xl shadow-sm text-sm text-career-text flex items-start gap-3"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><p>{error}</p></div>;
  }

  if (!market) return null;

  const demandChart = market.skills
    .filter((skill) => skill.demand_percent != null)
    .slice(0, 12)
    .map((skill) => ({ name: skill.name, demand: skill.demand_percent }));

  return (
    <div className="space-y-8 pb-8 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-career-border/50 pb-5">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Job market intelligence</p>
          <h1 className="text-3xl font-serif">{market.target_role}</h1>
          <p className="mt-2 text-sm text-career-muted">{market.basis_label}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refreshMarket()}
          disabled={refreshing}
          className="bg-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh data'}
        </Button>
      </header>

      {error && <p role="status" className="border-l-4 border-amber-500 bg-career-surface p-4 rounded-r-xl shadow-sm text-sm text-career-text">Refresh failed; showing the most recent available results. {error}</p>}

      <section className="grid gap-6 sm:grid-cols-2">
        <Card hover className="bg-gradient-to-br from-career-surface to-career-background border-career-primary/20">
          <div className="flex items-center gap-2 mb-2">
             <BarChart2 className="w-5 h-5 text-career-primary" />
             <p className="text-xs font-semibold uppercase tracking-wide text-career-primary">Postings analyzed</p>
          </div>
          <p className="mt-2 text-4xl font-serif text-career-dark score-animate">{market.analyzed_postings}</p>
          <p className="mt-2 text-sm text-career-muted">{market.market_demand_available ? 'Based on live job postings mapped to your target role.' : 'Market demand unavailable; seeded requirements shown.'}</p>
        </Card>
        
        <Card hover>
          <div className="flex items-center gap-2 mb-2">
             <Clock3 className="w-5 h-5 text-career-secondary" />
             <p className="text-xs font-semibold uppercase tracking-wide text-career-secondary">Analysis timestamp</p>
          </div>
          <p className="mt-2 text-lg font-serif text-career-dark">{market.analyzed_at ? new Date(market.analyzed_at).toLocaleString() : 'Not analyzed yet'}</p>
          <p className="mt-2 text-sm text-career-muted">Posting samples are an indicator, not a representation of the entire job market.</p>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Card className="flex flex-col">
          <div className="mb-6">
             <h2 className="text-xl font-serif">Skill demand</h2>
             <p className="mt-1 text-sm text-career-muted">Share of analyzed postings mentioning each skill.</p>
          </div>
          
          {demandChart.length ? (
            <div className="h-[400px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demandChart} layout="vertical" margin={{ top: 0, right: 24, bottom: 0, left: 12 }}>
                  <CartesianGrid stroke="var(--color-career-border)" strokeDasharray="3 5" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-muted)', fontSize: 11, fontWeight: 500 }} />
                  <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fill: 'var(--color-career-dark)', fontSize: 12, fontWeight: 500 }} />
                  <Tooltip cursor={{ fill: 'rgba(95, 107, 53, 0.05)' }} formatter={(value) => [`${value}%`, 'Posting share']} />
                  <Bar dataKey="demand" fill="var(--color-career-primary)" maxBarSize={20} radius={[0, 4, 4, 0]} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : market.skills.length ? (
            <div className="flex-1 space-y-3 mt-2">
              {market.skills.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-career-border bg-career-background/50 hover:border-career-primary/30 transition-colors">
                  <span className="text-sm font-medium text-career-dark">{skill.name}</span>
                  <span className="text-xs font-semibold text-career-primary bg-career-primary/10 px-2 py-1 rounded-md">Strength {skill.requirement_strength}/100</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl text-center bg-career-background/50">
               <p className="text-sm font-medium text-career-dark">No skill requirements available.</p>
            </div>
          )}
        </Card>

        <Card className="flex flex-col">
          <div className="mb-6">
             <h2 className="text-xl font-serif">Analyzed postings</h2>
             <p className="mt-1 text-sm text-career-muted">Recent listings contributing to the skill demand map.</p>
          </div>
          
          {market.jobs.length ? (
            <div className="flex-1 space-y-4">
              {market.jobs.slice(0, 10).map((job, index) => (
                <article key={`${job.url}-${index}`} className="p-5 rounded-2xl border border-career-border bg-career-background/40 hover:bg-career-surface hover:border-career-primary/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <a href={job.url} target="_blank" rel="noreferrer" className="text-base font-semibold text-career-dark hover:text-career-primary transition-colors underline decoration-career-primary/30 underline-offset-4">{job.title}</a>
                      <p className="mt-1 text-sm font-medium text-career-muted">{job.company}</p>
                    </div>
                    <span className="text-xs font-bold text-career-secondary bg-career-secondary/10 px-2 py-1 rounded-md">{formatSalary(job)}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-career-muted">
                     {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-career-primary/60" />{job.location}</span>}
                     {job.experience_requirements && <span className="flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5 text-career-primary/60" />{job.experience_requirements}</span>}
                  </div>
                  
                  {job.required_skills.length > 0 && (
                     <div className="mt-4 flex flex-wrap gap-2">
                        {job.required_skills.map((skill) => (
                           <span key={skill} className="text-[10px] font-semibold uppercase tracking-wider text-career-primary bg-career-primary/10 border border-career-primary/10 px-2 py-0.5 rounded-md">
                              {skill}
                           </span>
                        ))}
                     </div>
                  )}
                  
                  <p className="mt-4 text-sm leading-relaxed text-career-text line-clamp-3 bg-white/40 p-3 rounded-xl border border-career-border/50">
                     {job.description}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl text-center bg-career-background/50">
               <BriefcaseBusiness className="h-8 w-8 text-career-muted mb-3" />
               <p className="text-sm font-medium text-career-dark">No postings currently cached.</p>
               <p className="text-xs text-career-muted mt-1">Seeded role requirements remain available.</p>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}