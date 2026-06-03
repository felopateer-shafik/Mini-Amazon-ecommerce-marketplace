import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const Textarea = forwardRef(
  ({ label, error, className, required, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = props.id || generatedId;
    const errorId = error ? `${textareaId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={cn(
            "w-full rounded-lg border border-border bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-base sm:text-sm text-text placeholder:text-text-light transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y",
            error && "border-danger focus:ring-danger/30",
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
