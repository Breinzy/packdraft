import { redirect } from 'next/navigation';

export default async function LegacyAssetRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/asset/${id}`);
}
