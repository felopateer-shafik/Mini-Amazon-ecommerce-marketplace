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
        DB::table('orders')
            ->select(['id', 'notes', 'shipping_method', 'shipping_zone', 'shipping_min_days', 'shipping_max_days'])
            ->orderBy('id')
            ->chunkById(200, function ($orders): void {
                foreach ($orders as $order) {
                    $notes = (string) ($order->notes ?? '');
                    if ($notes === '') {
                        continue;
                    }

                    $shippingMethod = $order->shipping_method;
                    $shippingZone = $order->shipping_zone;
                    $shippingMinDays = $order->shipping_min_days;
                    $shippingMaxDays = $order->shipping_max_days;

                    if (!$shippingMethod && preg_match('/^(?:checkout\s+)?shipping\s+method\s*:\s*(.+)$/im', $notes, $methodMatch)) {
                        $shippingMethod = trim($methodMatch[1]);
                    }

                    if (!$shippingZone && preg_match('/^(?:checkout\s+)?shipping\s+zone\s*:\s*(.+)$/im', $notes, $zoneMatch)) {
                        $shippingZone = trim($zoneMatch[1]);
                    }

                    if (($shippingMinDays === null || $shippingMaxDays === null)
                        && preg_match('/^(?:checkout\s+)?(?:shipping\s+)?eta\s*:\s*(\d+)\s*-\s*(\d+)\s*(?:days?)?$/im', $notes, $etaMatch)) {
                        $etaMin = (int) $etaMatch[1];
                        $etaMax = (int) $etaMatch[2];
                        $shippingMinDays = $shippingMinDays ?? min($etaMin, $etaMax);
                        $shippingMaxDays = $shippingMaxDays ?? max($etaMin, $etaMax);
                    }

                    $updates = [];
                    if ($shippingMethod !== $order->shipping_method) {
                        $updates['shipping_method'] = $shippingMethod;
                    }
                    if ($shippingZone !== $order->shipping_zone) {
                        $updates['shipping_zone'] = $shippingZone;
                    }
                    if ($shippingMinDays !== $order->shipping_min_days) {
                        $updates['shipping_min_days'] = $shippingMinDays;
                    }
                    if ($shippingMaxDays !== $order->shipping_max_days) {
                        $updates['shipping_max_days'] = $shippingMaxDays;
                    }

                    if (!empty($updates)) {
                        DB::table('orders')->where('id', $order->id)->update($updates);
                    }
                }
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Backfill is intentionally non-reversible.
    }
};
