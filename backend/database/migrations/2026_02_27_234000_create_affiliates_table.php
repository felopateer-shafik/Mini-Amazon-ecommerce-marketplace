<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('code', 50)->unique();
            $table->unsignedInteger('referrals')->default(0);
            $table->decimal('earnings', 12, 2)->default(0);
            $table->decimal('commission_rate', 5, 2)->default(10);
            $table->string('status', 20)->default('pending');
            $table->timestamp('joined_at')->nullable();
            $table->timestamps();

            $table->index('status');
            $table->index('code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliates');
    }
};
