import { PageHeader } from '@/components/page-header'
import { SetsView } from '@/components/sets-view'

export default function SetsPage() {
  return (
    <>
      <PageHeader
        title="Sets"
        subtitle="Each expansion is one Packdraft index: cards and sealed lumped together from stored market prices."
      />
      <SetsView />
    </>
  )
}
