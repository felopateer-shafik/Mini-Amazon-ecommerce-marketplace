<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $notifications = UserNotification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate($perPage);

        $mappedNotifications = collect($notifications->items())
            ->map(function (UserNotification $notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'link' => $notification->link ?? '/notifications',
                    'time' => optional($notification->created_at)->diffForHumans(),
                    'read' => !is_null($notification->read_at),
                    'created_at' => $notification->created_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $mappedNotifications,
            'meta' => [
                'unread_count' => UserNotification::where('user_id', $request->user()->id)
                    ->whereNull('read_at')
                    ->count(),
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    public function markRead(Request $request, UserNotification $notification): JsonResponse
    {
        $notification = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($notification->id);

        if (is_null($notification->read_at)) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json([
            'success' => true,
            'message' => __('messages.notification_marked_read'),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        UserNotification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => __('messages.notifications_marked_read'),
        ]);
    }

    public function destroy(Request $request, UserNotification $notification): JsonResponse
    {
        $notification = UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($notification->id);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.notification_removed'),
        ]);
    }

    public function clearAll(Request $request): JsonResponse
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => __('messages.notifications_cleared'),
        ]);
    }
}
