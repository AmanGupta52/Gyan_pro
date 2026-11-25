import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Award,
  Download,
  Share2,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import api from '@/config/api';
import { downloadOrShareCertificate } from '@/lib/certificateMobile';
import type { UserCertificate } from '@/types';

export function CertificatesPage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/certificates/my');
        setCertificates(data.data || []);
      } catch (err: any) {
        toast.error('Failed to load certificates');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  const handleCopyLink = (certId: string) => {
    const url = `${window.location.origin}/verify-certificate/${certId}`;
    navigator.clipboard.writeText(url);
    toast.success('Verification link copied to clipboard!');
  };

  const handleDownload = async (certId: string, compName: string) => {
    try {
      await downloadOrShareCertificate(certId, `GYAN-26 Certificate - ${compName}`);
    } catch {
      toast.error('Failed to download certificate');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-200 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-7 h-7 text-brand-gold" />
            <span>My Verifiable Certificates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official, tamper-proof academic credentials with dynamic verification QR codes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/competitions')}
        >
          Explore Tournaments
        </Button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-500">Loading your credentials...</p>
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No Certificates Issued Yet"
          description="Participate in official GYAN-26 competitions. Once a tournament is completed, your verified certificate will appear here."
          actionLabel="View Live Tournaments"
          onAction={() => navigate('/competitions')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => {
            const isReady = cert.status === 'issued';

            return (
              <div
                key={cert._id}
                className="rounded-3xl border-2 border-amber-300/80 dark:border-amber-700/60 bg-[#FCF9F2] dark:bg-slate-900 p-6 shadow-md hover:shadow-lg transition-all space-y-5 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Decorative Gold Header Band */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-bold text-sm shadow-sm">
                      G
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400">
                        GYAN-26 Official
                      </p>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Certificate of Merit
                      </p>
                    </div>
                  </div>

                  {isReady ? (
                    <Badge variant="success" size="sm" className="gap-1 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Issued
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      Generating...
                    </Badge>
                  )}
                </div>

                {/* Tournament Info */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white leading-snug">
                    {cert.competition.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Category: <strong>{cert.competition.category}</strong> • Squad:{' '}
                    <strong>{cert.team.name}</strong>
                  </p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                    ID: {cert.certificateId}
                  </p>
                </div>

                {/* Performance Pill Grid */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-white/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-400">Rank</span>
                    <p className="text-base font-black font-display text-amber-600 dark:text-amber-400">
                      #{cert.rank}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-400">Score</span>
                    <p className="text-base font-black font-display text-brand-blue">
                      {cert.score}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-600 dark:text-slate-400">Accuracy</span>
                    <p className="text-base font-black font-display text-emerald-600 dark:text-emerald-400">
                      {Math.round(cert.accuracy * 100)}%
                    </p>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-amber-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
                  {isReady ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          handleDownload(
                            cert.certificateId,
                            cert.competition?.name || 'Tournament'
                          )
                        }
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                      >
                        Download PDF
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyLink(cert.certificateId)}
                        leftIcon={<Share2 className="w-3.5 h-3.5" />}
                        title="Copy Public Verification Link"
                      >
                        Share
                      </Button>

                      <a
                        href={`/verify-certificate/${cert.certificateId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        title="Open Verification Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium py-1">
                      Your certificate is being generated. Please try again shortly.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
