<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\BrandRequest;
use App\Models\Category;
use App\Models\CategoryRequest;
use App\Models\ProductReconsiderationRequest;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class ModerationRequestController extends Controller
{
    public function categoryRequests(Request $request): JsonResponse
    {
        $query = CategoryRequest::query()->with(['vendor:id,store_name,business_name', 'parent:id,name', 'category:id,name']);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->status);
        }

        $items = $query->latest()->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $items->items(),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function approveCategoryRequest(Request $request, CategoryRequest $categoryRequest): JsonResponse
    {
        if ($categoryRequest->status === 'approved') {
            return response()->json(['success' => true, 'data' => $categoryRequest], 200);
        }

        $category = Category::firstOrCreate(
            ['slug' => Str::slug($categoryRequest->name)],
            [
                'name' => $categoryRequest->name,
                'description' => $categoryRequest->description,
                'parent_id' => $categoryRequest->parent_id,
                'is_active' => true,
            ]
        );

        $categoryRequest->update([
            'status' => 'approved',
            'category_id' => $category->id,
            'admin_reply' => $request->input('admin_reply'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        Cache::forget('categories.active.v2');

        return response()->json([
            'success' => true,
            'data' => $categoryRequest->fresh(['category']),
            'message' => 'Category request approved.',
        ]);
    }

    public function rejectCategoryRequest(Request $request, CategoryRequest $categoryRequest): JsonResponse
    {
        $categoryRequest->update([
            'status' => 'rejected',
            'admin_reply' => $request->input('admin_reply'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $categoryRequest,
            'message' => 'Category request rejected.',
        ]);
    }

    public function brandRequests(Request $request): JsonResponse
    {
        $query = BrandRequest::query()->with(['vendor:id,store_name,business_name', 'brand:id,name']);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->status);
        }

        $items = $query->latest()->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $items->items(),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function approveBrandRequest(Request $request, BrandRequest $brandRequest): JsonResponse
    {
        if ($brandRequest->status === 'approved' && $brandRequest->brand_id) {
            return response()->json(['success' => true, 'data' => $brandRequest], 200);
        }

        $brand = Brand::firstOrCreate(
            ['slug' => Str::slug($brandRequest->name)],
            [
                'name' => $brandRequest->name,
                'website' => $brandRequest->website,
                'products_count' => 0,
                'status' => 'active',
            ]
        );

        $brandRequest->update([
            'status' => 'approved',
            'brand_id' => $brand->id,
            'admin_reply' => $request->input('admin_reply'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $brandRequest->fresh(['brand']),
            'message' => 'Brand request approved.',
        ]);
    }

    public function rejectBrandRequest(Request $request, BrandRequest $brandRequest): JsonResponse
    {
        $brandRequest->update([
            'status' => 'rejected',
            'admin_reply' => $request->input('admin_reply'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $brandRequest,
            'message' => 'Brand request rejected.',
        ]);
    }

    public function productReconsiderations(Request $request): JsonResponse
    {
        $query = ProductReconsiderationRequest::query()->with([
            'product:id,name,moderation_status,vendor_id',
            'vendor:id,store_name,business_name',
        ]);

        if ($request->filled('status')) {
            $query->where('status', (string) $request->status);
        }

        $items = $query->latest()->paginate(min(max((int) $request->get('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $items->items(),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function replyProductReconsideration(Request $request, ProductReconsiderationRequest $productReconsideration): JsonResponse
    {
        $validated = $request->validate([
            'admin_reply' => 'required|string|max:4000',
        ]);

        $productReconsideration->update([
            'admin_reply' => trim((string) $validated['admin_reply']),
            'status' => 'replied',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $productReconsideration->loadMissing(['product:id,name', 'vendor:id,user_id']);
        if (!empty($productReconsideration->vendor?->user_id)) {
            UserNotification::create([
                'user_id' => $productReconsideration->vendor->user_id,
                'type' => 'product',
                'title' => 'Reconsideration reply received',
                'message' => 'Admin replied to your reconsideration for product ' . ($productReconsideration->product->name ?? 'product') . '.',
                'link' => '/merchant/products?reconsiderationRequestId=' . $productReconsideration->id,
                'meta' => [
                    'product_id' => $productReconsideration->product_id,
                    'reconsideration_request_id' => $productReconsideration->id,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $productReconsideration->fresh(['product', 'vendor']),
            'message' => 'Reconsideration reply sent.',
        ]);
    }
}
