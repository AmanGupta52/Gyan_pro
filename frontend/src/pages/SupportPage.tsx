import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Copy,
  Check,
  QrCode,
  Building2,
  ShieldCheck,
  Sparkles,
  Download,
  IndianRupee,
  ExternalLink,
  Gift,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/config/api';
import type { DonationSettings, CustomQrResponse } from '@/types';

const SHAGUN_PRESETS = [
  { amount: 101, label: '₹101 Shagun', desc: 'Auspicious starter token' },
  { amount: 251, label: '₹251 Vidya Daan', desc: 'Sponsor quiz practice sets' },
  { amount: 501, label: '₹501 Shiksha Samman', desc: 'Fund a student merit medal' },
  { amount: 1100, label: '₹1,100 Medhavi', desc: 'Scholarship reward fund' },
  { amount: 2100, label: '₹2,100 Vidya Ratna', desc: 'Champion squad prize patron' },
  { amount: 5100, label: '₹5,100 Gyanapeeth', desc: 'Grand tournament patron' },
];

export function SupportPage() {
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAmount, setSelectedAmount] = useState<number>(501);
  const [customAmount, setCustomAmount] = useState<string>('501');
  const [donorNote, setDonorNote] = useState<string>('Shagun for student prize fund');
  const [qrData, setQrData] = useState<CustomQrResponse | null>(null);
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch initial donation settings & default QR code
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/donations/settings');
        if (data.data) {
          setSettings(data.data.settings);
          if (data.data.defaultQrCode) {
            setQrData({
              upiUri: data.data.defaultUpiUri,
              qrCodeDataUrl: data.data.defaultQrCode,
              amount: 501,
              upiId: data.data.settings.upiId,
              payeeName: data.data.settings.payeeName,
              notes: data.data.settings.notes,
            });
          }
        }
      } catch (err: any) {
        toast.error('Failed to load donation settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Fetch custom QR code whenever amount or note changes
  useEffect(() => {
    const num = Number(customAmount);
    if (!num || num <= 0 || isNaN(num)) return;

    const timeoutId = setTimeout(async () => {
      try {
        setQrLoading(true);
        const { data } = await api.get('/donations/qr', {
          params: {
            amount: num,
            note: donorNote,
          },
        });
        if (data.data) {
          setQrData(data.data);
        }
      } catch (err: any) {
        // Fallback silently if input is in intermediate state
      } finally {
        setQrLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [customAmount, donorNote]);

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount.toString());
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // only digits
    setCustomAmount(val);
    const num = Number(val);
    setSelectedAmount(num);
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadQr = () => {
    if (!qrData?.qrCodeDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.qrCodeDataUrl;
    link.download = `GYAN26-UPI-QR-₹${customAmount || '501'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded successfully!');
  };

  const upiId = settings?.upiId || 'gyan26@upi';
  const payeeName = settings?.payeeName || 'GYAN-26 Educational Trust';
  const bankDetails = settings?.bankDetails || {
    accountNumber: '98765432101234',
    ifsc: 'SBIN0001234',
    bankName: 'State Bank of India',
    branch: 'New Delhi Main Branch',
    accountHolder: 'GYAN-26 Educational Trust',
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in-50 duration-300 pb-20">
      {/* ── HERO BANNER ────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-blue text-white p-6 sm:p-10 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-amber-300 border border-amber-300/20">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            <span>विद्या ददाति विनयं | ज्ञानं परमं भूषणम्</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display">
            Support Future Scholars & Quiz Champions
          </h1>

          <p className="text-base sm:text-lg font-medium text-sky-100">
            "Kaun Banega Gyanwan Vivekvan Gunwan" — Junior KG se PhD Tak
          </p>

          <p className="text-xs sm:text-sm text-sky-200/80 leading-relaxed max-w-2xl">
            100% of your generous Shagun contributions go directly towards student scholarship prize pools, tamper-proof academic certificates, server hosting, and providing equitable quiz opportunities for underprivileged young minds across India.
          </p>
        </div>
      </section>

      {/* ── MAIN DONATION WORKFLOW ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Shagun Amount & Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Select Shagun Contribution */}
          <Card className="p-6 glass shadow-sm rounded-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-brand-gold" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Choose Auspicious Shagun
                </h2>
              </div>
              <Badge variant="success" className="text-xs">
                Zero Gateway Fees
              </Badge>
            </div>

            {/* Shagun Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SHAGUN_PRESETS.map((preset) => {
                const isSelected = selectedAmount === preset.amount;
                return (
                  <button
                    key={preset.amount}
                    type="button"
                    onClick={() => handleSelectPreset(preset.amount)}
                    className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-brand-blue bg-blue-50/60 dark:bg-blue-950/40 text-brand-blue ring-2 ring-brand-blue/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 glass text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="font-extrabold text-base tracking-tight flex items-center">
                      <IndianRupee className="w-3.5 h-3.5 mr-0.5 inline" />
                      {preset.amount}
                    </span>
                    <span className="text-xs font-semibold mt-0.5 text-slate-900 dark:text-slate-100">
                      {preset.label.split(' ')[1] || 'Shagun'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Field */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Or Enter Custom Shagun Amount (INR)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-600 dark:text-slate-400">
                  <IndianRupee className="w-5 h-5 font-bold" />
                </div>
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomInputChange}
                  placeholder="e.g. 501"
                  className="block w-full pl-10 pr-16 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-semibold text-slate-600 dark:text-slate-400">
                  INR
                </div>
              </div>
            </div>

            {/* Note / Purpose Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Purpose / Message on UPI Screen
              </label>
              <input
                type="text"
                value={donorNote}
                maxLength={60}
                onChange={(e) => setDonorNote(e.target.value)}
                placeholder="e.g. Shagun for student prize fund"
                className="block w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>

            {/* Direct UPI ID Pill with Copy Button */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Official Verified VPA / UPI ID
                </div>
                <div className="font-mono font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{upiId}</span>
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                    Verified
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  Beneficiary: {payeeName}
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(upiId, 'upiId', 'UPI ID')}
                className="shrink-0 font-medium"
              >
                {copiedKey === 'upiId' ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy UPI ID
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Card: Direct Bank Wire (NEFT / RTGS / IMPS) */}
          <Card className="p-6 glass shadow-sm rounded-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-blue" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Direct Bank Wire (NEFT / RTGS / IMPS)
                </h3>
              </div>
              <span className="text-xs text-slate-500">For institutions & trusts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Account Name</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {bankDetails.accountHolder}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1">
                <div className="text-xs text-slate-500 font-medium">Bank & Branch</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {bankDetails.bankName}, {bankDetails.branch}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Account Number</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {bankDetails.accountNumber}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      bankDetails.accountNumber,
                      'accNum',
                      'Account Number'
                    )
                  }
                >
                  {copiedKey === 'accNum' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </Button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium">IFSC Code</div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {bankDetails.ifsc}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(bankDetails.ifsc, 'ifsc', 'IFSC Code')
                  }
                >
                  {copiedKey === 'ifsc' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Dynamic QR Code & Payment Intents (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 glass shadow-lg rounded-2xl flex flex-col items-center text-center space-y-5">
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-brand-blue" />
                Scan & Pay via any UPI App
              </span>
              <span className="text-xs font-extrabold text-brand-blue">
                ₹{customAmount || '501'}
              </span>
            </div>

            {/* Dynamic QR Code Canvas */}
            <div className="relative p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center dark:border-white/10">
              {loading || qrLoading ? (
                <div className="w-60 h-60 flex flex-col items-center justify-center space-y-2">
                  <Skeleton className="w-56 h-56 rounded-xl" />
                </div>
              ) : qrData?.qrCodeDataUrl ? (
                <img
                  src={qrData.qrCodeDataUrl}
                  alt={`UPI QR for INR ${customAmount}`}
                  className="w-60 h-60 object-contain rounded-lg transition-transform hover:scale-[1.02] duration-200"
                />
              ) : (
                <div className="w-60 h-60 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 text-xs">
                  <QrCode className="w-12 h-12 mb-2 text-slate-300" />
                  QR generation pending...
                </div>
              )}
            </div>

            {/* Supported App Logos / Pills */}
            <div className="w-full space-y-2">
              <div className="text-[11px] font-semibold text-slate-500">
                Works with all NPCI UPI Enabled Applications
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  Google Pay
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  PhonePe
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  Paytm
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  BHIM UPI
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  Cred
                </span>
              </div>
            </div>

            {/* Mobile Deep-Link Intent Trigger */}
            {qrData?.upiUri && (
              <div className="w-full space-y-2 pt-2">
                <a
                  href={qrData.upiUri}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md transition-all active:scale-[0.98]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open UPI App (Mobile Only)
                </a>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full font-medium"
                  onClick={handleDownloadQr}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Save QR to Gallery
                </Button>
              </div>
            )}
          </Card>

          {/* Transparency & Governance Pledge */}
          <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm">100% Student Fund Transparency</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {settings?.taxExemptionNote ||
                'Every rupee received is audited and deployed exclusively to student merit prizes, medals, verifiable academic certificates, and operational digital hosting.'}
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <Award className="w-3.5 h-3.5 text-brand-gold" />
              <span>Audited under GYAN-26 Educational Governance Model</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
export default SupportPage;
