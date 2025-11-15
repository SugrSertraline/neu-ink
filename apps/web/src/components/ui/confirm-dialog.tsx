'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

/**
 * Glassmorphism + glowing edge styles
 * - Frosted glass body with strong backdrop blur
 * - Crisp inner border and soft outer halo
 * - Subtle highlight sheen layer
 */
const glassCard = [
  // Base glass panel
  'relative z-0 group overflow-hidden rounded-2xl',
  'border border-white/40 dark:border-white/10',
  'bg-white/30 dark:bg-white/10',
  'backdrop-blur-3xl backdrop-saturate-150',
  'shadow-[0_28px_72px_rgba(15,23,42,0.35)]',
  // Sheen highlight (top light) via ::before
  "before:pointer-events-none before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:z-[-1]",
  "before:[background:linear-gradient(180deg,rgba(255,255,255,0.65),rgba(255,255,255,0.28)_30%,transparent_65%)]",
  'before:opacity-80',
  // Glow halo & edge separation via ::after (multiple radial gradients)
  "after:pointer-events-none after:content-[''] after:absolute after:inset-0 after:rounded-2xl after:z-[-1]",
  "after:[background:radial-gradient(80%_60%_at_50%_-10%,rgba(59,130,246,0.45),transparent_60%),radial-gradient(70%_50%_at_110%_0%,rgba(147,51,234,0.35),transparent_55%),radial-gradient(70%_55%_at_-10%_100%,rgba(99,102,241,0.35),transparent_55%)]",
  'after:opacity-80 after:blur-xl',
  // Crisp inner edge
  'ring-1 ring-inset ring-white/40 dark:ring-white/15',
].join(' ');

const headerBar = [
  'relative z-[1] flex flex-col gap-1',
  'px-6 pt-6 pb-3',
].join(' ');

const footerBar = [
  'relative z-[1] flex items-center gap-3 justify-end',
  'px-6 pb-6 pt-2',
].join(' ');

// Buttons tuned for glass UI
const glowButtonFilled = [
  'rounded-xl',
  'bg-gradient-to-r from-[#28418A]/95 via-[#28418A]/90 to-[#28418A]/95',
  'text-white',
  'shadow-[0_18px_48px_rgba(40,65,138,0.35)] hover:shadow-[0_22px_56px_rgba(40,65,138,0.45)]',
  'border border-white/70',
  'focus-visible:ring-2 focus-visible:ring-[#4769b8]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'active:translate-y-[1px] disabled:opacity-70',
].join(' ');

const glowButtonGhost = [
  'rounded-xl',
  'border border-white/70',
  'bg-white/75 dark:bg-white/10',
  'text-[#28418A] dark:text-slate-100',
  'shadow-[0_12px_30px_rgba(40,65,138,0.18)] backdrop-blur-3xl',
  'hover:bg-white/90 hover:text-[#263b78] dark:hover:bg-white/20',
  'focus-visible:ring-2 focus-visible:ring-[#4769b8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'disabled:opacity-70',
].join(' ');

const glowButtonDestructive = [
  'rounded-xl text-white',
  'bg-gradient-to-r from-[#dc2626]/95 via-[#dc2626]/90 to-[#dc2626]/95',
  'shadow-[0_18px_48px_rgba(220,38,38,0.35)] hover:shadow-[0_22px_56px_rgba(220,38,38,0.45)]',
  'border border-white/70',
  'focus-visible:ring-2 focus-visible:ring-[#ef4444]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  'active:translate-y-[1px] disabled:opacity-70',
].join(' ');

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none" showCloseButton={false}>
        <div className={cn(glassCard)}>
          <DialogHeader className={headerBar}>
          <DialogTitle className="text-[17px] font-semibold tracking-[.01em] text-slate-900/95 dark:text-white drop-shadow-sm">
            {title}
          </DialogTitle>
        </DialogHeader>

        {description ? (
          <div className="relative z-[1] px-6 py-5">
            <DialogDescription className="text-[14px] leading-6 text-slate-800/90 dark:text-slate-100/85">
              {description}
            </DialogDescription>
          </div>
        ) : (
          <div className="px-6 py-4" />
        )}

          <DialogFooter className={footerBar}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className={glowButtonGhost}
            >
              {cancelText}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={cn('min-w-[110px]', variant === 'destructive' ? glowButtonDestructive : glowButtonFilled)}
            >
              {loading ? '处理中…' : confirmText}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easier usage (unchanged API)
export function useConfirmDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>>({
    title: '',
    onConfirm: () => {},
  });

  const confirm = React.useCallback(
    (props: Omit<ConfirmDialogProps, 'open' | 'onOpenChange'>) => {
      return new Promise<boolean>((resolve) => {
        setConfig({
          ...props,
          onConfirm: async () => {
            try {
              await props.onConfirm();
              resolve(true);
            } catch (error) {
              resolve(false);
              throw error;
            }
          },
        });
        setIsOpen(true);
      });
    },
    []
  );

  const ConfirmDialogComponent = React.useCallback(
    () => (
      <ConfirmDialog
        {...config}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    ),
    [config, isOpen]
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
