export default function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="panel px-4 py-3">
      <div className="label-caps mb-1">{label}</div>
      <div className="num text-lg font-semibold text-foreground" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
