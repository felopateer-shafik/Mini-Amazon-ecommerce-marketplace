<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Permission;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPanelAccess
{
    /**
     * Allow admin panel API access when user has at least one admin permission.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 401);
        }

        if (($user->is_active ?? true) === false) {
            return response()->json([
                'success' => false,
                'message' => 'Your account has been deactivated. Contact an administrator.',
            ], 403);
        }

        if (method_exists($user, 'isSystemAdminAccount') && $user->isSystemAdminAccount()) {
            return $next($request);
        }

        // Staff role users have panel-wide access; individual controllers
        // enforce action-level restrictions (e.g. staff cannot manage other staff).
        if (method_exists($user, 'hasRole') && $user->hasRole('staff')) {
            return $next($request);
        }

        $adminPermissionNames = Cache::remember('admin_panel_permission_names', 600, function (): array {
            return Permission::query()
                ->where('guard_name', 'web')
                ->pluck('name')
                ->all();
        });

        if ($adminPermissionNames !== [] && $user->hasAnyPermission($adminPermissionNames)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'You do not have access to the admin panel.',
        ], 403);
    }
}
