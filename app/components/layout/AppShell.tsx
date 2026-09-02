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
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      {nav !== 'none' ? <BottomNav active={nav} /> : null}
    </>
  );
}
