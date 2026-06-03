<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    private function resolveAvatarUrl(): ?string
    {
        if (!is_string($this->avatar) || trim($this->avatar) === '') {
            return null;
        }

        $avatar = trim($this->avatar);

        if (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')) {
            return $avatar;
        }

        if (str_starts_with($avatar, '/')) {
            return url($avatar);
        }

        return url('/' . ltrim($avatar, '/'));
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $authUser = $request->user();
        $isAuthEndpoint = $request->is('api/v1/auth/*');

        $canViewSensitive = $isAuthEndpoint || ($authUser && (
            (int) $authUser->id === (int) $this->id
            || $authUser->hasRole('admin')
            || (method_exists($authUser, 'isSystemAdminAccount') && $authUser->isSystemAdminAccount())
        ));

        $roleName = $this->relationLoaded('roles')
            ? optional($this->roles->first())->name
            : $this->roles()->select('name')->value('name');

        $permissions = $canViewSensitive && $this->relationLoaded('permissions') && $this->relationLoaded('roles')
            ? $this->getAllPermissions()->pluck('name')->values()
            : [];

        $status = (bool) $this->is_banned
            ? 'banned'
            : (($this->is_active ?? true) ? ($this->email_verified_at ? 'active' : 'inactive') : 'inactive');

        $isSystemAdmin = $this->isSystemAdminAccount();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->when($canViewSensitive, $this->email),
            'email_verified_at' => $this->email_verified_at,
            'phone' => $this->when($canViewSensitive, $this->phone),
            'date_of_birth' => $this->when($canViewSensitive, $this->date_of_birth?->format('Y-m-d')),
            'notification_preferences' => $this->when($canViewSensitive, $this->notification_preferences ?? [
                'orderUpdates' => true,
                'promotions' => true,
                'newsletter' => false,
                'sms' => true,
                'push' => false,
            ]),
            'avatar' => $this->resolveAvatarUrl(),
            'is_banned' => $this->when($canViewSensitive, (bool) $this->is_banned),
            'is_active' => $this->when($canViewSensitive, (bool) ($this->is_active ?? true)),
            'status' => $status,
            'is_system_admin' => $isSystemAdmin,
            'role' => $roleName,
            'permissions' => $this->when($canViewSensitive, $permissions),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'vendor' => $this->when(
                $this->relationLoaded('vendor') && $this->vendor,
                fn () => new VendorResource($this->vendor)
            ),
        ];
    }
}
