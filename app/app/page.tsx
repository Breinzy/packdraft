import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Hero */}
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 to-yellow-400 text-4xl mb-6">
            ⚡
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-[0.2em] text-white mb-3">
          PACKDRAFT
        </h1>
        <p className="text-sm text-slate-400 max-w-md leading-relaxed tracking-wider mb-2">
          Fantasy trading for Pokemon TCG sealed products.
        </p>
        <p className="text-xs text-slate-600 max-w-sm leading-relaxed tracking-wider mb-8">
          Draft a $5,000 portfolio of booster boxes, ETBs, and UPCs.
          Compete in 20-player leagues over 7 days. The best returns win.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: '💰', text: '$5K BUDGET' },
            { icon: '📦', text: '20 SLOTS' },
            { icon: '🏆', text: '7-DAY LEAGUES' },
            { icon: '📊', text: 'LIVE PRICES' },
          ].map((feature) => (
            <div
              key={feature.text}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400 tracking-wider"
            >
              <span>{feature.icon}</span>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4">
          <Link
            href="/auth/signup"
            className="px-8 py-3 rounded-md bg-gradient-to-r from-purple-600 to-purple-700 border border-purple-500/50 text-white text-xs font-bold tracking-widest hover:from-purple-500 hover:to-purple-600 transition-all shadow-[0_0_32px_rgba(124,58,237,0.3)]"
          >
            ENTER THE DRAFT
          </Link>
          <Link
            href="/leaderboard"
            className="px-8 py-3 rounded-md border border-white/[0.08] text-slate-400 text-xs font-bold tracking-widest hover:border-white/20 hover:text-white transition-all"
          >
            LEADERBOARD
          </Link>
        </div>

        {/* Bottom info */}
        <div className="mt-16 text-[10px] text-slate-700 tracking-wider space-y-1">
          <p>PRICES SOURCED FROM TCGPLAYER · SEALED PRODUCTS ONLY</p>
          <p>NO REAL MONEY · FANTASY GAME FOR ENTERTAINMENT</p>
        </div>
      </main>
    </>
  );
}
