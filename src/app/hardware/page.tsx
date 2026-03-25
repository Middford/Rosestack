export default function HardwarePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Hardware</h1>
        <p className="text-sm text-text-secondary mt-1">
          Battery, inverter, solar PV, and heat pump database
        </p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-secondary p-8 text-center">
        <p className="text-text-tertiary">Agent 1 (Hardware Specialist) will build this module.</p>
      </div>
    </div>
  );
}
