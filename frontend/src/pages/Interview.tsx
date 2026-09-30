import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, MessageSquareText, RotateCw, Sparkles, BrainCircuit, Target, Settings, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type InterviewType = 'technical' | 'behavioral' | 'mixed';
type Difficulty = 'easy' | 'medium' | 'hard';

type RoleOption = { id: string; title: string };
type InterviewOptions = { roles: RoleOption[]; default_target_role_id: string | null; experience_level: string };
type Evaluation = {
  technical_accuracy: number;
  completeness: number;
  clarity: number;
  structure: number;
  communication: number;
  overall_score: number;
  what_went_well: string[];
  what_was_missing: string[];
  how_to_improve: string[];
  recommended_answer_structure: string;
};
type InterviewAnswer = Evaluation & { answer_text: string };
type InterviewQuestion = {
  id: string;
  question_text: string;
  question_type: string | null;
  difficulty: string | null;
  order_index: number;
  answer: InterviewAnswer | null;
};
type InterviewSession = {
  id: string;
  target_role_id: string | null;
  interview_type: InterviewType;
  difficulty: Difficulty;
  status: 'in_progress' | 'completed';
  created_at: string;
  questions: InterviewQuestion[];
  completed_questions: number;
  score: null | {
    overall_score: number;
    feedback_summary: string | null;
    strong_areas: string[];
    weak_areas: string[];
    recommended_practice: string[];
  };
  latest_evaluation?: Evaluation;
  next_question_id?: string | null;
  completed?: boolean;
};

const interviewTypes: { value: InterviewType; label: string }[] = [
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'mixed', label: 'Mixed' },
];
const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];
const criteria: { key: keyof Pick<Evaluation, 'technical_accuracy' | 'completeness' | 'clarity' | 'structure' | 'communication'>; label: string }[] = [
  { key: 'technical_accuracy', label: 'Technical accuracy' },
  { key: 'completeness', label: 'Completeness' },
  { key: 'clarity', label: 'Clarity' },
  { key: 'structure', label: 'Structure' },
  { key: 'communication', label: 'Communication' },
];

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The interview request could not be completed.';
}

