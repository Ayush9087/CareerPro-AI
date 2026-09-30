
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-career-background flex items-center justify-center p-4 relative overflow-x-clip overflow-y-auto">
      {/* Subtle organic background shapes */}
      <div className="absolute top-[-10%] right-[-5%] w-[420px] h-[420px] bg-career-primary/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-8%] w-[520px] h-[520px] bg-career-accent/[0.06] rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10 page-enter">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-career-primary font-bold tracking-tight">CareerPro AI</h1>
          <p className="text-career-muted mt-2 text-sm px-2">Know where you stand. Know exactly what to do next.</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
