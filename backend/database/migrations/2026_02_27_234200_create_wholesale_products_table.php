<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wholesale_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->decimal('wholesale_price', 10, 2);
            $table->unsignedInteger('min_qty')->default(10);
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique('product_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_products');
    }
};
