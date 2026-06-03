import { useState, useRef, useCallback, memo } from "react";

/**
 * Amazon-style image zoom on hover.
 * Shows a magnified lens that follows the cursor.
 */
export default memo(function ImageZoom({ src, alt = "", className = "" }) {
  const containerRef = useRef(null);
  const [lens, setLens] = useState({ active: false, x: 0, y: 0 });

  const handleMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLens({ active: true, x, y });
  }, []);

  const handleLeave = useCallback(
    () => setLens({ active: false, x: 0, y: 0 }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden cursor-crosshair bg-white flex items-center justify-center ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchEnd={handleLeave}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-auto max-h-[70vh] object-contain"
        draggable={false}
      />
      {lens.active && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: "220%",
            backgroundPosition: `${lens.x}% ${lens.y}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
});
