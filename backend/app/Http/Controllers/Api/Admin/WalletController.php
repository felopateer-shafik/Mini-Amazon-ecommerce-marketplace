<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $query = User::query()
            ->with(['wallet', 'roles'])
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['customer', 'merchant', 'wholesale']);
            });

        $search = trim((string) $request->get('search', ''));

        $users = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (User $user) use ($search) {
                    return SensitiveData::contains($user->name, $search)
                        || SensitiveData::contains($user->email, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        $data = collect($users->items())->map(function (User $user) {
            $wallet = $user->wallet;
            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => optional($user->roles->first())->name,
                'wallet_id' => $wallet?->id,
                'balance' => (float) ($wallet?->balance ?? 0),
                'total_earned' => (float) ($wallet?->total_earned ?? 0),
                'total_spent' => (float) ($wallet?->total_spent ?? 0),
                'currency' => $wallet?->currency ?? config('app.currency', 'EGP'),
                'is_active' => (bool) ($wallet?->is_active ?? true),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);
        $query = WalletTransaction::query()->with(['wallet.user'])->latest();

        $userId = (int) $request->get('user_id', 0);
        if ($userId > 0) {
            $query->whereHas('wallet', fn ($q) => $q->where('user_id', $userId));
        }

        $search = trim((string) $request->get('search', ''));
        $transactions = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (WalletTransaction $transaction) use ($search) {
                    return SensitiveData::contains($transaction->wallet?->user?->name, $search)
                        || SensitiveData::contains($transaction->wallet?->user?->email, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        $data = collect($transactions->items())->map(function (WalletTransaction $transaction) {
            return [
                'id' => $transaction->id,
                'wallet_id' => $transaction->wallet_id,
                'user_id' => $transaction->wallet?->user_id,
                'user_name' => $transaction->wallet?->user?->name,
                'type' => $transaction->type,
                'amount' => (float) $transaction->amount,
                'balance_after' => (float) $transaction->balance_after,
                'description' => $transaction->description,
                'reference' => $transaction->reference,
                'created_at' => $transaction->created_at,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'total' => $transactions->total(),
                'per_page' => $transactions->perPage(),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
            ],
        ]);
    }

    public function topUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:500',
        ]);

        $user = User::findOrFail((int) $validated['user_id']);
        $amount = (float) $validated['amount'];

        $wallet = DB::transaction(function () use ($user, $amount, $validated, $request) {
            $wallet = $user->wallet;
            if (!$wallet) {
                $wallet = $user->wallet()->create([
                    'currency' => config('app.currency', 'EGP'),
                    'is_active' => true,
                ]);
            }

            $wallet->increment('balance', $amount);
            $wallet->increment('total_earned', $amount);
            $wallet->refresh();

            $wallet->transactions()->create([
                'type' => 'admin_top_up',
                'amount' => $amount,
                'balance_after' => $wallet->balance,
                'description' => $validated['description'] ?? 'Admin wallet top-up',
                'reference' => 'admin:' . ($request->user()?->id ?? 'system'),
            ]);

            return $wallet;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'balance' => (float) $wallet->balance,
                'total_earned' => (float) $wallet->total_earned,
                'total_spent' => (float) $wallet->total_spent,
                'currency' => $wallet->currency,
            ],
            'message' => __('messages.success'),
        ]);
    }
}
