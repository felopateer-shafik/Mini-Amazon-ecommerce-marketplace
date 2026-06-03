import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  productService,
  categoryService,
  brandService,
  cartService,
  orderService,
  refundService,
  wishlistService,
  walletService,
  addressService,
  userService,
  notificationService,
  messageService,
  vendorService,
  merchantService,
  couponService,
  adminService,
  settingsService,
  paymentCardService,
  authService,
} from "@/api/services";

const ADMIN_QUERY_TIMEOUT_MS = 10000;

// Real-time polling tiers for the admin panel
const ADMIN_POLL_FAST = 10 * 1000; // 10 s – analytics, orders, chats, refunds
const ADMIN_POLL_NORMAL = 15 * 1000; // 15 s – products, users, vendors, reviews …
const ADMIN_POLL_SLOW = 30 * 1000; // 30 s – settings, media, roles, permissions

const ADMIN_QUERY_OPTIONS = {
  retry: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  staleTime: 5 * 1000,
  refetchInterval: ADMIN_POLL_NORMAL,
};

function withQueryTimeout(promise, timeoutMs = ADMIN_QUERY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// ─── Products ─────────────────────────────────────────────────────
export function useProducts(params) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productService.list(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productService.featured().then((r) => r.data),
  });
}

export function useProduct(slug) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.detail(slug).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useProductReviews(productId, params) {
  return useQuery({
    queryKey: ["reviews", productId, params],
    queryFn: () =>
      productService.reviews(productId, params).then((r) => r.data),
    enabled: !!productId,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }) =>
      productService.submitReview(productId, data).then((r) => r.data),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, reviewId, data }) =>
      productService
        .updateReview(productId, reviewId, data)
        .then((r) => r.data),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, reviewId }) =>
      productService.deleteReview(productId, reviewId).then((r) => r.data),
    onSuccess: (_, { productId }) => {
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
  });
}

// ─── Categories ───────────────────────────────────────────────────
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list().then((r) => r.data),
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => brandService.list().then((r) => r.data),
  });
}

export function useCategory(slug) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => categoryService.detail(slug).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useCategoryProducts(slug, params) {
  return useQuery({
    queryKey: ["category-products", slug, params],
    queryFn: () => categoryService.products(slug, params).then((r) => r.data),
    enabled: !!slug,
    placeholderData: keepPreviousData,
  });
}

// ─── Cart ─────────────────────────────────────────────────────────
export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: () => cartService.get().then((r) => r.data),
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => cartService.add(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) =>
      cartService.update(itemId, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => cartService.remove(itemId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clear().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useApplyCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code) => cartService.applyCoupon(code).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

export function useRemoveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.removeCoupon().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
}

// ─── Public Settings ──────────────────────────────────────────────
export function usePublicSettings() {
  const qc = useQueryClient();

  return useQuery({
    queryKey: ["publicSettings"],
    queryFn: async () => {
      const payload = await settingsService.public().then((r) => r.data);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            "publicSettingsCacheV1",
            JSON.stringify(payload),
          );
        } catch {
          // ignore storage errors
        }
      }
      return payload;
    },
    initialData: () => {
      const inMemory = qc.getQueryData(["publicSettings"]);
      if (inMemory) return inMemory;

      if (typeof window === "undefined") return undefined;
      try {
        const raw = window.localStorage.getItem("publicSettingsCacheV1");
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    staleTime: 0,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

// ─── Orders ───────────────────────────────────────────────────────
export function useOrders(params) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => orderService.list(params).then((r) => r.data),
  });
}

export function useOrder(id) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => orderService.detail(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => orderService.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => orderService.cancel(id).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRequestRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }) =>
      orderService.requestRefund(orderId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order"] });
    },
  });
}

// ─── Refunds ──────────────────────────────────────────────────────
export function useRefunds(params) {
  return useQuery({
    queryKey: ["refunds", params],
    queryFn: () => refundService.list(params).then((r) => r.data),
  });
}

// ─── Wishlist ─────────────────────────────────────────────────────
export function useWishlist(enabled = true) {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistService.list().then((r) => r.data),
    enabled,
  });
}

export function useAddToWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId) =>
      wishlistService.add(productId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });
}

