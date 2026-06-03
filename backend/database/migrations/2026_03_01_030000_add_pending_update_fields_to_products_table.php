<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'pending_update_payload')) {
                $table->json('pending_update_payload')->nullable()->after('reviewed_at');
            }

            if (!Schema::hasColumn('products', 'pending_update_status')) {
                $table->string('pending_update_status', 20)->nullable()->after('pending_update_payload');
                $table->index('pending_update_status');
            }

            if (!Schema::hasColumn('products', 'pending_update_note')) {
                $table->text('pending_update_note')->nullable()->after('pending_update_status');
            }

            if (!Schema::hasColumn('products', 'pending_update_submitted_at')) {
                $table->timestamp('pending_update_submitted_at')->nullable()->after('pending_update_note');
            }

            if (!Schema::hasColumn('products', 'pending_update_reviewed_at')) {
                $table->timestamp('pending_update_reviewed_at')->nullable()->after('pending_update_submitted_at');
            }

            if (!Schema::hasColumn('products', 'pending_update_reviewed_by')) {
                $table->foreignId('pending_update_reviewed_by')->nullable()->after('pending_update_reviewed_at')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'pending_update_reviewed_by')) {
                $table->dropConstrainedForeignId('pending_update_reviewed_by');
            }

            if (Schema::hasColumn('products', 'pending_update_reviewed_at')) {
                $table->dropColumn('pending_update_reviewed_at');
            }

            if (Schema::hasColumn('products', 'pending_update_submitted_at')) {
                $table->dropColumn('pending_update_submitted_at');
            }

            if (Schema::hasColumn('products', 'pending_update_note')) {
                $table->dropColumn('pending_update_note');
            }

            if (Schema::hasColumn('products', 'pending_update_status')) {
                $table->dropIndex(['pending_update_status']);
                $table->dropColumn('pending_update_status');
            }

            if (Schema::hasColumn('products', 'pending_update_payload')) {
                $table->dropColumn('pending_update_payload');
            }
        });
    }
};
