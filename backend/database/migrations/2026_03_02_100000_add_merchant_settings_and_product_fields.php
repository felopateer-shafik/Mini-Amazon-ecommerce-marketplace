<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Vendor settings columns ──────────────────────────────
        Schema::table('vendors', function (Blueprint $table) {
            $table->string('state', 100)->nullable()->after('city');
            $table->string('bank_name', 255)->nullable()->after('banner');
            $table->string('account_name', 255)->nullable()->after('bank_name');
            $table->string('account_number', 255)->nullable()->after('account_name');
            $table->string('iban', 255)->nullable()->after('account_number');
            $table->boolean('free_shipping_enabled')->default(false)->after('iban');
            $table->decimal('free_shipping_minimum', 10, 2)->default(0)->after('free_shipping_enabled');
            $table->decimal('standard_shipping_rate', 10, 2)->default(0)->after('free_shipping_minimum');
            $table->decimal('express_shipping_rate', 10, 2)->default(0)->after('standard_shipping_rate');
            $table->integer('processing_time')->default(1)->after('express_shipping_rate');
            $table->json('notification_preferences')->nullable()->after('processing_time');
            $table->string('rejection_reason', 2000)->nullable()->after('status');
        });

        // ── Product extra columns ────────────────────────────────
        Schema::table('products', function (Blueprint $table) {
            $table->string('product_type', 50)->default('simple')->after('vendor_id');
            $table->boolean('free_shipping')->default(false)->after('is_featured');
            $table->integer('min_order_quantity')->default(1)->after('free_shipping');
            $table->integer('max_order_quantity')->nullable()->after('min_order_quantity');
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            $table->dropColumn([
                'state',
                'bank_name',
                'account_name',
                'account_number',
                'iban',
                'free_shipping_enabled',
                'free_shipping_minimum',
                'standard_shipping_rate',
                'express_shipping_rate',
                'processing_time',
                'notification_preferences',
                'rejection_reason',
            ]);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'product_type',
                'free_shipping',
                'min_order_quantity',
                'max_order_quantity',
            ]);
        });
    }
};
