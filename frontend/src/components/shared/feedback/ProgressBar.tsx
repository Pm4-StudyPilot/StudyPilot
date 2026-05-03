export default function ProgressBar({ value }: { value: number }) {
  const intValue = Math.min(3, Math.max(0, Math.round(value)));
  const floatValue = Math.min(4, Math.max(0, value));
  return (
    <div className="progress progress-bar--strength mb-3">
      <div
        role="progressbar"
        className={`progress-bar bg-${['danger', 'warning', 'info', 'success'][intValue]}`}
        style={{ width: `${(floatValue / 4) * 100}%` }}
      />
    </div>
  );
}
