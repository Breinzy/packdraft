import { PageHeader } from '@/components/page-header'
import { Overview } from '@/components/overview'

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Your collection, performance, and what's moving in the Pokemon market."
      />
      <Overview />
    </>
  )
}
