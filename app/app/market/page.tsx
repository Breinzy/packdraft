import { PageHeader } from '@/components/page-header'
import { MarketView } from '@/components/market-view'

export default function MarketPage() {
  return (
    <>
      <PageHeader title="Market" subtitle="Discover and research Pokemon cards, sealed products, and sets." />
      <MarketView />
    </>
  )
}
