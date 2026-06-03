import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      mobileMenuOpen: false,
      searchOpen: false,
      compareItems: [],
      recentSearches: [],
      recentlyViewed: [],

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleMobileMenu: () =>
        set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),

      addToCompare: (product) =>
        set((state) => {
          if (state.compareItems.length >= 4) return state;
          if (state.compareItems.find((p) => p.id === product.id)) return state;
          return { compareItems: [...state.compareItems, product] };
        }),

      removeFromCompare: (productId) =>
        set((state) => ({
          compareItems: state.compareItems.filter((p) => p.id !== productId),
        })),

      clearCompare: () => set({ compareItems: [] }),

      addRecentSearch: (term) =>
        set((state) => ({
          recentSearches: [
            term,
            ...state.recentSearches.filter((s) => s !== term),
          ].slice(0, 10),
        })),

      addRecentlyViewed: (product) =>
        set((state) => ({
          recentlyViewed: [
            product,
            ...state.recentlyViewed.filter((p) => p.id !== product.id),
          ].slice(0, 20),
        })),

      removeRecentlyViewed: (productId) =>
        set((state) => ({
          recentlyViewed: state.recentlyViewed.filter(
            (p) => p.id !== productId,
          ),
        })),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        recentSearches: state.recentSearches,
        recentlyViewed: state.recentlyViewed,
        compareItems: state.compareItems,
      }),
    },
  ),
);
