<?php

namespace App\Models;

use App\Casts\EncryptedArray;
use App\Casts\EncryptedDate;
use App\Casts\EncryptedString;
use App\Support\SensitiveData;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    private static ?int $cachedSystemAdminId = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'email_hash',
        'email_verified_at',
        'password',
        'phone',
        'phone_hash',
        'date_of_birth',
        'notification_preferences',
        'avatar',
        'oauth_provider',
        'oauth_provider_id',
        'is_banned',
        'banned_at',
        'is_active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'email_hash',
        'phone_hash',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => EncryptedString::class,
            'email' => EncryptedString::class,
            'phone' => EncryptedString::class,
            'avatar' => EncryptedString::class,
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_banned' => 'boolean',
            'is_active' => 'boolean',
            'banned_at' => 'datetime',
            'date_of_birth' => EncryptedDate::class,
            'notification_preferences' => EncryptedArray::class,
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (self $user): void {
            $user->email_hash = self::emailHashFor($user->email);
            $user->phone_hash = self::phoneHashFor($user->phone);
        });
    }

    public static function normalizeEmail(?string $value): string
    {
        return SensitiveData::normalizeEmail($value);
    }

    public static function normalizePhone(?string $value): string
    {
        return SensitiveData::normalizePhone($value);
    }

    public static function emailHashFor(?string $value): ?string
    {
        return SensitiveData::emailHash($value);
    }

    public static function phoneHashFor(?string $value): ?string
    {
        return SensitiveData::phoneHash($value);
    }

    public static function findByEmail(?string $email): ?self
    {
        $hash = self::emailHashFor($email);

        return $hash ? self::query()->where('email_hash', $hash)->first() : null;
    }

    public static function findByPhone(?string $phone): ?self
    {
        $hash = self::phoneHashFor($phone);

        return $hash ? self::query()->where('phone_hash', $hash)->first() : null;
    }

    /**
     * Get the vendor associated with the user.
     */
    public function vendor()
    {
        return $this->hasOne(Vendor::class);
    }

    /**
     * Get the user's orders.
     */
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Get the user's reviews.
     */
    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    /**
     * Get the user's wallet.
     */
    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * Get the user's loyalty points.
     */
    public function loyaltyPoints()
    {
        return $this->hasMany(LoyaltyPoint::class);
    }

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    public function cartItems()
    {
        return $this->hasMany(CartItem::class);
    }

    public function wishlist()
    {
        return $this->hasMany(Wishlist::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function customerConversations()
    {
        return $this->hasMany(Conversation::class, 'customer_id');
    }

    public function sentConversationMessages()
    {
        return $this->hasMany(ConversationMessage::class, 'sender_id');
    }

    public function appNotifications()
    {
        return $this->hasMany(UserNotification::class);
    }

    public function paymentCards()
    {
        return $this->hasMany(PaymentCard::class);
    }

    public static function resolveSystemAdminId(): ?int
    {
        if (self::$cachedSystemAdminId !== null) {
            return self::$cachedSystemAdminId;
        }

        $protectedEmails = array_values(array_unique(array_filter([
            strtolower((string) env('SYSTEM_ADMIN_EMAIL', '')),
            strtolower((string) env('ADMIN_EMAIL', '')),
            'admin@miniamazon.com',
        ])));

        if ($protectedEmails !== []) {
            $emailMatched = self::query()
                ->get(['id', 'email'])
                ->first(function (self $user) use ($protectedEmails) {
                    return in_array(strtolower((string) $user->email), $protectedEmails, true);
                });

            if ($emailMatched) {
                self::$cachedSystemAdminId = (int) $emailMatched->id;

                return self::$cachedSystemAdminId;
            }
        }

        $nameMatchedId = (int) (self::query()
            ->whereRaw('LOWER(name) = ?', ['system admin'])
            ->orderBy('created_at')
            ->orderBy('id')
            ->value('id') ?? 0);

        if ($nameMatchedId > 0) {
            self::$cachedSystemAdminId = $nameMatchedId;

            return self::$cachedSystemAdminId;
        }

        self::$cachedSystemAdminId = (int) (self::query()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'admin');
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->value('id') ?? 0);

        return self::$cachedSystemAdminId > 0 ? self::$cachedSystemAdminId : null;
    }

    public function isSystemAdminAccount(): bool
    {
        return (int) $this->id === (int) (self::resolveSystemAdminId() ?? 0);
    }
}
