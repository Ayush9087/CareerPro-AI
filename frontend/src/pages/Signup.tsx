import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <Card className="w-full text-center space-y-5 py-10 px-8 shadow-[0_8px_30px_rgba(48,42,30,0.06)] bg-white/60 backdrop-blur-sm border-white">
        <div className="w-20 h-20 bg-career-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 animate-[scale-in_0.4s_ease-out]">
          <CheckCircle2 className="w-10 h-10 text-career-primary" />
        </div>
        <h2 className="text-2xl font-serif text-career-dark font-bold">Check your email</h2>
        <p className="text-career-muted text-base leading-relaxed">
          We've sent a verification link to <br /><strong className="text-career-dark font-semibold">{email}</strong>.
          <br /><span className="text-sm mt-2 inline-block">Please verify your email to continue.</span>
        </p>
        <div className="pt-4">
          <Link to="/login" className="inline-block w-full">
            <Button variant="secondary" className="w-full bg-white">
              Go to Login
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full p-8 shadow-[0_8px_30px_rgba(48,42,30,0.06)] bg-white/60 backdrop-blur-sm border-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-serif text-career-dark font-bold">Create your account</h2>
          <p className="text-career-muted text-sm mt-2">Start your career readiness journey</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm animate-[slide-down_0.3s_ease-out]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Rahul Sharma"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="bg-white/80"
          />

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
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/80"
          />
        </div>

        <div className="pt-4">
          <Button type="submit" isLoading={loading} className="w-full shadow-[0_4px_14px_rgba(95,107,53,0.25)] hover:shadow-[0_6px_20px_rgba(95,107,53,0.3)]" size="lg">
            Create Account
          </Button>
        </div>

        <p className="text-center text-sm text-career-muted pt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-career-primary font-semibold hover:text-career-dark transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </Card>
  );
}
