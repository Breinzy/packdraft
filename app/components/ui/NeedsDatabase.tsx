export default function NeedsDatabase({ feature }: { feature: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-sm text-slate-500 tracking-wider leading-relaxed">
      Packdraft cannot load {feature} until the database is connected. Add the Supabase
      variables from
      <span className="text-slate-400"> .env.example </span>
      and apply the latest migration. Catalog import and tournament create stay in Admin.
    </div>
  );
}

export function QueryFailed({ feature }: { feature: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 text-sm text-slate-500 tracking-wider leading-relaxed">
      Packdraft could not load {feature}. The app is connected, but this query failed. Refresh
      and check server logs if it keeps happening.
    </div>
  );
}
