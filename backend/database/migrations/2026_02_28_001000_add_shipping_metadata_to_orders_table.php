<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'shipping_method')) {
                $table->string('shipping_method', 100)->nullable()->after('shipping_amount');
            }

            if (!Schema::hasColumn('orders', 'shipping_zone')) {
                $table->string('shipping_zone', 100)->nullable()->after('shipping_method');
            }

            if (!Schema::hasColumn('orders', 'shipping_min_days')) {
                $table->unsignedSmallInteger('shipping_min_days')->nullable()->after('shipping_zone');
            }

            if (!Schema::hasColumn('orders', 'shipping_max_days')) {
                $table->unsignedSmallInteger('shipping_max_days')->nullable()->after('shipping_min_days');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('orders', 'shipping_max_days')) {
                $columns[] = 'shipping_max_days';
            }
            if (Schema::hasColumn('orders', 'shipping_min_days')) {
                $columns[] = 'shipping_min_days';
            }
            if (Schema::hasColumn('orders', 'shipping_zone')) {
                $columns[] = 'shipping_zone';
            }
            if (Schema::hasColumn('orders', 'shipping_method')) {
                $columns[] = 'shipping_method';
            }

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
