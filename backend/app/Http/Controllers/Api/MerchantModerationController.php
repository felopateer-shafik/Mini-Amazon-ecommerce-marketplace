<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandRequest;
use App\Models\Category;
use App\Models\CategoryRequest;
use App\Models\ProductReconsiderationRequest;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MerchantModerationController extends Controller
{
    public function categoryRequests(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $requests = CategoryRequest::query()
            ->where('vendor_id', $vendor->id)
            ->latest()
            ->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $requests->items(),
            'meta' => [
                'total' => $requests->total(),
                'per_page' => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
            ],
        ]);
    }

    public function submitCategoryRequest(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $requestedName = trim((string) $validated['name']);
        $normalizedName = mb_strtolower($requestedName, 'UTF-8');

        $categoryAlreadyExists = Category::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->exists();

        if ($categoryAlreadyExists) {
            return response()->json([
                'success' => false,
                'message' => 'This category already exists.',
                'errors' => [
                    'name' => ['This category already exists.'],
                ],
            ], 422);
        }

        $pendingRequestExists = CategoryRequest::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($pendingRequestExists) {
            return response()->json([
                'success' => false,
                'message' => 'This category already exists.',
                'errors' => [
                    'name' => ['This category already exists.'],
                ],
            ], 422);
        }

        $created = CategoryRequest::create([
            'vendor_id' => $vendor->id,
            'name' => $requestedName,
            'description' => $validated['description'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data' => $created,
            'message' => 'Category request submitted successfully.',
        ], 201);
    }

    public function brandRequests(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $requests = BrandRequest::query()
            ->where('vendor_id', $vendor->id)
            ->latest()
            ->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $requests->items(),
            'meta' => [
                'total' => $requests->total(),
                'per_page' => $requests->perPage(),
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
            ],
        ]);
    }

    public function submitBrandRequest(Request $request): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'website' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
        ]);

        $requestedName = trim((string) $validated['name']);
        $normalizedName = mb_strtolower($requestedName, 'UTF-8');

        $brandAlreadyExists = Brand::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->exists();

        if ($brandAlreadyExists) {
            return response()->json([
                'success' => false,
                'message' => 'This brand already exists.',
                'errors' => [
                    'name' => ['This brand already exists.'],
                ],
            ], 422);
        }

        $pendingRequestExists = BrandRequest::query()
            ->whereRaw('LOWER(name) = ?', [$normalizedName])
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($pendingRequestExists) {
            return response()->json([
                'success' => false,
                'message' => 'This brand already exists.',
                'errors' => [
                    'name' => ['This brand already exists.'],
                ],
            ], 422);
        }

        $created = BrandRequest::create([
            'vendor_id' => $vendor->id,
            'name' => $requestedName,
            'website' => $validated['website'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'data' => $created,
            'message' => 'Brand request submitted successfully.',
        ], 201);
    }

    public function submitReconsideration(Request $request, int $productId): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json(['success' => false, 'message' => __('vendors.not_found')], 404);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:4000',
        ]);

        $product = $vendor->products()->findOrFail($productId);

        $isInitialRejection = empty($product->approved_at) && (string) ($product->moderation_status ?? '') === 'rejected';
        $isUpdateRejection = !empty($product->approved_at) && (string) ($product->pending_update_status ?? '') === 'rejected';

        if (!$isInitialRejection && !$isUpdateRejection) {
            return response()->json([
                'success' => false,
                'message' => 'Reconsideration is only available for rejected submissions or rejected updates.',
            ], 422);
        }

        if ($isInitialRejection) {
            $alreadySubmitted = ProductReconsiderationRequest::query()
                ->where('product_id', $product->id)
                ->where('vendor_id', $vendor->id)
                ->exists();

            if ($alreadySubmitted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only one reconsideration request is allowed for initially rejected products.',
                ], 422);
            }
        }

        $created = ProductReconsiderationRequest::create([
            'product_id' => $product->id,
            'vendor_id' => $vendor->id,
            'message' => trim((string) $validated['message']),
            'status' => 'pending',
        ]);

        $adminIds = User::role('admin')->pluck('id');
        foreach ($adminIds as $adminId) {
            UserNotification::create([
                'user_id' => $adminId,
                'type' => 'product',
                'title' => 'New reconsideration request',
                'message' => 'Merchant ' . ($vendor->store_name ?: $vendor->business_name) . ' submitted a reconsideration for product ' . $product->name . '.',
                'link' => '/admin/products?reconsiderationRequestId=' . $created->id,
                'meta' => [
                    'product_id' => $product->id,
                    'vendor_id' => $vendor->id,
                    'reconsideration_request_id' => $created->id,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $created,
            'message' => 'Reconsideration request submitted successfully.',
        ], 201);
    }
}
