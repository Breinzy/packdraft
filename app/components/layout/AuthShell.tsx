import Logo from '@/components/brand/Logo';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center py-10">
      <div className="w-full max-w-md px-6 flash">
        <Logo />
        <h1 className="page-title text-2xl mt-6">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted leading-6">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
