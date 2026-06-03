<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentCard;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentCardController extends Controller
{
    /**
     * List saved payment cards for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $cards = $request->user()->paymentCards()
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (PaymentCard $card) => [
                'id' => $card->id,
                'card_last_four' => $card->card_last_four,
                'card_brand' => $card->card_brand,
                'card_holder_name' => $card->card_holder_name,
                'expiry_month' => $card->expiry_month,
                'expiry_year' => $card->expiry_year,
                'billing_address' => $card->billing_address,
                'is_default' => $card->is_default,
                'created_at' => $card->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $cards,
            'message' => __('messages.success'),
        ]);
    }

    /**
     * Store a new payment card.
     * Note: Only the last 4 digits, brand, holder name, and expiry are stored.
     * Full card numbers are NEVER stored.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'card_number' => 'required|string|min:13|max:19',
            'card_holder_name' => 'required|string|max:255',
            'expiry_month' => 'required|string|size:2',
            'expiry_year' => 'required|string|min:2|max:4',
            'billing_address' => 'nullable|string|max:500',
        ]);

        $cardNumber = preg_replace('/\D/', '', $validated['card_number']);
        $lastFour = substr($cardNumber, -4);
        $brand = $this->detectCardBrand($cardNumber);

        // Validate expiry is in the future
        $expiryYear = strlen($validated['expiry_year']) === 2
            ? '20' . $validated['expiry_year']
            : $validated['expiry_year'];
        $expiryDate = \Carbon\Carbon::createFromDate((int) $expiryYear, (int) $validated['expiry_month'], 1)->endOfMonth();
        if ($expiryDate->isPast()) {
            return response()->json([
                'success' => false,
                'message' => __('payment.card_expired') ?: 'This card has expired.',
            ], 422);
        }

        // Check for duplicate (same last four + same expiry)
        $exists = $request->user()->paymentCards()
            ->get()
            ->first(function (PaymentCard $card) use ($lastFour, $validated, $expiryYear) {
                return $card->card_last_four === $lastFour
                    && $card->expiry_month === $validated['expiry_month']
                    && $card->expiry_year === $expiryYear;
            });

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => __('payment.card_already_saved') ?: 'This card is already saved.',
            ], 422);
        }

        $isFirst = $request->user()->paymentCards()->count() === 0;

        $card = $request->user()->paymentCards()->create([
            'card_last_four' => $lastFour,
            'card_brand' => $brand,
            'card_holder_name' => $validated['card_holder_name'],
            'expiry_month' => $validated['expiry_month'],
            'expiry_year' => $expiryYear,
            'billing_address' => $validated['billing_address'] ?? null,
            'is_default' => $isFirst,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $card->id,
                'card_last_four' => $card->card_last_four,
                'card_brand' => $card->card_brand,
                'card_holder_name' => $card->card_holder_name,
                'expiry_month' => $card->expiry_month,
                'expiry_year' => $card->expiry_year,
                'is_default' => $card->is_default,
            ],
            'message' => __('payment.card_saved') ?: 'Card saved successfully.',
        ], 201);
    }

    /**
     * Remove a saved payment card.
     */
    public function destroy(Request $request, int $card): JsonResponse
    {
        $paymentCard = $request->user()->paymentCards()->findOrFail($card);

        $wasDefault = $paymentCard->is_default;
        $paymentCard->delete();

        // If deleted card was default, make the next one default
        if ($wasDefault) {
            $next = $request->user()->paymentCards()->orderBy('created_at', 'desc')->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => [],
            'message' => __('payment.card_removed') ?: 'Card removed.',
        ]);
    }

    /**
     * Set a card as the default payment method.
     */
    public function setDefault(Request $request, int $card): JsonResponse
    {
        $paymentCard = $request->user()->paymentCards()->findOrFail($card);

        // Unset current defaults
        $request->user()->paymentCards()->update(['is_default' => false]);

        $paymentCard->update(['is_default' => true]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $paymentCard->id,
                'is_default' => true,
            ],
            'message' => __('payment.default_set') ?: 'Default card updated.',
        ]);
    }

    /**
     * Detect card brand from card number using BIN ranges.
     */
    private function detectCardBrand(string $number): string
    {
        $number = preg_replace('/\D/', '', $number);

        if (preg_match('/^4/', $number)) {
            return 'Visa';
        }
        if (preg_match('/^(5[1-5]|2[2-7])/', $number)) {
            return 'Mastercard';
        }
        if (preg_match('/^3[47]/', $number)) {
            return 'Amex';
        }
        if (preg_match('/^6(?:011|5)/', $number)) {
            return 'Discover';
        }
        if (preg_match('/^(?:2131|1800|35)/', $number)) {
            return 'JCB';
        }
        if (preg_match('/^3(?:0[0-5]|[68])/', $number)) {
            return 'Diners Club';
        }
        if (preg_match('/^(?:5018|5020|5038|6304|6759|6761|6763)/', $number)) {
            return 'Maestro';
        }

        return 'Unknown';
    }
}
