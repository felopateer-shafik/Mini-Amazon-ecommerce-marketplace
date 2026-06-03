<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\OrderService;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    private function applySystemAdminOrderVisibility(Request $request, $query): void
    {
        $actor = $request->user();
        if (!$actor || $actor->isSystemAdminAccount()) {
            return;
        }

        $systemAdminId = User::resolveSystemAdminId();
        if (!$systemAdminId) {
            return;
        }

        $query->whereDoesntHave('items.product', function ($pq) use ($systemAdminId) {
            $pq->whereNull('vendor_id')
                ->where('approved_by', $systemAdminId);
        });
    }

    private function canAccessOrderForActor(Request $request, Order $order): bool
    {
        $actor = $request->user();
        if (!$actor || $actor->isSystemAdminAccount()) {
            return true;
        }

        $systemAdminId = User::resolveSystemAdminId();
        if (!$systemAdminId) {
            return true;
        }

        return !$order->items()->whereHas('product', function ($pq) use ($systemAdminId) {
            $pq->whereNull('vendor_id')
                ->where('approved_by', $systemAdminId);
        })->exists();
    }

    /**
     * Display all orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with('user', 'items.product', 'items.variant', 'payment')
            ->withCount('items');

        $search = trim((string) $request->get('search', ''));

        $status = trim((string) $request->get('status', ''));
        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($request->boolean('system_only')) {
            $query->whereHas('items.product', function ($pq) {
                $pq->whereNull('vendor_id');
            });
        }

        $this->applySystemAdminOrderVisibility($request, $query);

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $orders = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (Order $order) use ($search) {
                    return SensitiveData::contains($order->order_number, $search)
                        || SensitiveData::contains($order->user?->name, $search)
                        || SensitiveData::contains($order->user?->email, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => OrderResource::collection($orders),
            'meta' => [
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
            ],
        ]);
    }

    /**
     * Display order details
     */
    public function show(Request $request, Order $order): JsonResponse
    {
        if (!$this->canAccessOrderForActor($request, $order)) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        $order->load('user', 'items.product', 'items.variant', 'payment', 'shipments')
            ->loadCount('items');

        return response()->json([
            'success' => true,
            'data' => new OrderResource($order),
        ]);
    }

    /**
     * Update order status
     */
    public function update(Request $request, Order $order): JsonResponse
    {
        if (!$this->canAccessOrderForActor($request, $order)) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found.',
            ], 404);
        }

        $validated = $request->validate([
            'status' => 'sometimes|string|in:pending,confirmed,processing,shipped,delivered,cancelled,refunded',
            'payment_status' => 'sometimes|string|in:pending,processing,completed,failed,cancelled,refunded',
        ]);

        if (array_key_exists('status', $validated)) {
            app(OrderService::class)->updateOrderStatus($order, $validated['status']);
        }

        if (array_key_exists('payment_status', $validated)) {
            $payment = $order->payment;

            if (!$payment) {
                $payment = Payment::create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'payment_method' => 'manual',
                    'amount' => $order->total,
                    'currency' => $order->currency ?? (string) config('app.currency', 'EGP'),
                    'status' => $validated['payment_status'],
                    'paid_at' => $validated['payment_status'] === 'completed' ? now() : null,
                ]);
            } else {
                $payment->update([
                    'status' => $validated['payment_status'],
                    'paid_at' => $validated['payment_status'] === 'completed' ? ($payment->paid_at ?: now()) : null,
                ]);
            }
        }

        $order->loadMissing('payment');
        $order->loadCount('items');

        return response()->json([
            'success' => true,
            'data' => new OrderResource($order->fresh(['user', 'items.product', 'items.variant', 'payment'])->loadCount('items')),
            'message' => __('orders.updated'),
        ]);
    }
}
