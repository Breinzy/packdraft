/** Passthrough so leftover game routes compile until they are rewired to the mockup. */
export default function AppShell({
  children,
}: {
  children: React.ReactNode;
  nav?: string;
  title?: string;
  subtitle?: string;
}) {
  return children;
}
