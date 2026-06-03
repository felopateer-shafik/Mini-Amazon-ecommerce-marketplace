<?php

namespace App\Support;

class SensitiveData
{
    public static function normalizeEmail(?string $value): string
    {
        return strtolower(trim((string) $value));
    }

    public static function normalizePhone(?string $value): string
    {
        return preg_replace('/\s+/', '', trim((string) $value)) ?? '';
    }

    public static function blindIndex(string $value, string $purpose): string
    {
        $key = (string) config('app.key', '');

        return hash_hmac('sha256', $purpose . '|' . $value, $key);
    }

    public static function emailHash(?string $value): ?string
    {
        $normalized = self::normalizeEmail($value);

        return $normalized !== '' ? self::blindIndex($normalized, 'user-email') : null;
    }

    public static function phoneHash(?string $value): ?string
    {
        $normalized = self::normalizePhone($value);

        return $normalized !== '' ? self::blindIndex($normalized, 'user-phone') : null;
    }

    public static function contains(mixed $haystack, string $needle): bool
    {
        $needle = trim(mb_strtolower($needle));
        if ($needle === '') {
            return true;
        }

        return str_contains(mb_strtolower(trim((string) ($haystack ?? ''))), $needle);
    }
}