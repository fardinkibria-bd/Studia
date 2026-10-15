'use client';

import * as React from 'react';

import {
  Checkbox as CheckboxPrimitive,
  CheckboxIndicator as CheckboxIndicatorPrimitive,
  type CheckboxProps as CheckboxPrimitiveProps,
} from '@/components/animate-ui/primitives/radix/checkbox';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { useTheme } from '@/store/ThemeContext';

/**
 * Styled checkbox on top of the animate-ui Radix checkbox primitive.
 *
 * NOTE: adapted from the upstream registry item — the shadcn design tokens
 * (bg-primary, bg-input, ring, destructive, size-4.5, …) don't exist in this
 * project's Tailwind config, so the variants are mapped onto the Studia token
 * system (brand / success / info + bg / fg / border variables). The API,
 * variants and animation behavior are unchanged. `checked` renders in the
 * variant's tone, while `indeterminate` (in-progress) always renders in info.
 */
const checkboxVariants = cva(
  'peer shrink-0 flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-300 [&[data-state=checked],&[data-state=indeterminate]]:text-white [&[data-state=indeterminate]]:bg-info [&[data-state=checked],&[data-state=indeterminate]]:border-transparent',
  {
    variants: {
      variant: {
        default: ' border border-bg-surface [&[data-state=checked]]:bg-brand-500',
        accent: 'bg-bg-muted [&[data-state=checked]]:bg-brand-500',
        success: ' border border-bg-surface [&[data-state=checked]]:bg-success',
        info: ' border border-bg-surface [&[data-state=checked]]:bg-info',
      },
      size: {
        default: 'size-5 rounded-md',
        sm: 'size-[18px] rounded-[5px]',
        lg: 'size-6 rounded-[7px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const checkboxIndicatorVariants = cva('', {
  variants: {
    size: {
      default: 'size-3.5',
      sm: 'size-3',
      lg: 'size-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type CheckboxProps = CheckboxPrimitiveProps &
  VariantProps<typeof checkboxVariants>;

function Checkbox({
  className,
  children,
  variant,
  size,
  ...props
}: CheckboxProps) {
  const { reducedMotion } = useTheme();

  return (
    <CheckboxPrimitive
      whileTap={reducedMotion ? undefined : { scale: 0.1 }}
      whileHover={reducedMotion ? undefined : { scale: 1.08 }}
      className={cn(
        checkboxVariants({ variant, size, className }),
        variant !== 'info' &&
          '[&[data-state=indeterminate]]:bg-info',
      )}
      {...props}
    >
      {children}
      <CheckboxIndicatorPrimitive
        className={cn(checkboxIndicatorVariants({ size }))}
      />
    </CheckboxPrimitive>
  );
}

export { Checkbox, type CheckboxProps };

