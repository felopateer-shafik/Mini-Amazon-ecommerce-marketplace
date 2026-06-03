<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (!Schema::hasColumn('vendors', 'business_type')) {
                $table->string('business_type', 100)->nullable()->after('description');
            }
            if (!Schema::hasColumn('vendors', 'bank_account')) {
                $table->string('bank_account', 255)->nullable()->after('bank_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vendors', function (Blueprint $table) {
            if (Schema::hasColumn('vendors', 'business_type')) {
                $table->dropColumn('business_type');
            }
            if (Schema::hasColumn('vendors', 'bank_account')) {
                $table->dropColumn('bank_account');
            }
        });
    }
};
