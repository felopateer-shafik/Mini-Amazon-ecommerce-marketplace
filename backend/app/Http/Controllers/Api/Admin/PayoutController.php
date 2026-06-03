<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use App\Models\VendorPayoutRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayoutController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $query = VendorPayoutRequest::with(['vendor:id,store_name,business_name,user_id'])
            ->latest();

        if ($status) {
            $query->where('status', $status);
        }

        $requests = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }

    public function show(VendorPayoutRequest $payoutRequest): JsonResponse
    {
        $payoutRequest->load(['vendor:id,store_name,business_name,user_id,bank_name,bank_account,iban']);

        return response()->json([
            'success' => true,
            'data'    => $payoutRequest,
        ]);
    }

    public function approve(Request $request, VendorPayoutRequest $payoutRequest): JsonResponse
    {
        if ($payoutRequest->status !== VendorPayoutRequest::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending requests can be approved.',
            ], 422);
        }

        $validated = $request->validate([
            'admin_note' => 'nullable|string|max:1000',
        ]);

        $payoutRequest->update([
            'status'       => VendorPayoutRequest::STATUS_APPROVED,
            'admin_note'   => $validated['admin_note'] ?? null,
            'processed_at' => now(),
        ]);

        // Notify vendor
        $userId = $payoutRequest->vendor?->user_id;
        if ($userId) {
            UserNotification::create([
                'user_id' => $userId,
                'type'    => 'payout',
                'title'   => 'Payout Request Approved',
                'message' => 'Your payout request of ' . number_format((float) $payoutRequest->amount, 2) . ' has been approved.',
                'link'    => '/merchant/earnings',
                'meta'    => ['payout_request_id' => $payoutRequest->id],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $payoutRequest->fresh(),
            'message' => 'Payout request approved.',
        ]);
    }

    public function reject(Request $request, VendorPayoutRequest $payoutRequest): JsonResponse
    {
        if ($payoutRequest->status !== VendorPayoutRequest::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending requests can be rejected.',
            ], 422);
        }

        $validated = $request->validate([
            'admin_note' => 'nullable|string|max:1000',
        ]);

        $payoutRequest->update([
            'status'       => VendorPayoutRequest::STATUS_REJECTED,
            'admin_note'   => $validated['admin_note'] ?? null,
            'processed_at' => now(),
        ]);

        // Notify vendor
        $userId = $payoutRequest->vendor?->user_id;
        if ($userId) {
            UserNotification::create([
                'user_id' => $userId,
                'type'    => 'payout',
                'title'   => 'Payout Request Rejected',
                'message' => 'Your payout request of ' . number_format((float) $payoutRequest->amount, 2) . ' has been rejected.' .
                    ($validated['admin_note'] ? ' Note: ' . $validated['admin_note'] : ''),
                'link'    => '/merchant/earnings',
                'meta'    => ['payout_request_id' => $payoutRequest->id],
            ]);
        }

        return response()->json([
            'success' => true,
            'data'    => $payoutRequest->fresh(),
            'message' => 'Payout request rejected.',
        ]);
    }
}
