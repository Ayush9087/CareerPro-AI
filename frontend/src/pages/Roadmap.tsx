import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, Check, Clock3, LoaderCircle, RotateCw, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { NextStepCard } from '../components/demo/NextStepCard';

type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

type RoadmapTask = {
  id: string;
  title: string;
  description: string | null;
  why_it_matters: string | null;
  estimated_minutes: number | null;
  difficulty: number | null;
  skill: string | null;
  resource: string | null;
  evidence_requirement: string | null;
  status: TaskStatus;
  priority_score: number;
  evidence: string | null;
};

type RoadmapWeek = {
  week_number: number;
  objective: string;
  skills: string[];
  estimated_hours: number;
  tasks: RoadmapTask[];
};

type RoadmapData = {
  id: string;
  title: string;
  created_at: string;
  weeks: RoadmapWeek[];
};

const statusLabels: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
};

const statusOptions: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'skipped'];

export default function Roadmap() {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, TaskStatus>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingTask, setSavingTask] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.get<RoadmapData>('/api/v1/roadmap')
      .then((data) => { if (active) setRoadmap(data); })
      .catch((requestError: Error) => {
        if (!active) return;
        if (!/roadmap not found/i.test(requestError.message)) setError(requestError.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      setRoadmap(await api.post<RoadmapData>('/api/v1/roadmap/generate', {}));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Roadmap generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const saveTask = async (task: RoadmapTask) => {
    const status = statusDrafts[task.id] ?? task.status;
    const evidence = status === 'completed'
      ? (evidenceDrafts[task.id] ?? task.evidence ?? '').trim()
      : '';
    if (evidence && evidence.length < 20) {
      setError('Evidence must contain at least 20 characters.');
      return;
    }
    setSavingTask(task.id);
    setError(null);
    try {
      const update = await api.patch<RoadmapData>(`/api/v1/roadmap/tasks/${task.id}`, {
        status,
        ...(evidence ? { evidence } : {}),
      });
      setRoadmap(update);
      setStatusDrafts({});
      setEvidenceDrafts({});
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Task progress could not be saved.');
    } finally {
      setSavingTask(null);
    }
  };

  const taskCount = roadmap?.weeks.reduce((total, week) => total + week.tasks.length, 0) || 0;
  const completedCount = roadmap?.weeks.reduce(
    (total, week) => total + week.tasks.filter((task) => task.status === 'completed').length,
    0,
  ) || 0;

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading your roadmap</div>;
  }

  return (
    <div className="space-y-8 pb-8 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-career-border/50">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Career plan</p>
          <h1 className="text-3xl font-serif">30-day roadmap</h1>
          <p className="mt-2 max-w-xl text-sm text-career-muted">A weekly plan shaped by your target role, readiness evidence, current skills, experience, and study time.</p>
        </div>
        {roadmap && (
           <div className="text-right bg-career-surface border border-career-border px-4 py-2.5 rounded-xl shadow-[0_1px_3px_rgba(48,42,30,0.04)]">
              <p className="text-sm font-semibold text-career-dark"><span className="text-xl font-serif score-animate text-career-primary">{completedCount}</span> of {taskCount} tasks completed</p>
              <p className="mt-1 text-xs text-career-muted font-medium">Progress updates your readiness score.</p>
           </div>
        )}
      </header>

      {error && (
         <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-500 bg-career-surface p-4 text-sm text-career-text rounded-r-xl shadow-sm animate-[slide-down_0.3s_ease-out]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
         </div>
      )}

      {!roadmap ? (
        <Card className="max-w-2xl py-12 text-center bg-gradient-to-br from-career-surface to-career-background border-career-primary/20">
          <div className="w-16 h-16 bg-career-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <BookOpen className="h-8 w-8 text-career-primary" />
          </div>
          <h2 className="text-2xl font-serif text-career-dark mb-3">Build your personalized roadmap</h2>
          <p className="text-sm leading-relaxed text-career-muted max-w-md mx-auto mb-8">
             Your plan will focus on the highest-priority skill gaps and fit the weekly study time in your profile.
          </p>
          <Button onClick={() => void generate()} disabled={generating} size="lg" className="w-full sm:w-auto">
            {generating ? <LoaderCircle className="h-5 w-5 animate-spin mr-2" /> : <RotateCw className="h-5 w-5 mr-2" />}
            {generating ? 'Building your plan...' : 'Generate roadmap'}
          </Button>
        </Card>
      ) : (
        <>
        <div className="flex items-center gap-3 bg-white/40 p-4 rounded-xl border border-career-border/50">
           <div className="flex-1">
              <h2 className="text-lg font-serif">{roadmap.title}</h2>
              <p className="mt-1 text-xs font-medium text-career-muted">Generated {new Date(roadmap.created_at).toLocaleDateString()}</p>
           </div>
           <Link to="/interview" className="hidden sm:flex items-center gap-2 text-sm font-medium bg-career-primary text-career-surface px-4 py-2 rounded-lg hover:bg-career-primary/90 transition-colors btn-press">
              Start Practice Interview <ArrowRight className="h-4 w-4" />
           </Link>
           <Button variant="secondary" size="sm" onClick={() => void generate()} disabled={generating} className="bg-white">
             {generating ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <RotateCw className="h-4 w-4 mr-2" />}
             Regenerate Plan
           </Button>
        </div>

          <div className="space-y-10">
            {roadmap.weeks.map((week) => (
              <section key={week.week_number} className="relative">
                {/* Connecting line between weeks */}
                <div className="absolute left-6 top-16 bottom-[-2.5rem] w-0.5 bg-career-border/60 z-0"></div>
                
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-career-primary text-career-surface flex items-center justify-center text-xl font-serif shadow-sm">
                        {week.week_number}
                     </div>
                     <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-1">Week {week.week_number}</p>
                        <h3 className="text-xl font-serif text-career-dark">{week.objective}</h3>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 bg-career-surface border border-career-border px-3 py-1.5 rounded-lg ml-16 md:ml-0">
                     <Clock3 className="h-4 w-4 text-career-muted" />
                     <p className="text-sm font-medium text-career-dark">{week.estimated_hours} <span className="text-career-muted font-normal">estimated hours</span></p>
                  </div>
                </header>
                
                <div className="ml-16 mb-6">
                   <div className="flex flex-wrap gap-2 text-xs">
                      {week.skills.map((skill) => (
                         <span key={skill} className="font-semibold uppercase tracking-wider text-career-primary bg-career-primary/10 border border-career-primary/10 px-2 py-1 rounded-md">
                            {skill}
                         </span>
                      ))}
                   </div>
                </div>

                <div className="space-y-4 ml-6 md:ml-16 relative z-10">
                  {week.tasks.map((task) => {
                    const status = statusDrafts[task.id] ?? task.status;
                    const evidence = evidenceDrafts[task.id] ?? task.evidence ?? '';
                    const isCompleted = status === 'completed';
                    
                    return (
                      <Card key={task.id} hover className={`grid gap-6 py-6 px-6 lg:grid-cols-[1fr_20rem] transition-all duration-300 ${isCompleted ? 'bg-career-primary/[0.02] border-career-primary/30 task-complete' : ''}`}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <h4 className="font-serif text-lg text-career-dark mr-2">{task.title}</h4>
                            {task.skill && <span className="text-[10px] font-semibold uppercase tracking-wider text-career-secondary bg-career-secondary/10 px-2 py-0.5 rounded-md">{task.skill}</span>}
                            {task.estimated_minutes != null && <span className="text-xs font-medium text-career-muted bg-career-surface border border-career-border px-2 py-0.5 rounded-md flex items-center gap-1"><Clock3 className="w-3 h-3"/>{task.estimated_minutes} min</span>}
                            {task.difficulty != null && <span className="text-[10px] font-semibold uppercase tracking-wider text-career-muted bg-career-surface border border-career-border px-2 py-0.5 rounded-md">Lvl {task.difficulty}/5</span>}
                          </div>
                          
                          {task.description && <p className="text-sm leading-relaxed text-career-text mb-4">{task.description}</p>}
                          
                          <div className="space-y-3 bg-career-background/50 p-4 rounded-xl border border-career-border/50">
                             {task.why_it_matters && (
                               <div>
                                 <p className="text-[10px] font-semibold uppercase tracking-widest text-career-muted mb-1">Why it matters</p>
                                 <p className="text-sm leading-relaxed text-career-text italic">"{task.why_it_matters}"</p>
                               </div>
                             )}
                             {task.evidence_requirement && (
                               <div className="pt-2 border-t border-career-border/50">
                                  <p className="text-sm text-career-dark flex items-start gap-2">
                                     <Check className="mt-0.5 shrink-0 h-4 w-4 text-career-primary" />
                                     <span><span className="font-semibold">Evidence required:</span> {task.evidence_requirement}</span>
                                  </p>
                               </div>
                             )}
                          </div>
                          
                          {task.resource && (
                            <div className="mt-4 inline-block">
                               {/^https:\/\//i.test(task.resource)
                                 ? <a className="inline-flex items-center gap-1.5 text-sm font-medium text-career-surface bg-career-dark px-3 py-1.5 rounded-lg hover:bg-black transition-colors" href={task.resource} target="_blank" rel="noreferrer"><BookOpen className="h-4 w-4" />View Learning Resource</a>
                                 : <p className="text-sm font-medium text-career-dark bg-career-surface border border-career-border px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4 text-career-primary" />{task.resource}</p>}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-3 bg-white/60 p-5 rounded-xl border border-career-border">
                          <div>
                             <label className="block text-xs font-semibold uppercase tracking-wide text-career-muted mb-1.5" htmlFor={`status-${task.id}`}>Task status</label>
                             <select id={`status-${task.id}`} value={status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [task.id]: event.target.value as TaskStatus }))} className="w-full rounded-xl border border-career-border bg-white px-3 py-2.5 text-sm font-medium text-career-dark focus:ring-2 focus:ring-career-primary focus:outline-none hover:border-career-primary/40 transition-colors cursor-pointer shadow-sm">
                               {statusOptions.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}
                             </select>
                          </div>
                          <div className="flex-1 flex flex-col">
                             <label className="block text-xs font-semibold uppercase tracking-wide text-career-muted mb-1.5" htmlFor={`evidence-${task.id}`}>Evidence note</label>
                             <textarea id={`evidence-${task.id}`} value={evidence} onChange={(event) => setEvidenceDrafts((current) => ({ ...current, [task.id]: event.target.value }))} rows={3} maxLength={4000} placeholder="Describe what you built or learned..." className="w-full flex-1 resize-none rounded-xl border border-career-border bg-white px-3 py-2 text-sm text-career-dark placeholder:text-career-muted/60 focus:ring-2 focus:ring-career-primary focus:outline-none hover:border-career-primary/40 transition-colors shadow-sm" />
                          </div>
                          <Button onClick={() => void saveTask(task)} disabled={savingTask === task.id || (status === task.status && evidence === (task.evidence || ''))} className="w-full mt-1">
                            {savingTask === task.id ? <LoaderCircle className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                            {savingTask === task.id ? 'Saving...' : 'Save progress'}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {roadmap && (
        <NextStepCard
          phase="PROVE"
          title="Prove the plan with a mock interview"
          description="Interview scores update interview readiness. Completing tasks with evidence updates the rest of the score."
          to="/interview"
          label="Start mock interview"
        />
      )}
    </div>
  );
}