export function useRemoveFromWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId) =>
      wishlistService.remove(productId).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });
}

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletService.get().then((r) => r.data),
  });
}

export function useWalletTransactions(params) {
  return useQuery({
    queryKey: ["wallet", "transactions", params],
    queryFn: () => walletService.transactions(params).then((r) => r.data),
  });
}

export function useTopUpWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => walletService.topUp(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ["rewards"],
    queryFn: () => walletService.points().then((r) => r.data),
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => walletService.redeemReward(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ─── Addresses ────────────────────────────────────────────────────
export function useAddresses() {
  return useQuery({
    queryKey: ["addresses"],
    queryFn: () => addressService.list().then((r) => r.data),
  });
}

export function useCreateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => addressService.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useUpdateAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      addressService.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => addressService.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["addresses"] }),
  });
}

// ─── Payment Cards ────────────────────────────────────────────────
export function usePaymentCards() {
  return useQuery({
    queryKey: ["paymentCards"],
    queryFn: () => paymentCardService.list().then((r) => r.data),
  });
}

export function useAddPaymentCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => paymentCardService.add(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentCards"] }),
  });
}

export function useRemovePaymentCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => paymentCardService.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentCards"] }),
  });
}

export function useSetDefaultPaymentCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => paymentCardService.setDefault(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentCards"] }),
  });
}

// ─── User Profile ─────────────────────────────────────────────────
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => userService.profile().then((r) => r.data),
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => userService.updateProfile(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadProfileAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) =>
      userService.uploadAvatar(formData).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ─── Notifications ───────────────────────────────────────────────
export function useNotifications(params, enabled = true) {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => notificationService.list(params).then((r) => r.data),
    enabled,
    refetchInterval: enabled ? 10000 : false,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.markRead(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.clearAll().then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── Messaging ───────────────────────────────────────────────────
export function useConversations(enabled = true) {
  return useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: () => messageService.conversations().then((r) => r.data),
    enabled,
  });
}

export function useConversationMessages(conversationId, enabled = true) {
  return useQuery({
    queryKey: ["messages", "conversation", conversationId],
    queryFn: () => messageService.messages(conversationId).then((r) => r.data),
    enabled: enabled && !!conversationId,
    refetchInterval: 15000,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => messageService.send(data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (variables?.conversation_id) {
        qc.invalidateQueries({
          queryKey: ["messages", "conversation", variables.conversation_id],
        });
      }
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateConversationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }) =>
      messageService.updateStatus(conversationId, data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      if (variables?.conversationId) {
        qc.invalidateQueries({
          queryKey: ["messages", "conversation", variables.conversationId],
        });
      }
    },
  });
}

export function useBlockConversationCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) =>
      messageService.blockCustomer(conversationId).then((r) => r.data),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      qc.invalidateQueries({
        queryKey: ["messages", "conversation", conversationId],
      });
    },
  });
}

export function useUnblockConversationCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) =>
      messageService.unblockCustomer(conversationId).then((r) => r.data),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
      qc.invalidateQueries({
        queryKey: ["messages", "conversation", conversationId],
      });
    },
  });
}

// ─── Vendors ──────────────────────────────────────────────────────
export function useVendors(params) {
  return useQuery({
    queryKey: ["vendors", params],
    queryFn: () => vendorService.list(params).then((r) => r.data),
  });
}

export function useVendor(slug) {
  return useQuery({
    queryKey: ["vendor", slug],
    queryFn: () => vendorService.detail(slug).then((r) => r.data),
    enabled: !!slug,
  });
}

export function useVendorProducts(slug, params) {
  return useQuery({
    queryKey: ["vendor", "products", slug, params],
    queryFn: () => vendorService.products(slug, params).then((r) => r.data),
    enabled: !!slug,
  });
}

// ─── Merchant (Vendor Panel) ──────────────────────────────────────
export function useMerchantDashboard() {
  return useQuery({
    queryKey: ["merchant", "dashboard"],
    queryFn: () => merchantService.dashboard().then((r) => r.data),
  });
}

export function useMerchantProducts(params) {
  return useQuery({
    queryKey: ["merchant", "products", params],
    queryFn: () => merchantService.products(params).then((r) => r.data),
  });
}

