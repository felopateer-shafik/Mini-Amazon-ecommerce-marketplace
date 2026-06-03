import api from "./axios";

// ─── Auth ─────────────────────────────────────────────────────────
export const authService = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  becomeMerchant: (data) => api.post("/auth/become-merchant", data),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  changePassword: (data) => api.post("/auth/change-password", data),
  forgotPassword: (data) => api.post("/auth/forgot-password", data),
  resetPassword: (data) => api.post("/auth/reset-password", data),
  requestOtp: (data) => api.post("/auth/otp/request", data),
  requestLoginOtp: (data) => api.post("/auth/otp/request-login", data),
  verifyOtp: (data) => api.post("/auth/otp/verify", data),
  socialLogin: (data) => api.post("/auth/social/login", data),
  socialRedirectUrl: (provider) => {
    const base = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
    return `${base}/auth/social/${provider}/redirect`;
  },
  deleteAccount: (data) => api.delete("/auth/account", { data }),
};

// ─── Search Suggestions ───────────────────────────────────────────
export const searchService = {
  suggestions: (q) => api.get("/search/suggestions", { params: { q } }),
};

// ─── Products ─────────────────────────────────────────────────────
export const productService = {
  list: (params) => api.get("/products", { params }),
  featured: () => api.get("/products/featured"),
  detail: (slug) => api.get(`/products/${slug}`),
  reviews: (productId, params) =>
    api.get(`/products/${productId}/reviews`, { params }),
  submitReview: (productId, data) =>
    api.post(`/products/${productId}/reviews`, data),
  updateReview: (productId, reviewId, data) =>
    api.put(`/products/${productId}/reviews/${reviewId}`, data),
  deleteReview: (productId, reviewId) =>
    api.delete(`/products/${productId}/reviews/${reviewId}`),
};

// ─── Categories ───────────────────────────────────────────────────
export const categoryService = {
  list: () => api.get("/categories"),
  detail: (slug) => api.get(`/categories/${slug}`),
  products: (slug, params) =>
    api.get(`/categories/${slug}/products`, { params }),
};

// ─── Brands ───────────────────────────────────────────────────────
export const brandService = {
  list: () => api.get("/brands"),
};

// ─── Cart ─────────────────────────────────────────────────────────
export const cartService = {
  get: () => api.get("/cart"),
  add: (data) => api.post("/cart/add", data),
  update: (itemId, data) => api.put(`/cart/update/${itemId}`, data),
  remove: (itemId) => api.delete(`/cart/remove/${itemId}`),
  clear: () => api.delete("/cart/clear"),
  applyCoupon: (code) => api.post("/cart/coupon", { code }),
  removeCoupon: () => api.delete("/cart/coupon"),
};

