<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CartController extends Controller
{
    /**
     * Display the user's cart
     */
    public function index(Request $request): JsonResponse
    {
        $items = $request->user()->cartItems()
            ->with(['product' => function ($query) {
                $query->with('vendor')
                      ->withCount('reviews')
                      ->withAvg('reviews', 'rating');
            }, 'variant'])
            ->get();

        $subtotal = $items->sum(function ($item) {
            $price = $item->variant ? $item->variant->price : $item->product->price;
            return $price * $item->quantity;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product' => new ProductResource($item->product),
                        'variant' => $item->variant,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) ($item->variant ? $item->variant->price : $item->product->price),
                        'total_price' => (float) ($item->variant ? $item->variant->price : $item->product->price) * $item->quantity,
                    ];
                }),
                'subtotal' => (float) $subtotal,
                'item_count' => $items->sum('quantity'),
            ],
            'message' => __('cart.retrieved'),
        ]);
    }

    /**
     * Add item to cart
     */
    public function add(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'product_variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $product = Product::findOrFail($request->product_id);

        if (!$product->is_active) {
            return response()->json([
                'success' => false,
                'message' => __('products.not_found'),
            ], 404);
        }

        if ($request->product_variant_id && !$product->variants()->where('id', $request->product_variant_id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => __('validation.exists', ['attribute' => 'product_variant_id']),
            ], 422);
        }

        $availableStock = $request->product_variant_id
            ? (int) $product->variants()->where('id', $request->product_variant_id)->value('stock_quantity')
            : (int) $product->stock_quantity;

        if ($request->quantity > $availableStock) {
            return response()->json([
                'success' => false,
                'message' => __('cart.insufficient_stock'),
            ], 422);
        }

        $cartItem = CartItem::updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'product_id' => $request->product_id,
                'product_variant_id' => $request->product_variant_id,
            ],
            [
                'quantity' => $request->quantity,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $cartItem,
            'message' => __('cart.item_added'),
        ]);
    }

    /**
     * Update cart item quantity
     */
    public function update(Request $request, $item): JsonResponse
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $cartItem = CartItem::where('user_id', $request->user()->id)
            ->with(['product', 'variant'])
            ->findOrFail($item);

        $availableStock = $cartItem->variant
            ? (int) $cartItem->variant->stock_quantity
            : (int) $cartItem->product->stock_quantity;

        if ($request->quantity > $availableStock) {
            return response()->json([
                'success' => false,
                'message' => __('cart.insufficient_stock'),
            ], 422);
        }

        $cartItem->update(['quantity' => $request->quantity]);

        return response()->json([
            'success' => true,
            'data' => $cartItem,
            'message' => __('cart.item_updated'),
        ]);
    }

    /**
     * Remove item from cart
     */
    public function remove(Request $request, $item): JsonResponse
    {
        CartItem::where('user_id', $request->user()->id)
            ->findOrFail($item)
            ->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('cart.item_removed'),
        ]);
    }

    /**
     * Clear cart
     */
    public function clear(Request $request): JsonResponse
    {
        $request->user()->cartItems()->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('cart.cleared'),
        ]);
    }

    /**
     * Apply coupon to cart
     */
    public function applyCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $normalizedCode = strtoupper(trim((string) $request->code));
        $coupon = \App\Models\Coupon::query()
            ->whereRaw('UPPER(code) = ?', [$normalizedCode])
            ->first();

        if (!$coupon || !$coupon->isValid()) {
            return response()->json([
                'success' => false,
                'message' => __('messages.coupon_invalid'),
            ], 422);
        }

        // Recalculate cart subtotal from DB prices
        $items = $request->user()->cartItems()->with('product', 'variant')->get();
        $subtotal = $items->sum(function ($item) {
            $price = $item->variant ? $item->variant->price : $item->product->price;
            return $price * $item->quantity;
        });

        $minimumPurchase = (float) ($coupon->min_order_amount ?? 0);
        if ($minimumPurchase > 0 && $subtotal < $minimumPurchase) {
            return response()->json([
                'success' => false,
                'message' => __('messages.coupon_min_order_not_met'),
            ], 422);
        }

        $discount = $coupon->calculateDiscount($subtotal);

        if ($discount <= 0) {
            return response()->json([
                'success' => false,
                'message' => __('messages.coupon_min_order_not_met'),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'coupon_code' => $coupon->code,
                'discount' => $discount,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'subtotal' => $subtotal,
                'total' => max(0, $subtotal - $discount),
            ],
            'message' => __('messages.coupon_applied'),
        ]);
    }

    /**
     * Remove coupon from cart
     */
    public function removeCoupon(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => __('messages.coupon_removed'),
        ]);
    }
}
