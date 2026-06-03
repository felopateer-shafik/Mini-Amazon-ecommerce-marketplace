<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;

return new class extends Migration
{
    /**
     * All permissions to seed, grouped for readability.
     */
    private function allPermissions(): array
    {
        return [
            // Dashboard
            'view-dashboard',
            // Users
            'view-users', 'create-users', 'edit-users', 'delete-users', 'ban-users', 'export-users',
            // Merchants
            'view-merchants', 'approve-merchants', 'suspend-merchants', 'delete-merchants', 'edit-commission', 'export-merchants',
            // Products
            'view-products', 'create-products', 'edit-products', 'delete-products', 'approve-products', 'export-products',
            // Catalog
            'view-categories', 'create-categories', 'edit-categories', 'delete-categories', 'approve-categories',
            'view-brands', 'create-brands', 'edit-brands', 'delete-brands', 'approve-brands',
            // Orders
            'view-orders', 'update-orders', 'export-orders',
            // Finance
            'view-finance', 'manage-wallets', 'export-finance',
            'view-refunds', 'process-refunds', 'export-refunds',
            // Marketing
            'view-marketing', 'create-coupons', 'edit-coupons', 'delete-coupons', 'edit-marketing',
            // Content
            'view-content', 'create-content', 'edit-content', 'delete-content',
            'view-media', 'upload-media', 'delete-media',
            // Reviews
            'view-reviews', 'moderate-reviews', 'delete-reviews',
            // Chat
            'view-chats', 'manage-chats', 'delete-chats',
            // Storefront
            'view-storefront', 'edit-storefront',
            // Operations
            'view-reports', 'export-reports', 'use-pos',
            'view-wholesale', 'manage-wholesale',
            'manage-affiliates', 'view-rewards', 'edit-rewards',
            // System
            'view-settings', 'edit-settings', 'edit-payment-settings', 'edit-security-settings', 'edit-shipping',
            'view-system', 'manage-system',
            'view-staff', 'create-staff', 'edit-staff', 'delete-staff', 'promote-staff',
            'view-roles', 'edit-roles',
        ];
    }

    public function up(): void
    {
        // Add is_active column for staff account activation
        if (!Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('is_banned');
            });
        }

        // Seed all permissions
        $guard = 'web';
        foreach ($this->allPermissions() as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm, 'guard_name' => $guard],
            );
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }

        // Remove seeded permissions
        Permission::whereIn('name', $this->allPermissions())->delete();
    }
};
