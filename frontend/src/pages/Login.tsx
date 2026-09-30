import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AlertCircle } from 'lucide-react';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_PERSONA } from '../lib/demoJourney';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const demoRequested = searchParams.get('demo') === '1';

  useEffect(() => {
    if (demoRequested) {
      setEmail(DEMO_EMAIL);
      setPassword(DEMO_PASSWORD);
    }
  }, [demoRequested]);

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let { error } = await signIn(email, password);

    // Auto-provision demo account if it doesn't exist
    if (error && email === DEMO_EMAIL) {
      const { error: signUpError } = await signUp(email, password, DEMO_PERSONA.full_name);
      if (!signUpError) {
        // Sign up succeeded, try logging in again
        const { error: retryError } = await signIn(email, password);
        error = retryError;
      }
    }

    setLoading(false);

    if (error) {
      setError(error);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Card className="w-full p-8 shadow-[0_8px_30px_rgba(48,42,30,0.06)] bg-white/60 backdrop-blur-sm border-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-serif text-career-dark font-bold">Welcome back</h2>
          <p className="text-career-muted text-sm mt-2">Sign in to continue the Assess → Diagnose → Plan → Prove → Track loop.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-[slide-down_0.3s_ease-out]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/80"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/80"
          />
        </div>

        <div className="flex justify-end pt-1">
          <Link to="/forgot-password" className="text-sm font-semibold text-career-primary hover:text-career-dark transition-colors">
            Forgot password?
          </Link>
        </div>

        <div className="pt-2 space-y-3">
          <Button type="submit" isLoading={loading} className="w-full shadow-[0_4px_14px_rgba(95,107,53,0.25)] hover:shadow-[0_6px_20px_rgba(95,107,53,0.3)]" size="lg">
            Sign In
          </Button>
          <Button type="button" variant="secondary" className="w-full bg-white" onClick={fillDemo}>
            Use demo account
          </Button>
          <p className="text-center text-xs text-career-muted">
            Demo: {DEMO_EMAIL}
          </p>
        </div>

        <p className="text-center text-sm text-career-muted pt-2">
          Don't have an account?{' '}
          <Link to="/signup" className="text-career-primary font-semibold hover:text-career-dark transition-colors">
            Sign up
          </Link>
        </p>
      </form>
    </Card>
  );
}
