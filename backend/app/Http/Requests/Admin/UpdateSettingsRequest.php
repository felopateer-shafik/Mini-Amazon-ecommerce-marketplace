<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'site_name' => 'sometimes|nullable|string|max:255',
            'site_name_ar' => 'sometimes|string|max:255',
            'site_description' => 'sometimes|nullable|string',
            'site_email' => 'sometimes|nullable|email|max:255',
            'site_phone' => 'sometimes|nullable|string|max:50',
            'mail_driver' => 'sometimes|nullable|string|max:50',
            'smtp_host' => 'sometimes|nullable|string|max:255',
            'smtp_port' => 'sometimes|nullable|string|max:10',
            'smtp_username' => 'sometimes|nullable|string|max:255',
            'smtp_password' => 'sometimes|nullable|string|max:255',
            'smtp_encryption' => 'sometimes|nullable|in:tls,ssl,none',
            'mail_from_address' => 'sometimes|nullable|email|max:255',
            'mail_from_name' => 'sometimes|nullable|string|max:255',
            'currency' => 'sometimes|nullable|string|max:10',
            'currency_symbol' => 'sometimes|string|max:10',
            'tax_rate' => 'sometimes|numeric|min:0',
            'shipping_fee' => 'sometimes|numeric|min:0',
            'free_shipping_threshold' => 'sometimes|numeric|min:0',
            'free_shipping_threshold_enabled' => 'sometimes|boolean',
            'shipping_min_days' => 'sometimes|integer|min:1',
            'shipping_max_days' => 'sometimes|integer|min:1',
            'shipping_zones' => 'sometimes|array',
            'shipping_zones.*.name' => 'required_with:shipping_zones|string|max:100',
            'shipping_zones.*.countries' => 'nullable|array',
            'shipping_zones.*.countries.*' => 'string|max:100',
            'shipping_methods' => 'sometimes|array',
            'shipping_methods.*.name' => 'required_with:shipping_methods|string|max:100',
            'shipping_methods.*.cost' => 'required_with:shipping_methods|numeric|min:0',
            'shipping_methods.*.minDays' => 'required_with:shipping_methods|integer|min:1',
            'shipping_methods.*.maxDays' => 'required_with:shipping_methods|integer|min:1',
            'shipping_methods.*.enabled' => 'boolean',
            'active_carriers' => 'sometimes|array',
            'active_carriers.*' => 'string|max:100',
            'commission_rate' => 'sometimes|nullable|numeric|min:0|max:100',
            'min_withdrawal' => 'sometimes|nullable|numeric|min:0',
            'min_payout' => 'sometimes|nullable|numeric|min:0',
            'stripe_enabled' => 'sometimes|boolean',
            'stripe_public_key' => 'sometimes|nullable|string|max:255',
            'stripe_secret_key' => 'sometimes|nullable|string|max:255',
            'paypal_enabled' => 'sometimes|boolean',
            'paypal_client_id' => 'sometimes|nullable|string|max:255',
            'paypal_client_secret' => 'sometimes|nullable|string|max:255',
            'cod_enabled' => 'sometimes|boolean',
            'wallet_topup_enabled' => 'sometimes|boolean',
            'google_auth_enabled' => 'sometimes|boolean',
            'google_client_id' => 'sometimes|nullable|string|max:255',
            'google_client_secret' => 'sometimes|nullable|string|max:255',
            'facebook_auth_enabled' => 'sometimes|boolean',
            'facebook_client_id' => 'sometimes|nullable|string|max:255',
            'facebook_client_secret' => 'sometimes|nullable|string|max:255',
            'facebook_pixel_enabled' => 'sometimes|boolean',
            'facebook_pixel_id' => ['sometimes', 'nullable', 'regex:/^[0-9]{5,30}$/'],
            'apple_auth_enabled' => 'sometimes|boolean',
            'apple_client_id' => 'sometimes|nullable|string|max:255',
            'apple_client_secret' => 'sometimes|nullable|string|max:255',
            'maintenance_mode' => 'sometimes|boolean',
            'maintenance_message' => 'sometimes|string|max:1000',
            'allow_registration' => 'sometimes|boolean',
            'require_vendor_approval' => 'sometimes|boolean',
            'require_product_approval' => 'sometimes|boolean',
            'require_review_approval' => 'sometimes|boolean',
            'max_upload_size' => 'sometimes|integer|min:1',
            'default_language' => 'sometimes|in:en,ar',
            'supported_languages' => 'sometimes|array|min:1',
            'supported_languages.*' => 'in:en,ar',
            'two_factor_enabled' => 'sometimes|boolean',
            'recaptcha_enabled' => 'sometimes|boolean',
            'recaptcha_site_key' => 'sometimes|nullable|string|max:255',
            'recaptcha_secret_key' => 'sometimes|nullable|string|max:255',
            'login_throttling' => 'sometimes|boolean',
            'max_login_attempts' => 'sometimes|nullable|integer|min:1|max:20',
            'force_https' => 'sometimes|boolean',
            'notify_new_order' => 'sometimes|boolean',
            'notify_new_merchant' => 'sometimes|boolean',
            'notify_refund_request' => 'sometimes|boolean',
            'notify_low_stock' => 'sometimes|boolean',
            'notify_product_report' => 'sometimes|boolean',
            'low_stock_threshold' => 'sometimes|integer|min:0',
            'primary_color' => ['sometimes', 'nullable', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'secondary_color' => ['sometimes', 'nullable', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'accent_color' => ['sometimes', 'nullable', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'logo_url' => 'sometimes|nullable|string|max:1000',
            'favicon_url' => 'sometimes|nullable|string|max:1000',
            'dark_mode_enabled' => 'sometimes|boolean',
            'points_per_dollar' => 'sometimes|numeric|min:0',
            'points_for_registration' => 'sometimes|numeric|min:0',
            'points_for_review' => 'sometimes|numeric|min:0',
            'points_for_referral' => 'sometimes|numeric|min:0',
            'points_expiry_months' => 'sometimes|integer|min:1',
            'min_points_redemption' => 'sometimes|numeric|min:0',
            'reward_tiers' => 'sometimes|array',
            'reward_tiers.*.id' => 'nullable|integer|min:1',
            'reward_tiers.*.name' => 'required_with:reward_tiers|string|max:100',
            'reward_tiers.*.icon' => 'nullable|string|max:20',
            'reward_tiers.*.minPoints' => 'required_with:reward_tiers|integer|min:0',
            'reward_tiers.*.maxPoints' => 'nullable|integer|min:0',
            'reward_tiers.*.benefits' => 'nullable|array',
            'reward_tiers.*.benefits.*' => 'string|max:255',
            'reward_tiers.*.color' => 'nullable|string|max:100',
            'reward_items' => 'sometimes|array',
            'reward_items.*.id' => 'nullable|integer|min:1',
            'reward_items.*.name' => 'required_with:reward_items|string|max:255',
            'reward_items.*.points' => 'required_with:reward_items|integer|min:1',
            'reward_items.*.type' => 'nullable|string|max:50',
            'reward_items.*.icon' => 'nullable|string|max:20',
            'storefront_banners' => 'sometimes|array',
            'storefront_banners.*.title' => 'required_with:storefront_banners|string|max:255',
            'storefront_banners.*.subtitle' => 'nullable|string|max:255',
            'storefront_banners.*.image' => 'nullable|string|max:1000',
            'storefront_banners.*.link' => 'nullable|string|max:255',
            'storefront_banners.*.position' => 'nullable|integer|min:1',
            'storefront_banners.*.active' => 'boolean',
            'homepage_sections' => 'sometimes|array',
            'homepage_sections.*.name' => 'required_with:homepage_sections|string|max:100',
            'homepage_sections.*.type' => 'required_with:homepage_sections|string|max:50',
            'homepage_sections.*.enabled' => 'sometimes|boolean',
            'announcement_bar' => 'sometimes|array',
            'announcement_bar.enabled' => 'sometimes|boolean',
            'announcement_bar.text' => 'sometimes|nullable|string|max:255',
            'announcement_bar.background_color' => ['sometimes', 'nullable', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'announcement_bar.text_color' => ['sometimes', 'nullable', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'announcement_bar.link' => 'sometimes|nullable|string|max:255',
            'theme_colors' => 'sometimes|array',
            'theme_colors.*' => ['string', 'regex:/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/'],
            'brands' => 'sometimes|array',
            'brands.*.id' => 'nullable|integer|min:1',
            'brands.*.name' => 'required_with:brands|string|max:255',
            'brands.*.slug' => 'nullable|string|max:255',
            'brands.*.website' => 'nullable|string|max:1000',
            'brands.*.logo' => 'nullable|string|max:1000',
            'brands.*.products' => 'nullable|integer|min:0',
            'brands.*.status' => 'nullable|in:active,inactive,pending',
            'affiliates' => 'sometimes|array',
            'affiliates.*.id' => 'nullable|integer|min:1',
            'affiliates.*.name' => 'required_with:affiliates|string|max:255',
            'affiliates.*.email' => 'nullable|email|max:255',
            'affiliates.*.code' => 'required_with:affiliates|string|max:50',
            'affiliates.*.referrals' => 'nullable|integer|min:0',
            'affiliates.*.earnings' => 'nullable|numeric|min:0',
            'affiliates.*.commissionRate' => 'nullable|numeric|min:0|max:100',
            'affiliates.*.status' => 'nullable|in:active,pending,suspended',
            'affiliates.*.joinDate' => 'nullable|date',
            'affiliate_enabled' => 'sometimes|boolean',
            'default_affiliate_commission' => 'sometimes|numeric|min:0|max:100',
            'affiliate_cookie_days' => 'sometimes|integer|min:1|max:365',
            'flash_deals_enabled' => 'sometimes|boolean',
            'flash_deals_note' => 'sometimes|nullable|string|max:500',
            'flash_deals_end_time' => 'sometimes|nullable|string|max:50',
            'newsletter_enabled' => 'sometimes|boolean',
            'newsletter_subject' => 'sometimes|nullable|string|max:255',
            'campaigns_enabled' => 'sometimes|boolean',
            'campaigns_note' => 'sometimes|nullable|string|max:500',
            'system_logs' => 'sometimes|array',
            'system_logs.*.time' => 'required_with:system_logs|string|max:20',
            'system_logs.*.level' => 'required_with:system_logs|in:info,warning,error',
            'system_logs.*.message' => 'required_with:system_logs|string|max:500',
            'chat_conversations' => 'sometimes|array',
            'chat_conversations.*.id' => 'nullable|integer|min:1',
            'chat_conversations.*.customer' => 'required_with:chat_conversations|string|max:255',
            'chat_conversations.*.merchant' => 'nullable|string|max:255',
            'chat_conversations.*.status' => 'nullable|in:active,waiting,resolved',
            'chat_conversations.*.time' => 'nullable|string|max:50',
            'chat_conversations.*.unread' => 'nullable|integer|min:0',
            'chat_conversations.*.lastMessage' => 'nullable|string|max:500',
            'chat_conversations.*.messages' => 'nullable|array',
            'chat_conversations.*.messages.*.from' => 'required_with:chat_conversations.*.messages|in:customer,merchant,admin',
            'chat_conversations.*.messages.*.text' => 'required_with:chat_conversations.*.messages|string|max:2000',
            'chat_conversations.*.messages.*.time' => 'nullable|string|max:50',
            'content_posts' => 'sometimes|array',
            'content_posts.*.id' => 'nullable|integer|min:1',
            'content_posts.*.title' => 'required_with:content_posts|string|max:255',
            'content_posts.*.slug' => 'nullable|string|max:255',
            'content_posts.*.category' => 'nullable|string|max:100',
            'content_posts.*.status' => 'nullable|in:published,draft,scheduled',
            'content_posts.*.views' => 'nullable|integer|min:0',
            'content_posts.*.createdAt' => 'nullable|string|max:50',
            'content_posts.*.updatedAt' => 'nullable|string|max:50',
            'content_posts.*.content' => 'nullable|string|max:20000',
            'content_pages' => 'sometimes|array',
            'content_pages.*.id' => 'nullable|integer|min:1',
            'content_pages.*.title' => 'required_with:content_pages|string|max:255',
            'content_pages.*.slug' => 'nullable|string|max:255',
            'content_pages.*.status' => 'nullable|in:published,draft,scheduled',
            'content_pages.*.updatedAt' => 'nullable|string|max:50',
            'content_pages.*.content' => 'nullable|string|max:20000',
            'media_library' => 'sometimes|array',
            'media_library.*.id' => 'nullable|integer|min:1',
            'media_library.*.name' => 'required_with:media_library|string|max:255',
            'media_library.*.type' => 'required_with:media_library|in:image,video,document',
            'media_library.*.size' => 'nullable|string|max:50',
            'media_library.*.url' => 'required_with:media_library|string|max:1000',
            'media_library.*.createdAt' => 'nullable|string|max:50',
            'pos_catalog' => 'sometimes|array',
            'pos_catalog.*.id' => 'nullable|integer|min:1',
            'pos_catalog.*.name' => 'required_with:pos_catalog|string|max:255',
            'pos_catalog.*.price' => 'required_with:pos_catalog|numeric|min:0',
            'pos_catalog.*.sku' => 'nullable|string|max:100',
            'pos_catalog.*.stock' => 'nullable|integer|min:0',
            'pos_catalog.*.image' => 'nullable|string|max:1000',
            'pos_catalog.*.category' => 'nullable|string|max:100',
            'pos_tax_rate' => 'sometimes|numeric|min:0|max:100',
            'pos_orders' => 'sometimes|array',
            'pos_orders.*.id' => 'nullable|integer|min:1',
            'pos_orders.*.total' => 'required_with:pos_orders|numeric|min:0',
            'pos_orders.*.subtotal' => 'nullable|numeric|min:0',
            'pos_orders.*.tax' => 'nullable|numeric|min:0',
            'pos_orders.*.customer' => 'nullable|string|max:255',
            'pos_orders.*.paymentMethod' => 'nullable|in:Cash,Card,Mobile',
            'pos_orders.*.createdAt' => 'nullable|string|max:50',
            'pos_orders.*.items' => 'nullable|array',
            'wholesalers' => 'sometimes|array',
            'wholesalers.*.id' => 'nullable|integer|min:1',
            'wholesalers.*.company' => 'required_with:wholesalers|string|max:255',
            'wholesalers.*.email' => 'nullable|email|max:255',
            'wholesalers.*.contact' => 'nullable|string|max:255',
            'wholesalers.*.orders' => 'nullable|integer|min:0',
            'wholesalers.*.totalSpent' => 'nullable|numeric|min:0',
            'wholesalers.*.status' => 'nullable|in:approved,pending,rejected,active',
            'wholesale_products' => 'sometimes|array',
            'wholesale_products.*.id' => 'nullable|integer|min:1',
            'wholesale_products.*.name' => 'required_with:wholesale_products|string|max:255',
            'wholesale_products.*.sku' => 'nullable|string|max:100',
            'wholesale_products.*.merchant' => 'nullable|string|max:255',
            'wholesale_products.*.retailPrice' => 'nullable|numeric|min:0',
            'wholesale_products.*.wholesalePrice' => 'required_with:wholesale_products|numeric|min:0',
            'wholesale_products.*.minQty' => 'nullable|integer|min:1',
            'wholesale_products.*.status' => 'nullable|in:active,inactive,pending',
            'wholesale_enabled' => 'sometimes|boolean',
            'wholesale_min_order_amount' => 'sometimes|numeric|min:0',
            'wholesale_default_discount' => 'sometimes|numeric|min:0|max:100',
            'wholesale_min_quantity' => 'sometimes|integer|min:1',
        ];
    }

    protected function prepareForValidation(): void
    {
        $booleanFields = [
            'free_shipping_threshold_enabled',
            'stripe_enabled',
            'paypal_enabled',
            'cod_enabled',
            'wallet_topup_enabled',
            'google_auth_enabled',
            'facebook_auth_enabled',
            'facebook_pixel_enabled',
            'apple_auth_enabled',
            'maintenance_mode',
            'allow_registration',
            'require_vendor_approval',
            'require_product_approval',
            'require_review_approval',
            'two_factor_enabled',
            'recaptcha_enabled',
            'login_throttling',
            'force_https',
            'notify_new_order',
            'notify_new_merchant',
            'notify_refund_request',
            'notify_low_stock',
            'notify_product_report',
            'dark_mode_enabled',
            'affiliate_enabled',
            'flash_deals_enabled',
            'newsletter_enabled',
            'campaigns_enabled',
            'wholesale_enabled',
        ];

        $updates = [];
        foreach ($booleanFields as $field) {
            if (!$this->has($field)) {
                continue;
            }

            $updates[$field] = $this->toBoolean($this->input($field));
        }

        if ($this->has('announcement_bar') && is_array($this->input('announcement_bar'))) {
            $announcementBar = $this->input('announcement_bar');
            if (array_key_exists('enabled', $announcementBar)) {
                $announcementBar['enabled'] = $this->toBoolean($announcementBar['enabled']);
            }
            $updates['announcement_bar'] = $announcementBar;
        }

        if (!empty($updates)) {
            $this->merge($updates);
        }
    }

    private function toBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return ((int) $value) === 1;
        }

        if (is_string($value)) {
            $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            return $normalized ?? false;
        }

        return false;
    }
}
