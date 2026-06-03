<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\UserNotification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AffiliateApplicationController extends Controller
{
    /**
     * Apply to become an affiliate.
     */
    public function apply(Request $request): JsonResponse
    {
        $affiliateEnabled = (bool) Cache::get('settings.affiliate_enabled', true);
        if (!$affiliateEnabled) {
            return response()->json([
                'success' => false,
                'message' => __('messages.affiliate_program_disabled'),
            ], 403);
        }

        $user = $request->user();

        // Check if user already has an affiliate application
        $existing = Affiliate::where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => __('messages.affiliate_already_applied'),
                'data' => [
                    'status' => $existing->status,
                    'affiliate' => $existing,
                ],
            ], 422);
        }

        $data = $request->validate([
            'website' => 'nullable|url|max:500',
            'social_media' => 'nullable|string|max:500',
            'reason' => 'nullable|string|max:2000',
        ]);

        $defaultCommission = (float) Cache::get('settings.default_affiliate_commission', 10);

        $affiliate = Affiliate::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'code' => strtoupper(Str::random(8)),
            'commission_rate' => $defaultCommission,
            'status' => 'pending',
            'referrals' => 0,
            'earnings' => 0,
            'joined_at' => now(),
        ]);

        // Notify admin(s) about new affiliate application
        $adminIds = User::query()->role('admin')->pluck('id');
        foreach ($adminIds as $adminId) {
            UserNotification::create([
                'user_id' => (int) $adminId,
                'type' => 'affiliate',
                'title' => 'New Affiliate Application',
                'message' => "New affiliate application from {$user->name}",
                'link' => '/admin/affiliates',
                'meta' => ['affiliate_id' => $affiliate->id, 'user_id' => $user->id],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $affiliate,
            'message' => __('messages.affiliate_application_submitted'),
        ], 201);
    }

    /**
     * Check affiliate application status for the current user.
     */
    public function status(Request $request): JsonResponse
    {
        $affiliate = Affiliate::where('user_id', $request->user()->id)->first();

        if (!$affiliate) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'No affiliate application found.',
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $affiliate,
        ]);
    }
}
