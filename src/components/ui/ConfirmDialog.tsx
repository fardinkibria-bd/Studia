import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      onSave={() => { onConfirm(); onClose(); }}
      title={title}
      saveLabel={confirmLabel}
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-danger/10 text-danger flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <p className="text-sm text-fg-muted leading-relaxed">
          {description}
        </p>
      </div>
    </Modal>
  );
}
