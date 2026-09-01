export default function NeedsDatabase({ feature }: { feature: string }) {
  return (
    <div className="panel p-6 text-sm text-muted leading-relaxed">
      Packdraft cannot load {feature} until the database is connected. Add the Supabase
      variables from
      <span className="text-muted"> .env.example </span>
      and apply the latest migration. Catalog import and tournament create stay in Admin.
    </div>
  );
}

export function QueryFailed({ feature }: { feature: string }) {
  return (
    <div className="panel p-6 text-sm text-muted leading-relaxed">
      Packdraft could not load {feature}. The app is connected, but this query failed. Refresh
      and check server logs if it keeps happening.
    </div>
  );
}
