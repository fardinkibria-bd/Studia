import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/store/ThemeContext';
import { Button } from '@/components/ui/Button';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  saveLabel?: string;
  cancelLabel?: string;
}

export function Modal({ open, onClose, onSave, title, description, children, footer, size = 'md', saveLabel = 'Save', cancelLabel = 'Cancel' }: ModalProps) {
  const { reducedMotion } = useTheme();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  // Keyboard shortcuts: Enter to save, Esc to cancel/close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && onSave) {
        const target = e.target as HTMLElement;
        // Don't hijack Enter when an interactive control already handles it:
        // textareas insert newlines, buttons/selects activate themselves.
        if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.tagName === 'SELECT') return;
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onSave]);

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

  // When `onSave` is wired up but no custom footer is supplied, present the
  // standard Cancel / Save footer so actions are always visible & clickable.
  const defaultFooter = onSave ? (
    <>
      <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
      <Button onClick={onSave}>{saveLabel}</Button>
    </>
  ) : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`relative w-full ${sizes[size]} glass-strong rounded-t-3xl sm:rounded-2xl shadow-float max-h-[90vh] flex flex-col`}
          >
            {(title || description) && (
              <div className="p-5 border-b border-border-default flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="text-lg font-semibold text-fg">{title}</h2>}
                  {description && <p className="text-sm text-fg-muted mt-1">{description}</p>}
                </div>
                <button onClick={onClose} className="text-fg-subtle hover:text-fg transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="p-5 overflow-y-auto flex-1">{children}</div>
            {footer && <div className="p-4 border-t border-border-default flex justify-end gap-2">{footer}</div>}
            {!footer && defaultFooter && (
              <div className="p-4 border-t border-border-default flex justify-end gap-2">{defaultFooter}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}