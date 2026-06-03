import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/api/axios";
import { useAuthStore } from "@/store/authStore";

function getKey(item) {
  return item.variant_id ? `${item.id}_${item.variant_id}` : String(item.id);
}

function parseFirstImage(images, fallbackText = "Item") {
  let value = images;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = [];
    }
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0];
  }

  return `https://placehold.co/80x80/f0f0f0/333?text=${encodeURIComponent(fallbackText)}`;
}

function mapServerItemToCartItem(item) {
  const product = item?.product || {};
  const variant = item?.variant || null;
  const productName = product?.name || "Product";

  return {
    id: product?.id,
    cart_item_id: item?.id,
    variant_id: variant?.id || null,
    name: variant?.name ? `${productName} - ${variant.name}` : productName,
    slug: product?.slug,
    price: Number(item?.unit_price ?? variant?.price ?? product?.price ?? 0),
    image: parseFirstImage(product?.images, productName),
    quantity: Number(item?.quantity ?? 1),
    merchant:
      product?.vendor?.store_name || product?.vendor?.business_name || "Store",
    merchantVendorId: product?.vendor?.id || null,
    merchantShippingRate: Number(product?.vendor?.standard_shipping_rate ?? 0),
    merchantFreeShippingEnabled: Boolean(
      product?.vendor?.free_shipping_enabled,
    ),
    merchantFreeShippingMinimum: Number(
      product?.vendor?.free_shipping_minimum ?? 0,
    ),
    variants: null,
  };
}

function hasAuthToken() {
  return !!useAuthStore.getState().token;
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      cartNotification: null,

      syncFromServer: async () => {
        if (!hasAuthToken()) return;
        try {
          const res = await api.get("/cart");
          const payload = res?.data?.data || {};
          const serverItems = Array.isArray(payload.items) ? payload.items : [];
          const previousOrder = new Map(
            get().items.map((item, index) => [getKey(item), index]),
          );
          const mappedItems = serverItems.map(mapServerItemToCartItem);

          mappedItems.sort((a, b) => {
            const aKey = getKey(a);
            const bKey = getKey(b);
            const aIndex = previousOrder.has(aKey)
              ? previousOrder.get(aKey)
              : Number.MAX_SAFE_INTEGER;
            const bIndex = previousOrder.has(bKey)
              ? previousOrder.get(bKey)
              : Number.MAX_SAFE_INTEGER;

            if (aIndex !== bIndex) {
              return aIndex - bIndex;
            }

            return Number(a?.cart_item_id || 0) - Number(b?.cart_item_id || 0);
          });

          set({ items: mappedItems });
        } catch {
          // Keep local cart when backend sync fails
        }
      },

      addItem: async (item) => {
        const { items } = get();
        const key = getKey(item);
        const existingIndex = items.findIndex((i) => {
          return getKey(i) === key;
        });
        const qty = item.quantity || 1;
        let nextQuantity = qty;

        if (existingIndex > -1) {
          const newItems = [...items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + qty,
          };
          nextQuantity = newItems[existingIndex].quantity;
          set({ items: newItems });
        } else {
          set({ items: [...items, { ...item, quantity: qty }] });
        }

        // Show cart popup notification
        set({ cartNotification: { name: item.name, image: item.image, qty } });
        setTimeout(() => {
          if (get().cartNotification?.name === item.name) {
            set({ cartNotification: null });
          }
        }, 3000);

        if (!hasAuthToken()) return;

        try {
          await api.post("/cart/add", {
            product_id: item.id,
            product_variant_id: item.variant_id || null,
            quantity: nextQuantity,
          });
          await get().syncFromServer();
        } catch {
          // Keep optimistic local state
        }
      },

      updateQuantity: async (id, quantity, variantId = null) => {
        const { items } = get();
        const target = items.find(
          (i) =>
            i.id === id && (variantId === null || i.variant_id === variantId),
        );
        if (!target) return;

        if (quantity <= 0) {
          await get().removeItem(id, variantId);
        } else {
          set({
            items: items.map((i) =>
              i.id === id && (variantId === null || i.variant_id === variantId)
                ? { ...i, quantity }
                : i,
            ),
          });

          if (!hasAuthToken()) return;

          try {
            if (target.cart_item_id) {
              await api.put(`/cart/update/${target.cart_item_id}`, {
                quantity,
              });
            } else {
              await api.post("/cart/add", {
                product_id: target.id,
                product_variant_id: target.variant_id || null,
                quantity,
              });
            }
            await get().syncFromServer();
          } catch {
            // Keep optimistic local state
          }
        }
      },

      removeItem: async (id, variantId = null) => {
        const target = get().items.find(
          (i) =>
            i.id === id && (variantId === null || i.variant_id === variantId),
        );
        set({
          items: get().items.filter(
            (i) =>
              !(
                i.id === id &&
                (variantId === null || i.variant_id === variantId)
              ),
          ),
        });

        if (!hasAuthToken()) return;
        if (!target) return;

        try {
          if (target.cart_item_id) {
            await api.delete(`/cart/remove/${target.cart_item_id}`);
          } else {
            await api.post("/cart/add", {
              product_id: target.id,
              product_variant_id: target.variant_id || null,
              quantity: 0,
            });
          }
          await get().syncFromServer();
        } catch {
          // Keep optimistic local state
        }
      },

      clearCart: async () => {
        set({ items: [], coupon: null });

        if (!hasAuthToken()) return;
        try {
          await api.delete("/cart/clear");
        } catch {
          // Keep local clear state
        }
      },

      setCoupon: (coupon) => set({ coupon }),
      removeCoupon: () => set({ coupon: null }),
      dismissCartNotification: () => set({ cartNotification: null }),

      getSubtotal: () => {
        return get().items.reduce((total, item) => {
          return total + (parseFloat(item.price) || 0) * item.quantity;
        }, 0);
      },

      getDiscount: () => {
        const { coupon } = get();
        if (!coupon) return 0;
        const subtotal = get().getSubtotal();
        if (coupon.type === "percentage") {
          const pct = coupon.value || 0;
          return (subtotal * pct) / 100;
        }
        return coupon.discount || coupon.value || 0;
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      getTotal: () => {
        return Math.max(0, get().getSubtotal() - get().getDiscount());
      },
    }),
    {
      name: "cart-storage",
    },
  ),
);
