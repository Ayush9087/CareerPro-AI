import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, FileText, LoaderCircle, Save, CheckCircle2, UserCircle2, Briefcase, TrendingUp, Award, Code } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type ProfileValues = {
  id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  college: string | null;
  degree: string | null;
  branch: string | null;
  graduation_year: number | null;
  city: string | null;
  state: string | null;
  experience_level: string | null;
  career_preferences: Record<string, string | null>;
};

type CareerProfile = {
  profile: ProfileValues;
  target_role: { id: string; title: string } | null;
  skills: {
    name: string;
    category: string | null;
    proficiency: number;
    evidence: { type: string; classification: string | null; confidence: number | null; description: string; created_at: string }[];
  }[];
  resume: null | {
    status: string;
    created_at: string;
    ats_score: number | null;
    strengths: string[];
    weaknesses: string[];
    feedback: string | null;
    projects: string[];
    experience: string[];
  };
};

type Role = { id: string; title: string };

export default function Profile() {
  const [data, setData] = useState<CareerProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState<ProfileValues | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadProfile = async () => {
    const [careerProfile, availableRoles] = await Promise.all([
      api.get<CareerProfile>('/api/v1/users/career-profile'),
      api.get<Role[]>('/api/v1/roles'),
    ]);
    setData(careerProfile);
    setForm(careerProfile.profile);
    setRoles(availableRoles);
    setTargetRole(careerProfile.target_role?.title || '');
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<CareerProfile>('/api/v1/users/career-profile'),
      api.get<Role[]>('/api/v1/roles'),
    ])
      .then(([careerProfile, availableRoles]) => {
        if (!active) return;
        setData(careerProfile);
        setForm(careerProfile.profile);
        setRoles(availableRoles);
        setTargetRole(careerProfile.target_role?.title || '');
      })
      .catch((requestError: Error) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setField = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setSaved(false);
  };

  const setPreference = (key: string, value: string) => {
    setForm((current) => current ? {
      ...current,
      career_preferences: { ...current.career_preferences, [key]: value },
    } : current);
    setSaved(false);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.patch('/api/v1/users/profile', {
        full_name: form.full_name.trim(),
        headline: form.headline,
        bio: form.bio,
        college: form.college,
        degree: form.degree,
        branch: form.branch,
        graduation_year: form.graduation_year,
        city: form.city,
        state: form.state,
        experience_level: form.experience_level,
        career_preferences: form.career_preferences,
        target_role: targetRole,
      });
      await loadProfile();
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Profile could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center text-career-muted"><LoaderCircle className="mr-2 h-6 w-6 animate-spin text-career-primary" />Loading profile</div>;
  if (!form || !data) return <div role="alert" className="border-l-4 border-rose-500 bg-career-surface p-4 text-sm text-career-text rounded-r-xl shadow-sm">{error || 'Profile is unavailable.'}</div>;

  const inputClass = 'mt-1.5 block min-h-[44px] w-full rounded-xl border border-career-border bg-career-surface px-4 py-2 text-sm font-medium text-career-dark focus:border-career-primary focus:ring-2 focus:ring-career-primary/20 focus:bg-white focus:outline-none transition-all shadow-sm';
  const labelClass = 'block text-xs font-semibold text-career-dark uppercase tracking-wide';

  return (
    <div className="space-y-8 pb-10 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-career-border/50">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-career-primary mb-1">Career profile</p>
          <h1 className="text-3xl font-serif">Your profile</h1>
          <p className="mt-2 text-sm text-career-muted">Profile details and evidence used by your CareerPro plan.</p>
        </div>
        <Link to="/resume" className="inline-flex items-center gap-2 text-sm font-semibold bg-career-primary/10 text-career-primary px-4 py-2 rounded-xl hover:bg-career-primary/20 transition-colors">
           <FileText className="h-4 w-4" />Resume analysis
        </Link>
      </header>

      {error && (
         <div role="alert" className="flex items-start gap-3 border-l-4 border-rose-500 bg-rose-50 p-4 text-sm text-career-text rounded-r-xl shadow-sm animate-[slide-down_0.3s_ease-out]">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <p>{error}</p>
         </div>
      )}

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
               <UserCircle2 className="w-5 h-5 text-career-primary" />
               <h2 className="text-xl font-serif">Personal details</h2>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>Full Name<input className={inputClass} required value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} placeholder="e.g. Rahul Sharma" /></label>
              <label className={`${labelClass} sm:col-span-2`}>Headline<input className={inputClass} value={form.headline || ''} onChange={(event) => setField('headline', event.target.value || null)} placeholder="e.g. Aspiring Full Stack Developer" /></label>
              <label className={`${labelClass} sm:col-span-2`}>Bio<textarea className={`${inputClass} resize-y min-h-[80px]`} rows={3} value={form.bio || ''} onChange={(event) => setField('bio', event.target.value || null)} placeholder="Tell us a little about yourself..." /></label>
              <label className={labelClass}>College / University<input className={inputClass} value={form.college || ''} onChange={(event) => setField('college', event.target.value || null)} placeholder="e.g. MIT" /></label>
              <label className={labelClass}>Degree<input className={inputClass} value={form.degree || ''} onChange={(event) => setField('degree', event.target.value || null)} placeholder="e.g. B.Tech" /></label>
              <label className={labelClass}>Branch / Major<input className={inputClass} value={form.branch || ''} onChange={(event) => setField('branch', event.target.value || null)} placeholder="e.g. Computer Science" /></label>
              <label className={labelClass}>Graduation year<input className={inputClass} type="number" min="1950" max="2100" value={form.graduation_year ?? ''} onChange={(event) => setField('graduation_year', event.target.value ? Number(event.target.value) : null)} placeholder="e.g. 2024" /></label>
              <label className={labelClass}>City<input className={inputClass} value={form.city || ''} onChange={(event) => setField('city', event.target.value || null)} placeholder="e.g. San Francisco" /></label>
              <label className={labelClass}>State / Region<input className={inputClass} value={form.state || ''} onChange={(event) => setField('state', event.target.value || null)} placeholder="e.g. CA" /></label>
              <label className={`${labelClass} sm:col-span-2`}>Experience level<input className={inputClass} value={form.experience_level || ''} onChange={(event) => setField('experience_level', event.target.value || null)} placeholder="e.g. Entry Level, 2 Years" /></label>
            </div>
          </Card>

          <Card className="p-8 border-career-primary/20 bg-gradient-to-br from-career-surface to-career-background">
            <div className="flex items-center gap-3 mb-6">
               <TrendingUp className="w-5 h-5 text-career-secondary" />
               <h2 className="text-xl font-serif">Career direction</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>Target role
                 <select className={`${inputClass} cursor-pointer`} required value={targetRole} onChange={(event) => { setTargetRole(event.target.value); setSaved(false); }}>
                    <option value="" disabled>Select a role</option>
                    {roles.map((role) => <option key={role.id} value={role.title}>{role.title}</option>)}
                 </select>
              </label>
              <label className={labelClass}>Study time per week
                 <select className={`${inputClass} cursor-pointer`} value={form.career_preferences.available_study_time || ''} onChange={(event) => setPreference('available_study_time', event.target.value)}>
                    <option value="">Not set</option>
                    {['< 5 hours', '5-10 hours', '10-20 hours', '20+ hours'].map((value) => <option key={value}>{value}</option>)}
                 </select>
              </label>
              <label className={labelClass}>Learning style
                 <select className={`${inputClass} cursor-pointer`} value={form.career_preferences.learning_style || ''} onChange={(event) => setPreference('learning_style', event.target.value)}>
                    <option value="">Not set</option>
                    {['Visual', 'Reading', 'Hands-on', 'Mixed'].map((value) => <option key={value}>{value}</option>)}
                 </select>
              </label>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-4 bg-white/40 p-4 rounded-xl border border-career-border/50">
            <Button type="submit" disabled={saving} size="lg" className="shadow-sm">
               {saving ? <LoaderCircle className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
               {saving ? 'Saving profile...' : 'Save changes'}
            </Button>
            {saved && (
               <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg animate-[fade-in_0.3s_ease-out]">
                  <CheckCircle2 className="w-4 h-4" /> Profile saved successfully
               </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <Card hover className="flex flex-col border-career-border">
            <div className="flex items-center justify-between gap-3 mb-6">
               <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-career-primary" />
                  <h2 className="text-xl font-serif">Skills</h2>
               </div>
               <span className="text-xs font-bold text-career-primary bg-career-primary/10 px-2.5 py-1 rounded-md">{data.skills.length} recorded</span>
            </div>
            
            {data.skills.length ? (
               <ul className="flex-1 space-y-3">
                  {data.skills.map((skill) => (
                     <li key={skill.name} className="p-3 bg-career-background/50 border border-career-border rounded-xl">
                        <div className="flex items-center justify-between gap-2 mb-2">
                           <span className="font-semibold text-sm text-career-dark">{skill.name}</span>
                           <span className="text-[10px] font-bold uppercase tracking-wider text-career-secondary bg-career-secondary/10 px-2 py-0.5 rounded">Lvl {skill.proficiency}/5</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-career-muted">
                           <Award className="w-3.5 h-3.5 text-career-primary shrink-0 mt-0.5" />
                           <span className="leading-relaxed">
                              {skill.evidence.length ? `${skill.evidence.length} evidence record${skill.evidence.length === 1 ? '' : 's'} · ${skill.evidence[0].classification || skill.evidence[0].type}` : 'No supporting evidence yet'}
                           </span>
                        </div>
                     </li>
                  ))}
               </ul>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-career-border rounded-xl bg-career-surface text-center min-h-[160px]">
                  <p className="text-sm font-medium text-career-dark">No skills recorded yet</p>
                  <p className="text-xs text-career-muted mt-1">Skills appear after resume analysis or when evidence is recorded.</p>
               </div>
            )}
          </Card>

          <Card hover className="flex flex-col border-career-border">
            <div className="flex items-center justify-between gap-3 mb-5">
               <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-career-secondary" />
                  <h2 className="text-xl font-serif">Projects</h2>
               </div>
               {data.resume?.projects.length ? <span className="text-[10px] font-bold uppercase tracking-wider text-career-muted bg-career-surface border border-career-border px-2 py-0.5 rounded">From resume</span> : null}
            </div>
            
            {data.resume?.projects.length ? (
               <ul className="flex-1 space-y-3">
                  {data.resume.projects.map((project, index) => (
                     <li key={`${project.slice(0, 40)}-${index}`} className="relative pl-4 text-sm leading-relaxed text-career-text bg-white/40 p-3 rounded-lg border border-career-border/50">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-career-secondary/40 rounded-l-lg"></div>
                        {project}
                     </li>
                  ))}
               </ul>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-career-border rounded-xl bg-career-surface text-center min-h-[120px]">
                  <p className="text-sm font-medium text-career-dark">No projects found</p>
                  <p className="text-xs text-career-muted mt-1">Add projects to your resume and re-upload.</p>
               </div>
            )}
          </Card>

          <Card hover className="flex flex-col border-career-border">
            <div className="flex items-center justify-between gap-3 mb-5">
               <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-career-primary" />
                  <h2 className="text-xl font-serif">Resume</h2>
               </div>
               <Link to="/resume" className="text-[10px] font-bold uppercase tracking-wider text-career-primary bg-career-primary/10 hover:bg-career-primary/20 px-2 py-1 rounded transition-colors">
                  Open analysis
               </Link>
            </div>
            
            {data.resume ? (
               <div className="flex-1 bg-career-surface border border-career-border rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                     <span className="capitalize text-xs font-bold text-career-dark bg-white px-2 py-1 rounded shadow-sm border border-career-border/50">{data.resume.status}</span>
                     {data.resume.ats_score != null && (
                        <span className="text-xs font-bold text-career-secondary bg-career-secondary/10 px-2 py-1 rounded">ATS Score: {data.resume.ats_score}/100</span>
                     )}
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-career-muted mb-2">Updated {new Date(data.resume.created_at).toLocaleDateString()}</p>
                  {data.resume.feedback && (
                     <div className="bg-white/60 p-3 rounded-lg border border-career-border/50 mt-2">
                        <p className="text-xs leading-relaxed text-career-dark font-medium italic">"{data.resume.feedback}"</p>
                     </div>
                  )}
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-career-border rounded-xl bg-career-surface text-center min-h-[120px]">
                  <p className="text-sm font-medium text-career-dark">No resume analyzed</p>
                  <p className="text-xs text-career-muted mt-1">Upload a resume in the onboarding flow or resume page.</p>
               </div>
            )}
          </Card>
        </aside>
      </form>
    </div>
  );
}