type ProgressBarProps = {
  value: number;
  color?: string;
  label?: string;
};

export function ProgressBar({
  value,
  color = "#d96f55",
  label,
}: ProgressBarProps) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label ?? `${value}% complete`}
    >
      <span style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}
