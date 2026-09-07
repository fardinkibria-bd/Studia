import type { HTMLAttributes } from 'react';
import type { Subject } from '@/types';

interface SubjectPillProps extends HTMLAttributes<HTMLSpanElement> {
  subject: Subject | null;
}

export function SubjectPill({
  subject,
  className = '',
  ...props
}: SubjectPillProps) {
  if (!subject) {
    return null;
  }

  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 text-xs text-fg-muted ${className}`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: subject.color }}
      />
      <span className="truncate">{subject.name}</span>
    </span>
  );
}
