<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
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

    private function collectDescendantCategoryIds(Category $category): array
    {
        $ids = [$category->id];
        $children = $category->children()->select('id')->get();

        foreach ($children as $child) {
            $ids = array_merge($ids, $this->collectDescendantCategoryIds($child));
        }

        return $ids;
    }

    /**
     * Display all active categories (cached for 30 minutes)
     */
    public function index(): JsonResponse
    {
        $categories = Cache::remember('categories.active.v2', 1800, function () {
            return Category::where('is_active', true)
                ->whereNull('parent_id')
                ->with(['children' => function ($q) {
                    $q->where('is_active', true)
                        ->withCount(['products' => function ($p) {
                            $p->where('is_active', true);
                        }])
                        ->with(['children' => function ($cq) {
                            $cq->where('is_active', true)
                                ->withCount(['products' => function ($p) {
                                    $p->where('is_active', true);
                                }])
                                ->orderBy('sort_order');
                        }])
                        ->orderBy('sort_order');
                }])
                ->withCount(['products' => function ($q) {
                    $q->where('is_active', true);
                }])
                ->orderBy('sort_order')
                ->get();
        });

        $categories->each(function ($category) {
            $category->setAttribute('computed_products_count', $this->aggregateProductsCount($category));
        });

        return response()->json([
            'success' => true,
            'data' => CategoryResource::collection($categories),
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Display a single category with its products
     */
    public function show(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->with(['children' => function ($q) {
                $q->where('is_active', true)->orderBy('sort_order');
            }])
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new CategoryResource($category),
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Get products for a category
     */
    public function products(Request $request, string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();
        $categoryIds = array_values(array_unique($this->collectDescendantCategoryIds($category)));

        $products = \App\Models\Product::whereIn('category_id', $categoryIds)
            ->where('is_active', true)
            ->where(function ($brandQuery) {
                $brandQuery->whereNull('brand_id')
                    ->orWhereHas('brand', function ($bq) {
                        $bq->where('status', 'active');
                    });
            })
            ->with(['vendor', 'category', 'brand'])
            ->withCount('reviews')
            ->withAvg('reviews', 'rating');

        // Search
        if ($request->has('search')) {
            $searchTerm = trim((string) $request->search);
            $products->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'ILIKE', "%{$searchTerm}%")
                  ->orWhereHas('category', function ($categoryQuery) use ($searchTerm) {
                      $categoryQuery
                          ->where('name', 'ILIKE', "%{$searchTerm}%")
                          ->orWhere('slug', 'ILIKE', "%{$searchTerm}%");
                  })
                  ->orWhereHas('brand', function ($brandQuery) use ($searchTerm) {
                      $brandQuery
                          ->where('name', 'ILIKE', "%{$searchTerm}%")
                          ->orWhere('slug', 'ILIKE', "%{$searchTerm}%");
                  });
            });
        }

        // Price range
        if ($request->has('min_price')) {
            $products->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $products->where('price', '<=', $request->max_price);
        }

        // Rating
        if ($request->has('min_rating')) {
            $minRating = (float) $request->min_rating;
            $products->whereRaw(
                '(SELECT AVG(rating) FROM reviews WHERE reviews.product_id = products.id) >= ?',
                [$minRating]
            );
        }

        // Featured
        if ($request->boolean('is_featured')) {
            $products->where('is_featured', true);
        }

        // Filter by brand slug(s)
        if ($request->has('brand')) {
            $brandSlugs = array_map('trim', explode(',', $request->brand));
            $products->whereHas('brand', fn ($q) => $q->where('status', 'active')
                ->where(function ($brandFilterQuery) use ($brandSlugs) {
                    $brandFilterQuery->whereIn('slug', $brandSlugs)
                        ->orWhereIn('name', $brandSlugs);
                }));
        }

        // Filter by seller slug/name
        if ($request->has('seller')) {
            $sellerValues = array_filter(array_map('trim', explode(',', (string) $request->seller)));
            if (!empty($sellerValues)) {
                $products->whereHas('vendor', function ($q) use ($sellerValues) {
                    $q->whereIn('slug', $sellerValues)
                        ->orWhereIn('store_name', $sellerValues)
                        ->orWhereIn('business_name', $sellerValues);
                });
            }
        }

        // Availability filter
        if ($request->has('availability')) {
            $availabilityValues = array_filter(array_map('trim', explode(',', (string) $request->availability)));
            if (!empty($availabilityValues)) {
                $products->where(function ($aq) use ($availabilityValues) {
                    if (in_array('in_stock', $availabilityValues, true)) {
                        $aq->orWhere('stock_quantity', '>', 0);
                    }
                    if (in_array('out_of_stock', $availabilityValues, true)) {
                        $aq->orWhere('stock_quantity', '<=', 0);
                    }
                    if (in_array('pre_order', $availabilityValues, true)) {
                        $aq->orWhereHas('attributes', function ($attrQ) {
                            $attrQ->where('key', 'availability')
                                ->where(function ($q) {
                                    $q->where('value', 'pre_order')
                                        ->orWhere('value', 'ILIKE', '%pre-order%')
                                        ->orWhere('value', 'ILIKE', '%pre order%');
                                });
                        });
                    }
                });
            }
        }

        // Attribute filters
        $filters = $request->input('filter', []);
        if (is_array($filters) && !empty($filters)) {
            foreach ($filters as $attrKey => $attrValues) {
                if (in_array($attrKey, ['brand', 'seller', 'availability', 'shipping'], true)) {
                    continue;
                }
                $values = array_map('trim', explode(',', $attrValues));
                $products->whereHas('attributes', function ($aq) use ($attrKey, $values) {
                    $aq->where('key', $attrKey);
                    if (count($values) === 1) {
                        $aq->where(function ($q2) use ($values) {
                            $q2->where('value', $values[0])
                               ->orWhere('value', 'ILIKE', '%' . $values[0] . '%');
                        });
                    } else {
                        $aq->where(function ($q2) use ($values) {
                            foreach ($values as $v) {
                                $q2->orWhere('value', $v)
                                   ->orWhere('value', 'ILIKE', '%' . $v . '%');
                            }
                        });
                    }
                });
            }
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSorts = ['created_at', 'price', 'name', 'sold_count'];
        if ($sortBy === 'rating') {
            $products->orderBy('reviews_avg_rating', $sortOrder);
        } elseif (in_array($sortBy, $allowedSorts)) {
            $products->orderBy($sortBy, $sortOrder);
        } else {
            $products->orderBy('created_at', 'desc');
        }

        $products = $products->paginate(min(max((int) $request->get('per_page', 12), 1), 100));

        return response()->json([
            'success' => true,
            'data' => \App\Http\Resources\ProductResource::collection($products),
            'meta' => [
                'category' => new CategoryResource($category),
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
        ]);
    }
}
