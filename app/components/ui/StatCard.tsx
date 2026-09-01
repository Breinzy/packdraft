interface StatCardProps {
  label: string;
  value: string;
  color: string;
}

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="panel px-3 py-2.5">
      <div className="kicker mb-0.5">{label}</div>
      <div className="num text-base font-medium" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
