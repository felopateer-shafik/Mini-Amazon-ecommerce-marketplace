import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed bottom-20 right-4 z-40 w-10 h-10 bg-secondary/80 hover:bg-secondary text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 backdrop-blur-sm md:bottom-6"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
