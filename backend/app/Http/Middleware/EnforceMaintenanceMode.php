<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnforceMaintenanceMode
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$this->isEnabled('maintenance_mode')) {
            return $next($request);
        }

        // Keep status and auth entry-points reachable during maintenance.
        if (
            $request->is('api/v1/settings/public')
            || $request->is('api/v1/auth/login')
            || $request->is('api/v1/auth/otp/*')
            || $request->is('api/v1/auth/social/*')
            || $request->is('api/v1/admin/settings')
            || $request->is('api/v1/admin/settings/*')
        ) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && $user->hasAnyRole(['admin', 'staff'])) {
            return $next($request);
        }

        $message = (string) Cache::get('settings.maintenance_message', __('messages.maintenance_default_message'));

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => $message,
            ], 503);
        }

        return response($message, 503);
    }

    private function isEnabled(string $key): bool
    {
        $value = Cache::get("settings.{$key}", false);

        if (is_bool($value)) {
            return $value;
        }

        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

        return $normalized ?? false;
    }
}
