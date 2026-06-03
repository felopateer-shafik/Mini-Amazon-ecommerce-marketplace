<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConversationMessage;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StreamController extends Controller
{
    public function updates(Request $request): StreamedResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->stream(function () use ($user) {
            if (function_exists('set_time_limit')) {
                set_time_limit(0);
            }

            echo "retry: 5000\n\n";
            @ob_flush();
            @flush();

            $ticks = 0;
            while (!connection_aborted() && $ticks < 60) {
                $payload = [
                    'unread_notifications' => UserNotification::where('user_id', $user->id)
                        ->whereNull('read_at')
                        ->count(),
                    'unread_messages' => $this->unreadMessagesCount($user),
                    'timestamp' => now()->toIso8601String(),
                ];

                echo "event: update\n";
                echo 'data: ' . json_encode($payload) . "\n\n";

                @ob_flush();
                @flush();

                $ticks++;
                sleep(5);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function unreadMessagesCount(User $user): int
    {
        $query = ConversationMessage::query()
            ->whereNull('read_at')
            ->where('sender_id', '!=', $user->id)
            ->whereHas('conversation', function ($conversationQuery) use ($user) {
                if ($user->hasRole('merchant') && $user->vendor) {
                    $conversationQuery->where('vendor_id', $user->vendor->id);
                    return;
                }

                $conversationQuery->where('customer_id', $user->id);
            });

        return $query->count();
    }
}
