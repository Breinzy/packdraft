export default function AdSlot({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className="panel px-4 py-3 text-xs text-faint">
      Ad placeholder. Pro hides this. Packdraft does not sell tournament outcomes.
    </div>
  );
}
