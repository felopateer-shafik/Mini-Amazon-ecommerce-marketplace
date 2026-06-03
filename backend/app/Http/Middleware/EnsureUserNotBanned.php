<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserNotBanned
{
    /**
     * Handle an incoming request.
     * Block access if the authenticated user is banned.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->is_banned) {
            // Revoke the current token so the user is fully logged out
            if ($user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }

        // Block inactive accounts from accessing admin routes.
        if ($user && !($user->is_active ?? true) && $request->is('api/v1/admin/*')) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Contact an administrator.',
            ], 403);
        }

        return $next($request);
    }
}
