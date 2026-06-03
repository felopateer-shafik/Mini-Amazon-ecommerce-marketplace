<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchSuggestionController extends Controller
{
    /**
     * Return lightweight search suggestions (product names, category names, brand names).
     * Designed for instant autocomplete — no pagination, minimal columns.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->get('q', ''));

        if (mb_strlen($q) < 1) {
            return response()->json(['data' => []]);
        }

        $limit = 10;

        // 1. Product name matches (distinct names only)
        $products = Product::where('is_active', true)
            ->whereHas('category', function ($categoryQuery) {
                $categoryQuery->where('is_active', true);
            })
            ->where(function ($brandQuery) {
                $brandQuery->whereNull('brand_id')
                    ->orWhereHas('brand', function ($bq) {
                        $bq->where('status', 'active');
                    });
            })
            ->where(function ($query) use ($q) {
                $query->where('name', 'ILIKE', "%{$q}%")
                      ->orWhere('sku', 'ILIKE', "%{$q}%")
                      ->orWhereRaw("CAST(tags AS TEXT) ILIKE ?", ["%{$q}%"]);
            })
            ->orderByRaw("CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END", [strtolower($q) . '%'])
            ->limit($limit)
            ->get(['name']);

        // 2. Category name matches
        $categories = Category::where('is_active', true)
            ->where(function ($query) use ($q) {
                $query->where('name', 'ILIKE', "%{$q}%")
                      ->orWhere('name_ar', 'ILIKE', "%{$q}%");
            })
            ->orderByRaw("CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END", [strtolower($q) . '%'])
            ->limit(5)
            ->get(['name', 'slug']);

        // 3. Brand name matches
        $brands = Brand::where('status', 'active')
            ->where('name', 'ILIKE', "%{$q}%")
            ->orderByRaw("CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END", [strtolower($q) . '%'])
            ->limit(5)
            ->get(['name', 'slug']);

        // Merge into a flat, deduplicated suggestion list
        $seen = [];
        $suggestions = [];

        foreach ($categories as $cat) {
            $lower = mb_strtolower($cat->name);
            if (!isset($seen[$lower])) {
                $seen[$lower] = true;
                $suggestions[] = [
                    'text' => $cat->name,
                    'type' => 'category',
                    'slug' => $cat->slug,
                ];
            }
        }

        foreach ($brands as $brand) {
            $lower = mb_strtolower($brand->name);
            if (!isset($seen[$lower])) {
                $seen[$lower] = true;
                $suggestions[] = [
                    'text' => $brand->name,
                    'type' => 'brand',
                    'slug' => $brand->slug,
                ];
            }
        }

        foreach ($products as $product) {
            $lower = mb_strtolower($product->name);
            if (!isset($seen[$lower])) {
                $seen[$lower] = true;
                $suggestions[] = [
                    'text' => $product->name,
                    'type' => 'product',
                ];
            }
            if (count($suggestions) >= $limit) break;
        }

        return response()->json(['data' => array_slice($suggestions, 0, $limit)]);
    }
}
