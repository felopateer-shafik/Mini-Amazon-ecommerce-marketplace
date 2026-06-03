<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Coupons table
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->enum('type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('value', 10, 2);
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Wallet transactions table
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->onDelete('cascade');
            $table->string('type'); // top_up, purchase, refund, withdrawal
            $table->decimal('amount', 10, 2);
            $table->decimal('balance_after', 10, 2);
            $table->text('description')->nullable();
            $table->string('reference')->nullable();
            $table->timestamps();

            $table->index('wallet_id');
            $table->index('type');
        });

        // Product attributes table for advanced filtering
        Schema::create('product_attributes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('key');   // brand, material, gender, color, etc.
            $table->text('value');   // Can be JSON for arrays (e.g. available sizes)
            $table->timestamps();

            $table->index(['product_id', 'key']);
            $table->index('key');
        });

        // Add is_banned to users table
        if (!Schema::hasColumn('users', 'is_banned')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_banned')->default(false)->after('avatar');
                $table->timestamp('banned_at')->nullable()->after('is_banned');
            });
        }

        // Add vendor_reply to reviews table
        if (!Schema::hasColumn('reviews', 'vendor_reply')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->text('vendor_reply')->nullable()->after('helpful_count');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('product_attributes');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('coupons');

        if (Schema::hasColumn('users', 'is_banned')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn(['is_banned', 'banned_at']);
            });
        }

        if (Schema::hasColumn('reviews', 'vendor_reply')) {
            Schema::table('reviews', function (Blueprint $table) {
                $table->dropColumn('vendor_reply');
            });
        }
    }
};
