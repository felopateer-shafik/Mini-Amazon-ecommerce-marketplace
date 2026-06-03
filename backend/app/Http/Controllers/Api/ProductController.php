<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductCollection;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Review;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['vendor', 'category', 'brand'])
            ->withCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->withAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating')
            ->where('is_active', true)
            ->whereHas('category', function ($categoryQuery) {
                $categoryQuery->where('is_active', true);
            })
            ->where(function ($brandQuery) {
                $brandQuery->whereNull('brand_id')
                    ->orWhereHas('brand', function ($bq) {
                        $bq->where('status', 'active');
                    });
            });

        // Search (name/description/sku/tags + brand + category)
        if ($request->has('search')) {
            $searchTerm = trim((string) $request->search);
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'ILIKE', "%{$searchTerm}%")
                  ->orWhere('description', 'ILIKE', "%{$searchTerm}%")
                  ->orWhere('sku', 'ILIKE', "%{$searchTerm}%")
                  ->orWhereRaw("CAST(tags AS TEXT) ILIKE ?", ["%{$searchTerm}%"])
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

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by category slug(s)
        if ($request->has('category')) {
            $categorySlugs = array_map('trim', explode(',', $request->category));
            $query->whereHas('category', fn ($q) => $q->whereIn('slug', $categorySlugs));
        }

        // Filter by brand slug(s)
        if ($request->has('brand')) {
            $brandSlugs = array_map('trim', explode(',', $request->brand));
            $query->whereHas('brand', fn ($q) => $q->whereIn('slug', $brandSlugs)
                ->orWhereIn('name', $brandSlugs));
        }

        // Filter by vendor
        if ($request->has('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        // Filter by seller slug/name
        if ($request->has('seller')) {
            $sellerValues = array_filter(array_map('trim', explode(',', (string) $request->seller)));
            if (!empty($sellerValues)) {
                $query->whereHas('vendor', function ($q) use ($sellerValues) {
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
                $query->where(function ($aq) use ($availabilityValues) {
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

        // Filter by price range
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Featured products
        if ($request->boolean('is_featured')) {
            $query->where('is_featured', true);
        }

        // Minimum rating filter
        if ($request->has('min_rating')) {
            $minRating = (float) $request->min_rating;
            $query->whereRaw(
                '(SELECT AVG(rating) FROM reviews WHERE reviews.product_id = products.id AND reviews.is_approved = true) >= ?',
                [$minRating]
            );
        }

        // ── Advanced attribute filters (from product_attributes table) ──
        // Frontend sends filter[brand]=Nike,Adidas  filter[gender]=men  etc.
        $filters = $request->input('filter', []);
        if (is_array($filters) && !empty($filters)) {
            foreach ($filters as $attrKey => $attrValues) {
                if (in_array($attrKey, ['brand', 'seller', 'availability', 'shipping'], true)) {
                    continue;
                }
                $values = array_map('trim', explode(',', $attrValues));
                $query->whereHas('attributes', function ($aq) use ($attrKey, $values) {
                    $aq->where('key', $attrKey);
                    if (count($values) === 1) {
                        // Single value — support partial match for comma-separated stored values (e.g. sizes "S,M,L")
                        $aq->where(function ($q2) use ($values) {
                            $q2->where('value', $values[0])
                               ->orWhere('value', 'ILIKE', '%' . $values[0] . '%');
                        });
                    } else {
                        // Multiple values — OR match any
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
            $query->orderBy('reviews_avg_rating', $sortOrder);
        } elseif (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Pagination
        $perPage = min(max((int) $request->get('per_page', 12), 1), 50);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => new ProductCollection($products),
            'message' => __('products.retrieved'),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Upload a single product media file (image or video) via multipart/form-data.
     * Returns the stored file URL. Used by the product form to avoid base64 JSON bloat.
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        // Check if PHP rejected the upload before Laravel validation
        if (!$request->hasFile('file') && $request->isMethod('post')) {
            $maxSize = ini_get('upload_max_filesize');
            return response()->json([
                'success' => false,
                'message' => "File upload failed. The server upload limit is {$maxSize}. Please check your PHP upload_max_filesize and post_max_size settings.",
            ], 422);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:204800', // 200 MB
                function ($attribute, $value, $fail) {
                    $allowedMimes = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
                        'video/mpeg', 'video/x-matroska', 'video/3gpp',
                        'application/octet-stream',
                    ];
                    $allowedExts = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'webm', 'mkv', 'mpeg', '3gp'];

                    $mime = $value->getMimeType();
                    $ext = strtolower($value->getClientOriginalExtension());

                    if (!in_array($mime, $allowedMimes, true) && !in_array($ext, $allowedExts, true)) {
                        $fail('The file must be an image or video (jpeg, png, gif, webp, mp4, mov, avi, webm).');
                    }
                },
            ],
        ]);

        $file = $request->file('file');
        $isVideo = str_starts_with($file->getMimeType(), 'video/');
        $folder = $isVideo ? 'products/videos' : 'products';

        // Convert images to WebP for better compression (if GD is available)
        if (!$isVideo && in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/gif'], true) && function_exists('imagecreatefromstring')) {
            try {
                $imageData = file_get_contents($file->getRealPath());
                $image = imagecreatefromstring($imageData);
                if ($image !== false) {
                    $webpFilename = $folder . '/' . \Illuminate\Support\Str::uuid() . '.webp';
                    $tempPath = tempnam(sys_get_temp_dir(), 'webp');
                    imagepalettetotruecolor($image);
                    imagealphablending($image, true);
                    imagesavealpha($image, true);
                    imagewebp($image, $tempPath, 85);
                    imagedestroy($image);

                    \Illuminate\Support\Facades\Storage::disk('public')->put($webpFilename, file_get_contents($tempPath));
                    @unlink($tempPath);

                    return response()->json([
                        'success' => true,
                        'url' => url(\Illuminate\Support\Facades\Storage::url($webpFilename)),
                    ]);
                }
            } catch (\Throwable $e) {
                // Fall through to original upload if WebP conversion fails
            }
        }

        $filename = $folder . '/' . \Illuminate\Support\Str::uuid() . '.' . $file->getClientOriginalExtension();

        \Illuminate\Support\Facades\Storage::disk('public')->putFileAs(
            '',
            $file,
            $filename,
        );

        return response()->json([
            'success' => true,
            'url' => url(\Illuminate\Support\Facades\Storage::url($filename)),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
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
            'min_stock_level' => 'nullable|integer|min:0',
            'track_inventory' => 'boolean',
            'is_featured' => 'boolean',
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
            'variants' => 'nullable|array',
            'variants.*.option' => 'nullable|string|max:255',
            'variants.*.values' => 'nullable|string|max:1000',
            'wholesale_price' => 'nullable|numeric|min:0.01',
            'wholesale_min_qty' => 'nullable|integer|min:1',
        ]);

        if ($request->filled('compare_price') && (float) $request->compare_price <= (float) $request->price) {
            return response()->json([
                'success' => false,
                'message' => 'Compare-at price must be greater than the sale price.',
                'errors' => [
                    'compare_price' => ['Compare-at price must be greater than the sale price.'],
                ],
            ], 422);
        }

        // Generate SKU if not provided
        $sku = $request->sku ?: strtoupper(substr(md5(uniqid()), 0, 8));

        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => __('vendors.not_found'),
            ], 404);
        }

        $requireProductApproval = (bool) Cache::get('settings.require_product_approval', true);

        $product = DB::transaction(function () use ($request, $vendor, $sku, $requireProductApproval) {
            $product = Product::create([
                'vendor_id' => $vendor->id,
                'product_type' => $request->get('product_type', 'simple'),
                'category_id' => $request->category_id,
                'brand_id' => $request->brand_id,
                'name' => $request->name,
                'description' => $request->description,
                'short_description' => $request->short_description,
                'sku' => $sku,
                'price' => $request->price,
                'compare_price' => $request->compare_price,
                'cost_price' => $request->cost_price,
                'stock_quantity' => $request->stock_quantity,
                'min_stock_level' => $request->min_stock_level ?? 0,
                'track_inventory' => $request->boolean('track_inventory', true),
                'is_active' => !$requireProductApproval,
                'is_featured' => $request->boolean('is_featured', false),
                'min_order_quantity' => $request->get('min_order_quantity', 1),
                'max_order_quantity' => $request->max_order_quantity,
                'moderation_status' => $requireProductApproval ? 'pending' : 'approved',
                'moderation_note' => null,
                'approved_at' => $requireProductApproval ? null : now(),
                'approved_by' => null,
                'reviewed_at' => $requireProductApproval ? null : now(),
                'weight' => $request->weight,
                'dimensions' => $request->dimensions,
                'images' => $this->normalizeImages($request->images),
                'video_url' => $this->extractVideoUrl($request->images),
                'tags' => $request->tags,
                'meta_title' => $request->meta_title,
                'meta_description' => $request->meta_description,
            ]);

            $this->syncVariants($product, $this->normalizeVariants($request->variants));
            $this->syncWholesale($product, $this->normalizeWholesalePayload($request->all()));

            return $product;
        });

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh(['category', 'brand', 'vendor', 'variants', 'wholesaleProduct', 'latestReconsideration'])),
            'message' => __('products.created'),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $slug): JsonResponse
    {
        $product = Product::with([
                'vendor' => function ($q) {
                    $q->withCount(['products' => function ($pq) {
                        $pq->where('is_active', true);
                    }]);
                },
                'variants',
                'reviews',
                'category',
            ])
            ->withCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->withAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->whereHas('category', function ($categoryQuery) {
                $categoryQuery->where('is_active', true);
            })
            ->where(function ($brandQuery) {
                $brandQuery->whereNull('brand_id')
                    ->orWhereHas('brand', function ($bq) {
                        $bq->where('status', 'active');
                    });
            })
            ->firstOrFail();

        if (!$product->vendor) {
            $systemProductsQuery = Product::query()
                ->whereNull('vendor_id')
                ->where('is_active', true)
                ->whereHas('category', function ($categoryQuery) {
                    $categoryQuery->where('is_active', true);
                })
                ->where(function ($brandQuery) {
                    $brandQuery->whereNull('brand_id')
                        ->orWhereHas('brand', function ($bq) {
                            $bq->where('status', 'active');
                        });
                });

            $systemProductsCount = (clone $systemProductsQuery)->count();

            $systemReviewStats = Review::query()
                ->where('is_approved', true)
                ->whereHas('product', function ($query) {
                    $query->whereNull('vendor_id')
                        ->where('is_active', true)
                        ->whereHas('category', function ($categoryQuery) {
                            $categoryQuery->where('is_active', true);
                        })
                        ->where(function ($brandQuery) {
                            $brandQuery->whereNull('brand_id')
                                ->orWhereHas('brand', function ($bq) {
                                    $bq->where('status', 'active');
                                });
                        });
                })
                ->selectRaw('COUNT(*) as total, COALESCE(AVG(rating), 0) as avg_rating')
                ->first();

            $product->setAttribute('system_products_count', (int) $systemProductsCount);
            $product->setAttribute('system_review_count', (int) ($systemReviewStats->total ?? 0));
            $product->setAttribute('system_average_rating', round((float) ($systemReviewStats->avg_rating ?? 0), 2));
        }

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product),
            'message' => __('products.retrieved'),
        ]);
    }

    /**
     * Display featured products.
     */
    public function featured(Request $request): JsonResponse
    {
        $products = Product::with(['vendor', 'category'])
            ->withCount(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }])
            ->withAvg(['reviews' => function ($query) {
                $query->where('is_approved', true);
            }], 'rating')
            ->where('is_active', true)
            ->whereHas('category', function ($categoryQuery) {
                $categoryQuery->where('is_active', true);
            })
            ->where(function ($brandQuery) {
                $brandQuery->whereNull('brand_id')
                    ->orWhereHas('brand', function ($bq) {
                        $bq->where('status', 'active');
                    });
            })
            ->where('is_featured', true)
            ->orderBy('created_at', 'desc')
            ->paginate(min(max((int) $request->get('per_page', 12), 1), 100));

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products->items()),
            'meta' => [
                'total' => $products->total(),
                'per_page' => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
            ],
            'message' => __('products.featured_retrieved'),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => __('vendors.not_found'),
            ], 404);
        }

        $product = Product::where('vendor_id', $vendor->id)
            ->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'short_description' => 'nullable|string|max:500',
            'sku' => 'sometimes|string|unique:products,sku,' . $product->id,
            'price' => 'sometimes|numeric|min:0',
            'compare_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'category_id' => 'sometimes|nullable|exists:categories,id',
            'brand_id' => 'sometimes|nullable|exists:brands,id',
            'min_stock_level' => 'nullable|integer|min:0',
            'track_inventory' => 'boolean',
            'is_featured' => 'boolean',
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
            'variants' => 'nullable|array',
            'variants.*.option' => 'nullable|string|max:255',
            'variants.*.values' => 'nullable|string|max:1000',
            'wholesale_price' => 'nullable|numeric|min:0.01',
            'wholesale_min_qty' => 'nullable|integer|min:1',
        ]);

        $nextPrice = $request->filled('price') ? (float) $request->price : (float) $product->price;
        if ($request->filled('compare_price') && (float) $request->compare_price <= $nextPrice) {
            return response()->json([
                'success' => false,
                'message' => 'Compare-at price must be greater than the sale price.',
                'errors' => [
                    'compare_price' => ['Compare-at price must be greater than the sale price.'],
                ],
            ], 422);
        }

        $normalizedVariants = $this->normalizeVariants($request->variants);
        $normalizedWholesale = $this->normalizeWholesalePayload($request->all());

        $payload = $request->only([
            'name',
            'description',
            'short_description',
            'sku',
            'price',
            'compare_price',
            'cost_price',
            'stock_quantity',
            'category_id',
            'brand_id',
            'min_stock_level',
            'track_inventory',
            'is_featured',
            'product_type',
            'min_order_quantity',
            'max_order_quantity',
            'weight',
            'dimensions',
            'images',
            'tags',
            'meta_title',
            'meta_description',
        ]);

        if (array_key_exists('images', $payload)) {
            $payload['video_url'] = $this->extractVideoUrl($request->images);
            $payload['images'] = $this->normalizeImages($payload['images']);
        }

        $isAlreadyLiveProduct = (bool) $product->is_active
            || (bool) $product->approved_at
            || (string) $product->moderation_status === 'approved';

        $requireProductApproval = (bool) Cache::get('settings.require_product_approval', true);

        if ($isAlreadyLiveProduct && $requireProductApproval) {
            if ($request->has('variants')) {
                $payload['variants'] = $normalizedVariants;
            }
            if (array_key_exists('wholesale_price', $normalizedWholesale) || array_key_exists('wholesale_min_qty', $normalizedWholesale)) {
                $payload['wholesale'] = $normalizedWholesale;
            }

            $product->update([
                'pending_update_payload' => $payload,
                'pending_update_status' => 'pending',
                'pending_update_note' => null,
                'pending_update_submitted_at' => now(),
                'pending_update_reviewed_at' => null,
                'pending_update_reviewed_by' => null,
            ]);
        } else {
            $payload['is_active'] = !$requireProductApproval;
            $payload['moderation_status'] = $requireProductApproval ? 'pending' : 'approved';
            $payload['moderation_note'] = null;
            $payload['approved_at'] = $requireProductApproval ? null : now();
            $payload['approved_by'] = null;
            $payload['reviewed_at'] = $requireProductApproval ? null : now();

            DB::transaction(function () use ($product, $payload, $request, $normalizedVariants, $normalizedWholesale) {
                $product->update($payload);

                if ($request->has('variants')) {
                    $this->syncVariants($product, $normalizedVariants);
                }

                if (array_key_exists('wholesale_price', $normalizedWholesale) || array_key_exists('wholesale_min_qty', $normalizedWholesale)) {
                    $this->syncWholesale($product, $normalizedWholesale);
                }
            });
        }

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->fresh(['category', 'brand', 'vendor', 'variants', 'wholesaleProduct', 'latestReconsideration'])),
            'message' => __('products.updated'),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $vendor = $request->user()->vendor;
        if (!$vendor) {
            return response()->json([
                'success' => false,
                'message' => __('vendors.not_found'),
            ], 404);
        }

        $product = Product::where('vendor_id', $vendor->id)
            ->findOrFail($id);

        $product->update([
            'is_active' => false,
            'moderation_status' => 'rejected',
            'moderation_note' => 'Removed by merchant',
            'reviewed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('products.deleted'),
        ]);
    }

    private function normalizeVariants($variants): array
    {
        if (!is_array($variants)) {
            return [];
        }

        $normalized = [];
        foreach ($variants as $variantData) {
            $option = trim((string) ($variantData['option'] ?? ''));
            $values = trim((string) ($variantData['values'] ?? ''));
            if ($option === '' || $values === '') {
                continue;
            }

            $valuesArray = array_values(array_filter(array_map('trim', explode(',', $values))));
            if (empty($valuesArray)) {
                continue;
            }

            $normalized[] = [
                'option' => $option,
                'values' => implode(', ', $valuesArray),
                'values_array' => $valuesArray,
            ];
        }

        return $normalized;
    }

    private function syncVariants(Product $product, array $variants): void
    {
        $product->variants()->delete();

        foreach ($variants as $index => $variantData) {
            $product->variants()->create([
                'sku' => $this->generateVariantSku($product, (string) ($variantData['option'] ?? ''), (int) $index),
                'name' => $variantData['option'],
                'price' => (float) $product->price,
                'attributes' => [
                    'values' => $variantData['values_array'],
                    'values_text' => $variantData['values'],
                ],
                'position' => $index,
            ]);
        }
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

    private function normalizeWholesalePayload(array $payload): array
    {
        $normalized = [];

        if (array_key_exists('wholesale_price', $payload)) {
            $value = $payload['wholesale_price'];
            $normalized['wholesale_price'] = ($value === null || $value === '') ? null : (float) $value;
        }

        if (array_key_exists('wholesale_min_qty', $payload)) {
            $value = $payload['wholesale_min_qty'];
            $normalized['wholesale_min_qty'] = ($value === null || $value === '') ? null : (int) $value;
        }

        return $normalized;
    }

    private function syncWholesale(Product $product, array $wholesalePayload): void
    {
        if (empty($wholesalePayload)) {
            return;
        }

        $price = $wholesalePayload['wholesale_price'] ?? null;
        $minQty = $wholesalePayload['wholesale_min_qty'] ?? null;

        if ($price === null) {
            $product->wholesaleProduct()->delete();
            return;
        }

        $product->wholesaleProduct()->updateOrCreate(
            ['product_id' => $product->id],
            [
                'wholesale_price' => $price,
                'min_qty' => $minQty ?? 1,
                'status' => 'active',
            ]
        );
    }

    private function normalizeImages($images): ?array
    {
        if (!is_array($images)) {
            return null;
        }

        $videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'mpeg', '3gp'];
        $normalized = [];
        foreach ($images as $image) {
            if (!is_string($image) || trim($image) === '') {
                continue;
            }

            $image = trim($image);

            // Skip video URLs — they go into video_url column
            $ext = strtolower(pathinfo(parse_url($image, PHP_URL_PATH) ?: $image, PATHINFO_EXTENSION));
            if (in_array($ext, $videoExtensions, true) || str_contains($image, 'products/videos/')) {
                continue;
            }

            if (str_starts_with($image, 'data:image/')) {
                $stored = $this->storeBase64Image($image);
                if ($stored !== null) {
                    $normalized[] = $stored;
                }
                continue;
            }

            $normalized[] = $image;
        }

        return $normalized;
    }

    private function extractVideoUrl($images): ?string
    {
        if (!is_array($images)) {
            return null;
        }

        $videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'mpeg', '3gp'];
        foreach ($images as $item) {
            if (!is_string($item) || trim($item) === '') {
                continue;
            }
            $item = trim($item);
            $ext = strtolower(pathinfo(parse_url($item, PHP_URL_PATH) ?: $item, PATHINFO_EXTENSION));
            if (in_array($ext, $videoExtensions, true) || str_contains($item, 'products/videos/')) {
                return $item;
            }
        }

        return null;
    }

    private function storeBase64Image(string $dataUri): ?string
    {
        if (!preg_match('/^data:image\/(\w+);base64,/', $dataUri, $matches)) {
            return null;
        }

        $extension = strtolower($matches[1]);

        $base64Data = substr($dataUri, strpos($dataUri, ',') + 1);
        $binary = base64_decode($base64Data, true);
        if ($binary === false) {
            return null;
        }

        // Try to convert to WebP for better compression
        if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif'], true) && function_exists('imagecreatefromstring')) {
            try {
                $image = imagecreatefromstring($binary);
                if ($image !== false) {
                    $tempPath = tempnam(sys_get_temp_dir(), 'webp');
                    imagepalettetotruecolor($image);
                    imagealphablending($image, true);
                    imagesavealpha($image, true);
                    imagewebp($image, $tempPath, 85);
                    imagedestroy($image);

                    $webpFilename = 'products/' . Str::uuid() . '.webp';
                    Storage::disk('public')->put($webpFilename, file_get_contents($tempPath));
                    @unlink($tempPath);

                    return url(Storage::url($webpFilename));
                }
            } catch (\Throwable) {
                // Fall through to original format
            }
        }

        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        $filename = 'products/' . Str::uuid() . '.' . $extension;
        Storage::disk('public')->put($filename, $binary);

        return url(Storage::url($filename));
    }

}
