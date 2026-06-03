<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    private function clearPublicCategoryCache(): void
    {
        Cache::forget('categories.active.v2');
    }

    private function notifyAdminsForEmptyCategory(Category $category): void
    {
        if (!(bool) ($category->is_active ?? false)) {
            return;
        }

        if ((int) ($category->products_count ?? 0) > 0) {
            return;
        }

        $cacheKey = 'alerts.category.empty.' . (int) $category->id;
        if (!Cache::add($cacheKey, 1, now()->addHours(24))) {
            return;
        }

        $adminUserIds = User::query()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'admin');
            })
            ->pluck('id');

        foreach ($adminUserIds as $adminUserId) {
            UserNotification::create([
                'user_id' => $adminUserId,
                'type' => 'alert',
                'title' => 'Category inventory alert',
                'message' => 'Category "' . $category->name . '" has 0 active products.',
                'link' => '/admin/categories',
                'meta' => [
                    'entity' => 'category',
                    'category_id' => (int) $category->id,
                ],
            ]);
        }
    }

    private function aggregateProductsCount(Category $category): int
    {
        $total = (int) ($category->products_count ?? 0);

        if ($category->relationLoaded('children')) {
            foreach ($category->children as $child) {
                $total += $this->aggregateProductsCount($child);
            }
        }

        return $total;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Category::with([
                'children' => function ($query) {
                    $query->withCount(['products' => function ($productQuery) {
                        $productQuery->where('is_active', true);
                    }]);
                },
            ])
            ->withCount(['products' => function ($query) {
                $query->where('is_active', true);
            }]);

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('slug', 'ILIKE', "%{$search}%")
                  ->orWhereHas('children', function ($cq) use ($search) {
                      $cq->where('name', 'ILIKE', "%{$search}%");
                  });
            });
        } else {
            $query->whereNull('parent_id');
        }

        $categories = $query->orderBy('sort_order')
            ->paginate(min(max((int) $request->get('per_page', 50), 1), 100));

        $categories->getCollection()->transform(function ($category) {
            $category->setAttribute('products_count', $this->aggregateProductsCount($category));
            $category->setAttribute(
                'empty_products_alert',
                (bool) ($category->is_active ?? false) && (int) ($category->products_count ?? 0) === 0,
            );
            $this->notifyAdminsForEmptyCategory($category);
            return $category;
        });

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('image', $validated)) {
            $validated['image'] = $this->normalizeImagePayload($validated['image']);
        }

        $category = Category::create($validated);
        $this->clearPublicCategoryCache();

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => __('messages.success'),
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $category->load('children', 'parent'),
        ]);
    }

    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $validated = $request->validated();

        if (array_key_exists('image', $validated)) {
            $validated['image'] = $this->normalizeImagePayload($validated['image']);
        }

        $category->update($validated);
        $this->clearPublicCategoryCache();

        return response()->json([
            'success' => true,
            'data' => $category,
            'message' => __('messages.success'),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if (!request()->boolean('force')) {
            return response()->json([
                'success' => false,
                'message' => __('messages.confirmation_required'),
            ], 422);
        }

        $categoryIds = $this->collectCategoryIds($category);

        DB::transaction(function () use ($categoryIds): void {
            Product::query()
                ->whereIn('category_id', $categoryIds)
                ->update([
                    'category_id' => null,
                    'is_active' => false,
                    'moderation_status' => 'pending',
                    'moderation_note' => 'Category removed by admin. Merchant must resubmit category.',
                    'approved_at' => null,
                    'approved_by' => null,
                    'reviewed_at' => now(),
                ]);

            Category::query()->whereIn('id', $categoryIds)->delete();
        });

        $this->clearPublicCategoryCache();

        return response()->json([
            'success' => true,
            'message' => __('messages.success'),
        ]);
    }

    /**
     * @return list<int>
     */
    private function collectCategoryIds(Category $root): array
    {
        $nodes = Category::query()->select('id', 'parent_id')->get();
        $childrenByParent = [];

        foreach ($nodes as $node) {
            $parentId = (int) ($node->parent_id ?? 0);
            if (!isset($childrenByParent[$parentId])) {
                $childrenByParent[$parentId] = [];
            }
            $childrenByParent[$parentId][] = (int) $node->id;
        }

        $stack = [(int) $root->id];
        $ids = [];

        while (!empty($stack)) {
            $current = array_pop($stack);
            if (in_array($current, $ids, true)) {
                continue;
            }

            $ids[] = $current;
            foreach ($childrenByParent[$current] ?? [] as $childId) {
                $stack[] = $childId;
            }
        }

        return $ids;
    }

    private function normalizeImagePayload(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (!str_starts_with($value, 'data:image/')) {
            return $value;
        }

        if (!preg_match('/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i', $value, $matches)) {
            return $value;
        }

        $extension = strtolower($matches[1]);
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        $decoded = base64_decode($matches[2], true);
        if ($decoded === false) {
            return $value;
        }

        $path = 'categories/' . Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($path, $decoded);

        return url(Storage::url($path));
    }
}
