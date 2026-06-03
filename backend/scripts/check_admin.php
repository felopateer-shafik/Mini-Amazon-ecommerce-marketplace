<?php

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Http\Kernel::class)->bootstrap();

// Check admin user
$admin = \App\Models\User::with('roles')->where('email_hash', \App\Models\User::emailHashFor('admin@miniamazon.com'))->first();
if ($admin) {
    echo "Found admin: ID=" . $admin->id . "\n";
    echo "is_system_admin: " . ($admin->isSystemAdminAccount() ? 'true' : 'false') . "\n";
    echo "Role: " . optional($admin->roles->first())->name . "\n";
} else {
    echo "Admin user not found by email hash.\n";
    // Try to find first user
    $first = \App\Models\User::with('roles')->first();
    echo "First user ID: " . $first->id . "\n";
    echo "First user roles: " . $first->roles->pluck('name')->implode(', ') . "\n";
}

// Count all users
$total = \App\Models\User::count();
echo "Total users: $total\n";
$withRole = \App\Models\User::has('roles')->count();
echo "Users with roles: $withRole\n";
$withoutRole = \App\Models\User::doesntHave('roles')->count();
echo "Users without roles: $withoutRole\n";
