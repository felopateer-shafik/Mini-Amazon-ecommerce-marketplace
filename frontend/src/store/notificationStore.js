import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultNotifications = [
  {
    id: 1,
    type: "order",
    title: "Order Shipped",
    message: "Your order #ORD-2024-001 has been shipped and is on its way.",
    time: "2 hours ago",
    read: false,
    link: "/orders",
  },
  {
    id: 2,
    type: "promo",
    title: "Flash Sale - 30% Off Electronics",
    message:
      "Don't miss our biggest sale! Up to 30% off all electronics. Limited time only.",
    time: "5 hours ago",
    read: false,
    link: "/products?deals=true",
  },
  {
    id: 3,
    type: "payment",
    title: "Payment Confirmed",
    message:
      "Payment of EGP 1,250.00 for order #ORD-2024-002 has been confirmed.",
    time: "1 day ago",
    read: false,
    link: "/orders",
  },
  {
    id: 4,
    type: "order",
    title: "Order Delivered",
    message:
      "Your order #ORD-2024-003 has been delivered. Please rate your experience.",
    time: "2 days ago",
    read: true,
    link: "/orders",
  },
  {
    id: 5,
    type: "security",
    title: "Password Changed",
    message:
      "Your account password was changed successfully. If this wasn't you, contact support.",
    time: "3 days ago",
    read: true,
    link: "/account",
  },
];

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: defaultNotifications,

      addNotification: (notification) => {
        const payload = {
          id: notification.id || Date.now(),
          type: notification.type || "default",
          title: notification.title || "Notification",
          message: notification.message || "",
          time: notification.time || "just now",
          read: false,
          link: notification.link || "/notifications",
        };

        set({
          notifications: [payload, ...get().notifications],
        });
      },

      markAllRead: () => {
        set({
          notifications: get().notifications.map((n) => ({
            ...n,
            read: true,
          })),
        });
      },

      markAsRead: (id) => {
        set({
          notifications: get().notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        });
      },

      removeNotification: (id) => {
        set({
          notifications: get().notifications.filter((n) => n.id !== id),
        });
      },

      clearNotifications: () => set({ notifications: [] }),

      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    { name: "notifications-storage" },
  ),
);
