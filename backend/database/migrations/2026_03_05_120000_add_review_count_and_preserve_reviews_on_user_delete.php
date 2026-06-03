<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (!Schema::hasColumn('vendors', 'review_count')) {
                $table->unsignedInteger('review_count')->default(0)->after('rating');
            }
        });

        // Backfill vendor rating + review count from approved reviews.
        DB::statement(
            "UPDATE vendors v\n" .
            "SET rating = COALESCE(src.avg_rating, 0),\n" .
            "    review_count = COALESCE(src.review_count, 0)\n" .
            "FROM (\n" .
            "    SELECT p.vendor_id AS vendor_id,\n" .
            "           ROUND(COALESCE(AVG(r.rating), 0)::numeric, 2) AS avg_rating,\n" .
            "           COUNT(r.id) AS review_count\n" .
            "    FROM reviews r\n" .
            "    JOIN products p ON p.id = r.product_id\n" .
            "    WHERE r.is_approved = true\n" .
            "      AND p.vendor_id IS NOT NULL\n" .
            "    GROUP BY p.vendor_id\n" .
            ") AS src\n" .
            "WHERE v.id = src.vendor_id"
        );

        DB::statement(
            "UPDATE vendors\n" .
            "SET rating = COALESCE(rating, 0),\n" .
            "    review_count = COALESCE(review_count, 0)"
        );

        // Preserve reviews when customer accounts are deleted.
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        DB::statement('ALTER TABLE reviews ALTER COLUMN user_id DROP NOT NULL');

        Schema::table('reviews', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::table('vendors', function (Blueprint $table) {
            if (Schema::hasColumn('vendors', 'review_count')) {
                $table->dropColumn('review_count');
            }
        });
    }
};
