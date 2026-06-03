<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use App\Models\UserNotification;
use App\Models\Vendor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();
        $isMerchant = $user->hasRole('merchant') && $user->vendor;
        $perPage = min(max((int) $request->integer('per_page', 15), 1), 100);

        $query = Conversation::query()
            ->with(['customer:id,name', 'vendor.user:id,name'])
            ->withCount([
                'messages as unread_count' => function ($q) use ($user) {
                    $q->whereNull('read_at')->where('sender_id', '!=', $user->id);
                },
            ])
            ->with(['messages' => function ($q) {
                $q->latest()->limit(1);
            }])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at');

        if ($isMerchant) {
            $query->where('vendor_id', $user->vendor->id);
        } else {
            $query->where('customer_id', $user->id);
        }

        $conversations = $query->paginate($perPage);

        $data = collect($conversations->items())->map(function (Conversation $conversation) use ($user, $isMerchant) {
            $latest = $conversation->messages->first();
            $otherName = $isMerchant
                ? ($conversation->customer->name ?? 'Customer')
                : ($conversation->vendor->store_name ?? $conversation->vendor->user->name ?? 'Merchant');

            return [
                'id' => $conversation->id,
                'name' => $otherName,
                'status' => $conversation->status ?? 'waiting',
                'is_customer_blocked' => (bool) ($conversation->is_customer_blocked ?? false),
                'time' => optional($conversation->last_message_at)->diffForHumans() ?? optional($conversation->updated_at)->diffForHumans(),
                'unread' => (int) ($conversation->unread_count ?? 0),
                'lastMessage' => $latest?->body,
                'online' => false,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'total' => $conversations->total(),
                'per_page' => $conversations->perPage(),
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
            ],
        ]);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $perPage = min(max((int) $request->integer('per_page', 30), 1), 100);
        if (!$this->canAccessConversation($user, $conversation)) {
            return response()->json([
                'success' => false,
                'message' => __('messages.unauthorized'),
            ], 403);
        }

        $conversation->loadMissing([
            'customer:id,name',
            'vendor:id,store_name,user_id',
            'vendor.user:id,name',
        ]);

        ConversationMessage::where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $messagesPaginated = $conversation->messages()
            ->with('sender:id,name')
            ->paginate($perPage);

        $messages = collect($messagesPaginated->items())->map(function (ConversationMessage $msg) use ($conversation) {
            $customerName = $conversation->customer?->name ?? 'Customer';
            $merchantName = $conversation->vendor?->store_name
                ?? $conversation->vendor?->user?->name
                ?? 'Merchant';
            $adminName = config('app.name', 'Website') . ' Admin';

            if ((int) $msg->sender_id === (int) $conversation->customer_id) {
                $senderType = 'customer';
                $senderName = $customerName;
            } elseif ((int) $msg->sender_id === (int) ($conversation->vendor?->user_id ?? 0)) {
                $senderType = 'merchant';
                $senderName = $merchantName;
            } else {
                $senderType = 'admin';
                $senderName = $adminName;
            }

            return [
                'id' => $msg->id,
                'sender' => $senderType,
                'sender_name' => $senderName,
                'text' => $msg->body,
                'time' => $msg->created_at?->format('h:i A'),
                'created_at' => $msg->created_at,
                'read_at' => $msg->read_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'conversation_id' => $conversation->id,
                'status' => $conversation->status ?? 'waiting',
                'is_customer_blocked' => (bool) ($conversation->is_customer_blocked ?? false),
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

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'conversation_id' => 'nullable|exists:conversations,id',
            'vendor_id' => 'nullable|exists:vendors,id',
            'message' => 'nullable|string|max:5000',
        ]);

        $user = $request->user();

        $conversation = null;
        if (!empty($data['conversation_id'])) {
            $conversation = Conversation::query()
                ->whereKey($data['conversation_id'])
                ->where(function ($query) use ($user) {
                    $query->where('customer_id', $user->id);

                    if ($user->hasRole('merchant') && $user->vendor) {
                        $query->orWhere('vendor_id', $user->vendor->id);
                    }
                })
                ->first();

            if (!$conversation) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.unauthorized'),
                ], 403);
            }

            if ((int) $conversation->customer_id === (int) $user->id) {
                if ((bool) $conversation->is_customer_blocked) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You are blocked from messaging in this conversation.',
                    ], 403);
                }

                if ((string) ($conversation->status ?? '') === 'resolved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'This conversation is resolved. You cannot send new messages to this seller.',
                    ], 403);
                }

                if ($conversation->admin_replied_at && $conversation->customer_chat_expires_at && now()->greaterThan($conversation->customer_chat_expires_at)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Chat access has expired. Please wait for admin to contact you again.',
                    ], 403);
                }
            }
        } else {
            if ($user->hasRole('merchant') && $user->vendor) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.merchant_conversation_required'),
                ], 422);
            }

            $vendorId = (int) ($data['vendor_id'] ?? 0);
            if (!$vendorId) {
                return response()->json([
                    'success' => false,
                    'message' => __('messages.vendor_required_for_conversation'),
                ], 422);
            }

            $vendor = Vendor::findOrFail($vendorId);
            $conversation = Conversation::firstOrCreate([
                'customer_id' => $user->id,
                'vendor_id' => $vendor->id,
            ], [
                'status' => 'waiting',
            ]);

            if (!$conversation->status) {
                $conversation->update(['status' => 'waiting']);
            }
        }

        if ((int) $conversation->customer_id === (int) $user->id) {
            if ((bool) $conversation->is_customer_blocked) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are blocked from messaging in this conversation.',
                ], 403);
            }

            if ((string) ($conversation->status ?? '') === 'resolved') {
                return response()->json([
                    'success' => false,
                    'message' => 'This conversation is resolved. You cannot send new messages to this seller.',
                ], 403);
            }
        }

        $trimmedMessage = trim((string) ($data['message'] ?? ''));
        if ($trimmedMessage === '') {
            return response()->json([
                'success' => true,
                'data' => [
                    'conversation_id' => $conversation->id,
                ],
                'message' => __('messages.success'),
            ]);
        }

        $message = ConversationMessage::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'body' => $trimmedMessage,
        ]);

        $conversation->update(['last_message_at' => now()]);
        $conversation->loadMissing('vendor:id,user_id');

        $recipientUserId = $conversation->customer_id === $user->id
            ? ($conversation->vendor?->user_id ?? null)
            : $conversation->customer_id;

        if ($recipientUserId) {
            $recipientIsMerchant = $conversation->vendor && (int) $recipientUserId === (int) $conversation->vendor->user_id;
            $chatLink = $recipientIsMerchant
                ? '/merchant/messages?conversation=' . $conversation->id
                : '/messages?conversation=' . $conversation->id;

            UserNotification::create([
                'user_id' => $recipientUserId,
                'type' => 'message',
                'title' => __('notifications.new_message_title'),
                'message' => __('messages.new_message_received'),
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
                'conversation_id' => $conversation->id,
                'message' => [
                    'id' => $message->id,
                    'text' => $message->body,
                    'time' => $message->created_at?->format('h:i A'),
                    'created_at' => $message->created_at,
                ],
            ],
            'message' => __('messages.message_sent'),
        ], 201);
    }

    private function canAccessConversation($user, Conversation $conversation): bool
    {
        if ($conversation->customer_id === $user->id) {
            return true;
        }

        if ($user->hasRole('merchant') && $user->vendor) {
            return $conversation->vendor_id === $user->vendor->id;
        }

        return false;
    }

    public function updateStatus(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$this->canManageConversationAsMerchant($user, $conversation)) {
            return response()->json([
                'success' => false,
                'message' => __('messages.unauthorized'),
            ], 403);
        }

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

    public function blockCustomer(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$this->canManageConversationAsMerchant($user, $conversation)) {
            return response()->json([
                'success' => false,
                'message' => __('messages.unauthorized'),
            ], 403);
        }

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

    public function unblockCustomer(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if (!$this->canManageConversationAsMerchant($user, $conversation)) {
            return response()->json([
                'success' => false,
                'message' => __('messages.unauthorized'),
            ], 403);
        }

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

    private function canManageConversationAsMerchant($user, Conversation $conversation): bool
    {
        return $user->hasRole('merchant')
            && $user->vendor
            && (int) $conversation->vendor_id === (int) $user->vendor->id;
    }
}
