<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $runtimeSettings = $this->loadRuntimeSettings();
        $this->applyRuntimeConfig($runtimeSettings);

        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));
            $rateKey = ($email !== '' ? $email : 'anonymous').'|'.$request->ip();

            $loginThrottlingEnabled = $this->parseBooleanSetting(Cache::get('settings.login_throttling', true), true);
            $maxAttempts = (int) Cache::get('settings.max_login_attempts', 20);
            $maxAttempts = max(1, min($maxAttempts, 100));

            if (!$loginThrottlingEnabled) {
                return Limit::none();
            }

            return Limit::perMinute($maxAttempts)
                ->by($rateKey)
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'success' => false,
                        'message' => __('auth.throttle', ['seconds' => $headers['Retry-After'] ?? 60]),
                    ], 429, $headers);
                });
        });

        // Permission-based bypasses and active-state enforcement.
        Gate::before(function ($user, $ability) {
            $permissionNames = Cache::remember('admin_panel_permission_names', 600, function (): array {
                return Permission::query()
                    ->where('guard_name', 'web')
                    ->pluck('name')
                    ->all();
            });

            // Block inactive users who hold any admin permission
            if (($user->is_active ?? true) === false && $permissionNames !== [] && $user->hasAnyPermission($permissionNames)) {
                return false;
            }

            // System admin account always has full access
            if (method_exists($user, 'isSystemAdminAccount') && $user->isSystemAdminAccount()) {
                return true;
            }

            // Admin role always has full access to all permissions
            if ($user->hasRole('admin')) {
                return true;
            }

        });

        // Strict mode in non-production: prevent lazy loading (N+1), mass assignment, silently discarding attributes
        Model::shouldBeStrict(! app()->isProduction());

        // In production, prevent lazy loading but log instead of exception
        if (app()->isProduction()) {
            Model::preventLazyLoading();
            Model::handleLazyLoadingViolationUsing(function ($model, $relation) {
                logger()->warning("Lazy loading [{$relation}] on model [" . get_class($model) . "]");
            });
        }

        // Force HTTPS only when the setting is enabled.
        if ($this->parseBooleanSetting(Cache::get('settings.force_https', false), false)) {
            URL::forceScheme('https');
        }

        // Optimize: prevent N+1 by default
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
    }

    private function loadRuntimeSettings(): array
    {
        $defaults = [
            'mail_driver' => 'smtp',
            'smtp_host' => '',
            'smtp_port' => '587',
            'smtp_username' => '',
            'smtp_password' => '',
            'smtp_encryption' => 'tls',
            'mail_from_address' => 'support@marketplace.com',
            'mail_from_name' => 'E-Commerce Marketplace',
            'currency' => 'EGP',
            'site_name' => 'E-Commerce Marketplace',
            'login_throttling' => true,
            'max_login_attempts' => 20,
            'google_client_id' => '',
            'google_client_secret' => '',
            'facebook_client_id' => '',
            'facebook_client_secret' => '',
            'apple_client_id' => '',
            'apple_client_secret' => '',
        ];

        $settings = [];
        foreach ($defaults as $key => $default) {
            $settings[$key] = Cache::get("settings.{$key}", $default);
        }

        // Hydrate from storage when cache is cold.
        $allDefaultsUsed = true;
        foreach ($settings as $key => $value) {
            if ($value !== $defaults[$key]) {
                $allDefaultsUsed = false;
                break;
            }
        }

        if ($allDefaultsUsed && Storage::disk('local')->exists('settings/platform-settings.json')) {
            $decoded = json_decode(Storage::disk('local')->get('settings/platform-settings.json'), true);
            if (is_array($decoded)) {
                foreach ($defaults as $key => $default) {
                    if (array_key_exists($key, $decoded)) {
                        $settings[$key] = $decoded[$key];
                    }
                    Cache::forever("settings.{$key}", $settings[$key]);
                }
            }
        }

        return $settings;
    }

    private function applyRuntimeConfig(array $settings): void
    {
        $mailDriver = (string) ($settings['mail_driver'] ?? 'smtp');
        if (!in_array($mailDriver, ['smtp', 'mailgun', 'ses', 'postmark', 'sendmail', 'log', 'array', 'failover', 'roundrobin'], true)) {
            $mailDriver = 'smtp';
        }

        $mailEncryption = (string) ($settings['smtp_encryption'] ?? 'tls');
        if ($mailEncryption === 'none') {
            $mailEncryption = null;
        }

        config([
            'mail.default' => $mailDriver,
            'mail.mailers.smtp.host' => (string) ($settings['smtp_host'] ?? ''),
            'mail.mailers.smtp.port' => (int) ($settings['smtp_port'] ?? 587),
            'mail.mailers.smtp.username' => (string) ($settings['smtp_username'] ?? ''),
            'mail.mailers.smtp.password' => (string) ($settings['smtp_password'] ?? ''),
            'mail.mailers.smtp.encryption' => $mailEncryption,
            'mail.from.address' => (string) ($settings['mail_from_address'] ?? 'support@marketplace.com'),
            'mail.from.name' => (string) ($settings['mail_from_name'] ?? 'E-Commerce Marketplace'),
            'app.currency' => strtoupper((string) ($settings['currency'] ?? 'EGP')),
            'app.name' => (string) ($settings['site_name'] ?? config('app.name', 'E-Commerce Marketplace')),
            'services.google.client_id' => (string) ($settings['google_client_id'] ?? ''),
            'services.google.client_secret' => (string) ($settings['google_client_secret'] ?? ''),
            'services.facebook.client_id' => (string) ($settings['facebook_client_id'] ?? ''),
            'services.facebook.client_secret' => (string) ($settings['facebook_client_secret'] ?? ''),
            'services.apple.client_id' => (string) ($settings['apple_client_id'] ?? ''),
            'services.apple.client_secret' => (string) ($settings['apple_client_secret'] ?? ''),
        ]);
    }

    private function parseBooleanSetting(mixed $value, bool $default = false): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return ((int) $value) === 1;
        }

        if (is_string($value)) {
            $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            return $normalized ?? $default;
        }

        return $default;
    }
}
