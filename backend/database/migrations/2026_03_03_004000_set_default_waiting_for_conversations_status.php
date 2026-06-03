<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'waiting'");
            DB::statement("UPDATE conversations SET status = 'waiting' WHERE status IS NULL OR TRIM(status) = ''");
            return;
        }

        DB::statement("UPDATE conversations SET status = 'waiting' WHERE status IS NULL OR status = ''");
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'active'");
        }
    }
};
