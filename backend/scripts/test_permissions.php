<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Spatie\Permission\Models\Role;

// Find the system admin
$adminId = User::resolveSystemAdminId();
$admin = User::find($adminId);
echo "System Admin: id={$admin->id}, name={$admin->name}\n";
echo "  isSystemAdminAccount: " . ($admin->isSystemAdminAccount() ? 'true' : 'false') . "\n";
echo "  Roles: " . $admin->getRoleNames()->implode(', ') . "\n";
echo "  Direct Permissions: " . $admin->getDirectPermissions()->pluck('name')->implode(', ') . "\n";
echo "  All Permissions: " . $admin->getAllPermissions()->pluck('name')->implode(', ') . "\n";

// Test Gate::before for system admin
echo "\n--- Gate Tests for System Admin ---\n";
$tests = ['view-users', 'edit-users', 'delete-users', 'manage-system', 'view-products', 'edit-settings'];
foreach ($tests as $perm) {
    $result = $admin->can($perm) ? 'ALLOWED' : 'DENIED';
    echo "  {$perm}: {$result}\n";
}

// Find staff users
echo "\n--- Staff Users with Roles ---\n";
$staffRole = Role::where('name', 'Felo Staff')->first();
if ($staffRole) {
    $staffUsers = User::role('Felo Staff')->get();
    foreach ($staffUsers as $u) {
        echo "  User: id={$u->id}, name={$u->name}\n";
        echo "    can(view-dashboard): " . ($u->can('view-dashboard') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(view-categories): " . ($u->can('view-categories') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(edit-categories): " . ($u->can('edit-categories') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(view-users): " . ($u->can('view-users') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(edit-users): " . ($u->can('edit-users') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(delete-products): " . ($u->can('delete-products') ? 'ALLOWED' : 'DENIED') . "\n";
        echo "    can(manage-system): " . ($u->can('manage-system') ? 'ALLOWED' : 'DENIED') . "\n";
    }
} else {
    echo "  No 'Felo Staff' role found\n";
}

echo "\nDone.\n";
