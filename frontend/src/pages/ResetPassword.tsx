import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(password);
    setLoading(false);

    if (error) {
      setError(error);
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  if (success) {
    return (
      <Card className="w-full text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-career-primary mx-auto" />
        <h2 className="text-2xl font-serif text-career-dark">Password updated</h2>
        <p className="text-career-muted">
          Your password has been successfully reset. Redirecting to login...
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-serif text-career-dark">Set a new password</h2>
          <p className="text-career-muted text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <Button type="submit" isLoading={loading} className="w-full" size="lg">
          Update Password
        </Button>
      </form>
    </Card>
  );
}
