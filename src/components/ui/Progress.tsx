import { motion } from 'framer-motion';
import { useTheme } from '@/store/ThemeContext';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Progress({ value, max = 100, className = '', color, size = 'md' }: ProgressProps) {
  const { reducedMotion } = useTheme();
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };
  return (
    <div className={`w-full bg-bg-muted rounded-full overflow-hidden ${heights[size]} ${className}`}>
      <motion.div
        className={`h-full rounded-full ${color ?? 'bg-brand-500'}`}
        initial={reducedMotion ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
  label?: string;
  labelClassName?: string;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className = '',
  color = 'rgb(var(--brand-500))',
  label,
  labelClassName = 'text-2xl font-bold',
}: CircularProgressProps) {
  const { reducedMotion } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-bg-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={reducedMotion ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? (
          <span className={`${labelClassName} text-fg`}>{label}</span>
        ) : (
          <span className="text-2xl font-bold text-fg">{Math.round(value)}%</span>
        )}
      </div>
    </div>
  );
}
