import { PageHeader } from '@/components/page-header'
import { WatchlistView } from '@/components/watchlist-view'

export default function WatchlistPage() {
  return (
    <>
      <PageHeader title="Watchlist" subtitle="Your research queue — assets you're tracking before you buy." />
      <WatchlistView />
    </>
  )
}
