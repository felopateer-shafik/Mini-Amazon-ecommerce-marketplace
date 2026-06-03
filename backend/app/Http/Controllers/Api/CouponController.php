<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function validateCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', strtoupper($request->code))->first();

        if (!$coupon) {
            return response()->json([
                'success' => false,
                'message' => __('messages.coupon_not_found'),
            ], 404);
        }

        if (!$coupon->isValid()) {
            return response()->json([
                'success' => false,
                'message' => __('messages.coupon_invalid'),
            ], 422);
        }

        $subtotal = $request->filled('subtotal')
            ? max(0, (float) $request->input('subtotal'))
            : null;

        if ($subtotal !== null) {
            $minimumPurchase = (float) ($coupon->min_order_amount ?? 0);
            if ($minimumPurchase > 0 && $subtotal < $minimumPurchase) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.coupon_min_order_not_met'),
                ], 422);
            }
        }

        $discount = $subtotal !== null
            ? $coupon->calculateDiscount($subtotal)
            : null;

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'discount' => $discount,
                'min_order_amount' => $coupon->min_order_amount,
                'max_discount' => $coupon->max_discount,
                'description' => $coupon->description,
            ],
            'message' => __('messages.coupon_valid'),
        ]);
    }
}
