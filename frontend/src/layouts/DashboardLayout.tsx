import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Home,
  Compass,
  Target,
  MessageSquare,
  User,
  LogOut,
  Gauge,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  School,
  Map,
  FileText,
  GitCompare,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { DemoJourneyBar } from '../components/demo/DemoJourneyBar';

// ── Desktop sidebar navigation (full set) ────────────────────
const sidebarItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: FileText, label: 'Resume', path: '/resume' },
  { icon: Gauge, label: 'Readiness', path: '/readiness' },
  { icon: GitCompare, label: 'Skill gaps', path: '/skills' },
  { icon: Target, label: 'Roadmap', path: '/roadmap' },
  { icon: MessageSquare, label: 'Practice', path: '/interview' },
  { icon: ChartNoAxesCombined, label: 'Progress', path: '/progress' },
  { icon: Compass, label: 'AI Coach', path: '/chat' },
  { icon: BriefcaseBusiness, label: 'Job Market', path: '/market' },
  { icon: School, label: 'Institution', path: '/institution' },
];

// ── Mobile bottom navigation (5 key tabs) ────────────────────
const mobileItems = [
  { icon: Home, label: 'Home', path: '/dashboard' },
  { icon: Map, label: 'Roadmap', path: '/roadmap' },
  { icon: MessageSquare, label: 'Practice', path: '/interview' },
  { icon: Compass, label: 'AI', path: '/chat' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export function DashboardLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  /** Page title for topbar — derive from the current path */
  const currentPage = sidebarItems.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentPage?.label || 'CareerPro';

  return (
    <div className="min-h-dvh max-w-full overflow-x-clip bg-career-background md:flex md:h-dvh">
      {/* ─── Desktop Sidebar ────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-career-border bg-career-surface h-dvh sticky top-0">
        <div className="p-6 pb-5">
          <h1 className="text-2xl font-serif text-career-primary font-bold tracking-tight">CareerPro</h1>
          <p className="text-[10px] uppercase tracking-widest text-career-muted mt-1 font-semibold">AI Career Intelligence</p>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-career-primary/10 text-career-primary font-medium'
                    : 'text-career-text hover:bg-career-border/20 hover:translate-x-0.5'
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-career-primary' : 'text-career-muted group-hover:text-career-dark'}`} />
                <span className="text-sm truncate">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-career-accent animate-[scale-in_0.3s_ease-out]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-career-border">
          <div className="px-4 py-2 mb-1">
            <p className="text-[11px] text-career-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-career-muted hover:bg-career-border/20 hover:text-career-dark w-full min-h-11"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────── */}
      <main className="flex min-h-dvh min-w-0 flex-1 flex-col md:h-dvh md:overflow-hidden">
        {/* Mobile topbar — shows current page title */}
        <div className="md:hidden px-4 py-3.5 border-b border-career-border bg-career-surface/95 backdrop-blur-md sticky top-0 z-[30] flex items-center justify-between gap-3 min-h-14">
          <h1 className="text-lg font-serif text-career-primary font-bold shrink-0">CareerPro</h1>
          <span className="text-sm font-medium text-career-dark truncate text-right min-w-0">{pageTitle}</span>
        </div>

        <div className="page-shell flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-clip px-4 py-4 md:px-8 md:py-8 pb-[calc(var(--app-nav-height)+1rem)] md:pb-8 page-enter">
          <DemoJourneyBar />
          <Outlet />
        </div>
      </main>

      {/* ─── Mobile Bottom Nav (5 tabs) ─────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-[40] flex min-h-[4.5rem] items-stretch border-t border-career-border bg-career-surface/95 backdrop-blur-md safe-area-bottom"
        aria-label="Main navigation"
      >
        {mobileItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-all duration-200 ${
                isActive
                  ? 'text-career-primary'
                  : 'text-career-muted active:text-career-dark active:scale-95'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={`w-5 h-5 shrink-0 transition-all duration-200 ${isActive ? 'text-career-primary scale-110' : ''}`} />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1.5 w-5 h-0.5 rounded-full bg-career-primary animate-[scale-in_0.2s_ease-out]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
