import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormValues } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface LoginFormProps {
  onForgotPasswordClick?: () => void;
}

export function LoginForm({ onForgotPasswordClick }: LoginFormProps) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [genericError, setGenericError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setGenericError(null);
      await login(data.identifier, data.password);
      toast.success('Welcome back to GYAN-26!');
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: unknown) {
      // In accordance with security specification: strict generic message
      setGenericError('Invalid email or password');
      toast.error('Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {genericError && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{genericError}</span>
        </div>
      )}

      <Input
        label="Email or Phone Number"
        placeholder="e.g. rahul@example.com or 9876543210"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.identifier?.message}
        {...register('identifier')}
      />

      <div className="space-y-1">
        <Input
          label="Password"
          placeholder="Enter your password"
          isPassword
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-xs font-medium text-brand-blue hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={isSubmitting}
        fullWidth
        className="mt-2"
      >
        Sign In to GYAN-26
      </Button>
    </form>
  );
}