// ─── Orders ───────────────────────────────────────────────────────
export const orderService = {
  list: (params) => api.get("/orders", { params }),
  detail: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post("/orders", data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  requestRefund: (id, data) => api.post(`/orders/${id}/refund`, data),
};

// ─── Refunds ──────────────────────────────────────────────────────
export const refundService = {
  list: (params) => api.get("/refunds", { params }),
  detail: (id) => api.get(`/refunds/${id}`),
  create: (orderId, data) => api.post(`/orders/${orderId}/refund`, data),
};

// ─── Wishlist ─────────────────────────────────────────────────────
export const wishlistService = {
  list: () => api.get("/wishlist"),
  add: (productId) => api.post("/wishlist", { product_id: productId }),
  remove: (productId) => api.delete(`/wishlist/${productId}`),
};

// ─── Wallet & Rewards ─────────────────────────────────────────────
export const walletService = {
  get: () => api.get("/wallet"),
  topUp: (data) => api.post("/wallet/top-up", data),
  transactions: (params) => api.get("/wallet/transactions", { params }),
  points: () => api.get("/rewards"),
  redeemReward: (data) => api.post("/rewards/redeem", data),
};

// ─── Addresses ────────────────────────────────────────────────────
export const addressService = {
  list: () => api.get("/addresses"),
  create: (data) => api.post("/addresses", data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  remove: (id) => api.delete(`/addresses/${id}`),
};

// ─── Affiliate (Customer) ─────────────────────────────────────────
export const affiliateService = {
  apply: (data) => api.post("/affiliates/apply", data),
  status: () => api.get("/affiliates/status"),
};

// ─── Payment Cards ────────────────────────────────────────────────
export const paymentCardService = {
  list: () => api.get("/payment-cards"),
  add: (data) => api.post("/payment-cards", data),
  remove: (id) => api.delete(`/payment-cards/${id}`),
  setDefault: (id) => api.put(`/payment-cards/${id}/default`),
};

// ─── User ─────────────────────────────────────────────────────────
export const userService = {
  profile: () => api.get("/user/profile"),
  updateProfile: (data) => api.put("/user/profile", data),
  uploadAvatar: (formData) => api.post("/user/profile/avatar", formData),
};

// ─── Notifications ───────────────────────────────────────────────
export const notificationService = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/read-all"),
  clearAll: () => api.delete("/notifications"),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// ─── Messaging ───────────────────────────────────────────────────
export const messageService = {
  conversations: () => api.get("/messages/conversations"),
  messages: (conversationId) =>
    api.get(`/messages/conversations/${conversationId}/messages`),
  updateStatus: (conversationId, data) =>
    api.put(`/messages/conversations/${conversationId}/status`, data),
  blockCustomer: (conversationId) =>
    api.post(`/messages/conversations/${conversationId}/block-customer`),
  unblockCustomer: (conversationId) =>
    api.post(`/messages/conversations/${conversationId}/unblock-customer`),
  send: (data) => api.post("/messages/send", data),
};

// ─── Vendors ──────────────────────────────────────────────────────
export const vendorService = {
  list: (params) => api.get("/vendors", { params }),
  detail: (slug) => api.get(`/vendors/${slug}`),
  products: (slug, params) => api.get(`/vendors/${slug}/products`, { params }),
};

// ─── Vendor (Merchant Panel) ──────────────────────────────────────
export const merchantService = {
  dashboard: () => api.get("/vendor/dashboard"),
  products: (params) => api.get("/vendor/products", { params }),
  productDetail: (id) => api.get(`/vendor/products/${id}`),
  brands: () => api.get("/vendor/brands"),
  createProduct: (data) => api.post("/vendor/products", data),
  updateProduct: (id, data) => api.put(`/vendor/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/vendor/products/${id}`),
  orders: (params) => api.get("/vendor/orders", { params }),
  earnings: (params) => api.get("/vendor/earnings", { params }),
  reviews: (params) => api.get("/vendor/reviews", { params }),
  replyToReview: (reviewId, data) =>
    api.post(`/vendor/reviews/${reviewId}/reply`, data),
  markReviewHelpful: (reviewId) =>
    api.post(`/vendor/reviews/${reviewId}/helpful`),
  settings: () => api.get("/vendor/settings"),
  updateSettings: (data) => api.put("/vendor/settings", data),
  categoryRequests: (params) =>
    api.get("/vendor/category-requests", { params }),
  submitCategoryRequest: (data) => api.post("/vendor/category-requests", data),
  brandRequests: (params) => api.get("/vendor/brand-requests", { params }),
  submitBrandRequest: (data) => api.post("/vendor/brand-requests", data),
  submitReconsideration: (productId, data) =>
    api.post(`/vendor/products/${productId}/reconsideration`, data),
  updateOrderStatus: (orderId, data) =>
    api.put(`/vendor/orders/${orderId}/status`, data),
  requestPayout: (data) => api.post("/vendor/payout-request", data),
  payoutRequests: (params) => api.get("/vendor/payout-requests", { params }),
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/vendor/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    });
  },
};

