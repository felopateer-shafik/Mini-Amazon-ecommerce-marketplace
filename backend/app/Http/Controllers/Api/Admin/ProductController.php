<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    private function denyIfNotSystemAdminForSystemProduct(Request $request, Product $product): ?JsonResponse
    {
        if ($product->vendor_id !== null) {
            return null;
        }

        $actor = $request->user();
        if (!$actor || !$actor->isSystemAdminAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'Only System Admin can manage System Admin products.',
            ], 403);
        }

        return null;
    }

    /**
     * Create product directly (admin-only, auto-approved)
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'short_description' => 'nullable|string|max:500',
            'sku' => 'nullable|string|unique:products,sku',
            'price' => 'required|numeric|min:0',
            'compare_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'category_id' => 'nullable|exists:categories,id',
            'brand_id' => 'nullable|exists:brands,id',
            'product_type' => 'nullable|string|in:simple,variable,digital',
            'min_order_quantity' => 'nullable|integer|min:1',
            'max_order_quantity' => 'nullable|integer|min:1',
            'weight' => 'required|numeric|min:0',
            'dimensions' => 'required|array',
            'dimensions.length' => 'required|numeric|min:0',
            'dimensions.width' => 'required|numeric|min:0',
            'dimensions.height' => 'required|numeric|min:0',
            'images' => 'required|array|min:1',
            'tags' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'is_featured' => 'sometimes|boolean',
            'wholesale_price' => 'nullable|numeric|min:0.01',
            'wholesale_min_qty' => 'nullable|integer|min:1',
            'variants' => 'nullable|array',
            'variants.*.option' => 'nullable|string|max:255',
            'variants.*.values' => 'nullable|string|max:1000',
        ]);

        if (
            array_key_exists('compare_price', $validated)
            && $validated['compare_price'] !== null
            && (float) $validated['compare_price'] <= (float) $validated['price']
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Compare-at price must be greater than the sale price.',
                'errors' => [
                    'compare_price' => ['Compare-at price must be greater than the sale price.'],
                ],
            ], 422);
        }

        $sku = $validated['sku'] ?? strtoupper(substr(md5(uniqid()), 0, 8));

        $product = DB::transaction(function () use ($validated, $request, $sku) {
            $product = Product::create([
                'vendor_id' => null,
                'product_type' => $validated['product_type'] ?? 'simple',
                'category_id' => $validated['category_id'] ?? null,
                'brand_id' => $validated['brand_id'] ?? null,
                'name' => $validated['name'],
                'description' => $validated['description'],
                'short_description' => $validated['short_description'] ?? null,
                'sku' => $sku,
                'price' => $validated['price'],
                'compare_price' => $validated['compare_price'] ?? null,
                'cost_price' => $validated['cost_price'] ?? null,
                'stock_quantity' => $validated['stock_quantity'],
                'is_active' => true,
                'is_featured' => (bool) ($validated['is_featured'] ?? false),
                'min_order_quantity' => $validated['min_order_quantity'] ?? 1,
                'max_order_quantity' => $validated['max_order_quantity'] ?? null,
                'moderation_status' => 'approved',
                'moderation_note' => null,
                'approved_at' => now(),
                'approved_by' => $request->user()->id,
                'reviewed_at' => now(),
                'weight' => $validated['weight'],
                'dimensions' => $validated['dimensions'],
                'images' => $validated['images'],
                'tags' => $validated['tags'] ?? [],
                'meta_title' => $validated['meta_title'] ?? null,
                'meta_description' => $validated['meta_description'] ?? null,
            ]);

            $variants = is_array($validated['variants'] ?? null) ? $validated['variants'] : [];
            foreach ($variants as $index => $variantData) {
                $option = trim((string) ($variantData['option'] ?? ''));
                $valuesText = trim((string) ($variantData['values'] ?? ''));
                $values = array_values(array_filter(array_map('trim', explode(',', $valuesText))));
                if ($option === '' || empty($values)) {
                    continue;
                }

                $product->variants()->create([
                    'sku' => $this->generateVariantSku($product, $option, (int) $index),
                    'name' => $option,
                    'price' => (float) $product->price,
                    'attributes' => [
                        'values' => $values,
                        'values_text' => $valuesText,
                    ],
                    'position' => $index,
                ]);
            }

            $wholesalePrice = $validated['wholesale_price'] ?? null;
            if ($wholesalePrice !== null && $wholesalePrice !== '') {
                $product->wholesaleProduct()->updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'wholesale_price' => (float) $wholesalePrice,
                        'min_qty' => (int) ($validated['wholesale_min_qty'] ?? 1),
                        'status' => 'active',
                    ],
                );
            }

            return $product;
        });

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh(['category', 'brand', 'vendor', 'variants', 'wholesaleProduct', 'latestReconsideration'])),
            'message' => __('messages.product_created'),
        ], 201);
    }

    /**
     * Display all products
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::query()
            ->with(['vendor', 'variants', 'category', 'latestReconsideration'])
            ->withCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->withAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating')
            ->where(function ($q) {
                $q->whereNull('moderation_note')
                    ->orWhereNotIn('moderation_note', ['Removed by merchant', 'Removed by admin']);
            });

        $search = trim((string) $request->get('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                    ->orWhere('sku', 'ILIKE', "%{$search}%")
                    ->orWhereHas('vendor', function ($vq) use ($search) {
                        $vq->where('store_name', 'ILIKE', "%{$search}%")
                            ->orWhere('business_name', 'ILIKE', "%{$search}%");
                    });
            });
        }

        $status = strtolower((string) $request->get('status', ''));
        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            if ($status === 'pending') {
                $query->where(function ($q) {
                    $q->where('moderation_status', 'pending')
                        ->orWhere('pending_update_status', 'pending');
                });
            } elseif ($status === 'rejected') {
                $query->where(function ($q) {
                    $q->where('moderation_status', 'rejected')
                        ->orWhere('pending_update_status', 'rejected');
                });
            } else {
                $query->where('moderation_status', 'approved');
            }
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $vendorId = (int) $request->get('vendor_id', 0);
        if ($vendorId > 0) {
            $query->where('vendor_id', $vendorId);
        }

        if ($request->boolean('system_only')) {
            $query->whereNull('vendor_id');
        }

        $products = $query
            ->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products),
            'meta' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }

    /**
     * Show product detail
     */
    public function show(Product $product): JsonResponse
    {
        $product->load(['vendor', 'variants', 'category', 'reviews', 'latestReconsideration'])
            ->loadCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->loadAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating');

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product),
        ]);
    }

    /**
     * Update product
     */
    public function update(Request $request, Product $product): JsonResponse
    {
        if ($denied = $this->denyIfNotSystemAdminForSystemProduct($request, $product)) {
            return $denied;
        }

        if ($product->vendor_id === null && $request->has('moderation_status')) {
            return response()->json([
                'success' => false,
                'message' => 'System Admin products do not support manual status changes.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'short_description' => 'nullable|string|max:500',
            'sku' => 'sometimes|string|unique:products,sku,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'compare_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'category_id' => 'sometimes|nullable|exists:categories,id',
            'brand_id' => 'sometimes|nullable|exists:brands,id',
            'is_active' => 'sometimes|boolean',
            'is_featured' => 'sometimes|boolean',
            'stock_quantity' => 'sometimes|integer|min:0',
            'product_type' => 'nullable|string|in:simple,variable,digital',
            'min_order_quantity' => 'nullable|integer|min:1',
            'max_order_quantity' => 'nullable|integer|min:1',
            'weight' => 'sometimes|numeric|min:0',
            'dimensions' => 'sometimes|array',
            'dimensions.length' => 'required_with:dimensions|numeric|min:0',
            'dimensions.width' => 'required_with:dimensions|numeric|min:0',
            'dimensions.height' => 'required_with:dimensions|numeric|min:0',
            'images' => 'sometimes|array|min:1',
            'tags' => 'nullable|array',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'wholesale_price' => 'nullable|numeric|min:0.01',
            'wholesale_min_qty' => 'nullable|integer|min:1',
            'variants' => 'nullable|array',
            'variants.*.option' => 'nullable|string|max:255',
            'variants.*.values' => 'nullable|string|max:1000',
            'moderation_status' => 'sometimes|in:pending,approved,rejected',
            'moderation_note' => 'nullable|string|max:4000',
        ]);

        $nextPrice = array_key_exists('price', $validated)
            ? (float) $validated['price']
            : (float) $product->price;
        if (
            array_key_exists('compare_price', $validated)
            && $validated['compare_price'] !== null
            && (float) $validated['compare_price'] <= $nextPrice
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Compare-at price must be greater than the sale price.',
                'errors' => [
                    'compare_price' => ['Compare-at price must be greater than the sale price.'],
                ],
            ], 422);
        }

        if (array_key_exists('variants', $validated)) {
            $product->variants()->delete();
            foreach ($validated['variants'] ?? [] as $index => $variantData) {
                $option = trim((string) ($variantData['option'] ?? ''));
                $valuesText = trim((string) ($variantData['values'] ?? ''));
                $values = array_values(array_filter(array_map('trim', explode(',', $valuesText))));
                if ($option === '' || empty($values)) {
                    continue;
                }

                $product->variants()->create([
                    'sku' => $this->generateVariantSku($product, $option, (int) $index),
                    'name' => $option,
                    'price' => (float) $product->price,
                    'attributes' => [
                        'values' => $values,
                        'values_text' => $valuesText,
                    ],
                    'position' => $index,
                ]);
            }
            unset($validated['variants']);
        }

        if (array_key_exists('wholesale_price', $validated) || array_key_exists('wholesale_min_qty', $validated)) {
            $price = $validated['wholesale_price'] ?? null;
            $minQty = $validated['wholesale_min_qty'] ?? 1;
            if ($price === null || $price === '') {
                $product->wholesaleProduct()->delete();
            } else {
                $product->wholesaleProduct()->updateOrCreate(
                    ['product_id' => $product->id],
                    [
                        'wholesale_price' => (float) $price,
                        'min_qty' => (int) $minQty,
                        'status' => 'active',
                    ]
                );
            }
            unset($validated['wholesale_price'], $validated['wholesale_min_qty']);
        }

        if (array_key_exists('moderation_status', $validated)) {
            if ($validated['moderation_status'] === 'approved') {
                $validated['is_active'] = true;
                $validated['approved_at'] = now();
                $validated['approved_by'] = $request->user()->id;
                $validated['reviewed_at'] = now();
                $validated['moderation_note'] = $validated['moderation_note'] ?? null;
            }

            if ($validated['moderation_status'] === 'rejected') {
                $validated['is_active'] = false;
                $validated['approved_at'] = null;
                $validated['approved_by'] = null;
                $validated['reviewed_at'] = now();
            }

            if ($validated['moderation_status'] === 'pending') {
                $validated['is_active'] = false;
                $validated['approved_at'] = null;
                $validated['approved_by'] = null;
                $validated['reviewed_at'] = now();
            }
        }

        $product->update($validated);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh()),
            'message' => __('messages.product_updated'),
        ]);
    }

    /**
     * Delete product
     */
    public function destroy(Product $product): JsonResponse
    {
        if ($denied = $this->denyIfNotSystemAdminForSystemProduct(request(), $product)) {
            return $denied;
        }

        $product->update([
            'is_active' => false,
            'moderation_status' => 'rejected',
            'moderation_note' => 'Removed by admin',
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Approve product
     */
    public function approve(Request $request, Product $product): JsonResponse
    {
        if ($product->vendor_id === null) {
            return response()->json([
                'success' => false,
                'message' => 'System Admin products do not support manual status changes.',
            ], 422);
        }

        if ($denied = $this->denyIfNotSystemAdminForSystemProduct($request, $product)) {
            return $denied;
        }

        if (($product->pending_update_status ?? null) === 'pending' && !empty($product->pending_update_payload)) {
            $payload = $product->pending_update_payload;

            $pendingVariants = is_array($payload['variants'] ?? null) ? $payload['variants'] : null;
            $pendingWholesale = is_array($payload['wholesale'] ?? null) ? $payload['wholesale'] : null;
            unset($payload['variants'], $payload['wholesale']);

            $product->update(array_merge($payload, [
                'pending_update_payload' => null,
                'pending_update_status' => null,
                'pending_update_note' => null,
                'pending_update_reviewed_at' => now(),
                'pending_update_reviewed_by' => request()->user()->id,
                'is_active' => true,
                'moderation_status' => 'approved',
                'moderation_note' => null,
                'approved_at' => $product->approved_at ?? now(),
                'approved_by' => $product->approved_by ?? request()->user()->id,
                'reviewed_at' => now(),
            ]));

            if ($pendingVariants !== null) {
                $product->variants()->delete();
                foreach ($pendingVariants as $index => $variantData) {
                    $option = trim((string) ($variantData['option'] ?? ''));
                    $valuesText = trim((string) ($variantData['values'] ?? ''));
                    $valuesArray = is_array($variantData['values_array'] ?? null)
                        ? array_values(array_filter(array_map('strval', $variantData['values_array'])))
                        : array_values(array_filter(array_map('trim', explode(',', $valuesText))));

                    if ($option === '' || empty($valuesArray)) {
                        continue;
                    }

                    $product->variants()->create([
                        'sku' => $this->generateVariantSku($product, $option, (int) $index),
                        'name' => $option,
                        'price' => (float) $product->price,
                        'attributes' => [
                            'values' => $valuesArray,
                            'values_text' => $valuesText !== '' ? $valuesText : implode(', ', $valuesArray),
                        ],
                        'position' => $index,
                    ]);
                }
            }

            if ($pendingWholesale !== null) {
                $price = $pendingWholesale['wholesale_price'] ?? null;
                $minQty = $pendingWholesale['wholesale_min_qty'] ?? null;

                if ($price === null || $price === '') {
                    $product->wholesaleProduct()->delete();
                } else {
                    $product->wholesaleProduct()->updateOrCreate(
                        ['product_id' => $product->id],
                        [
                            'wholesale_price' => (float) $price,
                            'min_qty' => $minQty ? (int) $minQty : 1,
                            'status' => 'active',
                        ]
                    );
                }
            }

            return response()->json([
                'success' => true,
                'data' => new ProductResource($product->fresh()),
                'message' => __('messages.product_approved'),
            ]);
        }

        $product->update([
            'is_active' => true,
            'moderation_status' => 'approved',
            'moderation_note' => null,
            'approved_at' => now(),
            'approved_by' => request()->user()->id,
            'reviewed_at' => now(),
            'pending_update_payload' => null,
            'pending_update_status' => null,
            'pending_update_note' => null,
            'pending_update_reviewed_at' => null,
            'pending_update_reviewed_by' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh()),
            'message' => __('messages.product_approved'),
        ]);
    }

    public function reject(Request $request, Product $product): JsonResponse
    {
        if ($product->vendor_id === null) {
            return response()->json([
                'success' => false,
                'message' => 'System Admin products do not support manual status changes.',
            ], 422);
        }

        if ($denied = $this->denyIfNotSystemAdminForSystemProduct($request, $product)) {
            return $denied;
        }

        $validated = $request->validate([
            'moderation_note' => 'nullable|string|max:4000',
        ]);

        if (($product->pending_update_status ?? null) === 'pending') {
            $product->update([
                'pending_update_status' => 'rejected',
                'pending_update_note' => $validated['moderation_note'] ?? null,
                'pending_update_reviewed_at' => now(),
                'pending_update_reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'data' => new ProductResource($product->fresh()),
                'message' => 'Product update request rejected successfully.',
            ]);
        }

        $product->update([
            'is_active' => false,
            'moderation_status' => 'rejected',
            'moderation_note' => $validated['moderation_note'] ?? null,
            'approved_at' => null,
            'approved_by' => null,
            'reviewed_at' => now(),
            'pending_update_payload' => null,
            'pending_update_status' => null,
            'pending_update_note' => null,
            'pending_update_reviewed_at' => null,
            'pending_update_reviewed_by' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh()),
            'message' => 'Product rejected successfully.',
        ]);
    }

    private function generateVariantSku(Product $product, string $option, int $index): string
    {
        $base = strtoupper(trim((string) ($product->sku ?? '')));
        if ($base === '') {
            $base = 'PRD-' . (int) $product->id;
        }

        $suffix = strtoupper(Str::slug($option, ''));
        if ($suffix === '') {
            $suffix = 'OPT' . ($index + 1);
        }

        $candidateBase = $base . '-' . $suffix;
        $candidate = $candidateBase;
        $counter = 1;

        while (ProductVariant::query()->where('sku', $candidate)->exists()) {
            $counter++;
            $candidate = $candidateBase . '-' . $counter;
        }

        return $candidate;
    }
}
