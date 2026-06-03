<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Support\Facades\Crypt;

class EncryptedArray implements CastsAttributes
{
    public function get($model, string $key, $value, array $attributes): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_array($value)) {
            return $value;
        }

        $decoded = $this->decodeJson((string) $value);
        if (is_array($decoded) && array_key_exists('payload', $decoded)) {
            try {
                $plaintext = Crypt::decryptString((string) $decoded['payload']);
                $payload = $this->decodeJson($plaintext);

                return is_array($payload) ? $payload : null;
            } catch (\Throwable) {
                return $decoded;
            }
        }

        return is_array($decoded) ? $decoded : null;
    }

    public function set($model, string $key, $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value)) {
            $decoded = $this->decodeJson($value);
            $normalized = is_array($decoded) ? $decoded : [$value];
        } else {
            $normalized = is_array($value) ? $value : (array) $value;
        }

        return json_encode([
            'payload' => Crypt::encryptString(json_encode($normalized)),
        ], JSON_UNESCAPED_UNICODE);
    }

    private function decodeJson(string $value): mixed
    {
        $decoded = json_decode($value, true);

        if (is_string($decoded)) {
            $decodedAgain = json_decode($decoded, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                return $decodedAgain;
            }
        }

        return $decoded;
    }
}