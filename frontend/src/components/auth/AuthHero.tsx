import { Award, Zap, GraduationCap, ShieldCheck } from 'lucide-react';

export function AuthHero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-700 to-brand-blue text-white p-8 lg:p-12 flex flex-col justify-between min-h-[300px] lg:min-h-full rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none">
      {/* Decorative background ambient circles */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Floating animated ambient icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-12 left-10 text-3xl font-bold animate-pulse">?</div>
        <div className="absolute top-1/4 right-12 text-2xl animate-bounce duration-1000">💡</div>
        <div className="absolute bottom-1/3 left-16 text-3xl">⚛️</div>
        <div className="absolute bottom-16 right-16 text-2xl font-bold">✨</div>
      </div>

      {/* Top Header & Branding */}
      <div className="relative z-10 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide text-sky-200 border border-white/15">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>India-First Edtech Competition</span>
        </div>

        <div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight font-display">
            GYAN<span className="text-blue-400">-26</span>
          </h1>
          <p className="mt-2 text-xl font-medium text-sky-100 tracking-wide">
            "Kaun Banega Gyanwan Vivekvan Gunwan"
          </p>
          <p className="text-sm font-semibold text-sky-300 uppercase tracking-widest mt-1">
            Junior KG se PhD Tak
          </p>
        </div>
      </div>

      {/* Trust Points */}
      <div className="relative z-10 my-8 space-y-4">
        <div className="flex items-start gap-3.5 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
          <div className="p-2 rounded-xl bg-brand-blue/30 text-sky-200">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white">Authoritative Real-Time Battles</h4>
            <p className="text-xs text-sky-200/80">Synchronized questions, millisecond speed bonuses, and anti-cheat.</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
          <div className="p-2 rounded-xl bg-emerald-500/30 text-emerald-300">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white">Verifiable PDF Certificates</h4>
            <p className="text-xs text-sky-200/80">QR-coded official participation certificates with atomic registry IDs.</p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
          <div className="p-2 rounded-xl bg-amber-500/30 text-amber-300">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white">Individual & Team Leagues</h4>
            <p className="text-xs text-sky-200/80">Compete solo or create balanced squads of 2, 4, or 6 players.</p>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-sky-200/70">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          DPDP Act Verified Parental Consent
        </span>
        <span>IST Timezone</span>
      </div>
    </div>
  );
}
