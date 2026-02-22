interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-white/[0.03] rounded-md px-2.5 py-2 border border-white/[0.05]">
      <div className="text-[9px] text-slate-600 tracking-wider mb-0.5">{label}</div>
      <div className="text-[13px] font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
