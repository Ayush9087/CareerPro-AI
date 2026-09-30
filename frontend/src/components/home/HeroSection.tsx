import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-32 overflow-hidden px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center">
        <div className="animate-[fade-up_0.5s_ease-out_both]">
          <span className="text-career-primary font-bold tracking-wider text-sm uppercase mb-4 block">
            CareerPro AI
          </span>
          <h1 className="text-5xl md:text-7xl font-serif text-career-dark leading-tight mb-6 max-w-4xl">
            Know where you stand.<br className="hidden md:block" />
            <span className="text-career-primary">Know exactly what to do next.</span>
          </h1>
          <p className="text-xl md:text-2xl text-career-muted mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            AI-powered career readiness and employability for every student.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-[fade-up_0.5s_ease-out_0.1s_both]">
          <Link to="/login?demo=1" className="w-full sm:w-auto">
            <Button size="lg" className="w-full shadow-sm">
              Start live demo
            </Button>
          </Link>
          <Link to="/signup" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full bg-white">
              Create an account
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-career-muted">
          Assess → Diagnose → Plan → Prove → Track
        </p>

        {/* Abstract organic shape / illustration placeholder */}
        <div className="mt-20 relative w-full max-w-4xl aspect-[21/9] bg-gradient-to-br from-career-surface to-white rounded-[2rem] border border-career-border/60 shadow-sm overflow-hidden flex items-center justify-center animate-[slide-up_0.7s_ease-out_0.2s_both]">
          <div className="w-64 h-64 bg-career-primary/10 rounded-full blur-3xl absolute -top-10 -left-10"></div>
          <div className="w-64 h-64 bg-career-accent/15 rounded-full blur-3xl absolute -bottom-10 -right-10"></div>
          
          <div className="relative z-10 text-center space-y-4 bg-white/40 backdrop-blur-sm p-8 rounded-2xl border border-white/50 shadow-sm">
             <div className="w-24 h-24 rounded-full bg-career-primary flex items-center justify-center mx-auto text-career-surface text-4xl font-serif shadow-md">
                92
             </div>
             <div>
                <p className="font-serif text-2xl text-career-dark">Exceptional Readiness</p>
                <p className="text-career-muted text-sm font-medium mt-1 uppercase tracking-widest">Target Role: Product Manager</p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
