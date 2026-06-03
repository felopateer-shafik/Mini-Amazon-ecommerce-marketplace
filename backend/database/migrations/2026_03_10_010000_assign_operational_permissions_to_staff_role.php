<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Permissions staff are ALLOWED to have.
     *
     * Deliberately excludes:
     *  - view-staff, create-staff, edit-staff, delete-staff, promote-staff (staff management)
     *  - view-roles, edit-roles                                             (role / permission management)
     *  - view-settings, edit-settings, edit-payment-settings,
     *    edit-security-settings                                             (system-wide config)
     *  - view-system, manage-system                                         (server/system tools)
     */
    private function staffPermissions(): array
    {
        return [
            // Dashboard
            'view-dashboard',
            // Users / Customers
            'view-users', 'create-users', 'edit-users', 'delete-users', 'ban-users', 'export-users',
            // Merchants
            'view-merchants', 'approve-merchants', 'suspend-merchants',
            'delete-merchants', 'edit-commission', 'export-merchants',
            // Products
            'view-products', 'create-products', 'edit-products', 'delete-products',
            'approve-products', 'export-products',
            // Catalog
            'view-categories', 'create-categories', 'edit-categories', 'delete-categories', 'approve-categories',
            'view-brands',     'create-brands',     'edit-brands',     'delete-brands',     'approve-brands',
            // Orders
            'view-orders', 'update-orders', 'export-orders',
            // Shipping
            'edit-shipping',
            // Finance
            'view-finance', 'manage-wallets', 'export-finance',
            'view-refunds', 'process-refunds', 'export-refunds',
            // Marketing
            'view-marketing', 'create-coupons', 'edit-coupons', 'delete-coupons', 'edit-marketing',
            // Content & Media
            'view-content', 'create-content', 'edit-content', 'delete-content',
            'view-media',   'upload-media',   'delete-media',
            // Reviews
            'view-reviews', 'moderate-reviews', 'delete-reviews',
            // Chat
            'view-chats', 'manage-chats', 'delete-chats',
            // Storefront (read + style only)
            'view-storefront', 'edit-storefront',
            // Operations
            'view-reports', 'export-reports', 'use-pos',
            'view-wholesale', 'manage-wholesale',
            'manage-affiliates',
            'view-rewards',
        ];
    }

    public function up(): void
    {
        $staffRole = Role::where('name', 'staff')->where('guard_name', 'web')->first();

        if (!$staffRole) {
            return;
        }

        $guard = 'web';
        $permissions = collect($this->staffPermissions())->map(function (string $name) use ($guard) {
            return Permission::firstOrCreate(['name' => $name, 'guard_name' => $guard]);
        });

        // syncWithoutDetaching keeps any permissions already individually assigned
        $staffRole->syncPermissions($permissions);

        // Clear Spatie permission cache so changes take effect immediately
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        $staffRole = Role::where('name', 'staff')->where('guard_name', 'web')->first();

        if ($staffRole) {
            $staffRole->syncPermissions([]);
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }
    }
};
