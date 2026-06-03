<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\StreamController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SearchSuggestionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    
    // ─── Search Suggestions (Public, lightweight) ──────────────
    Route::get('search/suggestions', SearchSuggestionController::class);

    // ─── Public Auth ───────────────────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
        Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('otp/request', [AuthController::class, 'requestOtp'])->middleware('throttle:5,1');
        Route::post('otp/request-login', [AuthController::class, 'requestLoginOtp'])->middleware('throttle:5,1');
        Route::post('otp/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');
        Route::post('social/login', [AuthController::class, 'socialLogin'])->middleware('throttle:10,1');
        Route::get('social/{provider}/redirect', [AuthController::class, 'socialRedirect'])
            ->whereIn('provider', ['google', 'facebook'])
            ->middleware('throttle:20,1');
        Route::get('social/{provider}/callback', [AuthController::class, 'socialCallback'])
            ->whereIn('provider', ['google', 'facebook'])
            ->middleware('throttle:20,1');
        Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
        Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
    });

    // ─── Products (Public) ─────────────────────────────────────
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/featured', [ProductController::class, 'featured']);
    Route::get('products/{slug}', [ProductController::class, 'show']);
    Route::get('products/{product}/reviews', [ReviewController::class, 'index']);

    // ─── Categories (Public) ───────────────────────────────────
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{slug}', [CategoryController::class, 'show']);
    Route::get('categories/{slug}/products', [CategoryController::class, 'products']);

    // ─── Brands (Public) ───────────────────────────────────────
    Route::get('brands', [BrandController::class, 'index']);

    // ─── Vendors (Public) ──────────────────────────────────────
    Route::get('vendors', [VendorController::class, 'index']);
    Route::get('vendors/{slug}', [VendorController::class, 'showBySlug']);
    Route::get('vendors/{slug}/products', [VendorController::class, 'vendorProductsBySlug']);

    // ─── Coupons (Public) ──────────────────────────────────────
    Route::post('coupons/validate', [CouponController::class, 'validateCoupon'])->middleware('throttle:20,1');

    // ─── Public Settings ────────────────────────────────────────
    Route::get('settings/public', [SettingsController::class, 'publicSettings']);

    // ─── Protected Routes ──────────────────────────────────────
    Route::middleware(['auth:sanctum', 'not-banned'])->group(function () {
        
        // Auth
        Route::prefix('auth')->middleware('throttle:20,1')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
            Route::post('refresh', [AuthController::class, 'refresh']);
            Route::post('change-password', [AuthController::class, 'changePassword']);
            Route::post('become-merchant', [AuthController::class, 'becomeMerchant']);
            Route::delete('account', [AuthController::class, 'deleteAccount'])->middleware('throttle:5,1');
        });

        // Cart
        Route::prefix('cart')->group(function () {
            Route::get('/', [CartController::class, 'index']);
            Route::post('add', [CartController::class, 'add']);
            Route::put('update/{item}', [CartController::class, 'update']);
            Route::delete('remove/{item}', [CartController::class, 'remove']);
            Route::delete('clear', [CartController::class, 'clear']);
            Route::post('coupon', [CartController::class, 'applyCoupon']);
            Route::delete('coupon', [CartController::class, 'removeCoupon']);
        });

        // Orders
        Route::apiResource('orders', OrderController::class)->only(['index', 'store', 'show']);
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::post('orders/{order}/refund', [OrderController::class, 'requestRefund']);

        // Reviews
        Route::post('products/{product}/reviews', [ReviewController::class, 'store']);
        Route::put('products/{product}/reviews/{review}', [ReviewController::class, 'update']);
        Route::delete('products/{product}/reviews/{review}', [ReviewController::class, 'destroy']);

        // Refunds
        Route::get('refunds', [RefundController::class, 'index']);
        Route::get('refunds/{id}', [RefundController::class, 'show']);

        // Wishlist
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist', [WishlistController::class, 'store']);
        Route::delete('wishlist/{product}', [WishlistController::class, 'destroy']);

        // Wallet & Points
        Route::get('wallet', [WalletController::class, 'show']);
        Route::post('wallet/top-up', [WalletController::class, 'topUp']);
        Route::get('wallet/transactions', [WalletController::class, 'transactions']);
        Route::get('rewards', [WalletController::class, 'points']);
        Route::post('rewards/redeem', [WalletController::class, 'redeem']);

        // Addresses
        Route::apiResource('addresses', AddressController::class)->except(['show']);

        // Notifications
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::delete('notifications', [NotificationController::class, 'clearAll']);
        Route::put('notifications/{notification}/read', [NotificationController::class, 'markRead']);
        Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);

        // Messaging
        Route::get('messages/conversations', [MessageController::class, 'conversations']);
        Route::get('messages/conversations/{conversation}/messages', [MessageController::class, 'messages']);
        Route::put('messages/conversations/{conversation}/status', [MessageController::class, 'updateStatus']);
        Route::post('messages/conversations/{conversation}/block-customer', [MessageController::class, 'blockCustomer']);
        Route::post('messages/conversations/{conversation}/unblock-customer', [MessageController::class, 'unblockCustomer']);
        Route::post('messages/send', [MessageController::class, 'send']);

        // Live updates stream
        Route::get('stream/updates', [StreamController::class, 'updates']);

        // User profile
        Route::get('user/profile', [ProfileController::class, 'show']);
        Route::put('user/profile', [ProfileController::class, 'update']);
        Route::post('user/profile/avatar', [ProfileController::class, 'uploadAvatar']);

        // Affiliate application (customer-facing)
        Route::post('affiliates/apply', [\App\Http\Controllers\Api\AffiliateApplicationController::class, 'apply']);
        Route::get('affiliates/status', [\App\Http\Controllers\Api\AffiliateApplicationController::class, 'status']);

        // Saved payment cards
        Route::prefix('payment-cards')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\PaymentCardController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\PaymentCardController::class, 'store']);
            Route::delete('{card}', [\App\Http\Controllers\Api\PaymentCardController::class, 'destroy']);
            Route::put('{card}/default', [\App\Http\Controllers\Api\PaymentCardController::class, 'setDefault']);
        });

        // ─── Vendor/Merchant Routes ───────────────────────────
        Route::middleware('role:merchant')->prefix('vendor')->name('vendor.')->group(function () {
            Route::get('dashboard', [VendorController::class, 'dashboard']);
            Route::get('products', [VendorController::class, 'vendorProducts']);
            Route::get('products/{product}', [VendorController::class, 'vendorProduct']);
            Route::post('products', [ProductController::class, 'store']);
            Route::put('products/{product}', [ProductController::class, 'update']);
            Route::delete('products/{product}', [ProductController::class, 'destroy']);
            Route::post('upload-media', [ProductController::class, 'uploadMedia']);
            Route::get('orders', [VendorController::class, 'orders']);
            Route::get('earnings', [VendorController::class, 'earnings']);
            Route::get('reviews', [VendorController::class, 'reviews']);
            Route::post('reviews/{review}/reply', [VendorController::class, 'replyToReview']);
            Route::post('reviews/{review}/helpful', [VendorController::class, 'markReviewHelpful']);
            Route::get('brands', [VendorController::class, 'brands']);
            Route::get('category-requests', [\App\Http\Controllers\Api\MerchantModerationController::class, 'categoryRequests']);
            Route::post('category-requests', [\App\Http\Controllers\Api\MerchantModerationController::class, 'submitCategoryRequest']);
            Route::get('brand-requests', [\App\Http\Controllers\Api\MerchantModerationController::class, 'brandRequests']);
            Route::post('brand-requests', [\App\Http\Controllers\Api\MerchantModerationController::class, 'submitBrandRequest']);
            Route::post('products/{product}/reconsideration', [\App\Http\Controllers\Api\MerchantModerationController::class, 'submitReconsideration']);
            Route::get('settings', [VendorController::class, 'settings']);
            Route::put('settings', [VendorController::class, 'updateSettings']);
            Route::put('orders/{order}/status', [VendorController::class, 'updateOrderStatus']);
            Route::post('payout-request', [VendorController::class, 'requestPayout']);
            Route::get('payout-requests', [VendorController::class, 'payoutRequests']);
        });

        // ─── Admin Routes ─────────────────────────────────────
        Route::middleware('admin-panel-access')->prefix('admin')->name('admin.')->group(function () {
            // ─── Users ─────────────────────────────────────────────
            Route::middleware('permission:view-users')->group(function () {
                Route::get('users', [\App\Http\Controllers\Api\Admin\UserController::class, 'index']);
                Route::get('users/{user}', [\App\Http\Controllers\Api\Admin\UserController::class, 'show']);
            });
            Route::post('users', [\App\Http\Controllers\Api\Admin\UserController::class, 'store'])->middleware('permission:create-users');
            Route::put('users/{user}', [\App\Http\Controllers\Api\Admin\UserController::class, 'update'])->middleware('permission:edit-users');
            Route::delete('users/{user}', [\App\Http\Controllers\Api\Admin\UserController::class, 'destroy'])->middleware('permission:delete-users');
            Route::post('users/{user}/ban', [\App\Http\Controllers\Api\Admin\UserController::class, 'ban'])->middleware('permission:ban-users');
            Route::post('users/{user}/unban', [\App\Http\Controllers\Api\Admin\UserController::class, 'unban'])->middleware('permission:ban-users');

            // ─── Vendors (Merchants) ───────────────────────────────
            Route::middleware('permission:view-merchants')->group(function () {
                Route::get('vendors', [\App\Http\Controllers\Api\Admin\VendorController::class, 'index']);
                Route::get('vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'show']);
            });
            Route::post('vendors', [\App\Http\Controllers\Api\Admin\VendorController::class, 'store'])->middleware('permission:approve-merchants');
            Route::put('vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'update'])->middleware('permission:edit-commission');
            Route::delete('vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'destroy'])->middleware('permission:delete-merchants');
            Route::post('vendors/{vendor}/approve', [\App\Http\Controllers\Api\Admin\VendorController::class, 'approve'])->middleware('permission:approve-merchants');
            Route::post('vendors/{vendor}/reject', [\App\Http\Controllers\Api\Admin\VendorController::class, 'reject'])->middleware('permission:approve-merchants');
            Route::post('vendors/{vendor}/suspend', [\App\Http\Controllers\Api\Admin\VendorController::class, 'suspend'])->middleware('permission:suspend-merchants');

            // ─── Merchant Payout Requests (Admin) ─────────────────
            Route::middleware('permission:view-merchants')->group(function () {
                Route::get('payout-requests', [\App\Http\Controllers\Api\Admin\PayoutController::class, 'index']);
                Route::get('payout-requests/{payoutRequest}', [\App\Http\Controllers\Api\Admin\PayoutController::class, 'show']);
            });
            Route::middleware('permission:approve-merchants')->group(function () {
                Route::put('payout-requests/{payoutRequest}/approve', [\App\Http\Controllers\Api\Admin\PayoutController::class, 'approve']);
                Route::put('payout-requests/{payoutRequest}/reject', [\App\Http\Controllers\Api\Admin\PayoutController::class, 'reject']);
            });

            // ─── Products ──────────────────────────────────────────
            Route::middleware('permission:view-products|use-pos')->group(function () {
                Route::get('products', [\App\Http\Controllers\Api\Admin\ProductController::class, 'index']);
                Route::get('products/{product}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'show']);
            });
            Route::post('products', [\App\Http\Controllers\Api\Admin\ProductController::class, 'store'])->middleware('permission:create-products');
            Route::put('products/{product}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'update'])->middleware('permission:edit-products');
            Route::delete('products/{product}', [\App\Http\Controllers\Api\Admin\ProductController::class, 'destroy'])->middleware('permission:delete-products');
            Route::post('products/{product}/approve', [\App\Http\Controllers\Api\Admin\ProductController::class, 'approve'])->middleware('permission:approve-products');
            Route::post('products/{product}/reject', [\App\Http\Controllers\Api\Admin\ProductController::class, 'reject'])->middleware('permission:approve-products');
            Route::post('upload-media', [\App\Http\Controllers\Api\ProductController::class, 'uploadMedia'])->middleware('permission:upload-media|create-products|edit-products');

            // ─── Moderation Requests ───────────────────────────────
            Route::middleware('permission:approve-categories')->group(function () {
                Route::get('category-requests', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'categoryRequests']);
                Route::post('category-requests/{categoryRequest}/approve', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'approveCategoryRequest']);
                Route::post('category-requests/{categoryRequest}/reject', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'rejectCategoryRequest']);
            });
            Route::middleware('permission:approve-brands')->group(function () {
                Route::get('brand-requests', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'brandRequests']);
                Route::post('brand-requests/{brandRequest}/approve', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'approveBrandRequest']);
                Route::post('brand-requests/{brandRequest}/reject', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'rejectBrandRequest']);
            });
            Route::middleware('permission:approve-products')->group(function () {
                Route::get('product-reconsiderations', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'productReconsiderations']);
                Route::post('product-reconsiderations/{productReconsideration}/reply', [\App\Http\Controllers\Api\Admin\ModerationRequestController::class, 'replyProductReconsideration']);
            });

            // ─── Orders ────────────────────────────────────────────
            Route::middleware('permission:view-orders')->group(function () {
                Route::get('orders', [\App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
                Route::get('orders/{order}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'show']);
            });
            Route::put('orders/{order}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'update'])->middleware('permission:update-orders');

            // ─── Categories ────────────────────────────────────────
            Route::middleware('permission:view-categories')->group(function () {
                Route::get('categories', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'index']);
                Route::get('categories/{category}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'show']);
            });
            Route::post('categories', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'store'])->middleware('permission:create-categories');
            Route::put('categories/{category}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'update'])->middleware('permission:edit-categories');
            Route::delete('categories/{category}', [\App\Http\Controllers\Api\Admin\CategoryController::class, 'destroy'])->middleware('permission:delete-categories');

            // ─── Analytics ─────────────────────────────────────────
            Route::get('analytics', [\App\Http\Controllers\Api\Admin\AnalyticsController::class, 'index'])->middleware('permission:view-dashboard');

            // ─── Refunds ───────────────────────────────────────────
            Route::middleware('permission:view-refunds')->group(function () {
                Route::get('refunds', [\App\Http\Controllers\Api\Admin\RefundController::class, 'index']);
                Route::get('refunds/{refund}', [\App\Http\Controllers\Api\Admin\RefundController::class, 'show']);
            });
            Route::middleware('permission:process-refunds')->group(function () {
                Route::post('refunds/{refund}/approve', [\App\Http\Controllers\Api\Admin\RefundController::class, 'approve']);
                Route::post('refunds/{refund}/reject', [\App\Http\Controllers\Api\Admin\RefundController::class, 'reject']);
                Route::put('refunds/{refund}/status', [\App\Http\Controllers\Api\Admin\RefundController::class, 'updateStatus']);
            });

            // ─── Wallet management ─────────────────────────────────
            Route::middleware('permission:view-finance')->group(function () {
                Route::get('wallets', [\App\Http\Controllers\Api\Admin\WalletController::class, 'index']);
                Route::get('wallet-transactions', [\App\Http\Controllers\Api\Admin\WalletController::class, 'transactions']);
            });
            Route::post('wallets/top-up', [\App\Http\Controllers\Api\Admin\WalletController::class, 'topUp'])->middleware('permission:manage-wallets');

            // ─── Staff ─────────────────────────────────────────────
            Route::get('staff', [\App\Http\Controllers\Api\Admin\StaffController::class, 'index'])->middleware('permission:view-staff');
            Route::post('staff', [\App\Http\Controllers\Api\Admin\StaffController::class, 'store'])->middleware('permission:create-staff');
            Route::put('staff/{staff}', [\App\Http\Controllers\Api\Admin\StaffController::class, 'update'])->middleware('permission:edit-staff');
            Route::delete('staff/{staff}', [\App\Http\Controllers\Api\Admin\StaffController::class, 'destroy'])->middleware('permission:delete-staff');

            // ─── Roles ─────────────────────────────────────────────
            Route::middleware('permission:view-roles')->group(function () {
                Route::get('roles', [\App\Http\Controllers\Api\Admin\RoleController::class, 'index']);
                Route::get('roles/permissions', [\App\Http\Controllers\Api\Admin\RoleController::class, 'permissions']);
            });
            Route::middleware('permission:edit-roles')->group(function () {
                Route::post('roles', [\App\Http\Controllers\Api\Admin\RoleController::class, 'store']);
                Route::put('roles/{role}', [\App\Http\Controllers\Api\Admin\RoleController::class, 'update']);
                Route::delete('roles/{role}', [\App\Http\Controllers\Api\Admin\RoleController::class, 'destroy']);
            });

            // ─── Reviews ───────────────────────────────────────────
            Route::get('reviews', [\App\Http\Controllers\Api\Admin\ReviewController::class, 'index'])->middleware('permission:view-reviews');
            Route::middleware('permission:moderate-reviews')->group(function () {
                Route::post('reviews/{review}/approve', [\App\Http\Controllers\Api\Admin\ReviewController::class, 'approve']);
                Route::post('reviews/{review}/reject', [\App\Http\Controllers\Api\Admin\ReviewController::class, 'reject']);
            });
            Route::delete('reviews/{review}', [\App\Http\Controllers\Api\Admin\ReviewController::class, 'destroy'])->middleware('permission:delete-reviews');

            // ─── Chat Management ───────────────────────────────────
            Route::middleware('permission:view-chats')->group(function () {
                Route::get('chats', [\App\Http\Controllers\Api\Admin\ChatController::class, 'index']);
                Route::get('chats/{conversation}', [\App\Http\Controllers\Api\Admin\ChatController::class, 'show']);
            });
            Route::middleware('permission:manage-chats')->group(function () {
                Route::post('chats/{conversation}/messages', [\App\Http\Controllers\Api\Admin\ChatController::class, 'send']);
                Route::put('chats/{conversation}/status', [\App\Http\Controllers\Api\Admin\ChatController::class, 'updateStatus']);
                Route::post('chats/{conversation}/block-customer', [\App\Http\Controllers\Api\Admin\ChatController::class, 'blockCustomer']);
                Route::post('chats/{conversation}/unblock-customer', [\App\Http\Controllers\Api\Admin\ChatController::class, 'unblockCustomer']);
            });
            Route::delete('chats/{conversation}', [\App\Http\Controllers\Api\Admin\ChatController::class, 'destroy'])->middleware('permission:delete-chats');

            // ─── Settings ──────────────────────────────────────────
            Route::get('settings', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'index']);
            Route::put('settings', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'update'])->middleware('permission:edit-settings|edit-marketing|edit-storefront|edit-content|edit-rewards|manage-wholesale|manage-affiliates|use-pos|edit-shipping|edit-payment-settings|edit-security-settings|manage-system');
            Route::post('settings/maintenance-action', [\App\Http\Controllers\Api\Admin\SettingsController::class, 'maintenanceAction'])->middleware('permission:edit-settings|manage-system');

            // ─── Coupons ───────────────────────────────────────────
            Route::get('coupons', [\App\Http\Controllers\Api\Admin\CouponController::class, 'index'])->middleware('permission:view-marketing');
            Route::post('coupons', [\App\Http\Controllers\Api\Admin\CouponController::class, 'store'])->middleware('permission:create-coupons');
            Route::put('coupons/{coupon}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'update'])->middleware('permission:edit-coupons');
            Route::delete('coupons/{coupon}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'destroy'])->middleware('permission:delete-coupons');

            // ─── Affiliates ────────────────────────────────────────
            Route::middleware('permission:manage-affiliates')->group(function () {
                Route::get('affiliates', [\App\Http\Controllers\Api\Admin\AffiliateController::class, 'index']);
                Route::post('affiliates', [\App\Http\Controllers\Api\Admin\AffiliateController::class, 'store']);
                Route::put('affiliates/{affiliate}', [\App\Http\Controllers\Api\Admin\AffiliateController::class, 'update']);
                Route::delete('affiliates/{affiliate}', [\App\Http\Controllers\Api\Admin\AffiliateController::class, 'destroy']);
            });

            // ─── Wholesale ─────────────────────────────────────────
            Route::middleware('permission:view-wholesale')->group(function () {
                Route::get('wholesale/customers', [\App\Http\Controllers\Api\Admin\WholesaleController::class, 'customers']);
                Route::get('wholesale/products', [\App\Http\Controllers\Api\Admin\WholesaleController::class, 'products']);
            });
            Route::middleware('permission:manage-wholesale')->group(function () {
                Route::put('wholesale/customers/{customer}/status', [\App\Http\Controllers\Api\Admin\WholesaleController::class, 'updateCustomerStatus']);
                Route::post('wholesale/products/sync', [\App\Http\Controllers\Api\Admin\WholesaleController::class, 'syncProducts']);
                Route::post('wholesale/products/bootstrap', [\App\Http\Controllers\Api\Admin\WholesaleController::class, 'bootstrapFromCatalog']);
            });

            // ─── Brands ────────────────────────────────────────────
            Route::get('brands', [\App\Http\Controllers\Api\Admin\BrandController::class, 'index'])->middleware('permission:view-brands');
            Route::post('brands', [\App\Http\Controllers\Api\Admin\BrandController::class, 'store'])->middleware('permission:create-brands');
            Route::put('brands/{brand}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'update'])->middleware('permission:edit-brands');
            Route::delete('brands/{brand}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'destroy'])->middleware('permission:delete-brands');

            // ─── Media Library ─────────────────────────────────────
            Route::get('media', [\App\Http\Controllers\Api\Admin\MediaController::class, 'index'])->middleware('permission:view-media');
            Route::post('media', [\App\Http\Controllers\Api\Admin\MediaController::class, 'store'])->middleware('permission:upload-media');
            Route::delete('media/{media}', [\App\Http\Controllers\Api\Admin\MediaController::class, 'destroy'])->middleware('permission:delete-media');
            Route::post('media/bulk-delete', [\App\Http\Controllers\Api\Admin\MediaController::class, 'bulkDestroy'])->middleware('permission:delete-media');
        });
    });
});
