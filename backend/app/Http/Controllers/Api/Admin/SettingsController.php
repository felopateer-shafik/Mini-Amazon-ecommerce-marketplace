<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSettingsRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    private const STORAGE_PATH = 'settings/platform-settings.json';

    private array $sensitiveKeys = [
        'stripe_secret_key',
        'paypal_client_secret',
        'smtp_password',
        'google_client_secret',
        'facebook_client_secret',
        'apple_client_secret',
        'recaptcha_secret_key',
    ];

    private $defaults = [
        'site_name' => 'E-Commerce Marketplace',
        'site_name_ar' => 'سوق إلكتروني',
        'site_description' => 'Multi-vendor e-commerce marketplace',
        'site_email' => 'support@marketplace.com',
        'site_phone' => '+20 100 000 0000',
        'mail_driver' => 'smtp',
        'smtp_host' => '',
        'smtp_port' => '587',
        'smtp_username' => '',
        'smtp_password' => '',
        'smtp_encryption' => 'tls',
        'mail_from_address' => 'support@marketplace.com',
        'mail_from_name' => 'E-Commerce Marketplace',
        'currency' => 'EGP',
        'currency_symbol' => 'ج.م',
        'tax_rate' => 14,
        'shipping_fee' => 50,
        'free_shipping_threshold' => 500,
        'free_shipping_threshold_enabled' => true,
        'shipping_min_days' => 3,
        'shipping_max_days' => 7,
        'shipping_zones' => [],
        'shipping_methods' => [],
        'active_carriers' => [],
        'commission_rate' => 10,
        'min_withdrawal' => 100,
        'min_payout' => 100,
        'stripe_enabled' => false,
        'stripe_public_key' => '',
        'stripe_secret_key' => '',
        'paypal_enabled' => false,
        'paypal_client_id' => '',
        'paypal_client_secret' => '',
        'cod_enabled' => true,
        'wallet_topup_enabled' => false,
        'google_auth_enabled' => false,
        'google_client_id' => '',
        'google_client_secret' => '',
        'facebook_auth_enabled' => false,
        'facebook_client_id' => '',
        'facebook_client_secret' => '',
        'facebook_pixel_enabled' => false,
        'facebook_pixel_id' => '',
        'apple_auth_enabled' => false,
        'apple_client_id' => '',
        'apple_client_secret' => '',
        'maintenance_mode' => false,
        'maintenance_message' => 'We are currently performing maintenance. Please check back soon.',
        'allow_registration' => true,
        'require_vendor_approval' => true,
        'require_product_approval' => true,
        'require_review_approval' => true,
        'max_upload_size' => 5,
        'default_language' => 'en',
        'supported_languages' => ['en', 'ar'],
        'two_factor_enabled' => false,
        'recaptcha_enabled' => false,
        'recaptcha_site_key' => '',
        'recaptcha_secret_key' => '',
        'login_throttling' => true,
        'max_login_attempts' => 5,
        'force_https' => false,
        'notify_new_order' => true,
        'notify_new_merchant' => true,
        'notify_refund_request' => true,
        'notify_low_stock' => true,
        'notify_product_report' => true,
        'low_stock_threshold' => 10,
        'primary_color' => '#FF9900',
        'secondary_color' => '#232F3E',
        'accent_color' => '#146EB4',
        'logo_url' => '',
        'favicon_url' => '',
        'dark_mode_enabled' => false,
        'points_per_dollar' => 10,
        'points_for_registration' => 100,
        'points_for_review' => 50,
        'points_for_referral' => 200,
        'points_expiry_months' => 12,
        'min_points_redemption' => 500,
        'reward_tiers' => [
            [
                'id' => 1,
                'name' => 'Bronze',
                'icon' => '🥉',
                'minPoints' => 0,
                'maxPoints' => 999,
                'benefits' => ['5% cashback on orders', 'Free standard shipping'],
                'color' => 'bg-orange-100 border-orange-300',
            ],
            [
                'id' => 2,
                'name' => 'Silver',
                'icon' => '🥈',
                'minPoints' => 1000,
                'maxPoints' => 4999,
                'benefits' => ['8% cashback on orders', 'Free express shipping', 'Priority support'],
                'color' => 'bg-gray-100 border-gray-300',
            ],
            [
                'id' => 3,
                'name' => 'Gold',
                'icon' => '🥇',
                'minPoints' => 5000,
                'maxPoints' => 19999,
                'benefits' => ['12% cashback on orders', 'Free overnight shipping', 'Priority support', 'Early access to deals'],
                'color' => 'bg-yellow-100 border-yellow-300',
            ],
            [
                'id' => 4,
                'name' => 'Platinum',
                'icon' => '💎',
                'minPoints' => 20000,
                'maxPoints' => null,
                'benefits' => ['15% cashback on orders', 'Free overnight shipping', 'VIP support', 'Early access to deals', 'Exclusive products'],
                'color' => 'bg-purple-100 border-purple-300',
            ],
        ],
        'reward_items' => [
            ['id' => 1, 'name' => '$5 Coupon', 'points' => 100, 'type' => 'coupon', 'icon' => '🎫'],
            ['id' => 2, 'name' => '$10 Coupon', 'points' => 200, 'type' => 'coupon', 'icon' => '🎫'],
            ['id' => 3, 'name' => 'Free Shipping Voucher', 'points' => 150, 'type' => 'shipping', 'icon' => '📦'],
            ['id' => 4, 'name' => '$25 Gift Card', 'points' => 500, 'type' => 'gift', 'icon' => '🎁'],
            ['id' => 5, 'name' => 'Double Points (24h)', 'points' => 300, 'type' => 'boost', 'icon' => '⚡'],
            ['id' => 6, 'name' => 'VIP Early Access', 'points' => 1000, 'type' => 'access', 'icon' => '👑'],
        ],
        'storefront_banners' => [],
        'homepage_sections' => [],
        'announcement_bar' => [
            'enabled' => true,
            'text' => 'Free shipping on qualifying orders.',
            'background_color' => '#FF9900',
            'text_color' => '#FFFFFF',
            'link' => '',
        ],
        'theme_colors' => [],
        'brands' => [],
        'affiliates' => [],
        'affiliate_enabled' => false,
        'default_affiliate_commission' => 10,
        'affiliate_cookie_days' => 30,
        'system_logs' => [],
        'chat_conversations' => [],
        'content_posts' => [],
        'content_pages' => [],
        'media_library' => [],
        'pos_catalog' => [],
        'pos_tax_rate' => 8,
        'pos_orders' => [],
        'wholesalers' => [],
        'wholesale_products' => [],
        'wholesale_enabled' => false,
        'wholesale_min_order_amount' => 500,
        'wholesale_default_discount' => 20,
        'wholesale_min_quantity' => 10,
        'flash_deals_enabled' => false,
        'flash_deals_note' => '',
        'flash_deals_end_time' => null,
        'newsletter_enabled' => false,
        'newsletter_subject' => '',
        'campaigns_enabled' => false,
        'campaigns_note' => '',
    ];

    public function index(): JsonResponse
    {
        $this->hydrateCacheFromStorage();

        $settings = [];
        foreach ($this->defaults as $key => $default) {
            $settings[$key] = Cache::get("settings.{$key}", $default);
        }

        $filtered = $this->filterSensitiveSettings($settings);

        return response()->json([
            'success' => true,
            'data' => $filtered,
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->hydrateCacheFromStorage();

        $currentSettings = [];
        foreach ($this->defaults as $key => $default) {
            $currentSettings[$key] = Cache::get("settings.{$key}", $default);
        }

        foreach ($data as $key => $value) {
            if (array_key_exists($key, $this->defaults)) {
                if (in_array($key, $this->sensitiveKeys, true) && ($value === null || $value === '' || $value === '********')) {
                    continue;
                }
                $value = $this->normalizeSettingValue($key, $value);
                Cache::forever("settings.{$key}", $value);
                $currentSettings[$key] = $value;
            }
        }

        $hasThemeOverride = array_key_exists('primary_color', $data)
            || array_key_exists('secondary_color', $data)
            || array_key_exists('accent_color', $data);

        if ($hasThemeOverride) {
            $themeColors = Cache::get('settings.theme_colors', []);
            if (!is_array($themeColors)) {
                $themeColors = [];
            }

            if (array_key_exists('primary_color', $data) && !empty($data['primary_color'])) {
                $themeColors['primary'] = $data['primary_color'];
            }
            if (array_key_exists('secondary_color', $data) && !empty($data['secondary_color'])) {
                $themeColors['secondary'] = $data['secondary_color'];
            }
            if (array_key_exists('accent_color', $data) && !empty($data['accent_color'])) {
                $themeColors['accent'] = $data['accent_color'];
            }

            Cache::forever('settings.theme_colors', $themeColors);
            $currentSettings['theme_colors'] = $themeColors;
        }

        $this->persistSettings($currentSettings);

        $filtered = $this->filterSensitiveSettings($currentSettings);

        return response()->json([
            'success' => true,
            'data' => $filtered,
            'message' => __('messages.settings_updated'),
        ]);
    }

    public function maintenanceAction(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => 'required|string|in:clear_cache,clear_logs,optimize,backup_db,backup_settings',
        ]);

        $action = $this->normalizeMaintenanceAction($data['action']);
        $message = __('messages.maintenance_action_completed');
        $result = [];

        switch ($action) {
            case 'clear_cache':
                foreach (array_keys($this->defaults) as $key) {
                    Cache::forget("settings.{$key}");
                }
                $this->hydrateCacheFromStorage();
                $message = __('messages.maintenance_cache_cleared');
                break;

            case 'clear_logs':
                Cache::forever('settings.system_logs', []);
                $message = __('messages.maintenance_logs_cleared');
                break;

            case 'backup_settings':
                $snapshot = [];
                foreach ($this->defaults as $key => $default) {
                    $snapshot[$key] = Cache::get("settings.{$key}", $default);
                }
                $filename = 'backups/settings-backup-' . now()->format('Ymd-His') . '.json';
                Storage::disk('local')->put($filename, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                $message = __('messages.maintenance_backup_generated');
                $result['backup_file'] = $filename;
                break;

            case 'optimize':
                // Keep optimize lightweight and safe in shared hosting environments.
                $message = __('messages.maintenance_optimized');
                break;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'action' => $action,
                ...$result,
            ],
            'message' => $message,
        ]);
    }

    private function normalizeMaintenanceAction(string $action): string
    {
        return match ($action) {
            'backup_db' => 'backup_settings',
            default => $action,
        };
    }

    private function hydrateCacheFromStorage(): void
    {
        if (!Storage::disk('local')->exists(self::STORAGE_PATH)) {
            return;
        }

        $content = Storage::disk('local')->get(self::STORAGE_PATH);
        $decoded = json_decode($content, true);
        if (!is_array($decoded)) {
            return;
        }

        foreach ($this->defaults as $key => $default) {
            if (!array_key_exists($key, $decoded)) {
                continue;
            }
            Cache::forever("settings.{$key}", $this->normalizeSettingValue($key, $decoded[$key]));
        }
    }

    private function normalizeSettingValue(string $key, mixed $value): mixed
    {
        $default = $this->defaults[$key] ?? null;
        if (!is_bool($default)) {
            return $value;
        }

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

    private function persistSettings(array $settings): void
    {
        Storage::disk('local')->put(
            self::STORAGE_PATH,
            json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
        );
    }

    private function filterSensitiveSettings(array $settings): array
    {
        foreach ($this->sensitiveKeys as $key) {
            if (array_key_exists($key, $settings) && is_string($settings[$key]) && $settings[$key] !== '') {
                $settings[$key] = '********';
            }
        }

        return $settings;
    }
}
