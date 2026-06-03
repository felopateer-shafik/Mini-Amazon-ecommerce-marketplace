<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'customer_id',
        'vendor_id',
        'status',
        'last_message_at',
        'admin_replied_at',
        'customer_chat_expires_at',
        'is_customer_blocked',
        'customer_blocked_at',
    ];

    protected $casts = [
        'status' => 'string',
        'last_message_at' => 'datetime',
        'admin_replied_at' => 'datetime',
        'customer_chat_expires_at' => 'datetime',
        'is_customer_blocked' => 'boolean',
        'customer_blocked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ConversationMessage::class)->orderBy('created_at');
    }
}
