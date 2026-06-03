<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\VendorResource;
use App\Models\UserNotification;
use App\Models\Vendor;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

class VendorController extends Controller
{
    /**
     * Display a listing of vendors.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Vendor::query()
            ->with('user')
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }]);

        $search = trim((string) $request->get('search', ''));

        $status = trim((string) $request->get('status', ''));
        if ($status !== '') {
            $query->where('status', $status);
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $vendors = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (Vendor $vendor) use ($search) {
                    return SensitiveData::contains($vendor->store_name, $search)
                        || SensitiveData::contains($vendor->business_name, $search)
                        || SensitiveData::contains($vendor->slug, $search)
                        || SensitiveData::contains($vendor->user?->name, $search)
                        || SensitiveData::contains($vendor->user?->email, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        $this->attachComputedMetrics($vendors->getCollection());

        return response()->json([
            'success' => true,
            'data' => VendorResource::collection($vendors),
            'meta' => [
                'total' => $vendors->total(),
                'per_page' => $vendors->perPage(),
                'current_page' => $vendors->currentPage(),
                'last_page' => $vendors->lastPage(),
            ],
        ]);
    }

    /**
     * Update vendor status (activate/deactivate)
     */
    public function update(Request $request, Vendor $vendor): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => 'sometimes|boolean',
            'business_name' => 'sometimes|string|max:255',
        ]);

        $vendor->update($validated);

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor),
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Delete vendor account
     */
    public function destroy(Vendor $vendor): JsonResponse
    {
        $vendor->loadMissing('user');

        if ((int) ($vendor->user_id ?? 0) === (int) auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => __('messages.cannot_delete_own_account'),
            ], 403);
        }

        if ($vendor->user) {
            $vendor->user->delete();
        } else {
            $vendor->delete();
        }

        return response()->json([
            'success' => true,
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Show vendor detail
     */
    public function show(Vendor $vendor): JsonResponse
    {
        $vendor->load(['user', 'products']);
        $this->attachComputedMetrics(collect([$vendor]));

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor),
        ]);
    }

    private function attachComputedMetrics(Collection $vendors): void
    {
        $vendors->each(function (Vendor $vendor): void {
            $totalRevenue = (float) $vendor->products()
                ->join('order_items', 'products.id', '=', 'order_items.product_id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.status', 'delivered')
                ->sum('order_items.total_price');

            $ordersCount = (int) $vendor->products()
                ->join('order_items', 'products.id', '=', 'order_items.product_id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->distinct('orders.id')
                ->count('orders.id');

            $reviewStats = $vendor->products()
                ->join('reviews', 'products.id', '=', 'reviews.product_id')
                ->where('reviews.is_approved', true)
                ->selectRaw('COALESCE(AVG(reviews.rating), 0) as avg_rating, COUNT(reviews.id) as reviews_count')
                ->first();

            $commissionRate = (float) ($vendor->commission_rate ?? 0);
            $commissionRatio = max(0, min(100, $commissionRate)) / 100;

            $vendor->setAttribute('total_revenue', $totalRevenue);
            $vendor->setAttribute('orders_count', $ordersCount);
            $vendor->setAttribute('computed_rating', round((float) ($reviewStats?->avg_rating ?? $vendor->rating ?? 0), 2));
            $vendor->setAttribute('review_count', (int) ($reviewStats?->reviews_count ?? 0));
            $vendor->setAttribute('commission_earned', round($totalRevenue * $commissionRatio, 2));
        });
    }

    /**
     * Approve vendor
     */
    public function approve(Vendor $vendor): JsonResponse
    {
        $vendor->update([
            'status' => 'active',
            'is_active' => true,
            'is_verified' => true,
        ]);

        // Ensure the associated user has the 'merchant' Spatie role
        if ($vendor->user_id && $vendor->user) {
            $vendor->user->syncRoles(['merchant']);
        }

        if ($vendor->user_id) {
            UserNotification::create([
                'user_id' => $vendor->user_id,
                'type' => 'vendor',
                'title' => __('messages.vendor_status_updated_title'),
                'message' => __('messages.vendor_approved'),
                'link' => '/merchant/dashboard',
                'meta' => [
                    'vendor_id' => $vendor->id,
                    'status' => 'active',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor->fresh()),
            'message' => __('messages.vendor_approved'),
        ]);
    }

    /**
     * Reject vendor
     */
    public function reject(Request $request, Vendor $vendor): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:2000',
        ]);

        $vendor->update([
            'status' => 'rejected',
            'is_active' => false,
            'rejection_reason' => $validated['reason'] ?? null,
        ]);

        if ($vendor->user_id) {
            UserNotification::create([
                'user_id' => $vendor->user_id,
                'type' => 'vendor',
                'title' => __('messages.vendor_status_updated_title'),
                'message' => __('messages.vendor_rejected'),
                'link' => '/merchant/dashboard',
                'meta' => [
                    'vendor_id' => $vendor->id,
                    'status' => 'rejected',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor->fresh()),
            'message' => __('messages.vendor_rejected'),
        ]);
    }

    /**
     * Suspend vendor
     */
    public function suspend(Vendor $vendor): JsonResponse
    {
        $vendor->update([
            'status' => 'suspended',
            'is_active' => false,
        ]);

        if ($vendor->user_id) {
            UserNotification::create([
                'user_id' => $vendor->user_id,
                'type' => 'vendor',
                'title' => __('messages.vendor_status_updated_title'),
                'message' => __('messages.vendor_suspended'),
                'link' => '/merchant/dashboard',
                'meta' => [
                    'vendor_id' => $vendor->id,
                    'status' => 'suspended',
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => new VendorResource($vendor->fresh()),
            'message' => __('messages.vendor_suspended'),
        ]);
    }
}
