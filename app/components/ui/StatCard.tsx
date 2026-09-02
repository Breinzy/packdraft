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
    <div className="panel">
      <div className="label-caps mb-2">{label}</div>
      <div className="num text-lg font-semibold text-foreground" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}
