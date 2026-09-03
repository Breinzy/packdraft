import { PageHeader } from '@/components/page-header'
import { SetsView } from '@/components/sets-view'

export default function SetsPage() {
  return (
    <>
      <PageHeader title="Sets" subtitle="Browse Pokemon expansions and their market performance." />
      <SetsView />
    </>
  )
}
