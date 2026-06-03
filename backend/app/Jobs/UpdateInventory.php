<?php

namespace App\Jobs;

use App\Models\Product;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class UpdateInventory implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Product $product,
        public int $quantity,
        public string $action = 'decrease' // 'decrease' or 'increase'
    ) {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        if ($this->action === 'decrease') {
            $next = max(0, (int) $this->product->stock_quantity - $this->quantity);
            $this->product->update(['stock_quantity' => $next]);
        } else {
            $this->product->increment('stock_quantity', $this->quantity);
        }
    }
}
