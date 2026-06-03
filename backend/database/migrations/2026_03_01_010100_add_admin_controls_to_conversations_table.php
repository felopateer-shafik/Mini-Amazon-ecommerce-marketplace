<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            if (!Schema::hasColumn('conversations', 'admin_replied_at')) {
                $table->timestamp('admin_replied_at')->nullable()->after('last_message_at');
            }

            if (!Schema::hasColumn('conversations', 'customer_chat_expires_at')) {
                $table->timestamp('customer_chat_expires_at')->nullable()->after('admin_replied_at');
                $table->index('customer_chat_expires_at');
            }

            if (!Schema::hasColumn('conversations', 'is_customer_blocked')) {
                $table->boolean('is_customer_blocked')->default(false)->after('customer_chat_expires_at');
                $table->index('is_customer_blocked');
            }

            if (!Schema::hasColumn('conversations', 'customer_blocked_at')) {
                $table->timestamp('customer_blocked_at')->nullable()->after('is_customer_blocked');
            }
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            if (Schema::hasColumn('conversations', 'customer_blocked_at')) {
                $table->dropColumn('customer_blocked_at');
            }

            if (Schema::hasColumn('conversations', 'is_customer_blocked')) {
                $table->dropIndex(['is_customer_blocked']);
                $table->dropColumn('is_customer_blocked');
            }

            if (Schema::hasColumn('conversations', 'customer_chat_expires_at')) {
                $table->dropIndex(['customer_chat_expires_at']);
                $table->dropColumn('customer_chat_expires_at');
            }

            if (Schema::hasColumn('conversations', 'admin_replied_at')) {
                $table->dropColumn('admin_replied_at');
            }
        });
    }
};
