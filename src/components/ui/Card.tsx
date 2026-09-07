import { forwardRef, type HTMLAttributes, type ComponentProps } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/store/ThemeContext';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  delay?: number;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hover = false, delay = 0, children, ...props }, ref) => {
    const { reducedMotion } = useTheme();
    return (
      <motion.div
        ref={ref}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
        whileHover={hover && !reducedMotion ? { y: -2 } : undefined}
        className={`card-base shadow-card ${hover ? 'transition-shadow hover:shadow-float' : ''} ${className}`}
        {...(props as ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = 'Card';

export function CardHeader({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-5 border-b border-border-default ${className}`}>{children}</div>;
}

export function CardTitle({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={`font-semibold text-fg ${className}`}>{children}</h3>;
}

export function CardContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
