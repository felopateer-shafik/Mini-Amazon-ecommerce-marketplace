<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AffiliateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));

        $query = Affiliate::query()->latest();

        $stats = (clone $query)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(referrals), 0) as total_referrals')
            ->selectRaw('COALESCE(SUM(earnings), 0) as total_earnings')
            ->selectRaw('COALESCE(AVG(commission_rate), 0) as avg_commission')
            ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count")
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw("SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended_count")
            ->first();

        $perPage = min(max((int) $request->get('per_page', 10), 1), 100);
        $affiliates = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (Affiliate $affiliate) use ($search) {
                    return SensitiveData::contains($affiliate->name, $search)
                        || SensitiveData::contains($affiliate->email, $search)
                        || SensitiveData::contains($affiliate->code, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $affiliates->items(),
            'meta' => [
                'total' => $affiliates->total(),
                'per_page' => $affiliates->perPage(),
                'current_page' => $affiliates->currentPage(),
                'last_page' => $affiliates->lastPage(),
                'total_referrals' => (int) ($stats->total_referrals ?? 0),
                'total_earnings' => (float) ($stats->total_earnings ?? 0),
                'avg_commission' => round((float) ($stats->avg_commission ?? 0), 2),
                'active_count' => (int) ($stats->active_count ?? 0),
                'pending_count' => (int) ($stats->pending_count ?? 0),
                'suspended_count' => (int) ($stats->suspended_count ?? 0),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'code' => 'required|string|max:50|unique:affiliates,code',
            'commissionRate' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:active,pending,suspended',
        ]);

        $affiliate = Affiliate::create([
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'code' => $data['code'],
            'commission_rate' => $data['commissionRate'] ?? 10,
            'status' => $data['status'] ?? 'pending',
            'joined_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $affiliate,
            'message' => __('messages.affiliate_created'),
        ], 201);
    }

    public function update(Request $request, Affiliate $affiliate): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email|max:255',
            'code' => 'sometimes|string|max:50|unique:affiliates,code,' . $affiliate->id,
            'referrals' => 'sometimes|integer|min:0',
            'earnings' => 'sometimes|numeric|min:0',
            'commissionRate' => 'sometimes|numeric|min:0|max:100',
            'status' => 'sometimes|in:active,pending,suspended',
        ]);

        $affiliate->update([
            'name' => $data['name'] ?? $affiliate->name,
            'email' => array_key_exists('email', $data) ? $data['email'] : $affiliate->email,
            'code' => $data['code'] ?? $affiliate->code,
            'referrals' => $data['referrals'] ?? $affiliate->referrals,
            'earnings' => $data['earnings'] ?? $affiliate->earnings,
            'commission_rate' => $data['commissionRate'] ?? $affiliate->commission_rate,
            'status' => $data['status'] ?? $affiliate->status,
        ]);

        return response()->json([
            'success' => true,
            'data' => $affiliate->fresh(),
            'message' => __('messages.affiliate_updated'),
        ]);
    }

    public function destroy(Affiliate $affiliate): JsonResponse
    {
        $affiliate->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.affiliate_deleted'),
        ]);
    }
}
