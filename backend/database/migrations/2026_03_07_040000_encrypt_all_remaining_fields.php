<?php

use App\Models\Brand;
use App\Models\Category;
use App\Models\MediaAsset;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Vendor;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Widen columns to TEXT (required for ciphertext storage) then
     * re-save every row through Eloquent so the new EncryptedString /
     * EncryptedArray casts encrypt each value with AES-256-CBC.
     */
    public function up(): void
    {
        $this->widenColumns();
        $this->backfillAll();
    }

    public function down(): void
    {
        // Encrypted data migration is intentionally irreversible.
    }

    /* ------------------------------------------------------------------ */
    /*  Schema: widen varchar / json columns to TEXT so ciphertext fits    */
    /* ------------------------------------------------------------------ */

    private function widenColumns(): void
    {
        $statements = [
            // users
            'ALTER TABLE users ALTER COLUMN avatar TYPE TEXT',

            // vendors
            'ALTER TABLE vendors ALTER COLUMN logo TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN banner TYPE TEXT',

            // products
            'ALTER TABLE products ALTER COLUMN meta_title TYPE TEXT',
            'ALTER TABLE products ALTER COLUMN images TYPE TEXT USING images::text',
            'ALTER TABLE products ALTER COLUMN tags TYPE TEXT USING tags::text',
            'ALTER TABLE products ALTER COLUMN dimensions TYPE TEXT USING dimensions::text',
            'ALTER TABLE products ALTER COLUMN pending_update_payload TYPE TEXT USING pending_update_payload::text',

            // product_variants
            'ALTER TABLE product_variants ALTER COLUMN name TYPE TEXT',
            'ALTER TABLE product_variants ALTER COLUMN barcode TYPE TEXT',
            'ALTER TABLE product_variants ALTER COLUMN attributes TYPE TEXT USING attributes::text',
            'ALTER TABLE product_variants ALTER COLUMN images TYPE TEXT USING images::text',

            // categories
            'ALTER TABLE categories ALTER COLUMN description_ar TYPE TEXT',
            'ALTER TABLE categories ALTER COLUMN image TYPE TEXT',
            'ALTER TABLE categories ALTER COLUMN icon TYPE TEXT',
            'ALTER TABLE categories ALTER COLUMN meta_title TYPE TEXT',
            'ALTER TABLE categories ALTER COLUMN meta_description TYPE TEXT',

            // brands
            'ALTER TABLE brands ALTER COLUMN logo TYPE TEXT',

            // media_assets
            'ALTER TABLE media_assets ALTER COLUMN size TYPE TEXT',

            // orders
            'ALTER TABLE orders ALTER COLUMN shipping_method TYPE TEXT',
            'ALTER TABLE orders ALTER COLUMN shipping_zone TYPE TEXT',

            // payments
            'ALTER TABLE payments ALTER COLUMN payment_method TYPE TEXT',

            // user_notifications
            'ALTER TABLE user_notifications ALTER COLUMN link TYPE TEXT',
        ];

        foreach ($statements as $sql) {
            try {
                DB::statement($sql);
            } catch (\Throwable) {
                // Column may already be TEXT from a prior run.
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Data: re-save every row through Eloquent so casts encrypt values  */
    /* ------------------------------------------------------------------ */

    private function backfillAll(): void
    {
        $this->backfillUsers();
        $this->backfillVendors();
        $this->backfillProducts();
        $this->backfillProductVariants();
        $this->backfillCategories();
        $this->backfillBrands();
        $this->backfillMediaAssets();
        $this->backfillOrders();
        $this->backfillPayments();
        $this->backfillUserNotifications();
    }

    private function backfillUsers(): void
    {
        User::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'avatar' => $row->avatar,
                ])->save();
            }
        });
    }

    private function backfillVendors(): void
    {
        Vendor::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'logo' => $row->logo,
                    'banner' => $row->banner,
                ])->save();
            }
        });
    }

    private function backfillProducts(): void
    {
        Product::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'short_description' => $row->short_description,
                    'meta_title' => $row->meta_title,
                    'meta_description' => $row->meta_description,
                    'pending_update_note' => $row->pending_update_note,
                    'images' => $row->images,
                    'tags' => $row->tags,
                    'dimensions' => $row->dimensions,
                    'pending_update_payload' => $row->pending_update_payload,
                ])->save();
            }
        });
    }

    private function backfillProductVariants(): void
    {
        ProductVariant::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'name' => $row->name,
                    'barcode' => $row->barcode,
                    'attributes' => $row->attributes,
                    'images' => $row->images,
                ])->save();
            }
        });
    }

    private function backfillCategories(): void
    {
        Category::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'description_ar' => $row->description_ar,
                    'image' => $row->image,
                    'icon' => $row->icon,
                    'meta_title' => $row->meta_title,
                    'meta_description' => $row->meta_description,
                ])->save();
            }
        });
    }

    private function backfillBrands(): void
    {
        Brand::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'logo' => $row->logo,
                ])->save();
            }
        });
    }

    private function backfillMediaAssets(): void
    {
        MediaAsset::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'size' => $row->size,
                ])->save();
            }
        });
    }

    private function backfillOrders(): void
    {
        Order::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'shipping_method' => $row->shipping_method,
                    'shipping_zone' => $row->shipping_zone,
                ])->save();
            }
        });
    }

    private function backfillPayments(): void
    {
        Payment::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'payment_method' => $row->payment_method,
                ])->save();
            }
        });
    }

    private function backfillUserNotifications(): void
    {
        UserNotification::withoutGlobalScopes()->orderBy('id')->chunkById(100, function ($rows): void {
            foreach ($rows as $row) {
                $row->forceFill([
                    'link' => $row->link,
                ])->save();
            }
        });
    }
};
