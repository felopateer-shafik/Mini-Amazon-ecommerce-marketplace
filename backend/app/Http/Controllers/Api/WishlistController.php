<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class WishlistController extends Controller
{
    /**
     * Get user's wishlist
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);

        $wishlist = $request->user()->wishlist()
            ->with(['product' => function ($query) {
                $query->with(['vendor', 'category'])
                      ->withCount('reviews')
                      ->withAvg('reviews', 'rating');
            }])
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => collect($wishlist->items())->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product' => new ProductResource($item->product),
                    'added_at' => $item->created_at,
                ];
            }),
            'meta' => [
                'total' => $wishlist->total(),
                'per_page' => $wishlist->perPage(),
                'current_page' => $wishlist->currentPage(),
                'last_page' => $wishlist->lastPage(),
            ],
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Add product to wishlist
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $product = Product::findOrFail($request->product_id);
        if (!$product->is_active) {
            return response()->json([
                'success' => false,
                'message' => __('products.not_found'),
            ], 422);
        }

        $wishlist = Wishlist::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $request->product_id,
        ]);

        return response()->json([
            'success' => true,
            'data' => $wishlist,
            'message' => __('wishlist.added'),
        ], 201);
    }

    /**
     * Remove product from wishlist
     */
    public function destroy(Request $request, $productId): JsonResponse
    {
        Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('wishlist.removed'),
        ]);
    }
}
