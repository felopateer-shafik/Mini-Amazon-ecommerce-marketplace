<?php

use App\Models\Address;
use App\Models\Affiliate;
use App\Models\ConversationMessage;
use App\Models\LoyaltyPoint;
use App\Models\Order;
use App\Models\Refund;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\Vendor;
use App\Models\WalletTransaction;
use App\Models\WholesaleCustomer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $this->rewriteUsers();
        $this->rewriteAddresses();
        $this->rewriteVendors();
        $this->rewriteOrders();
        $this->rewriteConversationMessages();
        $this->rewriteNotifications();
        $this->rewriteWalletTransactions();
        $this->rewriteRefunds();
        $this->rewriteLoyaltyPoints();
        $this->rewriteAffiliates();
        $this->rewriteWholesaleCustomers();
    }

    public function down(): void
    {
        // Encrypted backfill is intentionally irreversible.
    }

    private function rewriteUsers(): void
    {
        User::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'name' => $record->name,
                    'email' => $record->email,
                    'phone' => $record->phone,
                    'date_of_birth' => $record->date_of_birth,
                    'notification_preferences' => $record->notification_preferences,
                ])->save();
            }
        });
    }

    private function rewriteAddresses(): void
    {
        Address::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'label' => $record->label,
                    'first_name' => $record->first_name,
                    'last_name' => $record->last_name,
                    'phone' => $record->phone,
                    'address_line_1' => $record->address_line_1,
                    'address_line_2' => $record->address_line_2,
                    'city' => $record->city,
                    'state' => $record->state,
                    'postal_code' => $record->postal_code,
                    'country' => $record->country,
                ])->save();
            }
        });
    }

    private function rewriteVendors(): void
    {
        Vendor::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'business_name' => $record->business_name,
                    'store_name' => $record->store_name,
                    'description' => $record->description,
                    'email' => $record->email,
                    'phone' => $record->phone,
                    'address' => $record->address,
                    'city' => $record->city,
                    'state' => $record->state,
                    'country' => $record->country,
                    'postal_code' => $record->postal_code,
                    'tax_id' => $record->tax_id,
                    'bank_name' => $record->bank_name,
                    'account_name' => $record->account_name,
                    'account_number' => $record->account_number,
                    'iban' => $record->iban,
                    'notification_preferences' => $record->notification_preferences,
                    'rejection_reason' => $record->rejection_reason,
                ])->save();
            }
        });
    }

    private function rewriteOrders(): void
    {
        Order::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'shipping_address' => $record->shipping_address,
                    'billing_address' => $record->billing_address,
                    'customer_email' => $record->customer_email,
                    'customer_phone' => $record->customer_phone,
                    'notes' => $record->notes,
                ])->save();
            }
        });
    }

    private function rewriteConversationMessages(): void
    {
        ConversationMessage::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'body' => $record->body,
                ])->save();
            }
        });
    }

    private function rewriteNotifications(): void
    {
        UserNotification::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'title' => $record->title,
                    'message' => $record->message,
                    'meta' => $record->meta,
                ])->save();
            }
        });
    }

    private function rewriteWalletTransactions(): void
    {
        WalletTransaction::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'description' => $record->description,
                    'reference' => $record->reference,
                ])->save();
            }
        });
    }

    private function rewriteRefunds(): void
    {
        Refund::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'reason_description' => $record->reason_description,
                    'admin_notes' => $record->admin_notes,
                ])->save();
            }
        });
    }

    private function rewriteLoyaltyPoints(): void
    {
        LoyaltyPoint::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'description' => $record->description,
                    'metadata' => $record->metadata,
                ])->save();
            }
        });
    }

    private function rewriteAffiliates(): void
    {
        Affiliate::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'name' => $record->name,
                    'email' => $record->email,
                ])->save();
            }
        });
    }

    private function rewriteWholesaleCustomers(): void
    {
        WholesaleCustomer::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->forceFill([
                    'company' => $record->company,
                    'email' => $record->email,
                    'contact' => $record->contact,
                ])->save();
            }
        });
    }
};