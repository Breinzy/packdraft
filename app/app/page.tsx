import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 md:px-8">
        <div className="flex flex-col items-center text-center gap-5 md:gap-6">
          <div>
            <div
              className="inline-flex items-center justify-center w-24 h-24 md:w-36 md:h-36 rounded-full text-5xl md:text-7xl"
              style={{ background: 'linear-gradient(135deg, #6e9bcf, #b0c4de)' }}
            >
              ⚡
            </div>
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-[0.15em] md:tracking-[0.2em] text-white mb-2 md:mb-3">
              PACKDRAFT
            </h1>
            <p className="text-base md:text-xl text-slate-400 max-w-lg leading-relaxed tracking-wide mb-1 md:mb-2">
              Fantasy trading for Pokemon TCG.
            </p>
            <p className="text-sm md:text-lg text-slate-600 max-w-md leading-relaxed tracking-wide">
              Build a portfolio. Compete in leagues. Win the week.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center whitespace-nowrap w-full max-w-xs md:min-w-[320px] md:w-auto px-10 md:px-20 py-5 md:py-7 rounded-2xl text-lg md:text-2xl font-bold tracking-widest text-white transition-all hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #5b89bf, #4a78ae)',
              border: '2px solid rgba(110,155,207,0.4)',
              boxShadow: '0 0 48px rgba(110,155,207,0.2)',
            }}
          >
            ENTER THE DRAFT
          </Link>

          <div className="text-xs md:text-sm text-slate-700 tracking-wider space-y-2 md:space-y-3">
            <p>LEAGUES LOCK MONDAY · RESULTS EVERY SUNDAY</p>
            <p>NO REAL MONEY · FANTASY GAME</p>
          </div>
        </div>
      </main>
    </>
  );
}
