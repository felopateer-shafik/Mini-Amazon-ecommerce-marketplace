<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_status_check");
        DB::statement("ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (status IN ('pending','requested','approved','rejected','processed'))");
        DB::statement("ALTER TABLE refunds ALTER COLUMN status SET DEFAULT 'pending'");
        DB::statement("UPDATE refunds SET status = 'pending' WHERE status = 'requested'");

        DB::statement("ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_reason_check");
        DB::statement("ALTER TABLE refunds ADD CONSTRAINT refunds_reason_check CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other','late_delivery','order_cancelled'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("UPDATE refunds SET status = 'requested' WHERE status = 'pending'");

        DB::statement("ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_status_check");
        DB::statement("ALTER TABLE refunds ADD CONSTRAINT refunds_status_check CHECK (status IN ('requested','approved','rejected','processed'))");
        DB::statement("ALTER TABLE refunds ALTER COLUMN status SET DEFAULT 'requested'");

        DB::statement("ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_reason_check");
        DB::statement("ALTER TABLE refunds ADD CONSTRAINT refunds_reason_check CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other'))");
    }
};
