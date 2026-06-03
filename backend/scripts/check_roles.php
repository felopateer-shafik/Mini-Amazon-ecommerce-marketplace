<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$roles = \Spatie\Permission\Models\Role::with('permissions')
    ->where('guard_name', 'web')
    ->get();

foreach ($roles as $role) {
    echo $role->name . ': [' . $role->permissions->pluck('name')->join(', ') . "]\n";
}
