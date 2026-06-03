<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
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

        if ($target->isSystemAdminAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'System admin account cannot be modified.',
            ], 403);
        }

        return null;
    }

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->where(function ($q) {
                $q->whereHas('permissions')
                    ->orWhereHas('roles.permissions');
            })
            ->with(['roles', 'permissions']);

        $search = trim((string) $request->get('search', ''));

        $status = trim((string) $request->get('status', ''));
        if ($status !== '') {
            if ($status === 'banned') {
                $query->where('is_banned', true);
            } elseif ($status === 'active') {
                $query->where('is_banned', false)
                    ->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_banned', false)
                    ->where('is_active', false);
            }
        }

        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $staff = $search !== ''
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
            'data' => UserResource::collection($staff),
            'meta' => [
                'total' => $staff->total(),
                'per_page' => $staff->perPage(),
                'current_page' => $staff->currentPage(),
                'last_page' => $staff->lastPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Prevent privilege escalation: only system admin can assign the "admin" role
        if ($request->has('role_id')) {
            $role = Role::find($request->input('role_id'));
            if ($role && $role->name === 'admin') {
                $actor = auth()->user();
                if (!$actor instanceof User || !$actor->isSystemAdminAccount()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Only System Admin can assign the admin role.',
                    ], 403);
                }
            }
        }

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
            'role_id' => 'required|exists:roles,id',
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
            'email_verified_at' => now(),
        ]);

        $role = Role::findById($validated['role_id'], 'web');
        $user->assignRole($role);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->load(['roles', 'permissions'])),
            'message' => __('messages.staff_created'),
        ], 201);
    }

    public function update(Request $request, User $staff): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($staff, true);
        if ($guard) {
            return $guard;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => [
                'sometimes',
                'email',
                function ($attribute, $value, $fail) use ($staff) {
                    if (User::query()
                        ->where('email_hash', User::emailHashFor((string) $value))
                        ->where('id', '!=', $staff->id)
                        ->exists()) {
                        $fail('The email has already been taken.');
                    }
                },
            ],
            'password' => 'sometimes|string|min:8',
            'role_id' => 'sometimes|exists:roles,id',
            'phone' => [
                'nullable',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($staff) {
                    if ($value && User::query()
                        ->where('phone_hash', User::phoneHashFor((string) $value))
                        ->where('id', '!=', $staff->id)
                        ->exists()) {
                        $fail('this number is already used for another account');
                    }
                },
            ],
            'is_active' => 'sometimes|boolean',
        ], [
            'phone.unique' => 'this number is already used for another account',
        ]);

        if (
            $staff->isSystemAdminAccount()
            && (
                array_key_exists('role_id', $validated)
                || array_key_exists('is_active', $validated)
            )
        ) {
            return response()->json([
                'success' => false,
                'message' => 'System admin role and activation status cannot be changed.',
            ], 403);
        }

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $staff->update(collect($validated)->except('role_id')->toArray());

        if (array_key_exists('role_id', $validated)) {
            $role = Role::findById($validated['role_id'], 'web');
            $staff->syncRoles($role);
        }

        return response()->json([
            'success' => true,
            'data' => new UserResource($staff->fresh()->load(['roles', 'permissions'])),
            'message' => __('messages.staff_updated'),
        ]);
    }

    public function destroy(User $staff): JsonResponse
    {
        $guard = $this->ensureSystemAdminCanManage($staff, false);
        if ($guard) {
            return $guard;
        }

        $staff->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.staff_deleted'),
        ]);
    }
}
