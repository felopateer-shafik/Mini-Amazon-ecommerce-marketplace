<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Http\Kernel::class);
$app->boot();
$c = 0;
$users = \App\Models\User::whereHas('roles', function($q){ $q->where('name','admin'); })->orderBy('id')->get();
foreach($users as $u) {
    echo "ID:{$u->id} Name:{$u->name} Email:{$u->email}\n";
    if (++$c >= 3) break;
}
