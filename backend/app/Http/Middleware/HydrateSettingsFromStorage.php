<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class HydrateSettingsFromStorage
{
    private const STRICT_BOOLEAN_KEYS = [
        'maintenance_mode',
        'force_https',
        'login_throttling',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (!Storage::disk('local')->exists('settings/platform-settings.json')) {
            return $next($request);
        }

        $decoded = json_decode(Storage::disk('local')->get('settings/platform-settings.json'), true);
        if (!is_array($decoded)) {
            return $next($request);
        }

        foreach ($decoded as $key => $value) {
            if (in_array($key, self::STRICT_BOOLEAN_KEYS, true)) {
                $value = $this->toBoolean($value);
            }
            Cache::forever("settings.{$key}", $value);
        }

        return $next($request);
    }

    private function toBoolean(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        return $normalized ?? false;
    }
}
