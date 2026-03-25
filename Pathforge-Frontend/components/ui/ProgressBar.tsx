interface ProgressBarProps {
  value: number; // 0-100
  target?: number; // optional target marker
  color?: "primary" | "green" | "yellow" | "red" | "blue";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const COLOR_MAP = {
  primary: "bg-primary",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

const SIZE_MAP = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

export default function ProgressBar({
  value,
  target,
  color = "primary",
  size = "md",
  showLabel,
  label,
}: ProgressBarProps) {
  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex justify-between text-sm mb-1.5">
          {label && (
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {label}
            </span>
          )}
          {showLabel && (
            <span className="text-slate-500 dark:text-slate-400">
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <div
        className={`relative w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden ${SIZE_MAP[size]}`}
      >
        <div
          className={`${SIZE_MAP[size]} rounded-full progress-animate ${COLOR_MAP[color]}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
        {target !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-700 dark:bg-slate-100 z-10"
            style={{ left: `${target}%` }}
          />
        )}
      </div>
    </div>
  );
}
