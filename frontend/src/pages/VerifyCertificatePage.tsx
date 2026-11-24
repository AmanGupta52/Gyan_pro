import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { downloadOrShareCertificate } from '@/lib/certificateMobile';
import api from '@/config/api';
import type { VerifiedCertificate } from '@/types';

export function VerifyCertificatePage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [cert, setCert] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certificateId) return;

    const verify = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data } = await api.get(`/certificates/verify/${certificateId}`);
        setCert(data.data);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            'Certificate with this identifier could not be verified.'
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [certificateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Querying official GYAN-26 credential registry...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Navbar Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            G
          </div>
          <div>
            <span className="text-lg font-bold font-display text-slate-900 dark:text-white">
              GYAN<span className="text-brand-blue">-26</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium">
              National Talent Olympiad Verification Portal
            </p>
          </div>
        </Link>

        <Badge variant="info" size="sm">
          Public Registry
        </Badge>
      </header>

      {/* Main Verification Body */}
      <main className="max-w-2xl w-full mx-auto my-8 space-y-6">
        {error ? (
          <Card className="p-8 text-center bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/50 rounded-3xl shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-white">
                Invalid or Unverified Credential
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {error}
              </p>
            </div>

            <p className="text-xs font-mono text-slate-400">
              Query Identifier: {certificateId}
            </p>

            <div className="pt-2">
              <Link to="/">
                <Button size="sm" variant="secondary">
                  Return to Home
                </Button>
              </Link>
            </div>
          </Card>
        ) : cert ? (
          <Card className="p-6 sm:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md space-y-6 relative overflow-hidden">
            {/* Seal of Authenticity Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400">
                      Verified by GYAN-26
                    </span>
                    <Badge variant="success" size="sm">
                      Official Record
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    ID: {cert.certificateId}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Conferral Date (IST)
                </span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {new Date(cert.issuedAt).toLocaleDateString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Recipient Details */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Candidate Awarded
                </span>
                <h2 className="text-2xl sm:text-3xl font-black font-display text-slate-900 dark:text-white mt-0.5">
                  {cert.recipientName}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Championship</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {cert.competitionName}
                  </p>
                  <p className="text-[11px] text-brand-blue font-semibold">{cert.category}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Squad Representation</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {cert.teamName}
                  </p>
                </div>
              </div>

              {/* Tournament Accomplishment */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                  <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300">
                    Rank
                  </p>
                  <p className="text-xl font-black font-display text-amber-600 dark:text-amber-400 mt-0.5">
                    #{cert.rank}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60">
                  <p className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300">
                    Score
                  </p>
                  <p className="text-xl font-black font-display text-brand-blue mt-0.5">
                    {cert.score}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                  <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300">
                    Accuracy
                  </p>
                  <p className="text-xl font-black font-display text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {Math.round(cert.accuracy * 100)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                className="w-full sm:w-auto"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() =>
                  downloadOrShareCertificate(
                    cert.certificateId,
                    `GYAN-26 Certificate - ${cert.recipientName}`
                  )
                }
              >
                Download Official PDF
              </Button>

              <p className="text-[11px] text-slate-400 text-center sm:text-right">
                Cryptographically hashed • DPDP Act Compliant
              </p>
            </div>
          </Card>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto text-center text-xs text-slate-400 pt-6 border-t border-slate-200 dark:border-slate-800">
        © 2026 GYAN-26 • National Talent Olympiad • All Rights Reserved.
      </footer>
    </div>
  );
}
