<?php

namespace App\Casts;

use Carbon\Carbon;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Facades\Crypt;

class EncryptedDate implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        $dateValue = (string) $value;

        try {
            $dateValue = Crypt::decryptString($dateValue);
        } catch (\Throwable) {
            // Keep legacy plaintext values readable during migration.
        }

        try {
            return Carbon::parse($dateValue);
        } catch (\Throwable) {
            return null;
        }
    }

    public function set($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $dateValue = $value instanceof Carbon
            ? $value->toDateString()
            : Carbon::parse((string) $value)->toDateString();

        return Crypt::encryptString($dateValue);
    }
}