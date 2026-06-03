<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Refund;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RefundController extends Controller
{
    private function ensureOrderPaymentCompleted(Refund $refund): void
    {
        $paymentStatus = (string) ($refund->order?->payment?->status ?? '');
        if ($paymentStatus !== 'completed') {
            throw ValidationException::withMessages([
                'payment_status' => 'Refund can only be approved when payment is completed.',
            ]);
        }
    }

    private function markOrderAsRefunded(Refund $refund): void
    {
        if (!$refund->order_id) {
            return;
        }

        $order = $refund->order()->lockForUpdate()->first();
        if (!$order) {
            return;
        }

        if ($order->status !== 'refunded') {
            $order->update(['status' => 'refunded']);
        }
    }

    private function refundAmount(Refund $refund): float
    {
        return (float) ($refund->refund_amount ?? 0);
    }

    private function applyWalletRefundDelta(Refund $refund, float $delta, ?string $description = null): void
    {
        if (!$refund->user || abs($delta) < 0.00001) {
            return;
        }

        $wallet = $refund->user->wallet;
        if (!$wallet) {
            $wallet = $refund->user->wallet()->create([
                'currency' => $refund->currency ?: config('app.currency', 'EGP'),
                'is_active' => true,
            ]);
        }

        if ($delta > 0) {
            $wallet->increment('balance', $delta);
            $wallet->increment('total_earned', $delta);
            $type = 'refund';
        } else {
            $debit = abs($delta);
            $wallet->decrement('balance', $debit);
            $type = 'refund_reversal';
        }

        $wallet->refresh();

        $wallet->transactions()->create([
            'type' => $type,
            'amount' => abs($delta),
            'balance_after' => $wallet->balance,
            'description' => $description ?: ('Refund status adjustment for #' . $refund->id),
            'reference' => 'refund:' . $refund->id,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Refund::with(['user', 'order']);
        $baseStatsQuery = Refund::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $stats = $baseStatsQuery
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count")
            ->selectRaw("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count")
            ->selectRaw("SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count")
            ->first();

        $refunds = $query->latest()->paginate(min(max((int) $request->get('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $refunds->items(),
            'meta' => [
                'total' => $refunds->total(),
                'per_page' => $refunds->perPage(),
                'current_page' => $refunds->currentPage(),
                'last_page' => $refunds->lastPage(),
                'pending_count' => (int) ($stats->pending_count ?? 0),
                'approved_count' => (int) ($stats->approved_count ?? 0),
                'rejected_count' => (int) ($stats->rejected_count ?? 0),
            ],
        ]);
    }

    public function show(Refund $refund): JsonResponse
    {
        $refund->load(['user', 'order', 'order.items.product']);

        return response()->json([
            'success' => true,
            'data' => $refund,
        ]);
    }

    public function approve(Request $request, Refund $refund): JsonResponse
    {
        $refund->loadMissing('order.payment');
        $this->ensureOrderPaymentCompleted($refund);

        $validated = $request->validate([
            'admin_notes' => 'required|string|min:3|max:2000',
        ]);

        if (in_array($refund->status, ['approved', 'rejected'], true) || $refund->processed_at) {
            return response()->json([
                'success' => false,
                'message' => __('refunds.already_processed'),
            ], 422);
        }

        DB::transaction(function () use ($refund, $validated): void {
            $refund->update([
                'status' => 'approved',
                'admin_notes' => trim((string) $validated['admin_notes']),
                'processed_at' => now(),
            ]);

            $this->applyWalletRefundDelta(
                $refund,
                $this->refundAmount($refund),
                'Refund approved for order ' . ($refund->order?->order_number ?? $refund->order_id)
            );

            $this->markOrderAsRefunded($refund);
        });

        return response()->json([
            'success' => true,
            'data' => $refund->fresh(),
            'message' => __('refunds.approved'),
        ]);
    }

    public function reject(Request $request, Refund $refund): JsonResponse
    {
        $validated = $request->validate([
            'admin_notes' => 'required|string|min:3|max:2000',
        ]);

        if (in_array($refund->status, ['approved', 'rejected'], true) || $refund->processed_at) {
            return response()->json([
                'success' => false,
                'message' => __('refunds.already_processed'),
            ], 422);
        }

        $refund->update([
            'status' => 'rejected',
            'admin_notes' => trim((string) $validated['admin_notes']),
            'processed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $refund->fresh(),
            'message' => __('refunds.rejected'),
        ]);
    }

    public function updateStatus(Request $request, Refund $refund): JsonResponse
    {
        $refund->loadMissing('order.payment');

        if (in_array($refund->status, ['approved', 'rejected'], true) || $refund->processed_at) {
            return response()->json([
                'success' => false,
                'message' => __('refunds.already_processed'),
            ], 422);
        }

        $validated = $request->validate([
            'status' => 'required|string|in:pending,approved,rejected',
            'admin_notes' => 'nullable|string|max:2000',
        ]);

        if (in_array((string) $validated['status'], ['approved', 'rejected'], true)) {
            $request->validate([
                'admin_notes' => 'required|string|min:3|max:2000',
            ]);
        }

        $currentStatus = (string) $refund->status;
        $targetStatus = (string) $validated['status'];

        if ($currentStatus === $targetStatus) {
            if (array_key_exists('admin_notes', $validated)) {
                $refund->update(['admin_notes' => $validated['admin_notes'] ?? '']);
            }

            return response()->json([
                'success' => true,
                'data' => $refund->fresh(),
                'message' => __('messages.success'),
            ]);
        }

        DB::transaction(function () use ($refund, $validated, $currentStatus, $targetStatus): void {
            $amount = $this->refundAmount($refund);

            if ($currentStatus !== 'approved' && $targetStatus === 'approved') {
                $this->ensureOrderPaymentCompleted($refund);
                $this->applyWalletRefundDelta($refund, $amount);
                $this->markOrderAsRefunded($refund);
            }

            if ($currentStatus === 'approved' && $targetStatus !== 'approved') {
                $this->applyWalletRefundDelta($refund, -$amount);
            }

            $refund->update([
                'status' => $targetStatus,
                'admin_notes' => isset($validated['admin_notes']) ? trim((string) $validated['admin_notes']) : ($refund->admin_notes ?? ''),
                'processed_at' => $targetStatus === 'pending' ? null : now(),
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => $refund->fresh(),
            'message' => __('messages.success'),
        ]);
    }
}
