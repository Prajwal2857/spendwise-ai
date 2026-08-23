"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  max = 100,
  color,
  size = "md",
  showLabel = false,
  label,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  let barColor = color || "bg-emerald-500";
  if (!color) {
    if (percentage >= 90) barColor = "bg-red-500";
    else if (percentage >= 75) barColor = "bg-amber-500";
    else if (percentage >= 50) barColor = "bg-emerald-500";
    else barColor = "bg-emerald-400";
  }

  const sizes = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-slate-600">{label}</span>
          <span className="text-sm font-medium text-slate-700">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full ${sizes[size]}`}>
        <div
          className={`${barColor} ${sizes[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
