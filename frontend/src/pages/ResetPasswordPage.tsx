import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import api from '@/config/api';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validators';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PasswordStrength } from '@/components/ui/PasswordStrength';

/** Landing page for the link in the reset email: /reset-password?token=... */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordValues) => {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      toast.success('Password updated. Please sign in with your new password.');
      navigate('/auth', { replace: true });
    } catch (err: any) {
      setServerError(
        err?.response?.data?.error?.message ?? 'Could not reset password. Please try again.'
      );
    }
  };

  return (
    <div className="app-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 rounded-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
            Set a new password
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose a strong password you haven&apos;t used before.
          </p>
        </div>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-rose-500" role="alert">
              This reset link is invalid or incomplete.
            </p>
            <Link to="/auth">
              <Button variant="secondary" fullWidth>
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="New Password"
              isPassword
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordStrength password={watch('password') || ''} />
            <Input
              label="Confirm Password"
              isPassword
              autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            {serverError && (
              <p className="text-sm text-rose-500" role="alert">
                {serverError}
              </p>
            )}
            <Button type="submit" size="lg" fullWidth loading={isSubmitting}>
              Update Password
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
