<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WalletResource;
use App\Http\Resources\LoyaltyPointResource;
use App\Models\Coupon;
use App\Models\LoyaltyPoint;
use App\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WalletController extends Controller
{
    /**
     * Get user wallet
     */
    public function show(Request $request): JsonResponse
    {
        $wallet = $request->user()->wallet;
        $pendingBalance = (float) Refund::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'requested'])
            ->sum('refund_amount');

        $cashbackEarned = (float) ($wallet?->total_earned ?? 0);

        if ($wallet) {
            $walletData = (new WalletResource($wallet))->resolve();
            $walletData['pending_balance'] = $pendingBalance;
            $walletData['cashback_earned'] = $cashbackEarned;
        } else {
            $walletData = [
                'balance' => 0,
                'total_earned' => 0,
                'total_spent' => 0,
                'pending_balance' => $pendingBalance,
                'cashback_earned' => $cashbackEarned,
                'currency' => config('app.currency', 'EGP'),
                'is_active' => true,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $walletData,
            'settings' => [
                'wallet_topup_enabled' => (bool) Cache::get('settings.wallet_topup_enabled', false),
            ],
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Get loyalty points
     */
    public function points(Request $request): JsonResponse
    {
        $points = $request->user()->loyaltyPoints()
            ->orderBy('created_at', 'desc')
            ->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        $totalEarned = $request->user()->loyaltyPoints()
            ->where('type', 'earned')
            ->sum('points');

        $totalRedeemed = $request->user()->loyaltyPoints()
            ->where('type', 'redeemed')
            ->sum('points');

        return response()->json([
            'success' => true,
            'data' => LoyaltyPointResource::collection($points),
            'meta' => [
                'total_earned' => (int) $totalEarned,
                'total_redeemed' => (int) $totalRedeemed,
                'balance' => (int) ($totalEarned - $totalRedeemed),
                'total' => $points->total(),
                'per_page' => $points->perPage(),
                'current_page' => $points->currentPage(),
                'last_page' => $points->lastPage(),
            ],
        ]);
    }

    /**
     * Redeem points into a one-time coupon.
     */
    public function redeem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'reward_id' => 'required|integer|min:1',
        ]);

        $rewardItems = Cache::get('settings.reward_items', []);
        if (!is_array($rewardItems) || $rewardItems === []) {
            return response()->json([
                'success' => false,
                'message' => 'No redeemable rewards are configured.',
            ], 422);
        }

        $reward = collect($rewardItems)->first(function ($item) use ($data) {
            return (int) ($item['id'] ?? 0) === (int) $data['reward_id'];
        });

        if (!$reward) {
            return response()->json([
                'success' => false,
                'message' => 'Reward item not found.',
            ], 404);
        }

        $rewardType = strtolower((string) ($reward['type'] ?? ''));
        if ($rewardType !== 'coupon') {
            return response()->json([
                'success' => false,
                'message' => 'Only coupon rewards are redeemable at checkout.',
            ], 422);
        }

        $pointsCost = (int) ($reward['points'] ?? 0);
        if ($pointsCost <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'This reward has an invalid points value.',
            ], 422);
        }

        $discountAmount = $this->resolveCouponDiscountAmount($reward);
        if ($discountAmount <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'This coupon reward has an invalid discount amount.',
            ], 422);
        }

        $user = $request->user();

        $result = DB::transaction(function () use ($user, $pointsCost, $discountAmount, $reward) {
            $totalEarned = (int) $user->loyaltyPoints()
                ->where('type', 'earned')
                ->sum('points');
            $totalRedeemed = (int) $user->loyaltyPoints()
                ->where('type', 'redeemed')
                ->sum('points');
            $balance = $totalEarned - $totalRedeemed;

            if ($balance < $pointsCost) {
                return null;
            }

            $coupon = Coupon::create([
                'code' => $this->generatePointsCouponCode(),
                'type' => 'fixed',
                'value' => $discountAmount,
                'min_order_amount' => 0,
                'max_discount' => null,
                'usage_limit' => 1,
                'usage_count' => 0,
                'starts_at' => now(),
                'expires_at' => now()->addDays(30),
                'is_active' => true,
                'description' => 'Loyalty points redemption coupon',
            ]);

            LoyaltyPoint::create([
                'user_id' => $user->id,
                'type' => 'redeemed',
                'points' => $pointsCost,
                'description' => sprintf('Redeemed %d points for coupon %s', $pointsCost, $coupon->code),
                'metadata' => [
                    'reward_id' => (int) ($reward['id'] ?? 0),
                    'reward_name' => (string) ($reward['name'] ?? ''),
                    'coupon_id' => (int) $coupon->id,
                    'coupon_code' => (string) $coupon->code,
                    'coupon_value' => (float) $coupon->value,
                ],
            ]);

            return $coupon;
        });

        if (!$result) {
            return response()->json([
                'success' => false,
                'message' => 'Not enough points to redeem this reward.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'coupon_code' => $result->code,
                'coupon_type' => $result->type,
                'coupon_value' => (float) $result->value,
                'expires_at' => $result->expires_at,
            ],
            'message' => 'Coupon generated successfully.',
        ], 201);
    }

    private function resolveCouponDiscountAmount(array $reward): float
    {
        $configured = (float) ($reward['discount_amount'] ?? $reward['value'] ?? 0);
        if ($configured > 0) {
            return round($configured, 2);
        }

        $name = (string) ($reward['name'] ?? '');
        if (preg_match('/(\d+(?:\.\d+)?)/', $name, $matches) === 1) {
            return round((float) $matches[1], 2);
        }

        return 0;
    }

    private function generatePointsCouponCode(): string
    {
        do {
            $code = 'PTS' . strtoupper(Str::random(8));
        } while (Coupon::query()->where('code', $code)->exists());

        return $code;
    }

    /**
     * Top up wallet
     */
    public function topUp(Request $request): JsonResponse
    {
        $topUpEnabled = (bool) Cache::get('settings.wallet_topup_enabled', false);
        if (!$topUpEnabled) {
            return response()->json([
                'success' => false,
                'message' => __('messages.wallet_topup_disabled'),
            ], 403);
        }

        return response()->json([
            'success' => false,
            'message' => __('messages.feature_not_available'),
            'errors' => [
                'wallet_top_up' => ['Wallet top-up requires verified gateway callback integration.'],
            ],
        ], 422);

        // Intentionally disabled until gateway webhooks and reconciliation are in place.
    }

    /**
     * Get wallet transactions
     */
    public function transactions(Request $request): JsonResponse
    {
        $wallet = $request->user()->wallet;
        if (!$wallet) {
            return response()->json([
                'success' => true,
                'data' => [],
                'meta' => ['total' => 0, 'per_page' => 15, 'current_page' => 1, 'last_page' => 1],
            ]);
        }

        $transactions = \App\Models\WalletTransaction::where('wallet_id', $wallet->id)
            ->latest()
            ->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $transactions->items(),
            'meta' => [
                'total' => $transactions->total(),
                'per_page' => $transactions->perPage(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
            ],
        ]);
    }
}
