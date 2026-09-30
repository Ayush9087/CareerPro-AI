import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, GraduationCap, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';

export function ImpactSection() {
  return (
    <>
      <section className="py-24 bg-career-surface border-t border-career-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          
          <div className="text-center mb-16 animate-[fade-up_0.5s_ease-out_both] intersect-once">
            <span className="text-career-primary font-bold tracking-wider text-sm uppercase mb-2 block">
              Built for Scale
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-career-dark max-w-2xl mx-auto">
              Accessible, lightweight, and designed for impact.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-24">
            <div className="text-center animate-[fade-up_0.5s_ease-out_both] intersect-once" style={{ animationDelay: '0s' }}>
              <div className="w-16 h-16 rounded-full bg-white border border-career-border/80 flex items-center justify-center mx-auto mb-4 shadow-sm text-career-accent">
                 <Smartphone size={28} />
              </div>
              <h4 className="font-bold text-career-dark mb-2 text-sm">Mobile-First</h4>
              <p className="text-xs text-career-muted font-medium">Optimized for small screens and quick thumb navigation.</p>
            </div>
            <div className="text-center animate-[fade-up_0.5s_ease-out_both] intersect-once" style={{ animationDelay: '0.1s' }}>
              <div className="w-16 h-16 rounded-full bg-white border border-career-border/80 flex items-center justify-center mx-auto mb-4 shadow-sm text-career-accent">
                 <Wifi size={28} />
              </div>
              <h4 className="font-bold text-career-dark mb-2 text-sm">Low-Bandwidth Friendly</h4>
              <p className="text-xs text-career-muted font-medium">Static asset caching for poor network conditions.</p>
            </div>
            <div className="text-center animate-[fade-up_0.5s_ease-out_both] intersect-once" style={{ animationDelay: '0.2s' }}>
              <div className="w-16 h-16 rounded-full bg-white border border-career-border/80 flex items-center justify-center mx-auto mb-4 shadow-sm text-career-accent">
                 <GraduationCap size={28} />
              </div>
              <h4 className="font-bold text-career-dark mb-2 text-sm">For Students</h4>
              <p className="text-xs text-career-muted font-medium">Democratizing access to premium career intelligence.</p>
            </div>
            <div className="text-center animate-[fade-up_0.5s_ease-out_both] intersect-once" style={{ animationDelay: '0.3s' }}>
              <div className="w-16 h-16 rounded-full bg-white border border-career-border/80 flex items-center justify-center mx-auto mb-4 shadow-sm text-career-accent">
                 <Building2 size={28} />
              </div>
              <h4 className="font-bold text-career-dark mb-2 text-sm">For Institutions</h4>
              <p className="text-xs text-career-muted font-medium">Aggregated readiness analytics for placement cells.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="animate-[fade-right_0.5s_ease-out_both] intersect-once">
               <Card hover className="h-full bg-white border-career-border/80 p-8">
                 <h3 className="font-serif text-2xl text-career-dark mb-4">Student Impact</h3>
                 <p className="text-career-muted leading-relaxed">
                   Moves students from anxiety to agency. By providing a clear, deterministic score and a personalized day-by-day roadmap, students stop wasting time on irrelevant tutorials and focus exactly on what the market demands.
                 </p>
               </Card>
            </div>
            <div className="animate-[fade-left_0.5s_ease-out_both] intersect-once">
               <Card hover className="h-full bg-white border-career-border/80 p-8">
                 <h3 className="font-serif text-2xl text-career-dark mb-4">Institution Impact</h3>
                 <p className="text-career-muted leading-relaxed">
                   Transforms placement cells from reactive to proactive. Institutions gain real-time visibility into batch readiness, allowing them to arrange targeted upskilling workshops weeks before actual hiring drives begin.
                 </p>
               </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-career-dark to-[#1A1916] text-career-background text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-career-primary/10 rounded-full blur-[100px]"></div>
           <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-career-accent/10 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10 animate-[fade-up_0.6s_ease-out_both] intersect-once">
          <h2 className="text-4xl md:text-6xl font-serif mb-6 text-career-surface">
            Know where you stand.
          </h2>
          <p className="text-xl text-career-background/70 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
            Stop guessing. Start preparing with precision.
          </p>
          <Link to="/onboarding">
            <Button size="lg" className="bg-career-primary text-career-surface hover:bg-career-primary/90 border border-career-primary/50 text-base md:text-lg px-8 h-14 shadow-lg shadow-black/20 btn-press">
              Start your career readiness assessment
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
