import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Briefcase, GraduationCap, Trophy, Link as LinkIcon, 
  CheckCircle2, Code, LoaderCircle, AlertCircle, FileCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { NextStepCard } from '../components/demo/NextStepCard';

export default function Resume() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);

  useEffect(() => {
    const fetchLatestResume = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/resumes/latest`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });

        if (response.status === 404) {
          setError("No resume found. Please upload one in the onboarding flow or settings.");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch resume data');
        }

        const data = await response.json();
        
        if (data.status === 'failed') {
          setError("Resume processing failed. Please try uploading again.");
        } else if (data.status !== 'completed') {
          // If it's still processing, poll again in 3 seconds
          setTimeout(fetchLatestResume, 3000);
        } else {
          setResumeData(data.extracted_data);
        }
        
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLatestResume();
  }, [session]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[50vh]">
        <LoaderCircle className="w-8 h-8 text-career-primary animate-spin mb-4" />
        <span className="text-career-muted font-medium text-sm">Loading resume analysis...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="border-l-4 border-rose-500 bg-rose-50 p-5 flex items-start gap-3 rounded-r-xl shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-career-text font-medium text-sm">{error}</p>
        </div>
        <Link to="/onboarding" className="mt-4 inline-flex text-sm font-medium text-career-primary">Upload a resume to start Assess</Link>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 px-4 bg-career-surface border border-career-border/50 rounded-2xl shadow-sm mt-8">
        <div className="w-20 h-20 bg-career-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
           <FileText className="w-8 h-8 text-career-primary" />
        </div>
        <h2 className="text-2xl font-serif text-career-dark mb-3">Resume is processing</h2>
        <p className="text-sm text-career-muted max-w-md mx-auto mb-8 leading-relaxed">Our AI is currently analyzing your resume to extract skills, experience, and generate your career profile. This usually takes a few seconds.</p>
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-career-primary">
           <LoaderCircle className="w-5 h-5 animate-spin" /> Analyzing Document...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 page-enter">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-career-border/50">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-career-primary">Resume intelligence</p>
          <h1 className="text-3xl font-serif">Resume Analysis</h1>
          <p className="mt-2 text-sm text-career-muted leading-relaxed">Extracted profile and skills from your uploaded document.</p>
        </div>
        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
          <FileCheck className="w-4 h-4" />
          Parsed Successfully
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Overview & Skills */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Overview */}
          <Card hover className="p-6 border-career-border animate-[fade-up_0.3s_ease-out_both]">
            <h2 className="text-lg font-serif text-career-dark mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-career-primary" />
              Candidate Overview
            </h2>
            <div className="space-y-5">
              {resumeData.name && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-career-muted mb-1">Name</p>
                  <p className="text-career-dark font-medium">{resumeData.name}</p>
                </div>
              )}
              {resumeData.headline && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-career-muted mb-1">Headline</p>
                  <p className="text-sm text-career-text leading-relaxed">{resumeData.headline}</p>
                </div>
              )}
              {resumeData.links && resumeData.links.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-career-muted mb-2">Links</p>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.links.map((link: string, i: number) => (
                      <a key={i} href={link} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-medium bg-white hover:bg-career-primary/5 text-career-primary px-3 py-2 rounded-lg transition-colors border border-career-border/80 shadow-sm">
                        <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                        {new URL(link.startsWith('http') ? link : `https://${link}`).hostname.replace('www.', '')}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Extracted Skills */}
          <Card hover className="p-6 border-career-border animate-[fade-up_0.4s_ease-out_both]">
            <h2 className="text-lg font-serif text-career-dark mb-5 flex items-center gap-2">
              <Code className="w-5 h-5 text-career-primary" />
              Extracted Skills
            </h2>
            <div className="space-y-4">
              {resumeData.skills?.map((skill: any, i: number) => (
                <div key={i} className="bg-career-background/50 border border-career-border rounded-xl p-4 transition-colors hover:bg-white hover:shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-career-dark text-sm">{skill.normalized_skill}</span>
                    <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider ${
                      skill.confidence > 80 ? 'bg-career-primary/10 text-career-primary' : 'bg-career-accent/15 text-career-secondary'
                    }`}>
                      {skill.confidence}% Conf
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium text-career-muted mt-2 mb-3">
                    <span className="flex items-center bg-white px-2 py-1 rounded border border-career-border/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-career-primary mr-2"></span>
                      Lvl {skill.proficiency_estimate}/5
                    </span>
                    <span className="truncate max-w-[50%]" title={skill.source}>Via {skill.source}</span>
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-career-text italic border-l-2 border-career-secondary/40 pl-3 py-1">
                    "{skill.evidence}"
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Experience, Education, Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Experience */}
          <Card hover className="p-6 md:p-8 border-career-border animate-[fade-up_0.3s_ease-out_both]">
            <h2 className="text-xl font-serif text-career-dark mb-6 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-career-primary" />
              Experience
            </h2>
            {resumeData.experience?.length > 0 ? (
              <div className="space-y-6">
                {resumeData.experience.map((exp: string, i: number) => (
                  <div key={i} className="flex gap-5">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-3.5 h-3.5 rounded-full bg-career-primary mt-1 shadow-sm"></div>
                      {i !== resumeData.experience.length - 1 && <div className="w-0.5 h-full bg-career-primary/20 mt-2 rounded-full"></div>}
                    </div>
                    <div className="pb-4 text-career-text text-sm leading-relaxed whitespace-pre-wrap">{exp}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-career-border rounded-xl p-8 text-center bg-career-background/50">
                 <p className="text-sm font-medium text-career-dark">No experience found</p>
              </div>
            )}
          </Card>

          {/* Projects */}
          <Card hover className="p-6 md:p-8 border-career-border animate-[fade-up_0.4s_ease-out_both]">
            <h2 className="text-xl font-serif text-career-dark mb-6 flex items-center gap-2">
              <Code className="w-5 h-5 text-career-secondary" />
              Projects
            </h2>
            {resumeData.projects?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resumeData.projects.map((proj: string, i: number) => (
                  <div key={i} className="bg-white border border-career-border/80 rounded-xl p-5 text-sm text-career-text leading-relaxed shadow-sm">
                    {proj}
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-career-border rounded-xl p-8 text-center bg-career-background/50">
                 <p className="text-sm font-medium text-career-dark">No projects found</p>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Education */}
            <Card hover className="p-6 border-career-border animate-[fade-up_0.5s_ease-out_both]">
              <h2 className="text-lg font-serif text-career-dark mb-5 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-career-primary" />
                Education
              </h2>
              {resumeData.education?.length > 0 ? (
                <ul className="space-y-4">
                  {resumeData.education.map((edu: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-career-text leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-career-primary mr-3 shrink-0 mt-0.5" />
                      {edu}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center p-4">
                   <p className="text-sm font-medium text-career-muted">No education found</p>
                </div>
              )}
            </Card>

            {/* Achievements */}
            <Card hover className="p-6 border-career-border animate-[fade-up_0.6s_ease-out_both]">
              <h2 className="text-lg font-serif text-career-dark mb-5 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-career-accent" />
                Achievements
              </h2>
              {resumeData.achievements?.length > 0 ? (
                <ul className="space-y-4">
                  {resumeData.achievements.map((achieve: string, i: number) => (
                    <li key={i} className="flex items-start text-sm text-career-text leading-relaxed">
                      <Trophy className="w-4 h-4 text-career-accent mr-3 shrink-0 mt-0.5" />
                      {achieve}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center p-4">
                   <p className="text-sm font-medium text-career-muted">No achievements found</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <NextStepCard
        phase="ASSESS"
        title="Turn this analysis into a readiness score"
        description="The score uses these extracted skills as evidence against your target role requirements."
        to="/readiness"
        label="Calculate readiness"
      />
    </div>
  );
}
