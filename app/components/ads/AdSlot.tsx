export default function AdSlot({ hidden }: { hidden: boolean }) {
  if (hidden) return null;
  return (
    <div className="panel text-xs leading-5 text-faint">
      Ad placeholder. Pro hides this. Packdraft does not sell tournament outcomes.
    </div>
  );
}
