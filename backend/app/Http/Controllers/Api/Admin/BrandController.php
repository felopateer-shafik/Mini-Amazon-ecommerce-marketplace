<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    private function normalizeBrandLogoUrl(?string $logo): ?string
    {
        if (!$logo || trim($logo) === '') {
            return null;
        }

        $value = trim($logo);
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://') || str_starts_with($value, 'data:image/')) {
            return $value;
        }

        if (str_starts_with($value, '/')) {
            return url($value);
        }

        return url('/' . ltrim($value, '/'));
    }

    private function normalizeBrandForResponse(Brand $brand): Brand
    {
        $brand->setAttribute('logo', $this->normalizeBrandLogoUrl($brand->logo));

        return $brand;
    }

    private function notifyAdminsForEmptyBrand(Brand $brand): void
    {
        if ((string) ($brand->status ?? '') !== 'active') {
            return;
        }

        if ((int) ($brand->products_count ?? 0) > 0) {
            return;
        }

        $cacheKey = 'alerts.brand.empty.' . (int) $brand->id;
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
                'title' => 'Brand inventory alert',
                'message' => 'Brand "' . $brand->name . '" has 0 active products.',
                'link' => '/admin/brands',
                'meta' => [
                    'entity' => 'brand',
                    'brand_id' => (int) $brand->id,
                ],
            ]);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));

        $query = Brand::query()
            ->withCount(['products' => function ($q) {
                $q->where('is_active', true);
            }])
            ->latest();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")
                    ->orWhere('website', 'like', "%{$search}%");
            });
        }

        $brands = $query->paginate(min(max((int) $request->get('per_page', 12), 1), 100));
        $brands->getCollection()->transform(function (Brand $brand) {
            $brand->setAttribute(
                'empty_products_alert',
                (string) ($brand->status ?? '') === 'active' && (int) ($brand->products_count ?? 0) === 0,
            );
            $this->notifyAdminsForEmptyBrand($brand);

            return $this->normalizeBrandForResponse($brand);
        });

        return response()->json([
            'success' => true,
            'data' => $brands->items(),
            'meta' => [
                'total' => $brands->total(),
                'per_page' => $brands->perPage(),
                'current_page' => $brands->currentPage(),
                'last_page' => $brands->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:brands,slug',
            'website' => 'nullable|string|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:2048',
            'status' => 'nullable|in:active,inactive,pending',
        ]);

        $slug = trim((string) ($data['slug'] ?? ''));
        if ($slug === '') {
            $slug = Str::slug($data['name']);
        }

        $logoPath = null;
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('brands', 'public');
            $logoPath = '/storage/' . $logoPath;
        }

        $brand = Brand::create([
            'name' => $data['name'],
            'slug' => $slug,
            'website' => $data['website'] ?? null,
            'logo' => $logoPath,
            'products_count' => 0,
            'status' => $data['status'] ?? 'active',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->normalizeBrandForResponse($brand),
            'message' => __('messages.brand_created'),
        ], 201);
    }

    public function update(Request $request, Brand $brand): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'nullable|string|max:255|unique:brands,slug,' . $brand->id,
            'website' => 'nullable|string|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp,svg|max:2048',
            'remove_logo' => 'nullable|boolean',
            'status' => 'sometimes|in:active,inactive,pending',
        ]);

        $logoPath = $brand->logo;
        if ($request->hasFile('logo')) {
            // Delete old logo if it was stored locally
            if ($brand->logo && str_starts_with($brand->logo, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $brand->logo));
            }
            $logoPath = '/storage/' . $request->file('logo')->store('brands', 'public');
        } elseif ($request->boolean('remove_logo')) {
            if ($brand->logo && str_starts_with($brand->logo, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $brand->logo));
            }
            $logoPath = null;
        }

        $brand->update([
            'name' => $data['name'] ?? $brand->name,
            'slug' => array_key_exists('slug', $data)
                ? (trim((string) $data['slug']) !== '' ? trim((string) $data['slug']) : Str::slug($data['name'] ?? $brand->name))
                : $brand->slug,
            'website' => array_key_exists('website', $data) ? $data['website'] : $brand->website,
            'logo' => $logoPath,
            'status' => $data['status'] ?? $brand->status,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->normalizeBrandForResponse($brand->fresh()),
            'message' => __('messages.brand_updated'),
        ]);
    }

    public function destroy(Brand $brand): JsonResponse
    {
        $brand->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.brand_deleted'),
        ]);
    }
}
