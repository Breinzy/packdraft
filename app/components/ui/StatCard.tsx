interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] rounded-md px-3 py-2.5 border border-white/[0.05]">
      <div className="text-xs text-slate-600 tracking-wider mb-0.5">{label}</div>
      <div className="text-base font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
