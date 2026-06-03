<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function publicSettings(): JsonResponse
    {
        $this->hydrateCacheFromStorage();

        $themeColors = Cache::get('settings.theme_colors', []);
        $facebookPixelEnabled = (bool) Cache::get('settings.facebook_pixel_enabled', false);
        $facebookPixelId = (string) Cache::get('settings.facebook_pixel_id', '');
        $rewardTiers = Cache::get('settings.reward_tiers', []);
        $rewardItems = Cache::get('settings.reward_items', []);
        $minPointsRedemption = (int) Cache::get('settings.min_points_redemption', 500);
        $shippingFee = (float) Cache::get('settings.shipping_fee', 50);
        $freeShippingThreshold = (float) Cache::get('settings.free_shipping_threshold', 0);
        $freeShippingThresholdEnabled = (bool) Cache::get('settings.free_shipping_threshold_enabled', true);
        $shippingMinDays = (int) Cache::get('settings.shipping_min_days', 3);
        $shippingMaxDays = (int) Cache::get('settings.shipping_max_days', 7);
        $shippingMethods = Cache::get('settings.shipping_methods', []);
        $shippingZones = Cache::get('settings.shipping_zones', []);
        $siteName = (string) Cache::get('settings.site_name', config('app.name', 'E-Commerce Marketplace'));
        $siteNameAr = (string) Cache::get('settings.site_name_ar', 'سوق إلكتروني');
        $currency = strtoupper((string) Cache::get('settings.currency', 'EGP'));
        $currencySymbol = (string) Cache::get('settings.currency_symbol', 'ج.م');
        $taxRate = (float) Cache::get('settings.tax_rate', 0);
        $allowRegistration = (bool) Cache::get('settings.allow_registration', true);
        $maintenanceMode = (bool) Cache::get('settings.maintenance_mode', false);
        $maintenanceMessage = (string) Cache::get('settings.maintenance_message', __('messages.maintenance_default_message'));
        $announcementBar = Cache::get('settings.announcement_bar', []);
        $darkModeEnabled = (bool) Cache::get('settings.dark_mode_enabled', false);
        $logoUrl = (string) Cache::get('settings.logo_url', '');
        $faviconUrl = (string) Cache::get('settings.favicon_url', '');
        $googleAuthEnabled = (bool) Cache::get('settings.google_auth_enabled', false);
        $facebookAuthEnabled = (bool) Cache::get('settings.facebook_auth_enabled', false);
        $flashDealsEnabled = (bool) Cache::get('settings.flash_deals_enabled', false);
        $flashDealsEndTime = Cache::get('settings.flash_deals_end_time', null);
        $newsletterEnabled = (bool) Cache::get('settings.newsletter_enabled', false);
        $campaignsEnabled = (bool) Cache::get('settings.campaigns_enabled', false);

        return response()->json([
            'success' => true,
            'data' => [
                'theme_colors' => is_array($themeColors) ? $themeColors : [],
                'facebook_pixel_enabled' => $facebookPixelEnabled,
                'facebook_pixel_id' => trim($facebookPixelId),
                'reward_tiers' => is_array($rewardTiers) ? $rewardTiers : [],
                'reward_items' => is_array($rewardItems) ? $rewardItems : [],
                'min_points_redemption' => $minPointsRedemption,
                'shipping_fee' => $shippingFee,
                'free_shipping_threshold' => $freeShippingThreshold,
                'free_shipping_threshold_enabled' => $freeShippingThresholdEnabled,
                'shipping_min_days' => $shippingMinDays,
                'shipping_max_days' => $shippingMaxDays,
                'shipping_methods' => is_array($shippingMethods) ? $shippingMethods : [],
                'shipping_zones' => is_array($shippingZones) ? $shippingZones : [],
                'site_name' => trim($siteName) !== '' ? trim($siteName) : 'E-Commerce Marketplace',
                'site_name_ar' => trim($siteNameAr),
                'currency' => trim($currency) !== '' ? trim($currency) : 'EGP',
                'currency_symbol' => $currencySymbol,
                'tax_rate' => $taxRate,
                'allow_registration' => $allowRegistration,
                'maintenance_mode' => $maintenanceMode,
                'maintenance_message' => trim($maintenanceMessage) !== ''
                    ? trim($maintenanceMessage)
                    : __('messages.maintenance_default_message'),
                'announcement_bar' => is_array($announcementBar) ? $announcementBar : [],
                'dark_mode_enabled' => $darkModeEnabled,
                'logo_url' => trim($logoUrl),
                'favicon_url' => trim($faviconUrl),
                'google_auth_enabled' => $googleAuthEnabled,
                'facebook_auth_enabled' => $facebookAuthEnabled,
                'flash_deals_enabled' => $flashDealsEnabled,
                'flash_deals_end_time' => $flashDealsEndTime,
                'newsletter_enabled' => $newsletterEnabled,
                'campaigns_enabled' => $campaignsEnabled,
            ],
        ]);
    }

    private function hydrateCacheFromStorage(): void
    {
        $path = 'settings/platform-settings.json';
        if (!Storage::disk('local')->exists($path)) {
            return;
        }

        $decoded = json_decode(Storage::disk('local')->get($path), true);
        if (!is_array($decoded)) {
            return;
        }

        foreach ($decoded as $key => $value) {
            Cache::forever("settings.{$key}", $value);
        }
    }
}
