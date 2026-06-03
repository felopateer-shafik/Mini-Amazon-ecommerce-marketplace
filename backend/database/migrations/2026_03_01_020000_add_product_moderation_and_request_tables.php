<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'moderation_status')) {
                $table->string('moderation_status', 20)->default('pending')->after('is_featured');
                $table->index('moderation_status');
            }

            if (!Schema::hasColumn('products', 'moderation_note')) {
                $table->text('moderation_note')->nullable()->after('moderation_status');
            }

            if (!Schema::hasColumn('products', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('moderation_note');
            }

            if (!Schema::hasColumn('products', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            }

            if (!Schema::hasColumn('products', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('approved_by');
            }
        });

        DB::table('products')
            ->where('is_active', true)
            ->update([
                'moderation_status' => 'approved',
                'approved_at' => now(),
                'reviewed_at' => now(),
            ]);

        DB::table('products')
            ->where('is_active', false)
            ->update([
                'moderation_status' => 'pending',
            ]);

        Schema::create('category_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('admin_reply')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['vendor_id', 'status']);
        });

        Schema::create('brand_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->string('name');
            $table->string('website')->nullable();
            $table->text('description')->nullable();
            $table->string('status', 20)->default('pending');
            $table->text('admin_reply')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['vendor_id', 'status']);
        });

        Schema::create('product_reconsideration_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->text('message');
            $table->string('status', 20)->default('pending');
            $table->text('admin_reply')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['product_id', 'status']);
            $table->index(['vendor_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_reconsideration_requests');
        Schema::dropIfExists('brand_requests');
        Schema::dropIfExists('category_requests');

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'approved_by')) {
                $table->dropConstrainedForeignId('approved_by');
            }

            if (Schema::hasColumn('products', 'reviewed_at')) {
                $table->dropColumn('reviewed_at');
            }

            if (Schema::hasColumn('products', 'approved_at')) {
                $table->dropColumn('approved_at');
            }

            if (Schema::hasColumn('products', 'moderation_note')) {
                $table->dropColumn('moderation_note');
            }

            if (Schema::hasColumn('products', 'moderation_status')) {
                $table->dropIndex(['moderation_status']);
                $table->dropColumn('moderation_status');
            }
        });
    }
};
