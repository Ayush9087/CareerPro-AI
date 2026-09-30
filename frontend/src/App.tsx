import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/useAuth';
import { queryClient } from './lib/queryClient';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { PublicLayout } from './layouts/PublicLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import {
  DashboardSkeleton,
  ListPageSkeleton,
  ChatSkeleton,
  ProfileSkeleton,
} from './components/ui/Skeleton';

// ── Eagerly loaded pages (first-paint critical) ──────────────
import Home from './pages/Home';

// ── Route-level lazy loading ─────────────────────────────────
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Resume = lazy(() => import('./pages/Resume'));
const Readiness = lazy(() => import('./pages/Readiness'));
const Market = lazy(() => import('./pages/Market'));
const RoadmapPage = lazy(() => import('./pages/Roadmap'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const InterviewPage = lazy(() => import('./pages/Interview'));
const ChatPage = lazy(() => import('./pages/Chat'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const ProgressPage = lazy(() => import('./pages/Progress'));
const InstitutionPage = lazy(() => import('./pages/Institution'));
const SkillsPage = lazy(() => import('./pages/Skills'));

/** Minimal full-screen spinner for auth pages */
function AuthFallback() {
  return (
    <div className="min-h-screen bg-career-background flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-career-primary border-t-transparent" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OfflineBanner />
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
            </Route>

            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Suspense fallback={<AuthFallback />}><Login /></Suspense>} />
              <Route path="/signup" element={<Suspense fallback={<AuthFallback />}><Signup /></Suspense>} />
              <Route path="/forgot-password" element={<Suspense fallback={<AuthFallback />}><ForgotPassword /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<AuthFallback />}><ResetPassword /></Suspense>} />
            </Route>

            {/* Standalone Protected Routes */}
            <Route path="/onboarding" element={<ProtectedRoute><Suspense fallback={<AuthFallback />}><Onboarding /></Suspense></ProtectedRoute>} />

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Suspense fallback={<DashboardSkeleton />}><DashboardPage /></Suspense>} />
              <Route path="/progress" element={<Suspense fallback={<ListPageSkeleton />}><ProgressPage /></Suspense>} />
              <Route path="/institution" element={<Suspense fallback={<ListPageSkeleton />}><InstitutionPage /></Suspense>} />
              <Route path="/resume" element={<Suspense fallback={<ListPageSkeleton />}><Resume /></Suspense>} />
              <Route path="/readiness" element={<Suspense fallback={<ListPageSkeleton />}><Readiness /></Suspense>} />
              <Route path="/market" element={<Suspense fallback={<ListPageSkeleton />}><Market /></Suspense>} />
              <Route path="/skills" element={<Suspense fallback={<ListPageSkeleton />}><SkillsPage /></Suspense>} />
              <Route path="/roadmap" element={<Suspense fallback={<ListPageSkeleton />}><RoadmapPage /></Suspense>} />
              <Route path="/interview" element={<Suspense fallback={<ListPageSkeleton />}><InterviewPage /></Suspense>} />
              <Route path="/chat" element={<Suspense fallback={<ChatSkeleton />}><ChatPage /></Suspense>} />
              <Route path="/profile" element={<Suspense fallback={<ProfileSkeleton />}><ProfilePage /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<ProfileSkeleton />}><ProfilePage /></Suspense>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
