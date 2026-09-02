import Header from '@/components/layout/Header';
import BottomNav, { type BottomNavKey } from '@/components/layout/BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  nav?: BottomNavKey | 'none';
}

export default function AppShell({ children, nav = 'none' }: AppShellProps) {
  return (
    <>
      <Header />
      <div className={nav === 'none' ? 'flex-1 w-full' : 'flex-1 w-full pb-[var(--dock-offset)] md:pb-0'}>
        {children}
      </div>
      {nav !== 'none' ? <BottomNav active={nav} /> : null}
    </>
  );
}