export function useMerchantProduct(id, options = {}) {
  return useQuery({
    queryKey: ["merchant", "product", id],
    queryFn: () => merchantService.productDetail(id).then((r) => r.data),
    enabled: !!id && (options.enabled ?? true),
  });
}

export function useMerchantBrands() {
  return useQuery({
    queryKey: ["merchant", "brands"],
    queryFn: () => merchantService.brands().then((r) => r.data),
  });
}

export function useMerchantOrders(params) {
  return useQuery({
    queryKey: ["merchant", "orders", params],
    queryFn: () => merchantService.orders(params).then((r) => r.data),
  });
}

export function useMerchantEarnings(params) {
  return useQuery({
    queryKey: ["merchant", "earnings", params],
    queryFn: () => merchantService.earnings(params).then((r) => r.data),
  });
}

export function useMerchantReviews(params) {
  return useQuery({
    queryKey: ["merchant", "reviews", params],
    queryFn: () => merchantService.reviews(params).then((r) => r.data),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      merchantService.createProduct(data).then((r) => r.data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["merchant", "products"] });
      const productId = result?.data?.id ?? result?.id;
      if (productId) {
        qc.invalidateQueries({ queryKey: ["merchant", "product", productId] });
      }
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      merchantService.updateProduct(id, data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["merchant", "products"] });
      const productId = variables?.id;
      if (productId) {
        qc.invalidateQueries({ queryKey: ["merchant", "product", productId] });
      }
    },
  });
}

export function useMerchantSubmitCategoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      merchantService.submitCategoryRequest(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "category-requests"] }),
  });
}

export function useMerchantSubmitBrandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      merchantService.submitBrandRequest(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "brand-requests"] }),
  });
}

export function useMerchantSubmitReconsideration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, data }) =>
      merchantService
        .submitReconsideration(productId, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => merchantService.deleteProduct(id).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "products"] }),
  });
}

export function useMerchantReplyReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }) =>
      merchantService.replyToReview(reviewId, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "reviews"] }),
  });
}

export function useMerchantMarkReviewHelpful() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId) =>
      merchantService.markReviewHelpful(reviewId).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "reviews"] }),
  });
}

export function useMerchantSettings() {
  return useQuery({
    queryKey: ["merchant", "settings"],
    queryFn: () => merchantService.settings().then((r) => r.data),
  });
}

export function useUpdateMerchantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      merchantService.updateSettings(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["merchant", "settings"] }),
  });
}

export function useMerchantUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, ...data }) =>
      merchantService.updateOrderStatus(orderId, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchantOrders"] });
      qc.invalidateQueries({ queryKey: ["merchantDashboard"] });
    },
  });
}

export function useMerchantRequestPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      merchantService.requestPayout(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchantEarnings"] });
      qc.invalidateQueries({ queryKey: ["merchantPayoutRequests"] });
    },
  });
}

export function useMerchantPayoutRequests(params) {
  return useQuery({
    queryKey: ["merchantPayoutRequests", params],
    queryFn: () => merchantService.payoutRequests(params).then((r) => r.data),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (data) => authService.deleteAccount(data).then((r) => r.data),
  });
}

// ─── Coupons ──────────────────────────────────────────────────────
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (payload) =>
      couponService.validate(payload).then((r) => r.data),
  });
}

// ─── Admin ────────────────────────────────────────────────────────
export function useAdminAnalytics(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    ...options,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "analytics", params],
    queryFn: () =>
      withQueryTimeout(adminService.analytics(params).then((r) => r.data)),
  });
}

export function useAdminUsers(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    ...options,
    queryKey: ["admin", "users", params],
    queryFn: () =>
      withQueryTimeout(adminService.users.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.users.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.users.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.users.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.users.ban(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminUnbanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.users.unban(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useAdminVendors(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "vendors", params],
    queryFn: () =>
      withQueryTimeout(adminService.vendors.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminApproveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.vendors.approve(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vendors"] }),
  });
}

export function useAdminRejectVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      adminService.vendors.reject(id, { reason }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vendors"] }),
  });
}

export function useAdminSuspendVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.vendors.suspend(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vendors"] }),
  });
}

export function useAdminDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.vendors.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vendors"] }),
  });
}

