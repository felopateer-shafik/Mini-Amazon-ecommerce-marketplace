<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Vendor;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        if (!(bool) Cache::get('settings.allow_registration', true)) {
            return response()->json([
                'success' => false,
                'message' => __('auth.registration_disabled'),
            ], 403);
        }

        if (!$this->passesRecaptcha($request)) {
            return response()->json([
                'success' => false,
                'message' => __('auth.recaptcha_failed'),
            ], 422);
        }

        try {
            $validated = $request->validated();
            $requireVendorApproval = (bool) Cache::get('settings.require_vendor_approval', true);
            $notifyNewMerchant = (bool) Cache::get('settings.notify_new_merchant', true);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => Hash::make($validated['password']),
            ]);

            // Restrict role assignment to validated allow-list only.
            $role = in_array(($validated['role'] ?? 'customer'), ['customer', 'merchant'], true)
                ? ($validated['role'] ?? 'customer')
                : 'customer';
            $user->assignRole($role);

            // Create vendor profile if role is merchant
            if ($role === 'merchant') {
                $user->vendor()->create([
                    'business_name' => $validated['business_name'] ?? $user->name,
                    'store_name' => $validated['store_name'] ?? ($validated['business_name'] ?? $user->name),
                    'slug' => \Illuminate\Support\Str::slug($validated['store_name'] ?? ($validated['business_name'] ?? $user->name)),
                    'email' => $user->email,
                    'is_active' => !$requireVendorApproval,
                    'is_verified' => !$requireVendorApproval,
                    'status' => $requireVendorApproval ? 'pending' : 'active',
                ]);

                if ($notifyNewMerchant) {
                    $adminIds = User::query()->role('admin')->pluck('id');
                    foreach ($adminIds as $adminId) {
                        UserNotification::create([
                            'user_id' => (int) $adminId,
                            'type' => 'merchant',
                            'title' => __('messages.vendor_status_updated_title'),
                            'message' => __('vendors.new_application', ['name' => $user->name]),
                            'link' => '/admin/merchants',
                            'meta' => ['merchant_user_id' => $user->id],
                        ]);
                    }
                }
            }
        } catch (Throwable) {
            return response()->json([
                'success' => false,
                'message' => __('messages.error'),
            ], 500);
        }

        return $this->tokenResponse($user, __('auth.register_success'), 201);
    }

    /**
     * Upgrade an authenticated customer account to merchant.
     */
    public function becomeMerchant(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name' => 'required|string|max:255',
            'store_name' => 'nullable|string|max:255',
            'business_type' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:2000',
            'bank_name' => 'nullable|string|max:255',
            'bank_account' => 'nullable|string|max:255',
            'iban' => 'nullable|string|max:255',
        ]);

        $user = $request->user();

        if ($user->hasRole('merchant') || $user->vendor()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'You already have a merchant account.',
            ], 422);
        }

        $requireVendorApproval = (bool) Cache::get('settings.require_vendor_approval', true);
        $notifyNewMerchant = (bool) Cache::get('settings.notify_new_merchant', true);

        $storeName = trim((string) ($validated['store_name'] ?? $validated['business_name'] ?? $user->name));
        $businessName = trim((string) ($validated['business_name'] ?? $storeName));

        DB::transaction(function () use ($user, $validated, $businessName, $storeName, $requireVendorApproval, $notifyNewMerchant): void {
            $user->assignRole('merchant');

            $user->vendor()->create([
                'business_name' => $businessName,
                'store_name' => $storeName,
                'slug' => $this->generateUniqueVendorSlug($storeName),
                'email' => $user->email,
                'description' => $validated['description'] ?? null,
                'business_type' => $validated['business_type'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account' => $validated['bank_account'] ?? null,
                'iban' => $validated['iban'] ?? null,
                'is_active' => !$requireVendorApproval,
                'is_verified' => !$requireVendorApproval,
                'status' => $requireVendorApproval ? 'pending' : 'active',
            ]);

            if ($notifyNewMerchant) {
                $adminIds = User::query()->role('admin')->pluck('id');
                foreach ($adminIds as $adminId) {
                    UserNotification::create([
                        'user_id' => (int) $adminId,
                        'type' => 'merchant',
                        'title' => __('messages.vendor_status_updated_title'),
                        'message' => __('vendors.new_application', ['name' => $user->name]),
                        'link' => '/admin/merchants',
                        'meta' => ['merchant_user_id' => $user->id],
                    ]);
                }
            }
        });

        $user = $user->fresh()->loadMissing(['roles', 'permissions', 'vendor']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
            ],
            'message' => __('auth.register_success'),
        ]);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => __('auth.wrong_password'),
            ], 422);
        }

        // Revoke all tokens before deleting
        $user->tokens()->delete();
        $user->delete();

        return response()->json([
            'success' => true,
            'message' => __('auth.account_deleted'),
        ]);
    }

    private function generateUniqueVendorSlug(string $storeName): string
    {
        $base = Str::slug($storeName);
        $slug = $base !== '' ? $base : 'store';
        $counter = 1;

        while (Vendor::query()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Login user and create token
     */
    public function login(LoginRequest $request): JsonResponse
    {
        if (!$this->passesRecaptcha($request)) {
            return response()->json([
                'success' => false,
                'message' => __('auth.recaptcha_failed'),
            ], 422);
        }

        $user = User::findByEmail((string) $request->input('email'));

        if (!$user || !Hash::check((string) $request->input('password'), (string) $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        if ((bool) Cache::get('settings.two_factor_enabled', false)) {
            if (empty($user->phone)) {
                return response()->json([
                    'success' => false,
                    'message' => __('auth.two_factor_phone_required'),
                ], 422);
            }

            $otp = trim((string) $request->input('otp', ''));
            if ($otp === '') {
                return response()->json([
                    'success' => false,
                    'message' => __('auth.two_factor_otp_required'),
                ], 422);
            }

            $payload = Cache::get('auth_otp:' . User::phoneHashFor($user->phone));
            $otpValid = is_array($payload)
                && !empty($payload['otp_hash'])
                && ((int) ($payload['user_id'] ?? 0) === (int) $user->id)
                && Hash::check($otp, (string) $payload['otp_hash']);

            if (!$otpValid) {
                return response()->json([
                    'success' => false,
                    'message' => __('auth.two_factor_otp_invalid'),
                ], 422);
            }

            Cache::forget('auth_otp:' . User::phoneHashFor($user->phone));
        }

        // Block banned users from logging in
        if ($user->is_banned) {
            // Revoke any existing tokens
            $user->tokens()->delete();

            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }

        return $this->tokenResponse($user, __('auth.login_success'));
    }

    /**
     * Logout user (Revoke the token)
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('auth.logout_success'),
        ]);
    }

    /**
     * Get the authenticated user
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['roles', 'permissions']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
            ],
            'message' => __('auth.user_retrieved'),
        ]);
    }

    /**
     * Refresh token
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['roles', 'permissions']);
        $request->user()->currentAccessToken()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
            'message' => __('auth.token_refreshed'),
        ]);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'data' => [],
                'message' => __('auth.current_password_incorrect'),
                'errors' => [
                    'current_password' => [__('auth.current_password_incorrect')],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        // Revoke all issued tokens after password change.
        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('auth.password_changed'),
        ]);
    }

    /**
     * Send password reset link
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::findByEmail((string) $request->email);
        if (!$user) {
            return response()->json([
                'success' => true,
                'message' => __('auth.password_reset_link_sent'),
            ]);
        }

        $token = Str::random(60);
        $emailHash = User::emailHashFor((string) $request->email);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $emailHash],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $resetUrl = "{$frontendUrl}/reset-password?email=" . urlencode((string) $request->email) . '&token=' . urlencode($token);

        try {
            Mail::raw(
                "Use this link to reset your password: {$resetUrl}",
                function ($message) use ($user) {
                    $message->to($user->email)
                        ->subject('Password Reset Link');
                }
            );
        } catch (Throwable $exception) {
            Log::warning('Password reset email delivery failed.', [
                'user_id' => $user->id,
                'email_hash' => $emailHash,
                'error' => $exception->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => __('auth.password_reset_link_sent'),
        ]);
    }

    /**
     * Reset password with token
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::findByEmail((string) $request->email);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => __('auth.reset_token_invalid'),
            ], 422);
        }

        $emailHash = User::emailHashFor((string) $request->email);

        $record = DB::table('password_reset_tokens')
            ->where('email', $emailHash)
            ->first();

        $expiresInMinutes = (int) config('auth.passwords.users.expire', 60);
        $createdAt = $record?->created_at ? Carbon::parse($record->created_at) : null;
        $isExpired = !$createdAt || $createdAt->lt(now()->subMinutes($expiresInMinutes));

        if (!$record || $isExpired || !Hash::check($request->token, $record->token)) {
            if ($record && $isExpired) {
                DB::table('password_reset_tokens')
                    ->where('email', $emailHash)
                    ->delete();
            }

            return response()->json([
                'success' => false,
                'message' => __('auth.reset_token_invalid'),
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_reset_tokens')
            ->where('email', $emailHash)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => __('auth.password_reset_success'),
        ]);
    }

    /**
     * Request OTP for phone login.
     */
    public function requestOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string|max:20',
        ]);

        $user = User::findByPhone((string) $data['phone']);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => __('messages.not_found'),
            ], 404);
        }
        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }

        $this->generateAndCacheOtp($user);

        return response()->json([
            'success' => true,
            'message' => __('auth.otp_sent'),
        ]);
    }

    /**
     * Request OTP for two-factor authentication during login (by email).
     */
    public function requestLoginOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $user = User::findByEmail((string) $data['email']);
        if (!$user) {
            // Don't reveal user existence
            return response()->json([
                'success' => true,
                'message' => __('auth.otp_sent'),
            ]);
        }
        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }
        if (empty($user->phone)) {
            return response()->json([
                'success' => false,
                'message' => __('auth.two_factor_phone_required'),
            ], 422);
        }

        $this->generateAndCacheOtp($user);

        return response()->json([
            'success' => true,
            'message' => __('auth.otp_sent'),
        ]);
    }

    private function generateAndCacheOtp(User $user): void
    {
        $phoneHash = User::phoneHashFor((string) $user->phone);
        $otp = (string) random_int(100000, 999999);
        Cache::put(
            'auth_otp:' . $phoneHash,
            [
                'otp_hash' => Hash::make($otp),
                'user_id' => $user->id,
            ],
            now()->addMinutes(5)
        );

        // TODO: Send OTP via SMS provider (Twilio, Vonage, etc.)
        Log::info('2FA OTP generated for user', ['user_id' => $user->id, 'otp' => $otp]);
    }

    /**
     * Verify OTP and login.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => 'required|string|max:20',
            'otp' => 'required|string|size:6',
        ]);

        $phoneHash = User::phoneHashFor((string) $data['phone']);
        $payload = Cache::get('auth_otp:' . $phoneHash);
        if (!$payload || !Hash::check($data['otp'], $payload['otp_hash'])) {
            return response()->json([
                'success' => false,
                'message' => __('auth.otp_invalid'),
            ], 422);
        }

        $user = User::find($payload['user_id']);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => __('messages.not_found'),
            ], 404);
        }

        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }

        Cache::forget('auth_otp:' . $phoneHash);

        return $this->tokenResponse($user, __('auth.otp_login_success'));
    }

    /**
     * Social login entry point.
     */
    public function socialLogin(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider' => 'required|in:google,facebook,apple',
            'provider_user_id' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'name' => 'nullable|string|max:255',
        ]);

        if (empty($data['email']) && empty($data['provider_user_id'])) {
            return response()->json([
                'success' => false,
                'message' => __('auth.social_identity_required'),
            ], 422);
        }

        if (!$this->isSocialProviderEnabled($data['provider'])) {
            return response()->json([
                'success' => false,
                'message' => __('auth.social_provider_disabled'),
            ], 403);
        }

        try {
            $user = $this->resolveSocialUser(
                $data['provider'],
                $data['provider_user_id'] ?? null,
                $data['email'] ?? null,
                $data['name'] ?? null,
            );
        } catch (ValidationException $exception) {
            return response()->json([
                'success' => false,
                'message' => __('auth.registration_disabled'),
            ], 403);
        }

        if ($user->is_banned) {
            return response()->json([
                'success' => false,
                'message' => __('auth.account_suspended'),
            ], 403);
        }

        return $this->tokenResponse($user, __('auth.social_login_success'));
    }

    /**
     * Redirect user to social provider.
     */
    public function socialRedirect(string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'facebook', 'apple'], true), 404);
        abort_if(!$this->isSocialProviderEnabled($provider), 403, __('auth.social_provider_disabled'));

        $state = Str::random(64);
        Cache::put("social_oauth_state:{$provider}:{$state}", true, now()->addMinutes(10));

        return Socialite::driver($provider)
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    /**
     * Handle social provider callback.
     */
    public function socialCallback(Request $request, string $provider): RedirectResponse
    {
        abort_unless(in_array($provider, ['google', 'facebook', 'apple'], true), 404);
        abort_if(!$this->isSocialProviderEnabled($provider), 403, __('auth.social_provider_disabled'));

        $state = (string) $request->query('state', '');
        if ($state === '' || !Cache::pull("social_oauth_state:{$provider}:{$state}")) {
            return $this->redirectToFrontend('error=social_auth_state_invalid');
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();

            $user = $this->resolveSocialUser(
                $provider,
                $socialUser->getId(),
                $socialUser->getEmail(),
                $socialUser->getName() ?: $socialUser->getNickname(),
            );

            if ($user->is_banned) {
                return $this->redirectToFrontend('banned=1');
            }

            $payload = $this->issueTokenPayload($user);
            $token = urlencode((string) ($payload['token'] ?? ''));

            return $this->redirectToFrontend("token={$token}");
        } catch (ValidationException $exception) {
            return $this->redirectToFrontend('error=registration_disabled');
        } catch (Throwable $exception) {
            return $this->redirectToFrontend('error=social_auth_failed');
        }
    }

    private function resolveSocialUser(string $provider, ?string $providerUserId, ?string $email, ?string $name): User
    {
        $user = null;

        if (!empty($email)) {
            $user = User::findByEmail($email);
        }

        if (!$user && !empty($providerUserId)) {
            $user = User::where('oauth_provider', $provider)
                ->where('oauth_provider_id', $providerUserId)
                ->first();
        }

        if (!$user) {
            if (!(bool) Cache::get('settings.allow_registration', true)) {
                throw ValidationException::withMessages([
                    'email' => __('auth.registration_disabled'),
                ]);
            }

            $userEmail = $email ?? ($provider . '_' . ($providerUserId ?? Str::random(8)) . '@social.local');
            $userName = $name ?: Str::headline($provider) . ' User';

            $user = User::create([
                'name' => $userName,
                'email' => $userEmail,
                'password' => Hash::make(Str::random(40)),
                'oauth_provider' => $provider,
                'oauth_provider_id' => $providerUserId,
            ]);
            $user->assignRole('customer');
        } else {
            $user->update([
                'oauth_provider' => $provider,
                'oauth_provider_id' => $providerUserId ?? $user->oauth_provider_id,
            ]);
        }

        return $user;
    }

    private function redirectToFrontend(string $query): RedirectResponse
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');

        return redirect()->away("{$frontendUrl}/auth/social/callback?{$query}");
    }

    private function tokenResponse(User $user, string $message, int $status = 200): JsonResponse
    {
        $payload = $this->issueTokenPayload($user);

        return response()->json([
            'success' => true,
            'data' => $payload,
            'message' => $message,
        ], $status);
    }

    private function issueTokenPayload(User $user): array
    {
        $token = $user->createToken('auth_token')->plainTextToken;
        $user->loadMissing(['roles', 'permissions']);

        return [
            'user' => new UserResource($user),
            'token' => $token,
        ];
    }

    private function passesRecaptcha(Request $request): bool
    {
        if (!(bool) Cache::get('settings.recaptcha_enabled', false)) {
            return true;
        }

        $secret = trim((string) Cache::get('settings.recaptcha_secret_key', ''));
        $token = trim((string) $request->input('recaptcha_token', ''));

        if ($secret === '' || $token === '') {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(8)
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);

            return (bool) $response->json('success', false);
        } catch (Throwable) {
            return false;
        }
    }

    private function isSocialProviderEnabled(string $provider): bool
    {
        return match ($provider) {
            'google' => (bool) Cache::get('settings.google_auth_enabled', false),
            'facebook' => (bool) Cache::get('settings.facebook_auth_enabled', false),
            'apple' => (bool) Cache::get('settings.apple_auth_enabled', false),
            default => false,
        };
    }
}
