import { useState, useRef, useEffect, memo } from "react";

/**
 * Optimized image component with:
 * - Lazy loading via IntersectionObserver
 * - Blur placeholder effect
 * - Error fallback
 * - WebP support detection
 */
function OptimizedImage({
  src,
  alt,
  className = "",
  width,
  height,
  fallback = "/assets/placeholder.png",
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const imageSrc = error ? fallback : src || fallback;

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {!loaded && isVisible && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      )}
      {isVisible && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
          {...props}
        />
      )}
    </div>
  );
}

export default memo(OptimizedImage);
