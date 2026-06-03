import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getPublicSettingsSnapshot() {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem("publicSettingsCacheV1");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.data ?? parsed ?? {};
  } catch {
    return {};
  }
}

export function formatCurrency(amount, currency) {
  const effectiveCurrency = "EGP";
  const numericAmount = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: effectiveCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function formatDate(date, format = "medium") {
  if (!date) return "";
  const d = new Date(date);
  const options = {
    short: { month: "short", day: "numeric" },
    medium: { year: "numeric", month: "short", day: "numeric" },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    full: {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  };
  return d.toLocaleDateString("en-US", options[format] || options.medium);
}

export function truncate(str, length = 100) {
  if (!str) return "";
  return str.length > length ? str.substring(0, length) + "..." : str;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function getStatusColor(status) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-purple-100 text-purple-800",
    "out for delivery": "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    "return requested": "bg-amber-100 text-amber-800",
    returned: "bg-gray-100 text-gray-800",
    "refund pending": "bg-yellow-100 text-yellow-800",
    refunded: "bg-teal-100 text-teal-800",
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    draft: "bg-gray-100 text-gray-600",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-red-100 text-red-800",
  };
  return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export function calculateDiscount(regular, sale) {
  if (!regular || !sale || sale >= regular) return 0;
  return Math.round(((regular - sale) / regular) * 100);
}

export function getStarRating(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return { full, half, empty };
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Return Requested",
  "Returned",
  "Refund Pending",
  "Refunded",
];

export const PRODUCT_TYPES = [
  "Simple",
  "Variable",
  "Digital",
  "Catalog",
  "Classified",
];