// ─── Coupons ──────────────────────────────────────────────────────
export const couponService = {
  validate: (payload) => {
    if (typeof payload === "string") {
      return api.post("/coupons/validate", { code: payload });
    }
    return api.post("/coupons/validate", payload || {});
  },
  list: (params) => api.get("/admin/coupons", { params }),
  create: (data) => api.post("/admin/coupons", data),
  update: (id, data) => api.put(`/admin/coupons/${id}`, data),
  remove: (id) => api.delete(`/admin/coupons/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────
export const adminService = {
  analytics: (params) => api.get("/admin/analytics", { params }),
  users: {
    list: (params) => api.get("/admin/users", { params }),
    detail: (id) => api.get(`/admin/users/${id}`),
    create: (data) => api.post("/admin/users", data),
    update: (id, data) => api.put(`/admin/users/${id}`, data),
    remove: (id) => api.delete(`/admin/users/${id}`),
    ban: (id) => api.post(`/admin/users/${id}/ban`),
    unban: (id) => api.post(`/admin/users/${id}/unban`),
  },
  vendors: {
    list: (params) => api.get("/admin/vendors", { params }),
    detail: (id) => api.get(`/admin/vendors/${id}`),
    update: (id, data) => api.put(`/admin/vendors/${id}`, data),
    remove: (id) => api.delete(`/admin/vendors/${id}`),
    approve: (id) => api.post(`/admin/vendors/${id}/approve`),
    reject: (id, data) => api.post(`/admin/vendors/${id}/reject`, data),
    suspend: (id) => api.post(`/admin/vendors/${id}/suspend`),
  },
  payouts: {
    list: (params) => api.get("/admin/payout-requests", { params }),
    detail: (id) => api.get(`/admin/payout-requests/${id}`),
    approve: (id, data) => api.put(`/admin/payout-requests/${id}/approve`, data),
    reject: (id, data) => api.put(`/admin/payout-requests/${id}/reject`, data),
  },
  products: {
    list: (params) => api.get("/admin/products", { params }),
    detail: (id) => api.get(`/admin/products/${id}`),
    create: (data) => api.post("/admin/products", data),
    update: (id, data) => api.put(`/admin/products/${id}`, data),
    remove: (id) => api.delete(`/admin/products/${id}`),
    approve: (id) => api.post(`/admin/products/${id}/approve`),
    reject: (id, data) => api.post(`/admin/products/${id}/reject`, data),
  },
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/admin/upload-media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000,
    });
  },
  moderationRequests: {
    categoryRequests: (params) =>
      api.get("/admin/category-requests", { params }),
    approveCategoryRequest: (id, data) =>
      api.post(`/admin/category-requests/${id}/approve`, data),
    rejectCategoryRequest: (id, data) =>
      api.post(`/admin/category-requests/${id}/reject`, data),
    brandRequests: (params) => api.get("/admin/brand-requests", { params }),
    approveBrandRequest: (id, data) =>
      api.post(`/admin/brand-requests/${id}/approve`, data),
    rejectBrandRequest: (id, data) =>
      api.post(`/admin/brand-requests/${id}/reject`, data),
    productReconsiderations: (params) =>
      api.get("/admin/product-reconsiderations", { params }),
    replyProductReconsideration: (id, data) =>
      api.post(`/admin/product-reconsiderations/${id}/reply`, data),
  },
  orders: {
    list: (params) => api.get("/admin/orders", { params }),
    detail: (id) => api.get(`/admin/orders/${id}`),
    update: (id, data) => api.put(`/admin/orders/${id}`, data),
  },
  categories: {
    list: (params) => api.get("/admin/categories", { params }),
    create: (data) => api.post("/admin/categories", data),
    update: (id, data) => api.put(`/admin/categories/${id}`, data),
    remove: (id, options = {}) =>
      api.delete(`/admin/categories/${id}`, { params: options }),
  },
  refunds: {
    list: (params) => api.get("/admin/refunds", { params }),
    detail: (id) => api.get(`/admin/refunds/${id}`),
    approve: (id, data) => api.post(`/admin/refunds/${id}/approve`, data),
    reject: (id, data) => api.post(`/admin/refunds/${id}/reject`, data),
    updateStatus: (id, data) => api.put(`/admin/refunds/${id}/status`, data),
  },
  wallets: {
    list: (params) => api.get("/admin/wallets", { params }),
    transactions: (params) => api.get("/admin/wallet-transactions", { params }),
    topUp: (data) => api.post("/admin/wallets/top-up", data),
  },
  staff: {
    list: (params) => api.get("/admin/staff", { params }),
    create: (data) => api.post("/admin/staff", data),
    update: (id, data) => api.put(`/admin/staff/${id}`, data),
    remove: (id) => api.delete(`/admin/staff/${id}`),
  },
  roles: {
    list: () => api.get("/admin/roles"),
    permissions: () => api.get("/admin/roles/permissions"),
    create: (data) => api.post("/admin/roles", data),
    update: (id, data) => api.put(`/admin/roles/${id}`, data),
    remove: (id) => api.delete(`/admin/roles/${id}`),
  },
  reviews: {
    list: (params) => api.get("/admin/reviews", { params }),
    remove: (id) => api.delete(`/admin/reviews/${id}`),
    approve: (id) => api.post(`/admin/reviews/${id}/approve`),
    reject: (id) => api.post(`/admin/reviews/${id}/reject`),
  },
  chats: {
    list: (params) => api.get("/admin/chats", { params }),
    detail: (id) => api.get(`/admin/chats/${id}`),
    sendMessage: (id, data) => api.post(`/admin/chats/${id}/messages`, data),
    updateStatus: (id, data) => api.put(`/admin/chats/${id}/status`, data),
    blockCustomer: (id) => api.post(`/admin/chats/${id}/block-customer`),
    unblockCustomer: (id) => api.post(`/admin/chats/${id}/unblock-customer`),
    remove: (id) => api.delete(`/admin/chats/${id}`),
  },
  affiliates: {
    list: (params) => api.get("/admin/affiliates", { params }),
    create: (data) => api.post("/admin/affiliates", data),
    update: (id, data) => api.put(`/admin/affiliates/${id}`, data),
    remove: (id) => api.delete(`/admin/affiliates/${id}`),
  },
  wholesale: {
    customers: (params) => api.get("/admin/wholesale/customers", { params }),
    updateCustomerStatus: (id, data) =>
      api.put(`/admin/wholesale/customers/${id}/status`, data),
    products: () => api.get("/admin/wholesale/products"),
    syncProducts: (items) =>
      api.post("/admin/wholesale/products/sync", { items }),
    bootstrapProducts: () => api.post("/admin/wholesale/products/bootstrap"),
  },
  brands: {
    list: (params) => api.get("/admin/brands", { params }),
    create: (data) => api.post("/admin/brands", data),
    update: (id, data) => {
      if (data instanceof FormData) {
        data.append("_method", "PUT");
        return api.post(`/admin/brands/${id}`, data);
      }
      return api.put(`/admin/brands/${id}`, data);
    },
    remove: (id) => api.delete(`/admin/brands/${id}`),
  },
  media: {
    list: (params) => api.get("/admin/media", { params }),
    create: (data) =>
      data instanceof FormData
        ? api.post("/admin/media", data)
        : api.post("/admin/media", data),
    remove: (id) => api.delete(`/admin/media/${id}`),
    bulkRemove: (ids) => api.post("/admin/media/bulk-delete", { ids }),
  },
  settings: {
    get: () => api.get("/admin/settings"),
    update: (data) => api.put("/admin/settings", data),
    maintenanceAction: (action) =>
      api.post("/admin/settings/maintenance-action", { action }),
  },
};

export const settingsService = {
  public: () => api.get("/settings/public"),
};
