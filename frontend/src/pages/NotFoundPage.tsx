import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-center">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h1 className="text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
        404 — Page Not Found
      </h1>

      <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-md text-sm">
        The competition track, game lobby, or resource you are looking for does not exist or has been relocated.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button
          size="lg"
          onClick={() => navigate('/dashboard')}
          leftIcon={<Home className="w-4 h-4" />}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
