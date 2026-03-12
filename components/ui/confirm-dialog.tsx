'use client';

import {X, AlertTriangle} from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                destructive ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}
            >
              <AlertTriangle size={16} />
            </span>
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button onClick={onCancel} className="rounded-full p-2 hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 text-sm text-muted-foreground">
          {description}
        </div>
        <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
              destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
