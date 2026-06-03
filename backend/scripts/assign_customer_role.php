<?php

require_once __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Http\Kernel::class)->bootstrap();

$count = \App\Models\User::doesntHave('roles')->count();
echo "Users with no role: $count\n";

\App\Models\User::doesntHave('roles')->with('roles')->each(function ($user) {
    $user->assignRole('customer');
    echo "Assigned customer to user ID: {$user->id}\n";
});

echo "Done.\n";