export function useAdminProducts(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    ...options,
    queryKey: ["admin", "products", params],
    queryFn: () =>
      withQueryTimeout(adminService.products.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "product", id],
    queryFn: () =>
      withQueryTimeout(adminService.products.detail(id).then((r) => r.data)),
    enabled: !!id,
  });
}

export function useAdminCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      adminService.products.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.products.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.products.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminApproveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.products.approve(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminRejectProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.products.reject(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

export function useAdminCategoryRequests(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "category-requests", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.moderationRequests
          .categoryRequests(params)
          .then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminApproveCategoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.moderationRequests
        .approveCategoryRequest(id, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "category-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });
}

export function useAdminRejectCategoryRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.moderationRequests
        .rejectCategoryRequest(id, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "category-requests"] }),
  });
}

export function useAdminBrandRequests(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "brand-requests", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.moderationRequests
          .brandRequests(params)
          .then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminApproveBrandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.moderationRequests
        .approveBrandRequest(id, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "brand-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
  });
}

export function useAdminRejectBrandRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.moderationRequests
        .rejectBrandRequest(id, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "brand-requests"] }),
  });
}

export function useAdminProductReconsiderations(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "product-reconsiderations", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.moderationRequests
          .productReconsiderations(params)
          .then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminReplyProductReconsideration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.moderationRequests
        .replyProductReconsideration(id, data)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "product-reconsiderations"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["merchant", "products"] });
    },
  });
}

export function useAdminOrders(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    ...options,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "orders", params],
    queryFn: () =>
      withQueryTimeout(adminService.orders.list(params).then((r) => r.data)),
  });
}

export function useAdminOrder(id) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "order", id],
    queryFn: () =>
      withQueryTimeout(adminService.orders.detail(id).then((r) => r.data)),
    enabled: !!id,
  });
}

export function useAdminUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.orders.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });
}

export function useAdminCategories(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    staleTime: 0,
    refetchOnMount: "always",
    queryKey: ["admin", "categories", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.categories.list(params).then((r) => r.data),
      ),
  });
}

export function useAdminCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      adminService.categories.create(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useAdminUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.categories.update(id, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useAdminDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, options = {} }) =>
      adminService.categories.remove(id, options).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "categories"] }),
  });
}

export function useAdminRefunds(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "refunds", params],
    queryFn: () =>
      withQueryTimeout(adminService.refunds.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminApproveRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.refunds.approve(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "refunds"] }),
  });
}

export function useAdminRejectRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.refunds.reject(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "refunds"] }),
  });
}

export function useAdminUpdateRefundStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.refunds.updateStatus(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "refunds"] }),
  });
}

export function useAdminWallets(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_FAST,
    ...options,
    queryKey: ["admin", "wallets", params],
    queryFn: () =>
      withQueryTimeout(adminService.wallets.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminWalletTransactions(params, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_FAST,
    ...options,
    queryKey: ["admin", "wallet-transactions", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.wallets.transactions(params).then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminWalletTopUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.wallets.topUp(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "wallets"] });
      qc.invalidateQueries({ queryKey: ["admin", "wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}

export function useAdminStaff(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_SLOW,
    queryKey: ["admin", "staff", params],
    queryFn: () =>
      withQueryTimeout(adminService.staff.list(params).then((r) => r.data)),
  });
}

export function useAdminCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.staff.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });
}

export function useAdminUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.staff.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });
}

export function useAdminDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.staff.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "staff"] }),
  });
}

export function useAdminRoles() {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_SLOW,
    queryKey: ["admin", "roles"],
    queryFn: () =>
      withQueryTimeout(adminService.roles.list().then((r) => r.data)),
  });
}

export function useAdminUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.roles.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}

export function useAdminCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.roles.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}

export function useAdminDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.roles.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "roles"] }),
  });
}

export function useAdminPermissions() {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "permissions"],
    queryFn: () =>
      withQueryTimeout(adminService.roles.permissions().then((r) => r.data)),
    staleTime: 1000 * 60 * 30,
    refetchInterval: false,
  });
}

export function useAdminCoupons(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "coupons", params],
    queryFn: () => couponService.list(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => couponService.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useAdminUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      couponService.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useAdminDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => couponService.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] }),
  });
}

