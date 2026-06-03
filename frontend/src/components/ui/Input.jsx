import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef(
  (
    {
      label,
      error,
      icon: Icon,
      className,
      type = "text",
      required,
      helper,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = props.id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helper ? `${inputId}-helper` : undefined;
    const describedBy =
      [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Icon className="h-4 w-4 text-text-secondary" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "w-full rounded-lg border border-border bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-base sm:text-sm text-text placeholder:text-text-light transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed",
              Icon && "ltr:pl-10 rtl:pr-10 rtl:pl-4",
              error && "border-danger focus:ring-danger/30 focus:border-danger",
              className,
            )}
            {...props}
          />
        </div>
        {helper && !error && (
          <p id={helperId} className="mt-1 text-xs text-text-secondary">
            {helper}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
