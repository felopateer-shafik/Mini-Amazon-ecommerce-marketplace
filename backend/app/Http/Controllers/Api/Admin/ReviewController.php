<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class ReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['user', 'product']);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('comment', 'ILIKE', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'ILIKE', "%{$search}%");
                  })
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('name', 'ILIKE', "%{$search}%");
                  });
            });
        }

        if ($request->has('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        if ($request->has('rating')) {
            $query->where('rating', $request->rating);
        }

        $reviews = $query->latest()->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'total' => $reviews->total(),
                'per_page' => $reviews->perPage(),
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
            ],
        ]);
    }

    public function destroy(Review $review): JsonResponse
    {
        Cache::forget("product_{$review->product_id}_review_stats");
        $review->delete();

        return response()->json([
            'success' => true,
            'message' => __('reviews.deleted'),
        ]);
    }

    public function approve(Review $review): JsonResponse
    {
        $review->update(['is_approved' => true]);
        Cache::forget("product_{$review->product_id}_review_stats");

        return response()->json([
            'success' => true,
            'data' => new ReviewResource($review->fresh()->load(['user', 'product'])),
            'message' => __('reviews.approved'),
        ]);
    }

    public function reject(Review $review): JsonResponse
    {
        $review->update(['is_approved' => false]);
        Cache::forget("product_{$review->product_id}_review_stats");

        return response()->json([
            'success' => true,
            'data' => new ReviewResource($review->fresh()->load(['user', 'product'])),
            'message' => __('reviews.rejected'),
        ]);
    }
}
