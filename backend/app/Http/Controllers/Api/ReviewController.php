<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ReviewController extends Controller
{
    /**
     * Get reviews for a product
     */
    public function index(Request $request, Product $product): JsonResponse
    {
        $reviews = $product->reviews()
            ->with('user')
            ->where('is_approved', true)
            ->orderBy('created_at', 'desc')
            ->paginate(min(max((int) $request->get('per_page', 10), 1), 100));

        // Single query for all stats instead of 7 separate queries
        $stats = Cache::remember(
            "product_{$product->id}_review_stats",
            now()->addMinutes(30),
            function () use ($product) {
                $raw = $product->reviews()
                    ->where('is_approved', true)
                    ->selectRaw('
                        COUNT(*) as total_reviews,
                        COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average_rating,
                        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5,
                        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4,
                        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3,
                        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2,
                        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1
                    ')
                    ->first();

                return [
                    'average_rating' => (float) ($raw->average_rating ?? 0),
                    'total_reviews' => (int) ($raw->total_reviews ?? 0),
                    'rating_distribution' => [
                        5 => (int) ($raw->rating_5 ?? 0),
                        4 => (int) ($raw->rating_4 ?? 0),
                        3 => (int) ($raw->rating_3 ?? 0),
                        2 => (int) ($raw->rating_2 ?? 0),
                        1 => (int) ($raw->rating_1 ?? 0),
                    ],
                ];
            }
        );

        return response()->json([
            'success' => true,
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'stats' => $stats,
                'total' => $reviews->total(),
                'per_page' => $reviews->perPage(),
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
            ],
        ]);
    }

    /**
     * Store a new review
     */
    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'rating' => 'required|integer|between:1,5',
            'title' => 'nullable|string|max:255',
            'comment' => 'required|string|max:2000',
        ]);

        // Check if user already reviewed this product
        $existing = Review::where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => __('reviews.already_reviewed'),
            ], 422);
        }

        // Check if user purchased this product
        $hasPurchased = $request->user()->orders()
            ->whereHas('items', function ($q) use ($product) {
                $q->where('product_id', $product->id);
            })
            ->where('status', 'delivered')
            ->exists();

        $requiresApproval = (bool) Cache::get('settings.require_review_approval', true);

        $review = Review::create([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
            'rating' => $request->rating,
            'title' => $request->title,
            'comment' => $request->comment,
            'is_verified' => $hasPurchased,
            'is_approved' => !$requiresApproval,
        ]);

        $review->load('user');

        // Invalidate cached review stats for this product
        Cache::forget("product_{$product->id}_review_stats");

        return response()->json([
            'success' => true,
            'data' => new ReviewResource($review),
            'message' => __('reviews.created'),
        ], 201);
    }

    /**
     * Update a review
     */
    public function update(Request $request, Product $product, Review $review): JsonResponse
    {
        $review = Review::query()
            ->where('id', $review->id)
            ->where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->firstOrFail();

        $request->validate([
            'rating' => 'sometimes|integer|between:1,5',
            'title' => 'nullable|string|max:255',
            'comment' => 'sometimes|string|max:2000',
        ]);

        $review->update($request->only(['rating', 'title', 'comment']));

        // Invalidate cached review stats for this product
        Cache::forget("product_{$product->id}_review_stats");

        return response()->json([
            'success' => true,
            'data' => new ReviewResource($review->fresh()->load('user')),
            'message' => __('reviews.updated'),
        ]);
    }

    /**
     * Delete a review
     */
    public function destroy(Request $request, Product $product, Review $review): JsonResponse
    {
        $review = Review::query()
            ->where('id', $review->id)
            ->where('user_id', $request->user()->id)
            ->where('product_id', $product->id)
            ->firstOrFail();

        $review->delete();

        // Invalidate cached review stats for this product
        Cache::forget("product_{$product->id}_review_stats");

        return response()->json([
            'success' => true,
            'message' => __('reviews.deleted'),
        ]);
    }
}
