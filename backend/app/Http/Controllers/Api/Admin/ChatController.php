<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\UserNotification;
use App\Support\CollectionPaginator;
use App\Support\SensitiveData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));
        $status = (string) $request->get('status', 'all');

        $query = Conversation::query()
            ->with(['customer:id,name', 'vendor:id,store_name,user_id', 'vendor.user:id,name'])
            ->withCount([
                'messages as unread_count' => function ($q) {
                    $q->whereNull('read_at');
                },
            ])
            ->with(['messages' => function ($q) {
                $q->latest()->limit(1);
            }])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at');

        $stats = Conversation::query()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw("SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count")
            ->selectRaw("SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting_count")
            ->selectRaw("SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count")
            ->first();

        if ($status !== 'all') {
            $query->where('status', $status);
        }

        $perPage = min(max((int) $request->integer('per_page', 20), 1), 100);
        $conversationsPaginated = $search !== ''
            ? CollectionPaginator::paginate(
                $query->get()->filter(function (Conversation $conversation) use ($search) {
                    return SensitiveData::contains($conversation->customer?->name, $search)
                        || SensitiveData::contains($conversation->vendor?->store_name, $search)
                        || SensitiveData::contains($conversation->vendor?->user?->name, $search);
                }),
                $request,
                $perPage,
            )
            : $query->paginate($perPage);

        $conversations = collect($conversationsPaginated->items())->map(function (Conversation $conversation) {
            $latest = $conversation->messages->first();

            return [
                'id' => $conversation->id,
                'customer' => $conversation->customer?->name ?? 'Customer',
                'merchant' => $conversation->vendor?->store_name ?? $conversation->vendor?->user?->name ?? 'Merchant',
                'status' => $conversation->status ?? 'active',
                'unread' => (int) ($conversation->unread_count ?? 0),
                'time' => optional($conversation->last_message_at)->diffForHumans()
                    ?? optional($conversation->updated_at)->diffForHumans(),
                'lastMessage' => $latest?->body,
                'is_customer_blocked' => (bool) $conversation->is_customer_blocked,
                'customer_chat_expires_at' => $conversation->customer_chat_expires_at,
                'admin_replied_at' => $conversation->admin_replied_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $conversations,
            'meta' => [
                'pagination' => [
                    'total' => $conversationsPaginated->total(),
                    'per_page' => $conversationsPaginated->perPage(),
                    'current_page' => $conversationsPaginated->currentPage(),
                    'last_page' => $conversationsPaginated->lastPage(),
                ],
                'total' => (int) ($stats->total ?? 0),
                'active_count' => (int) ($stats->active_count ?? 0),
                'waiting_count' => (int) ($stats->waiting_count ?? 0),
                'resolved_count' => (int) ($stats->resolved_count ?? 0),
            ],
        ]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $messagesPaginated = $conversation->messages()
            ->with('sender:id,name')
            ->paginate(min(max((int) $request->integer('per_page', 40), 1), 100));

        $messages = collect($messagesPaginated->items())
            ->map(function (ConversationMessage $message) use ($conversation) {
                $sender = 'admin';
                if ($message->sender_id === $conversation->customer_id) {
                    $sender = 'customer';
                }

                if ($conversation->vendor && $message->sender_id === $conversation->vendor->user_id) {
                    $sender = 'merchant';
                }

                return [
                    'id' => $message->id,
                    'sender' => $sender,
                    'text' => $message->body,
                    'time' => $message->created_at?->format('h:i A'),
                    'created_at' => $message->created_at,
                    'read_at' => $message->read_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->id,
                'status' => $conversation->status,
                'is_customer_blocked' => (bool) $conversation->is_customer_blocked,
                'customer_chat_expires_at' => $conversation->customer_chat_expires_at,
                'admin_replied_at' => $conversation->admin_replied_at,
                'messages' => $messages,
            ],
            'meta' => [
                'total' => $messagesPaginated->total(),
                'per_page' => $messagesPaginated->perPage(),
                'current_page' => $messagesPaginated->currentPage(),
                'last_page' => $messagesPaginated->lastPage(),
            ],
        ]);
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $user = $request->user();

        $message = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => trim($data['message']),
        ]);

        $conversation->update([
            'status' => 'active',
            'last_message_at' => now(),
            'admin_replied_at' => now(),
            'customer_chat_expires_at' => now()->addMinutes(30),
        ]);

        $conversation->loadMissing('vendor:id,user_id');

        $recipientIds = array_filter([
            $conversation->customer_id,
            $conversation->vendor?->user_id,
        ]);

        foreach ($recipientIds as $recipientId) {
            if ((int) $recipientId === (int) $user->id) {
                continue;
            }

            $isVendorRecipient = $conversation->vendor && (int) $recipientId === (int) $conversation->vendor->user_id;
            $chatLink = $isVendorRecipient
                ? '/merchant/messages?conversation=' . $conversation->id
                : '/messages?conversation=' . $conversation->id;

            UserNotification::create([
                'user_id' => $recipientId,
                'type' => 'message',
                'title' => __('messages.admin_replied_chat_title'),
                'message' => __('messages.admin_replied_chat_message'),
                'link' => $chatLink,
                'meta' => [
                    'conversation_id' => $conversation->id,
                    'sender_id' => $user->id,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $message->id,
                'text' => $message->body,
                'time' => $message->created_at?->format('h:i A'),
                'created_at' => $message->created_at,
            ],
                'message' => __('messages.message_sent'),
        ], 201);
    }

    public function updateStatus(Request $request, Conversation $conversation): JsonResponse
    {
        $data = $request->validate([
            'status' => 'required|in:active,waiting,resolved',
        ]);

        $conversation->update([
            'status' => $data['status'],
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $conversation->id,
                'status' => $conversation->status,
            ],
            'message' => __('messages.conversation_status_updated'),
        ]);
    }

    public function blockCustomer(Conversation $conversation): JsonResponse
    {
        $conversation->update([
            'is_customer_blocked' => true,
            'customer_blocked_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $conversation->id,
                'is_customer_blocked' => true,
            ],
            'message' => 'Customer blocked from this chat.',
        ]);
    }

    public function unblockCustomer(Conversation $conversation): JsonResponse
    {
        $conversation->update([
            'is_customer_blocked' => false,
            'customer_blocked_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $conversation->id,
                'is_customer_blocked' => false,
            ],
            'message' => 'Customer unblocked for this chat.',
        ]);
    }

    public function destroy(Conversation $conversation): JsonResponse
    {
        $conversation->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conversation deleted.',
        ]);
    }
}