export default function Interview() {
  const [options, setOptions] = useState<InterviewOptions | null>(null);
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roleId, setRoleId] = useState('');
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<InterviewOptions>('/api/v1/interviews/options'),
      api.get<{ interviews: InterviewSession[] }>('/api/v1/interviews'),
    ])
      .then(([interviewOptions, sessions]) => {
        if (!active) return;
        setOptions(interviewOptions);
        setRoleId(interviewOptions.default_target_role_id || interviewOptions.roles[0]?.id || '');
        setHistory(sessions.interviews);
        const activeSession = sessions.interviews.find((item) => item.status === 'in_progress');
        if (activeSession) {
          setSession(activeSession);
          const latestAnswered = [...activeSession.questions].reverse().find((question) => question.answer);
          if (latestAnswered?.answer) {
            const { answer_text: _answerText, ...latestEvaluation } = latestAnswered.answer;
            setEvaluation(latestEvaluation);
          }
        }
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const start = async () => {
    if (!roleId) return;
    setStarting(true);
    setError(null);
    try {
      const created = await api.post<InterviewSession>('/api/v1/interviews/start', {
        target_role_id: roleId,
        interview_type: interviewType,
        difficulty,
        question_count: 5,
      });
      setSession(created);
      setEvaluation(null);
      setAnswer('');
      setHistory((current) => [created, ...current]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setStarting(false);
    }
  };

  const submitAnswer = async () => {
    if (!session || !currentQuestion || answer.trim().length < 20) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.post<InterviewSession>(
        `/api/v1/interviews/${session.id}/questions/${currentQuestion.id}/answer`,
        { answer_text: answer.trim() },
      );
      setSession(result);
      setEvaluation(result.latest_evaluation || null);
      setAnswer('');
      setHistory((current) => current.map((item) => item.id === result.id ? result : item));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = session?.questions.find((question) => question.answer === null) || null;
  const advance = () => setEvaluation(null);

  const resumeSession = async (interviewId: string) => {
    setError(null);
    try {
      const loaded = await api.get<InterviewSession>(`/api/v1/interviews/${interviewId}`);
      setSession(loaded);
      const lastAnswered = [...loaded.questions].reverse().find((question) => question.answer);
      if (lastAnswered?.answer) {
        const { answer_text: _answerText, ...lastEvaluation } = lastAnswered.answer;
        setEvaluation(lastEvaluation);
      } else {
        setEvaluation(null);
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (loading) {
    return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Preparing your interview</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-career-border/50">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Practice and improve</p>
          <h1 className="text-3xl font-serif">AI Mock Interview</h1>
          <p className="mt-2 max-w-2xl text-sm text-career-muted leading-relaxed">Practice role-specific questions and get feedback on observable answer quality: accuracy, completeness, clarity, structure, and communication.</p>
        </div>
      </header>

      {error && (
         <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-career-text rounded-r-xl shadow-sm animate-[slide-down_0.3s_ease-out]">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
         </div>
      )}

      {!session ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <Card className="border border-career-border/50 bg-gradient-to-br from-career-surface to-white p-8">
            <div className="flex items-center gap-3 mb-6">
               <Settings className="w-6 h-6 text-career-primary" />
               <h2 className="text-2xl font-serif">Set up your practice</h2>
            </div>
            
            <div className="space-y-6">
               <div className="grid gap-5 sm:grid-cols-2">
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-career-dark block">Target role</label>
                    <select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="w-full rounded-xl border border-career-border bg-white px-4 py-3 text-sm font-medium text-career-dark focus:ring-2 focus:ring-career-primary focus:outline-none hover:border-career-primary/40 transition-colors shadow-sm">
                      {options?.roles.map((role) => <option key={role.id} value={role.id}>{role.title}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-semibold text-career-dark block">Difficulty</label>
                    <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty)} className="w-full rounded-xl border border-career-border bg-white px-4 py-3 text-sm font-medium text-career-dark focus:ring-2 focus:ring-career-primary focus:outline-none hover:border-career-primary/40 transition-colors shadow-sm">
                      {difficulties.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                 </div>
               </div>
               
               <fieldset className="space-y-2">
                 <legend className="text-sm font-semibold text-career-dark block mb-2">Interview type</legend>
                 <div className="flex bg-career-background p-1.5 rounded-xl border border-career-border" role="group" aria-label="Interview type">
                   {interviewTypes.map((item) => (
                      <button 
                         key={item.value} 
                         type="button" 
                         aria-pressed={interviewType === item.value} 
                         onClick={() => setInterviewType(item.value)} 
                         className={`flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-all duration-200 ${interviewType === item.value ? 'bg-white text-career-primary shadow-sm ring-1 ring-black/5' : 'text-career-muted hover:text-career-dark hover:bg-white/50'}`}
                      >
                         {item.label}
                      </button>
                   ))}
                 </div>
               </fieldset>
               
               <div className="bg-career-primary/5 border border-career-primary/10 rounded-xl p-4 flex items-start gap-3">
                  <BrainCircuit className="w-5 h-5 text-career-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-career-dark leading-relaxed font-medium">5 questions · About 10-20 minutes · Your answer is evaluated based on its content, technical accuracy, and structure, not psychological traits.</p>
               </div>
               
               <div className="pt-2">
                  <Button onClick={() => void start()} disabled={starting || !roleId} size="lg" className="w-full sm:w-auto">
                    {starting ? <LoaderCircle className="h-5 w-5 animate-spin mr-2" /> : <MessageSquareText className="h-5 w-5 mr-2" />}
                    {starting ? 'Preparing questions...' : 'Start interview'}
                  </Button>
               </div>
            </div>
          </Card>

          <aside className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
               <History className="w-5 h-5 text-career-muted" />
               <h2 className="text-xl font-serif">Recent sessions</h2>
            </div>
            
            {history.length ? (
               <ul className="flex-1 space-y-3">
                  {history.slice(0, 5).map((item) => (
                     <li key={item.id}>
                        <button type="button" onClick={() => void resumeSession(item.id)} className="w-full flex items-center justify-between gap-3 text-left bg-white border border-career-border/80 hover:border-career-primary/40 hover:shadow-sm p-4 rounded-xl transition-all group">
                           <div>
                              <span className="block text-sm font-bold capitalize text-career-dark group-hover:text-career-primary transition-colors">{item.interview_type} · {item.difficulty}</span>
                              <div className="flex items-center gap-2 mt-1.5">
                                 <span className="text-[11px] font-medium text-career-muted">{new Date(item.created_at).toLocaleDateString()}</span>
                                 <span className="w-1 h-1 rounded-full bg-career-border"></span>
                                 {item.status === 'completed' ? (
                                    <span className="text-[11px] font-bold text-career-primary bg-career-primary/10 px-1.5 py-0.5 rounded">{item.score?.overall_score ?? 0}/100</span>
                                 ) : (
                                    <span className="text-[11px] font-bold text-career-accent bg-career-accent/10 px-1.5 py-0.5 rounded">In progress</span>
                                 )}
                              </div>
                           </div>
                           <ArrowRight className="h-4 w-4 shrink-0 text-career-border group-hover:text-career-primary transition-colors transform group-hover:translate-x-1" />
                        </button>
                     </li>
                  ))}
               </ul>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-career-border rounded-xl text-center bg-career-surface">
                  <p className="text-sm font-medium text-career-dark">No recent sessions</p>
                  <p className="text-xs text-career-muted mt-1">Your completed practices will appear here.</p>
               </div>
            )}
          </aside>
        </div>
      ) : evaluation ? (
        <Card className="max-w-3xl mx-auto space-y-8 p-8 border border-career-border/50 animate-[fade-in_0.4s_ease-out]">
          <div className="flex items-center justify-between gap-4 border-b border-career-border/50 pb-6">
            <div>
               <p className="text-xs font-bold uppercase tracking-widest text-career-primary mb-1">Evaluation · Question {session.completed_questions} of {session.questions.length}</p>
               <h2 className="text-2xl font-serif">Feedback on your answer</h2>
            </div>
            <div className="text-right bg-career-surface px-4 py-2 rounded-xl border border-career-border">
               <p className="text-3xl font-serif text-career-dark score-animate">{evaluation.overall_score}</p>
               <p className="text-[10px] uppercase font-bold text-career-muted tracking-wider">out of 100</p>
            </div>
          </div>
          
          <div>
             <h3 className="text-sm font-bold uppercase tracking-widest text-career-dark mb-4">Scoring Breakdown</h3>
             <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
               {criteria.map(({ key, label }) => (
                  <div key={key}>
                     <div className="mb-2 flex justify-between gap-3 text-xs font-semibold">
                        <span className="text-career-dark">{label}</span>
                        <span className="tabular-nums text-career-primary bg-career-primary/10 px-1.5 rounded">{evaluation[key]}</span>
                     </div>
                     <div className="h-2 rounded-full bg-career-background overflow-hidden border border-career-border/30">
                        <div className="h-full bg-career-primary transition-all duration-1000 ease-out" style={{ width: `${evaluation[key]}%` }} />
                     </div>
                  </div>
               ))}
             </div>
          </div>
          
          <div className="grid gap-6">
             <FeedbackList title="What went well" items={evaluation.what_went_well} icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} />
             <FeedbackList title="What was missing" items={evaluation.what_was_missing} empty="The answer covered all key points for this question." icon={<CircleAlert className="w-5 h-5 text-rose-500" />} />
             <FeedbackList title="How to improve" items={evaluation.how_to_improve} icon={<Target className="w-5 h-5 text-career-secondary" />} />
          </div>
          
          <div className="bg-career-primary/5 border border-career-primary/20 p-5 rounded-xl">
             <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-career-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-career-primary">Recommended Structure</p>
             </div>
             <p className="text-sm leading-relaxed text-career-dark">{evaluation.recommended_answer_structure}</p>
          </div>
          
          <div className="pt-4 border-t border-career-border/50 flex justify-end">
             {session.status === 'completed' ? (
               <Button onClick={advance} size="lg">
                 View final results <ArrowRight className="h-4 w-4 ml-2" />
               </Button>
             ) : (
               <Button onClick={advance} size="lg">
                 Next question <ArrowRight className="h-4 w-4 ml-2" />
               </Button>
             )}
          </div>
        </Card>
      ) : session.status === 'completed' ? (
        <div className="space-y-8 animate-[fade-in_0.4s_ease-out]">
          <Card className="text-center py-10 bg-gradient-to-b from-career-surface to-white border-career-primary/20">
            <div className="w-20 h-20 rounded-full bg-career-primary text-career-surface flex items-center justify-center mx-auto mb-6 shadow-md animate-[scale-in_0.5s_ease-out]">
               <span className="text-3xl font-serif">{session.score?.overall_score ?? 0}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-career-primary mb-2">Interview Complete</p>
            <h2 className="text-3xl font-serif mb-4">Your performance summary</h2>
            <p className="text-sm text-career-text leading-relaxed max-w-2xl mx-auto">{session.score?.feedback_summary}</p>
          </Card>
          
          <div className="grid gap-6 md:grid-cols-3">
            <SummaryList title="Strong areas" items={session.score?.strong_areas || []} empty="Strengths will appear after evaluated answers." tone="good" />
            <SummaryList title="Weak areas" items={session.score?.weak_areas || []} empty="No weak areas below the feedback threshold." tone="needs-work" />
            <SummaryList title="Recommended practice" items={session.score?.recommended_practice || []} empty="Keep practicing role-specific questions." tone="neutral" />
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 pt-6">
            <Link to="/progress" className="inline-flex items-center justify-center gap-2 rounded-xl bg-career-primary px-6 py-3 text-sm font-medium text-career-surface hover:bg-career-primary/90 btn-press">
               See how this updates progress <ArrowRight className="h-4 w-4" />
            </Link>
            <Button onClick={() => { setSession(null); setEvaluation(null); }} size="lg" className="shadow-sm">
               <RotateCw className="h-4 w-4 mr-2" />Start another interview
            </Button>
          </div>
        </div>
      ) : currentQuestion ? (
        <Card className="max-w-3xl mx-auto p-8 border border-career-border/50 animate-[slide-up_0.4s_ease-out]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-career-primary bg-career-primary/10 px-3 py-1.5 rounded-md border border-career-primary/10">Question {currentQuestion.order_index} of {session.questions.length}</p>
            <p className="text-xs font-semibold capitalize text-career-muted">{session.interview_type} · {session.difficulty}</p>
          </div>
          
          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-career-muted mb-2">{currentQuestion.question_type?.replace('_', ' ')}</p>
            <h2 className="text-2xl font-serif leading-snug text-career-dark">{currentQuestion.question_text}</h2>
          </div>
          
          <div>
             <label htmlFor="interview-answer" className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-career-dark uppercase tracking-wider">Your answer</span>
                <span className="text-xs font-medium text-career-muted">{answer.length}/10000 chars</span>
             </label>
             <textarea 
               id="interview-answer" 
               value={answer} 
               onChange={(event) => setAnswer(event.target.value)} 
               rows={10} 
               maxLength={10000} 
               placeholder="Answer with specific details, structure your thoughts clearly, and explain your reasoning..." 
               className="w-full resize-y rounded-xl border border-career-border bg-career-background/50 p-5 text-sm leading-relaxed text-career-dark placeholder:text-career-muted/60 focus:ring-2 focus:ring-career-primary focus:border-career-primary focus:outline-none transition-shadow shadow-inner" 
             />
             <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-career-muted font-medium">
                <span className="flex items-center gap-1.5"><CircleAlert className="w-3.5 h-3.5" /> Minimum 20 characters required. Feedback evaluates content only.</span>
             </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-career-border/50 flex justify-end">
             <Button onClick={() => void submitAnswer()} disabled={submitting || answer.trim().length < 20} size="lg">
               {submitting ? <LoaderCircle className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
               {submitting ? 'Evaluating answer...' : 'Submit for feedback'}
             </Button>
          </div>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto py-12 text-center text-sm font-medium text-career-muted border-dashed">
           This interview has no remaining questions.
        </Card>
      )}
    </div>
  );
}

function FeedbackList({ title, items, empty, icon }: { title: string; items: string[]; empty?: string; icon: React.ReactNode }) {
  return (
     <div className="bg-career-surface/50 border border-career-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
           {icon}
           <h3 className="text-sm font-bold text-career-dark uppercase tracking-wider">{title}</h3>
        </div>
        {items.length ? (
           <ul className="space-y-3">
              {items.map((item, index) => (
                 <li key={`${item}-${index}`} className="text-sm leading-relaxed text-career-text flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-career-border mt-1.5 shrink-0"></div>
                    {item}
                 </li>
              ))}
           </ul>
        ) : (
           <p className="text-sm text-career-muted italic">{empty || 'No additional points.'}</p>
        )}
     </div>
  );
}

function SummaryList({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: 'good' | 'needs-work' | 'neutral' }) {
  const markerClass = tone === 'good' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : tone === 'needs-work' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-career-primary/5 text-career-dark border-career-primary/20';
  const iconColor = tone === 'good' ? 'text-emerald-600' : tone === 'needs-work' ? 'text-rose-600' : 'text-career-primary';
  
  return (
     <Card hover className={`flex flex-col border ${markerClass.split(' ')[2]}`}>
        <h3 className="text-xl font-serif text-career-dark mb-4">{title}</h3>
        {items.length ? (
           <ul className="flex-1 space-y-3">
              {items.map((item, index) => (
                 <li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-career-text">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
                    {item}
                 </li>
              ))}
           </ul>
        ) : (
           <div className="flex-1 flex items-center justify-center p-4 border border-dashed border-career-border/50 rounded-lg bg-white/40">
              <p className="text-sm text-career-muted">{empty}</p>
           </div>
        )}
     </Card>
  );
}