import { Card } from '../ui/Card';
import { CheckCircle2, Clock, XCircle, Bot, Calendar, Target } from 'lucide-react';

export function FeatureShowcase() {
  return (
    <section className="py-24 bg-career-background overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-32">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto animate-[fade-up_0.5s_ease-out_both] intersect-once">
          <span className="text-career-secondary font-bold tracking-wider text-sm uppercase mb-2 block">
            Intelligence Engine
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-career-dark">
            Precision tools for a precise career trajectory.
          </h2>
        </div>

        {/* 1. Readiness Score & Skill Gap */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-[fade-right_0.5s_ease-out_both] intersect-once">
            <h3 className="text-3xl font-serif text-career-dark mb-4">The Skill Gap Map</h3>
            <p className="text-career-muted mb-8 text-lg leading-relaxed">
              Don't guess what you're missing. Our semantic engine parses your history against live market data to categorize your competencies into what you have, what you're learning, and what you critically lack.
            </p>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="text-career-primary mt-1 w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-career-dark text-sm uppercase tracking-wider mb-1">Have</h4>
                  <p className="text-sm text-career-muted font-medium">React, TypeScript, Tailwind CSS</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Clock className="text-career-accent mt-1 w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-career-dark text-sm uppercase tracking-wider mb-1">Learning</h4>
                  <p className="text-sm text-career-muted font-medium">Next.js, Node.js</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <XCircle className="text-career-secondary mt-1 w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-career-dark text-sm uppercase tracking-wider mb-1">Missing</h4>
                  <p className="text-sm text-career-muted font-medium">System Design, AWS Fundamentals</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative animate-[fade-left_0.5s_ease-out_both] intersect-once">
             <Card hover className="p-8 text-center bg-white border-career-border/60">
                <h4 className="font-serif text-career-dark text-xl mb-8">Target: Full Stack Engineer</h4>
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-career-border/50" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-career-primary" strokeDasharray="283" strokeDashoffset="56.6" strokeLinecap="round" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 rounded-full m-4">
                      <span className="text-5xl font-serif text-career-dark">80</span>
                      <span className="text-[10px] text-career-muted font-bold tracking-widest uppercase mt-1">out of 100</span>
                   </div>
                </div>
                <div className="mt-8 inline-block bg-career-primary/10 text-career-primary px-4 py-2 rounded-xl text-sm font-bold">
                   Ready for interview stage
                </div>
             </Card>
          </div>
        </div>

        {/* 2. 30-Day Roadmap */}
        <div className="grid md:grid-cols-2 gap-12 items-center flex-col-reverse md:flex-row-reverse">
          <div className="animate-[fade-left_0.5s_ease-out_both] intersect-once">
            <h3 className="text-3xl font-serif text-career-dark mb-4">30-Day Actionable Roadmap</h3>
            <p className="text-career-muted mb-8 text-lg leading-relaxed">
              Knowledge without action is useless. CareerPro AI generates a day-by-day learning strategy specifically tailored to bridge your exact skill gaps before your target interview.
            </p>
            <ul className="space-y-4 font-medium text-career-dark">
               <li className="flex items-center gap-3 bg-white p-3 rounded-xl border border-career-border/50 shadow-sm"><Target size={20} className="text-career-primary"/> Week 1: Master System Design basics</li>
               <li className="flex items-center gap-3 bg-white p-3 rounded-xl border border-career-border/50 shadow-sm"><Target size={20} className="text-career-primary"/> Week 2: Build a microservice with Node.js</li>
               <li className="flex items-center gap-3 bg-white p-3 rounded-xl border border-career-border/50 shadow-sm"><Target size={20} className="text-career-primary"/> Week 3: Deploy to AWS via CI/CD</li>
            </ul>
          </div>
          <div className="animate-[fade-right_0.5s_ease-out_both] intersect-once">
            <Card hover className="relative overflow-hidden p-0 border-career-border/80 bg-white">
               <div className="bg-gradient-to-r from-career-primary to-career-primary/90 text-white p-5 flex items-center gap-3">
                  <Calendar className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-wider text-sm">Day 14 / 30</span>
               </div>
               <div className="p-8 space-y-6">
                  <div className="flex gap-5">
                     <div className="w-6 flex flex-col items-center shrink-0">
                        <div className="w-4 h-4 rounded-full bg-career-primary shadow-sm"></div>
                        <div className="w-0.5 h-full bg-career-primary/20 mt-3 rounded-full"></div>
                     </div>
                     <div className="pb-2">
                        <h5 className="font-bold text-career-dark text-lg mb-1">Understand CAP Theorem</h5>
                        <p className="text-sm text-career-muted leading-relaxed">Read DynamoDB whitepaper concepts and write a 2-page summary.</p>
                     </div>
                  </div>
                  <div className="flex gap-5">
                     <div className="w-6 flex flex-col items-center shrink-0">
                        <div className="w-4 h-4 rounded-full bg-career-background border-2 border-career-border shadow-inner"></div>
                        <div className="w-0.5 h-full bg-career-border/50 mt-3 rounded-full"></div>
                     </div>
                     <div className="pb-2">
                        <h5 className="font-bold text-career-muted text-lg mb-1">Design URL Shortener</h5>
                        <p className="text-sm text-career-muted/60 leading-relaxed">Practice horizontal scaling patterns.</p>
                     </div>
                  </div>
               </div>
            </Card>
          </div>
        </div>

        {/* 3. AI Mock Interview */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-[fade-right_0.5s_ease-out_both] intersect-once">
            <h3 className="text-3xl font-serif text-career-dark mb-4">AI Mock Interviewer</h3>
            <p className="text-career-muted mb-6 text-lg leading-relaxed">
              Prove your readiness. Engage in a dynamic, conversational interview where CareerPro AI acts as your hiring manager, challenging your decisions and evaluating your communication.
            </p>
          </div>
          <div className="animate-[fade-left_0.5s_ease-out_both] intersect-once">
            <Card hover className="bg-career-surface border-career-border/80 p-0 overflow-hidden">
               <div className="flex items-center gap-3 p-5 border-b border-career-border/50 bg-white/40">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-career-dark to-black text-career-surface flex items-center justify-center shadow-sm">
                     <Bot size={24} />
                  </div>
                  <div>
                     <h5 className="font-serif text-career-dark text-lg">Tech Lead AI</h5>
                     <p className="text-xs font-bold text-career-primary uppercase tracking-wider">Evaluating System Design</p>
                  </div>
               </div>
               <div className="p-6 space-y-5">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-career-border/60 shadow-sm text-sm text-career-dark max-w-[85%] leading-relaxed">
                     "How would you handle eventual consistency in the user profile service?"
                  </div>
                  <div className="bg-career-primary p-4 rounded-2xl rounded-tr-sm text-sm text-white max-w-[85%] ml-auto text-right leading-relaxed shadow-sm">
                     "I'd use an event-driven approach with Kafka to sync read-replicas..."
                  </div>
                  <div className="flex gap-2 items-center mt-6 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                     <CheckCircle2 size={16} className="shrink-0" /> Strong architectural justification.
                  </div>
               </div>
            </Card>
          </div>
        </div>

      </div>
    </section>
  );
}
