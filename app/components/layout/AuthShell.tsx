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
    <div className="flex-1 flex items-center justify-center py-12">
      <div className="w-full max-w-md flash">
        <Logo />
        <h1 className="page-title text-3xl md:text-[2.15rem] mt-10">{title}</h1>
        {subtitle ? <p className="mt-3 text-sm text-muted leading-relaxed">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
