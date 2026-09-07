import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/store/ThemeContext';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-soft',
  secondary: 'bg-bg-elevated text-fg border border-border-default hover:border-border-strong hover:bg-bg-muted',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-muted',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-soft',
  outline: 'border border-border-default text-fg hover:bg-bg-muted hover:border-border-strong',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const { reducedMotion } = useTheme();
    return (
      <motion.button
        ref={ref}
        whileHover={reducedMotion ? undefined : { scale: 1.02 }}
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`inline-flex items-center justify-center font-medium transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none select-none ${variants[variant]} ${sizes[size]} ${className}`}
        {...(props as ComponentProps<typeof motion.button>)}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