export function useAdminReviews(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "reviews", params],
    queryFn: () =>
      withQueryTimeout(adminService.reviews.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminChats(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "chats", params],
    queryFn: () =>
      withQueryTimeout(adminService.chats.list(params).then((r) => r.data)),
  });
}

export function useAdminChat(conversationId, options = {}) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_FAST,
    queryKey: ["admin", "chat", conversationId],
    queryFn: () =>
      withQueryTimeout(
        adminService.chats.detail(conversationId).then((r) => r.data),
      ),
    enabled: !!conversationId,
    ...options,
  });
}

export function useAdminSendChatMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }) =>
      adminService.chats.sendMessage(conversationId, data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
      qc.invalidateQueries({
        queryKey: ["admin", "chat", variables?.conversationId],
      });
    },
  });
}

export function useAdminUpdateChatStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, data }) =>
      adminService.chats.updateStatus(conversationId, data).then((r) => r.data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
      qc.invalidateQueries({
        queryKey: ["admin", "chat", variables?.conversationId],
      });
    },
  });
}

export function useAdminBlockChatCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) =>
      adminService.chats.blockCustomer(conversationId).then((r) => r.data),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
      qc.invalidateQueries({ queryKey: ["admin", "chat", conversationId] });
    },
  });
}

export function useAdminUnblockChatCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) =>
      adminService.chats.unblockCustomer(conversationId).then((r) => r.data),
    onSuccess: (_, conversationId) => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
      qc.invalidateQueries({ queryKey: ["admin", "chat", conversationId] });
    },
  });
}

export function useAdminDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) =>
      adminService.chats.remove(conversationId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "chats"] });
      qc.invalidateQueries({ queryKey: ["admin", "chat"] });
    },
  });
}

export function useAdminAffiliates(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "affiliates", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.affiliates.list(params).then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUpdateAffiliate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.affiliates.update(id, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "affiliates"] }),
  });
}

export function useAdminWholesaleCustomers(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "wholesale", "customers", params],
    queryFn: () =>
      withQueryTimeout(
        adminService.wholesale.customers(params).then((r) => r.data),
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAdminWholesaleProducts() {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "wholesale", "products"],
    queryFn: () =>
      withQueryTimeout(adminService.wholesale.products().then((r) => r.data)),
  });
}

export function useAdminUpdateWholesaleCustomerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.wholesale.updateCustomerStatus(id, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "wholesale", "customers"] }),
  });
}

export function useAdminSyncWholesaleProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items) =>
      adminService.wholesale.syncProducts(items).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "wholesale", "products"] }),
  });
}

export function useAdminBootstrapWholesaleProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      adminService.wholesale.bootstrapProducts().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "wholesale", "products"] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export function useAdminBrands(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    queryKey: ["admin", "brands", params],
    queryFn: () =>
      withQueryTimeout(adminService.brands.list(params).then((r) => r.data)),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.brands.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "brands"] }),
  });
}

export function useAdminUpdateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) =>
      adminService.brands.update(id, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "brands"] }),
  });
}

export function useAdminDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.brands.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "brands"] }),
  });
}

export function useAdminMedia(params) {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_SLOW,
    queryKey: ["admin", "media", params],
    queryFn: () =>
      withQueryTimeout(adminService.media.list(params).then((r) => r.data)),
  });
}

export function useAdminCreateMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminService.media.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "media"] }),
  });
}

export function useAdminDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.media.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "media"] }),
  });
}

export function useAdminBulkDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids) => adminService.media.bulkRemove(ids).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "media"] }),
  });
}

export function useAdminDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.reviews.remove(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useAdminApproveReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.reviews.approve(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useAdminRejectReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminService.reviews.reject(id).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useAdminSettings() {
  return useQuery({
    ...ADMIN_QUERY_OPTIONS,
    refetchInterval: ADMIN_POLL_SLOW,
    queryKey: ["admin", "settings"],
    queryFn: () =>
      withQueryTimeout(adminService.settings.get().then((r) => r.data)),
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) =>
      adminService.settings.update(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["publicSettings"] });
    },
  });
}

export function useAdminMaintenanceAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action) =>
      adminService.settings.maintenanceAction(action).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
  });
}
