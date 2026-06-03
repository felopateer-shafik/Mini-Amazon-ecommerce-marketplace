<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    private function roleAssignedToSystemAdmin(Role $role): bool
    {
        $systemAdminId = User::resolveSystemAdminId();
        if (!$systemAdminId) {
            return false;
        }

        return \Illuminate\Support\Facades\DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', (int) $systemAdminId)
            ->where('role_id', (int) $role->id)
            ->exists();
    }

    /**
     * Return all available permissions grouped.
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'web')
            ->orderBy('id')
            ->pluck('name');

        // Build grouping from permission slug prefix
        $groups = [];
        $groupMap = [
            'view-dashboard' => 'Dashboard',
            'view-users' => 'Users', 'create-users' => 'Users', 'edit-users' => 'Users', 'delete-users' => 'Users', 'ban-users' => 'Users', 'export-users' => 'Users',
            'view-merchants' => 'Merchants', 'approve-merchants' => 'Merchants', 'suspend-merchants' => 'Merchants', 'delete-merchants' => 'Merchants', 'edit-commission' => 'Merchants', 'export-merchants' => 'Merchants',
            'view-products' => 'Products', 'create-products' => 'Products', 'edit-products' => 'Products', 'delete-products' => 'Products', 'approve-products' => 'Products', 'export-products' => 'Products',
            'view-categories' => 'Catalog', 'create-categories' => 'Catalog', 'edit-categories' => 'Catalog', 'delete-categories' => 'Catalog', 'approve-categories' => 'Catalog',
            'view-brands' => 'Catalog', 'create-brands' => 'Catalog', 'edit-brands' => 'Catalog', 'delete-brands' => 'Catalog', 'approve-brands' => 'Catalog',
            'view-orders' => 'Orders', 'update-orders' => 'Orders', 'export-orders' => 'Orders',
            'view-finance' => 'Finance', 'manage-wallets' => 'Finance', 'export-finance' => 'Finance',
            'view-refunds' => 'Finance', 'process-refunds' => 'Finance', 'export-refunds' => 'Finance',
            'view-marketing' => 'Marketing', 'create-coupons' => 'Marketing', 'edit-coupons' => 'Marketing', 'delete-coupons' => 'Marketing', 'edit-marketing' => 'Marketing',
            'view-content' => 'Content', 'create-content' => 'Content', 'edit-content' => 'Content', 'delete-content' => 'Content',
            'view-media' => 'Content', 'upload-media' => 'Content', 'delete-media' => 'Content',
            'view-reviews' => 'Reviews', 'moderate-reviews' => 'Reviews', 'delete-reviews' => 'Reviews',
            'view-chats' => 'Chat', 'manage-chats' => 'Chat', 'delete-chats' => 'Chat',
            'view-storefront' => 'Storefront', 'edit-storefront' => 'Storefront',
            'view-reports' => 'Operations', 'export-reports' => 'Operations', 'use-pos' => 'Operations',
            'view-wholesale' => 'Operations', 'manage-wholesale' => 'Operations',
            'manage-affiliates' => 'Operations', 'view-rewards' => 'Operations', 'edit-rewards' => 'Operations',
            'view-settings' => 'System', 'edit-settings' => 'System', 'edit-payment-settings' => 'System', 'edit-security-settings' => 'System', 'edit-shipping' => 'System',
            'view-system' => 'System', 'manage-system' => 'System',
            'view-staff' => 'System', 'create-staff' => 'System', 'edit-staff' => 'System', 'delete-staff' => 'System', 'promote-staff' => 'System',
            'view-roles' => 'System', 'edit-roles' => 'System',
        ];

        foreach ($permissions as $perm) {
            $group = $groupMap[$perm] ?? 'Other';
            $groups[$group][] = $perm;
        }

        return response()->json([
            'success' => true,
            'data' => $groups,
        ]);
    }

    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->with('permissions:id,name')
            ->addSelect(['users_count' => \Illuminate\Support\Facades\DB::table('model_has_roles')
                ->selectRaw('count(*)')
                ->whereColumn('model_has_roles.role_id', 'roles.id')
            ])
            ->paginate(min(max((int) request()->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => collect($roles->items())->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'users_count' => $role->users_count,
                    'permissions' => $role->permissions->pluck('name'),
                    'created_at' => $role->created_at,
                ];
            }),
            'meta' => [
                'total' => $roles->total(),
                'per_page' => $roles->perPage(),
                'current_page' => $roles->currentPage(),
                'last_page' => $roles->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        if (!empty($validated['permissions'])) {
            $allowedPermissionNames = Permission::query()
                ->whereIn('name', $validated['permissions'])
                ->pluck('name')
                ->all();

            $role->syncPermissions($allowedPermissionNames);
        }

        return response()->json([
            'success' => true,
            'data' => $role->load('permissions'),
            'message' => __('messages.role_created'),
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if (isset($validated['name'])) {
            if ($this->roleAssignedToSystemAdmin($role) && $validated['name'] !== $role->name) {
                return response()->json([
                    'success' => false,
                    'message' => 'Role assigned to the System Admin account cannot be renamed.',
                ], 403);
            }

            $role->update(['name' => $validated['name']]);
        }

        if (isset($validated['permissions'])) {
            $allowedPermissionNames = Permission::query()
                ->whereIn('name', $validated['permissions'])
                ->pluck('name')
                ->all();

            $role->syncPermissions($allowedPermissionNames);
        }

        return response()->json([
            'success' => true,
            'data' => $role->fresh()->load('permissions'),
            'message' => __('messages.role_updated'),
        ]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($this->roleAssignedToSystemAdmin($role)) {
            return response()->json([
                'success' => false,
                'message' => 'Role assigned to the System Admin account cannot be deleted.',
            ], 403);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.role_deleted'),
        ]);
    }
}
