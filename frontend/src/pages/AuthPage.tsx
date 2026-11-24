import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AuthHero } from '@/components/auth/AuthHero';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import api from '@/config/api';

export function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setIsSubmittingForgot(true);
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('Password reset link sent! Please check your inbox.');
      setIsForgotPassword(false);
      setForgotEmail('');
    } catch {
      // In accordance with security: generic message
      toast.info('If that email is registered, a password reset link has been sent.');
      setIsForgotPassword(false);
      setForgotEmail('');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Left Column: Hero Branding */}
      <div className="w-full lg:w-1/2 p-4 lg:p-6 flex flex-col">
        <AuthHero />
      </div>

      {/* Right Column: Auth Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <Card className="w-full max-w-lg p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl">
          {isForgotPassword ? (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>

              <div>
                <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                  Reset Password
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enter your registered email address to receive a secure, single-use password reset link.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <Input
                  label="Registered Email"
                  type="email"
                  placeholder="e.g. yourname@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={isSubmittingForgot}
                >
                  Send Reset Link
                </Button>
              </form>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="mb-6">
                <h2 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
                  {activeTab === 'login' ? 'Sign In to GYAN-26' : 'Create an Account'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {activeTab === 'login'
                    ? 'Enter your credentials to enter the competition arena.'
                    : 'Students from Junior KG to PhD can register below.'}
                </p>
              </div>

              <TabsList className="grid grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="focus:outline-none">
                <LoginForm onForgotPasswordClick={() => setIsForgotPassword(true)} />
              </TabsContent>

              <TabsContent value="register" className="focus:outline-none">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}
