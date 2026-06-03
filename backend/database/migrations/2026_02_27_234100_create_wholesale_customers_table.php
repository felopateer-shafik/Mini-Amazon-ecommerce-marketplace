<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wholesale_customers', function (Blueprint $table) {
            $table->id();
            $table->string('company');
            $table->string('email')->nullable();
            $table->string('contact')->nullable();
            $table->unsignedInteger('orders')->default(0);
            $table->decimal('total_spent', 12, 2)->default(0);
            $table->string('status', 20)->default('pending');
            $table->timestamps();

            $table->index('status');
            $table->index('company');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_customers');
    }
};
