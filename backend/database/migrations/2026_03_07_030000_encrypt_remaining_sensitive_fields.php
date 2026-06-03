<?php

use App\Models\BrandRequest;
use App\Models\CategoryRequest;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductReconsiderationRequest;
use App\Models\Review;
use App\Models\Shipment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $statements = [
            'ALTER TABLE payments ALTER COLUMN notes TYPE TEXT',
            'ALTER TABLE order_items ALTER COLUMN product_name TYPE TEXT',
            'ALTER TABLE order_items ALTER COLUMN product_sku TYPE TEXT',
            'ALTER TABLE order_items ALTER COLUMN variant_name TYPE TEXT',
            'ALTER TABLE shipments ALTER COLUMN tracking_number TYPE TEXT',
            'ALTER TABLE shipments ALTER COLUMN carrier TYPE TEXT',
            'ALTER TABLE shipments ALTER COLUMN notes TYPE TEXT',
            'ALTER TABLE reviews ALTER COLUMN title TYPE TEXT',
            'ALTER TABLE reviews ALTER COLUMN comment TYPE TEXT',
            'ALTER TABLE reviews ALTER COLUMN vendor_reply TYPE TEXT',
            'ALTER TABLE category_requests ALTER COLUMN name TYPE TEXT',
            'ALTER TABLE brand_requests ALTER COLUMN name TYPE TEXT',
            'ALTER TABLE brand_requests ALTER COLUMN website TYPE TEXT',
        ];

        foreach ($statements as $statement) {
            try {
                DB::statement($statement);
            } catch (\Throwable) {
                // Skip if already altered.
            }
        }

        $this->backfill();
    }

    public function down(): void
    {
        // Irreversible by design.
    }

    private function backfill(): void
    {
        Payment::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'gateway_response' => $record->gateway_response,
                    'notes' => $record->notes,
                ])->save();
            }
        });

        OrderItem::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'product_name' => $record->product_name,
                    'product_sku' => $record->product_sku,
                    'variant_name' => $record->variant_name,
                    'product_attributes' => $record->product_attributes,
                ])->save();
            }
        });

        Shipment::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'tracking_number' => $record->tracking_number,
                    'carrier' => $record->carrier,
                    'shipping_address' => $record->shipping_address,
                    'tracking_events' => $record->tracking_events,
                    'notes' => $record->notes,
                ])->save();
            }
        });

        Review::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'title' => $record->title,
                    'comment' => $record->comment,
                    'vendor_reply' => $record->vendor_reply,
                ])->save();
            }
        });

        CategoryRequest::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'name' => $record->name,
                    'description' => $record->description,
                    'admin_reply' => $record->admin_reply,
                ])->save();
            }
        });

        BrandRequest::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'name' => $record->name,
                    'website' => $record->website,
                    'description' => $record->description,
                    'admin_reply' => $record->admin_reply,
                ])->save();
            }
        });

        ProductReconsiderationRequest::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'message' => $record->message,
                    'admin_reply' => $record->admin_reply,
                ])->save();
            }
        });
    }
};
