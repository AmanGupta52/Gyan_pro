import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Status = 'loading' | 'success' | 'error';

/** Landing page for the link in the verification email: /verify-email?token=... */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { isAuthenticated, refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is invalid.');
  // The token is single-use: make sure StrictMode's double effect does not consume it twice.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    api
      .post('/auth/verify-email', { token })
      .then(async () => {
        setStatus('success');
        if (isAuthenticated) await refreshUser();
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.error?.message ?? 'Invalid or expired verification link.'
        );
      });
  }, [token, isAuthenticated, refreshUser]);

  return (
    <div className="app-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center rounded-3xl space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-blue" aria-hidden />
            <h1 className="text-xl font-bold font-display">Verifying your email…</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
            <h1 className="text-xl font-bold font-display">Email verified</h1>
            <p className="text-sm text-slate-500">
              Your email address is confirmed. You can now register for competitions.
            </p>
            <Link to={isAuthenticated ? '/dashboard' : '/auth'}>
              <Button fullWidth size="lg">
                {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
              </Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-rose-500" aria-hidden />
            <h1 className="text-xl font-bold font-display">Verification failed</h1>
            <p className="text-sm text-slate-500" role="alert">
              {message}
            </p>
            <Link to="/auth">
              <Button variant="secondary" fullWidth size="lg">
                Back to Sign In
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

export default VerifyEmailPage;
