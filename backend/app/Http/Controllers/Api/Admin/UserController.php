<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    private function actorIsSystemAdmin(): bool
    {
        $actor = auth()->user();

        return $actor instanceof User && $actor->isSystemAdminAccount();
    }

    private function isProtectedSystemAdmin(User $user): bool
    {
        return $user->isSystemAdminAccount();
    }

    private function cannotManageProtectedAdmin(User $target): bool
    {
        return $this->isProtectedSystemAdmin($target)
            && (int) auth()->id() !== (int) $target->id;
    }

    private function ensureSystemAdminCanManage(User $target, bool $allowSelfEdit = false): ?JsonResponse
    {
        $actor = auth()->user();
        if (!$actor instanceof User) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized.',
            ], 403);
        }

        if (!$allowSelfEdit && (int) $target->id === (int) $actor->id) {
            return response()->json([
                'success' => false,
                'message' => __('messages.cannot_delete_own_account'),
            ], 403);
        }

        // Protect the system admin account from modification by non-system-admins
        if ($this->isProtectedSystemAdmin($target) && !$actor->isSystemAdminAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'System admin account cannot be modified by other admins or staff.',
            ], 403);
        }

        return null;
    }

    /**
     * Display a listing of users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->with('roles');

        $search = trim((string) $request->get('search', ''));

        $role = trim((string) $request->get('role', ''));
        if ($role !== '') {
            if ($role === 'merchant') {
                // Filter by vendor relationship so all sellers appear regardless of Spatie role
                $query->whereHas('vendor');
            } else {
                try {
                    $query->role($role);
                } catch (\Spatie\Permission\Exceptions\RoleDoesNotExist $e) {
                    // Role doesn't exist — return empty result set
                    $query->whereRaw('1 = 0');
                }
            }
        }

        $status = trim((string) $request->get('status', ''));
        if ($status !== '') {
            if ($status === 'banned') {
                $query->where('is_banned', true);
            } elseif ($status === 'active') {
                $query->where('is_banned', false)
                    ->whereNotNull('email_verified_at');
            } elseif ($status === 'inactive') {
                $query->where('is_banned', false)
                    ->whereNull('email_verified_at');
            }
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $users = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (User $user) use ($search) {
                    return SensitiveData::contains($user->name, $search)
                        || SensitiveData::contains($user->email, $search)
                        || SensitiveData::contains($user->phone, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
            'meta' => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request): JsonResponse
    {
        // Prevent privilege escalation: only system admin can assign the "admin" role
        $requestedRole = trim((string) $request->input('role', ''));
        if ($requestedRole === 'admin') {
            if (!$this->actorIsSystemAdmin()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Only System Admin can assign the admin role.',
                ], 403);
            }
        }

        $allRoleNames = \Spatie\Permission\Models\Role::pluck('name')->implode(',');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                function ($attribute, $value, $fail) {
                    if (User::query()->where('email_hash', User::emailHashFor((string) $value))->exists()) {
                        $fail('The email has already been taken.');
                    }
                },
            ],
            'password' => 'required|string|min:8',
            'role' => 'sometimes|string|in:' . $allRoleNames,
            'phone' => [
                'nullable',
                'string',
                'max:20',
                function ($attribute, $value, $fail) {
                    if ($value && User::query()->where('phone_hash', User::phoneHashFor((string) $value))->exists()) {
                        $fail('this number is already used for another account');
                    }
                },
            ],
        ], [
            'phone.unique' => 'this number is already used for another account',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
        ]);

        if (isset($validated['role'])) {
            $user->assignRole($validated['role']);
        } else {
            $user->assignRole('customer');
        }

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->load('roles')),
            'message' => __('messages.success'),
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user): JsonResponse
    {
        $user->load('roles', 'wallet');

        $orders = $user->orders()
            ->latest()
            ->paginate(min(max((int) request()->integer('per_page', 15), 1), 100));

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'orders' => $orders->items(),
            ],
            'meta' => [
                'orders' => [
                    'total' => $orders->total(),
                    'per_page' => $orders->perPage(),
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                ],
            ],
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($user, true);
        if ($guard) {
            return $guard;
        }

        $allRoleNames = \Spatie\Permission\Models\Role::pluck('name')->implode(',');

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'email',
                function ($attribute, $value, $fail) use ($user) {
                    if (User::query()
                        ->where('email_hash', User::emailHashFor((string) $value))
                        ->where('id', '!=', $user->id)
                        ->exists()) {
                        $fail('The email has already been taken.');
                    }
                },
            ],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && User::query()
                        ->where('phone_hash', User::phoneHashFor((string) $value))
                        ->where('id', '!=', $user->id)
                        ->exists()) {
                        $fail('this number is already used for another account');
                    }
                },
            ],
            'role' => 'sometimes|string|in:' . $allRoleNames,
            'status' => 'sometimes|string|in:active,inactive',
        ], [
            'phone.unique' => 'this number is already used for another account',
        ]);

        if (
            $user->isSystemAdminAccount()
            && (
                array_key_exists('role', $validated)
                || array_key_exists('status', $validated)
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'System admin role and activation status cannot be changed.',
            ], 403);
        }

        $updateData = collect($validated)->except('role', 'status')->toArray();

        // Handle status toggle
        if (isset($validated['status'])) {
            if ($validated['status'] === 'active') {
                $updateData['email_verified_at'] = $user->email_verified_at ?? now();
                $updateData['is_banned'] = false;
                $updateData['banned_at'] = null;
            } elseif ($validated['status'] === 'inactive') {
                $updateData['email_verified_at'] = null;
                $updateData['is_banned'] = false;
                $updateData['banned_at'] = null;
            }
        }

        $user->update($updateData);

        // Update role if provided
        if (array_key_exists('role', $validated)) {
            $user->syncRoles($validated['role']);
        }

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()->load('roles')),
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Delete the specified user.
     */
    public function destroy(User $user): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($user, false);
        if ($guard) {
            return $guard;
        }

        $actor = auth()->user();
        if ($actor instanceof User && $actor->hasRole('staff') && $user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Staff cannot remove admin accounts.',
            ], 403);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Ban a user.
     */
    public function ban(User $user): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($user, false);
        if ($guard) {
            return $guard;
        }

        $user->update(['is_banned' => true, 'banned_at' => now()]);

        // Revoke all tokens
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()->load('roles')),
            'message' => __('messages.user_banned'),
        ]);
    }

    /**
     * Unban a user.
     */
    public function unban(User $user): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($user, false);
        if ($guard) {
            return $guard;
        }

        $user->update(['is_banned' => false, 'banned_at' => null]);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()->load('roles')),
            'message' => __('messages.user_unbanned'),
        ]);
    }
}
