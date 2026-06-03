<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()->load('roles')),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => [
                'nullable',
                'string',
                'max:20',
                function ($attribute, $value, $fail) use ($request) {
                    if ($value && User::query()
                        ->where('phone_hash', User::phoneHashFor((string) $value))
                        ->where('id', '!=', $request->user()->id)
                        ->exists()) {
                        $fail('this number is already used for another account');
                    }
                },
            ],
            'date_of_birth' => 'nullable|date|before:today',
            'notification_preferences' => 'sometimes|array',
            'notification_preferences.orderUpdates' => 'sometimes|boolean',
            'notification_preferences.promotions' => 'sometimes|boolean',
            'notification_preferences.newsletter' => 'sometimes|boolean',
            'notification_preferences.sms' => 'sometimes|boolean',
            'notification_preferences.push' => 'sometimes|boolean',
        ], [
            'phone.unique' => 'this number is already used for another account',
        ]);

        $request->user()->update($validated);

        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()->load('roles')),
            'message' => __('messages.success'),
        ]);
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'avatar' => 'required|image|max:5120',
        ]);

        $user = $request->user();

        if (is_string($user->avatar) && str_starts_with($user->avatar, '/storage/')) {
            $existingPath = ltrim(str_replace('/storage/', '', $user->avatar), '/');
            if ($existingPath !== '') {
                Storage::disk('public')->delete($existingPath);
            }
        }

        $path = $validated['avatar']->store('avatars', 'public');
        $user->update([
            'avatar' => Storage::url($path),
        ]);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user->fresh()->load('roles')),
            'message' => __('messages.success'),
        ]);
    }
}
