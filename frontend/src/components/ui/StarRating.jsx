import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({
  rating = 0,
  size = "md",
  showValue = false,
  count,
  interactive,
  onChange,
  className,
  ariaLabel,
}) {
  const sizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
    xl: "h-6 w-6",
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(
          <Star
            key={i}
            className={cn(
              sizes[size],
              "fill-yellow-400 text-yellow-400",
              interactive && "cursor-pointer",
            )}
            onClick={() => interactive && onChange?.(i)}
            aria-hidden="true"
          />,
        );
      } else if (i === Math.ceil(rating) && rating % 1 >= 0.5) {
        stars.push(
          <StarHalf
            key={i}
            className={cn(
              sizes[size],
              "fill-yellow-400 text-yellow-400",
              interactive && "cursor-pointer",
            )}
            onClick={() => interactive && onChange?.(i)}
            aria-hidden="true"
          />,
        );
      } else {
        stars.push(
          <Star
            key={i}
            className={cn(
              sizes[size],
              "text-gray-300",
              interactive && "cursor-pointer hover:text-yellow-400",
            )}
            onClick={() => interactive && onChange?.(i)}
            aria-hidden="true"
          />,
        );
      }
    }
    return stars;
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="img"
      aria-label={
        ariaLabel || `Rating ${Number(rating || 0).toFixed(1)} out of 5`
      }
    >
      <div className="flex">{renderStars()}</div>
      {showValue && (
        <span className="text-sm font-medium text-text ml-1">
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span className="text-xs sm:text-sm text-text-secondary">
          ({count})
        </span>
      )}
    </div>
  );
}
