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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'email_hash')) {
            DB::statement('ALTER TABLE users ADD COLUMN email_hash TEXT NULL');
            DB::statement('CREATE UNIQUE INDEX users_email_hash_unique ON users (email_hash)');
        }

        if (!Schema::hasColumn('users', 'phone_hash')) {
            DB::statement('ALTER TABLE users ADD COLUMN phone_hash TEXT NULL');
            DB::statement('CREATE UNIQUE INDEX users_phone_hash_unique ON users (phone_hash)');
        }

        $alterStatements = [
            'ALTER TABLE users ALTER COLUMN name TYPE TEXT',
            'ALTER TABLE users ALTER COLUMN email TYPE TEXT',
            'ALTER TABLE users ALTER COLUMN phone TYPE TEXT',
            'ALTER TABLE users ALTER COLUMN date_of_birth TYPE TEXT USING date_of_birth::text',
            'ALTER TABLE addresses ALTER COLUMN label TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN first_name TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN last_name TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN phone TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN address_line_1 TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN address_line_2 TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN city TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN state TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN postal_code TYPE TEXT',
            'ALTER TABLE addresses ALTER COLUMN country TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN business_name TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN store_name TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN description TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN email TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN phone TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN address TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN city TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN state TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN country TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN postal_code TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN tax_id TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN bank_name TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN account_name TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN account_number TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN iban TYPE TEXT',
            'ALTER TABLE vendors ALTER COLUMN rejection_reason TYPE TEXT',
            'ALTER TABLE orders ALTER COLUMN customer_email TYPE TEXT',
            'ALTER TABLE orders ALTER COLUMN customer_phone TYPE TEXT',
            'ALTER TABLE user_notifications ALTER COLUMN title TYPE TEXT',
            'ALTER TABLE wallet_transactions ALTER COLUMN reference TYPE TEXT',
            'ALTER TABLE affiliates ALTER COLUMN name TYPE TEXT',
            'ALTER TABLE affiliates ALTER COLUMN email TYPE TEXT',
            'ALTER TABLE wholesale_customers ALTER COLUMN company TYPE TEXT',
            'ALTER TABLE wholesale_customers ALTER COLUMN email TYPE TEXT',
            'ALTER TABLE wholesale_customers ALTER COLUMN contact TYPE TEXT',
        ];

        foreach ($alterStatements as $statement) {
            try {
                DB::statement($statement);
            } catch (\Throwable) {
                // Skip if already altered.
            }
        }

        $this->encryptExistingRecords();
    }

    public function down(): void
    {
        // Encrypted data migration is intentionally irreversible.
    }

    private function encryptExistingRecords(): void
    {
        User::query()->orderBy('id')->chunkById(100, function ($users): void {
            foreach ($users as $user) {
                $user->save();
            }
        });

        Address::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        Vendor::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        Order::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        ConversationMessage::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        UserNotification::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        WalletTransaction::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        Refund::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        LoyaltyPoint::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        Affiliate::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });

        WholesaleCustomer::query()->orderBy('id')->chunkById(100, function ($records): void {
            foreach ($records as $record) {
                $record->save();
            }
        });
    }
};