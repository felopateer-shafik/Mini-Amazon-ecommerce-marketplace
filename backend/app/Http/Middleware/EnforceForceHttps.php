<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class EnforceForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->shouldBypassForLocalDevelopment($request)) {
            return $next($request);
        }

        $forceHttps = $this->isEnabled('force_https');
        if (!$forceHttps) {
            return $next($request);
        }

        $forwardedProto = strtolower((string) $request->header('x-forwarded-proto', ''));
        $isSecure = $request->isSecure() || $forwardedProto === 'https';
        if ($isSecure) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'success' => false,
                'message' => __('messages.https_required'),
            ], 403);
        }

        return redirect()->secure($request->getRequestUri(), 301);
    }

    private function shouldBypassForLocalDevelopment(Request $request): bool
    {
        if (app()->environment(['local', 'testing'])) {
            return true;
        }

        $host = strtolower((string) $request->getHost());

        return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
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
