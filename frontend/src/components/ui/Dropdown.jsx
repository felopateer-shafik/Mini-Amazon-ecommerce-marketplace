import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export default function Dropdown({
  trigger,
  children,
  align = "right",
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger || (
          <button className="flex items-center gap-1 text-sm text-text-secondary hover:text-text">
            Options <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
      {isOpen && (
        <div
          className={cn(
            "absolute top-full mt-2 bg-white border border-border rounded-xl shadow-lg z-50 min-w-[180px] py-1 animate-dropdown-in",
            align === "right" ? "end-0" : "start-0",
            className,
          )}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon: Icon,
  danger,
  className,
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors",
        danger ? "text-danger hover:bg-red-50" : "text-text",
        className,
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
