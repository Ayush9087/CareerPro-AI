import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, hasCompletedOnboarding } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-career-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-career-primary mx-auto" />
          <p className="text-career-muted font-medium">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user hasn't onboarded yet and isn't already on the onboarding page
  if (!hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // If the user has onboarded and is trying to visit onboarding again
  if (hasCompletedOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
