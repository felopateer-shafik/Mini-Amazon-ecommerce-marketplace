import { useState, useEffect, useRef, memo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Clock,
  TrendingUp,
  X,
  ArrowRight,
  Tag,
  Layers,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import { searchService } from "@/api/services";

function renderHighlightedText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  const normalizedQuery = query.toLowerCase();

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedQuery ? (
      <strong key={`${part}-${index}`}>{part}</strong>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

const ICON_MAP = {
  product: Search,
  category: Layers,
  brand: Tag,
};

const SearchAutocomplete = memo(function SearchAutocomplete({
  query,
  setQuery,
  onSubmit,
  isRTL,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const wrapperRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const { recentSearches, addRecentSearch } = useUIStore();
  const navigate = useNavigate();
  const trimmedQuery = query.trim();
  const isTyping = trimmedQuery.length > 0;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced API suggestions — fast, no loading indicators
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (!trimmedQuery || trimmedQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      searchService
        .suggestions(trimmedQuery)
        .then((res) => {
          if (!controller.signal.aborted) {
            setSuggestions(res.data?.data || []);
          }
        })
        .catch(() => {
          // Silently ignore aborted / failed requests
        });
    }, 150); // 150ms debounce — feels instant

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmedQuery]);

  const handleSelect = useCallback(
    (item) => {
      const term = typeof item === "string" ? item : item.text;
      setQuery(term);
      addRecentSearch(term);
      setOpen(false);

      if (typeof item === "object" && item.type === "category" && item.slug) {
        navigate(`/category/${item.slug}`);
      } else if (
        typeof item === "object" &&
        item.type === "brand" &&
        item.slug
      ) {
        navigate(`/products?q=${encodeURIComponent(term)}`);
      } else {
        navigate(`/products?q=${encodeURIComponent(term)}`);
      }
    },
    [setQuery, addRecentSearch, navigate],
  );

  const handleSubmitInternal = useCallback(
    (e) => {
      e.preventDefault();
      if (query.trim()) {
        addRecentSearch(query.trim());
        setOpen(false);
        onSubmit(e);
      }
    },
    [query, addRecentSearch, onSubmit],
  );

  const showDropdown =
    open && (isTyping ? suggestions.length > 0 : recentSearches.length > 0);

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-3xl">
      <form onSubmit={handleSubmitInternal} className="flex w-full">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 text-sm focus:outline-none"
          style={{ backgroundColor: "#ffffff", color: "#111" }}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
            className="px-2 bg-white text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark px-3 md:px-4 min-w-[48px] md:min-w-[56px] transition-colors flex items-center justify-center shrink-0"
          style={{ borderRadius: isRTL ? "8px 0 0 8px" : "0 8px 8px 0" }}
        >
          <Search className="h-5 w-5 md:h-6 md:w-6 text-secondary-dark stroke-[2.5]" />
        </button>
      </form>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {/* Live API suggestions */}
          {isTyping && suggestions.length > 0 && (
            <div className="p-2">
              {suggestions.map((item, idx) => {
                const Icon = ICON_MAP[item.type] || Search;
                return (
                  <button
                    key={`${item.type}-${item.text}-${idx}`}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text hover:bg-gray-50 rounded transition"
                  >
                    <Icon className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                    <span className="flex-1 text-left">
                      {renderHighlightedText(item.text, trimmedQuery)}
                    </span>
                    {item.type !== "product" && (
                      <span className="text-[10px] text-text-secondary/70 uppercase tracking-wide flex-shrink-0">
                        {item.type}
                      </span>
                    )}
                    <ArrowRight className="h-3 w-3 text-text-secondary ml-1 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Recent Searches — only when input is empty */}
          {!isTyping && recentSearches.length > 0 && (
            <div className="p-2">
              <p className="px-3 py-1 text-xs font-semibold text-text-secondary flex items-center gap-1">
                <Clock className="h-3 w-3" /> Recent Searches
              </p>
              {recentSearches.slice(0, 5).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text hover:bg-gray-50 rounded transition"
                >
                  <Clock className="h-3.5 w-3.5 text-text-secondary flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Trending — only when input is empty */}
          {!isTyping && (
            <div className="border-t border-border/30 p-2">
              <p className="px-3 py-1 text-xs font-semibold text-text-secondary flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Trending
              </p>
              {[
                "iPhone 15",
                "Samsung Galaxy",
                "Nike Air Max",
                "PlayStation 5",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSelect(s)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-text hover:bg-gray-50 rounded transition"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default SearchAutocomplete;
