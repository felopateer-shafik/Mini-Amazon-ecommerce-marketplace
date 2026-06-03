<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Coupon::query();

        $search = trim((string) $request->get('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('code', 'ILIKE', "%{$search}%")
                    ->orWhere('description', 'ILIKE', "%{$search}%")
                    ->orWhere('type', 'ILIKE', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $coupons = $query->latest()->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => collect($coupons->items())->map(fn (Coupon $coupon) => $this->transformCoupon($coupon))->values(),
            'meta' => [
                'total' => $coupons->total(),
                'per_page' => $coupons->perPage(),
                'current_page' => $coupons->currentPage(),
                'last_page' => $coupons->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:coupons,code',
            'type' => 'required|in:percentage,fixed',
            'value' => 'required|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'max_uses' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        $validated['min_order_amount'] = array_key_exists('min_order_amount', $validated)
            ? $validated['min_order_amount']
            : ($validated['min_purchase'] ?? null);
        $validated['usage_limit'] = array_key_exists('usage_limit', $validated)
            ? $validated['usage_limit']
            : ($validated['max_uses'] ?? null);
        unset($validated['min_purchase'], $validated['max_uses']);

        if (array_key_exists('code', $validated)) {
            $validated['code'] = strtoupper(trim((string) $validated['code']));
        }

        $coupon = Coupon::create($validated);

        return response()->json([
            'success' => true,
            'data' => $this->transformCoupon($coupon),
            'message' => __('messages.coupon_created'),
        ], 201);
    }

    public function update(Request $request, Coupon $coupon): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'sometimes|string|unique:coupons,code,' . $coupon->id,
            'type' => 'sometimes|in:percentage,fixed',
            'value' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'min_purchase' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'max_uses' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
            'description' => 'nullable|string',
        ]);

        if (array_key_exists('min_purchase', $validated) && !array_key_exists('min_order_amount', $validated)) {
            $validated['min_order_amount'] = $validated['min_purchase'];
        }
        if (array_key_exists('max_uses', $validated) && !array_key_exists('usage_limit', $validated)) {
            $validated['usage_limit'] = $validated['max_uses'];
        }
        unset($validated['min_purchase'], $validated['max_uses']);

        if (array_key_exists('code', $validated)) {
            $validated['code'] = strtoupper(trim((string) $validated['code']));
        }

        $startsAt = $validated['starts_at'] ?? $coupon->starts_at;
        if (array_key_exists('expires_at', $validated) && $validated['expires_at'] !== null && $startsAt !== null) {
            $startsAtTs = strtotime((string) $startsAt);
            $expiresAtTs = strtotime((string) $validated['expires_at']);

            if ($startsAtTs !== false && $expiresAtTs !== false && $expiresAtTs <= $startsAtTs) {
                return response()->json([
                    'success' => false,
                    'message' => __('validation.after', ['attribute' => 'expires_at', 'date' => 'starts_at']),
                    'errors' => [
                        'expires_at' => [__('validation.after', ['attribute' => 'expires_at', 'date' => 'starts_at'])],
                    ],
                ], 422);
            }
        }

        $coupon->update($validated);

        return response()->json([
            'success' => true,
            'data' => $this->transformCoupon($coupon->fresh()),
            'message' => __('messages.coupon_updated'),
        ]);
    }

    public function destroy(Coupon $coupon): JsonResponse
    {
        $coupon->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.coupon_deleted'),
        ]);
    }

    private function transformCoupon(Coupon $coupon): array
    {
        return [
            'id' => $coupon->id,
            'code' => $coupon->code,
            'type' => $coupon->type,
            'value' => (float) $coupon->value,
            'min_order_amount' => $coupon->min_order_amount !== null ? (float) $coupon->min_order_amount : null,
            'min_purchase' => $coupon->min_order_amount !== null ? (float) $coupon->min_order_amount : null,
            'max_discount' => $coupon->max_discount !== null ? (float) $coupon->max_discount : null,
            'usage_limit' => $coupon->usage_limit,
            'max_uses' => $coupon->usage_limit,
            'usage_count' => (int) ($coupon->usage_count ?? 0),
            'used_count' => (int) ($coupon->usage_count ?? 0),
            'starts_at' => $coupon->starts_at,
            'expires_at' => $coupon->expires_at,
            'is_active' => (bool) $coupon->is_active,
            'description' => $coupon->description,
            'created_at' => $coupon->created_at,
            'updated_at' => $coupon->updated_at,
        ];
    }
}
