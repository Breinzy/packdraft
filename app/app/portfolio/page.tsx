import AppShell from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/page-header";
import { PortfolioView } from "@/components/collector/portfolio-view";

export default function PortfolioPage() {
  return (
    <AppShell>
      <PageHeader
        title="Portfolio"
        subtitle="Every card and sealed product you own, with live valuation."
      />
      <PortfolioView />
    </AppShell>
  );
}
