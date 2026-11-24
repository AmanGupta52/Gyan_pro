import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

export function Modal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  const isModalOpen = open ?? isOpen ?? false;

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
    if (!newOpen && onClose) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isModalOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {isModalOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg',
                  'rounded-card bg-white p-6 shadow-lifted',
                  'dark:bg-navy-900 dark:border dark:border-slate-200/10',
                  'focus:outline-none',
                  className
                )}
                style={{ x: '-50%', y: '-50%' }}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Dialog.Close
                  className={cn(
                    'absolute right-4 top-4 rounded-lg p-1.5',
                    'text-slate-700/60 hover:text-slate-700 hover:bg-slate-200/60',
                    'dark:text-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-navy-700/60',
                    'outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40',
                    'transition-colors'
                  )}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>

                <Dialog.Title className="text-lg font-semibold text-slate-700 dark:text-slate-200 pr-8">
                  {title}
                </Dialog.Title>

                {description && (
                  <Dialog.Description className="mt-1 text-sm text-slate-700/60 dark:text-slate-200/60">
                    {description}
                  </Dialog.Description>
                )}

                <div className="mt-4">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
