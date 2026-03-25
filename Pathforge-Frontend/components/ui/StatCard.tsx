interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean };
  icon?: string;
  highlight?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  trend,
  icon,
  highlight,
}: StatCardProps) {
  return (
    <div
      className={`card p-6 flex flex-col gap-3 ${
        highlight
          ? "bg-gradient-to-br from-navy to-blue-600 border-0 text-white"
          : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-medium uppercase tracking-wider ${
          highlight ? "text-white/70" : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {icon && (
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        )}
        {label}
      </div>
      <div className="flex items-end gap-3">
        <span
          className={`text-3xl font-bold leading-none ${
            highlight ? "text-white" : "text-slate-900 dark:text-white"
          }`}
        >
          {value}
        </span>
        {trend && (
          <span
            className={`flex items-center text-sm font-semibold px-2 py-0.5 rounded ${
              trend.positive
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {trend.positive ? "trending_up" : "trending_down"}
            </span>
            {trend.value}
          </span>
        )}
      </div>
      {sub && (
        <p
          className={`text-xs ${
            highlight ? "text-white/60" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
