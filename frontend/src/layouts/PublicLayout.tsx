import { Outlet, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function PublicLayout() {
  return (
    <div className="min-h-dvh max-w-full overflow-x-clip bg-career-background flex flex-col">
      <header className="py-3 px-4 md:px-8 border-b border-career-border/50 flex items-center justify-between gap-3 sticky top-0 bg-career-background/90 backdrop-blur-md z-[30]">
        <Link to="/" className="text-xl sm:text-2xl font-serif text-career-primary font-bold tracking-tight hover:opacity-80 transition-opacity min-w-0 truncate">CareerPro AI</Link>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link to="/login" className="text-sm font-medium text-career-dark hover:text-career-primary transition-colors hidden sm:block">
            Sign in
          </Link>
          <Link to="/login?demo=1" className="hidden sm:block">
            <Button size="sm" variant="secondary" className="bg-white">Live demo</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>
      <main className="flex-1 min-w-0 overflow-x-clip">
        <Outlet />
      </main>
    </div>
  );
}
