import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-6xl",
};

export default function Modal({
  isOpen,
  onClose,
  onAfterClose,
  title,
  children,
  size = "md",
  footer,
  className,
}) {
  const titleId = useId();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return undefined;
    }

    if (!shouldRender) return undefined;

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      onAfterClose?.();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, shouldRender, onAfterClose]);

  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-[2px]",
            isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop",
          )}
          onClick={onClose}
        />
        <div
          className={cn(
            "relative bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[calc(100vh-2rem)]",
            isClosing ? "animate-modal-out" : "animate-modal-in",
            sizes[size],
            className,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          {title && (
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border shrink-0">
              <h3
                id={titleId}
                className="text-base sm:text-lg font-semibold text-text"
              >
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="p-4 sm:p-5 overflow-y-auto min-h-0">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 sm:gap-3 p-4 sm:p-5 border-t border-border shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
