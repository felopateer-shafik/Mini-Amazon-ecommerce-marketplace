<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use App\Models\Vendor;

echo "=== Merchant Users Analysis ===\n";
echo "Total vendors: " . Vendor::count() . "\n";
echo "Users with vendor: " . User::has('vendor')->count() . "\n";
echo "Users with 'merchant' Spatie role: " . User::role('merchant')->count() . "\n\n";

echo "=== Users with vendor (their roles) ===\n";
User::has('vendor')->get()->each(function ($u) {
    $roles = $u->getRoleNames()->toArray();
    echo "User #{$u->id}: roles=[" . implode(',', $roles) . "]\n";
});

echo "\n=== All Roles in DB ===\n";
\Spatie\Permission\Models\Role::all()->each(function ($r) {
    echo "Role: {$r->name}, users_count=" . $r->users()->count() . "\n";
});
