import { Card } from '../ui/Card';
import { Upload, FileSearch, Target, Map, Award } from 'lucide-react';

export function ProcessSection() {
  const coreLoops = [
    { title: "ASSESS", desc: "Score where you stand from resume evidence." },
    { title: "DIAGNOSE", desc: "Explain the score with a skill gap map." },
    { title: "PLAN", desc: "Assign a 30-day plan to the highest-priority gaps." },
    { title: "PROVE", desc: "Validate skills in an AI mock interview." },
    { title: "TRACK", desc: "Measure score, tasks, interviews, and new evidence." }
  ];

  const workflow = [
    { icon: Upload, title: "UPLOAD", desc: "Drop your resume." },
    { icon: FileSearch, title: "PARSE", desc: "AI extracts your profile." },
    { icon: Target, title: "SCORE", desc: "Get a deterministic baseline." },
    { icon: Map, title: "PLAN", desc: "Generate a 30-day strategy." },
    { icon: Award, title: "TRACK", desc: "Monitor continuous improvement." }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-career-surface border-y border-career-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        
        {/* Problem Statement */}
        <div className="text-center max-w-3xl mx-auto mb-20 animate-[fade-up_0.5s_ease-out_both] intersect-once">
          <h2 className="text-3xl md:text-4xl font-serif text-career-dark mb-6">
            Why career preparation still feels like guesswork.
          </h2>
          <p className="text-lg text-career-muted leading-relaxed">
            Students lack a quantifiable baseline. They don't know exactly what the market demands for their target role, which skills they are missing, or how to bridge the gap in an actionable timeframe. CareerPro AI changes this by replacing ambiguity with precision.
          </p>
        </div>

        {/* Core Loop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-24">
          {coreLoops.map((loop, idx) => (
            <div 
              key={idx}
              className="animate-[fade-up_0.5s_ease-out_both] intersect-once"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <Card hover className="h-full text-center border-career-border/80">
                <h3 className="font-bold text-career-primary tracking-wider mb-2">{loop.title}</h3>
                <p className="text-career-muted text-sm">{loop.desc}</p>
              </Card>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="text-center mb-16 animate-[fade-up_0.5s_ease-out_both] intersect-once">
          <h2 className="text-3xl font-serif text-career-dark mb-4">How It Works</h2>
        </div>
        <div className="flex flex-col md:flex-row justify-between items-center relative gap-8 md:gap-0">
          <div className="hidden md:block absolute top-8 left-16 right-16 h-0.5 bg-career-border/80 -z-10"></div>
          {workflow.map((step, idx) => (
            <div 
              key={idx}
              className="flex flex-col items-center bg-career-surface p-4 w-full md:w-1/5 relative animate-[scale-in_0.5s_ease-out_both] intersect-once"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="w-16 h-16 rounded-full bg-white border border-career-border/80 flex items-center justify-center mb-5 shadow-sm text-career-primary">
                <step.icon size={26} strokeWidth={2.5} />
              </div>
              <h4 className="font-bold text-career-dark mb-2 text-sm uppercase tracking-wider">{step.title}</h4>
              <p className="text-xs text-career-muted text-center font-medium max-w-[150px]">{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
