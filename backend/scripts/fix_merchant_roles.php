<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$users = \App\Models\User::whereHas('vendor', function ($q) {
    $q->where('status', 'active');
})->get();

foreach ($users as $user) {
    $user->syncRoles(['merchant']);
    echo "Assigned merchant role to user #{$user->id} ({$user->name})\n";
}

echo "\nDone: {$users->count()} users assigned merchant role.\n";
