<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('products', 'sold_count')) {
            Schema::table('products', function (Blueprint $table) {
                $table->unsignedInteger('sold_count')->default(0)->after('track_inventory');
            });
        }

        $soldMap = DB::table('order_items')
            ->select('product_id', DB::raw('COALESCE(SUM(quantity), 0) as total_sold'))
            ->groupBy('product_id')
            ->pluck('total_sold', 'product_id');

        foreach ($soldMap as $productId => $totalSold) {
            DB::table('products')
                ->where('id', $productId)
                ->update(['sold_count' => (int) $totalSold]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('products', 'sold_count')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('sold_count');
            });
        }
    }
};
