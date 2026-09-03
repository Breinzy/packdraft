import { PageHeader } from '@/components/page-header'
import { PortfolioView } from '@/components/portfolio-view'

export default function PortfolioPage() {
  return (
    <>
      <PageHeader title="Portfolio" subtitle="Every card and sealed product you own, with live valuation." />
      <PortfolioView />
    </>
  )
}
