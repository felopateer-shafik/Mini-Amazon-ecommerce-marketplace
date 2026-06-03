<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;
use Spatie\Permission\Models\Role;

$admin = User::find(User::resolveSystemAdminId());
$adminToken = $admin->createToken('test-role-update')->plainTextToken;

$baseUrl = 'http://localhost:8000/api/v1';
$role = Role::where('name', 'Felo Staff')->first();

echo "=== ROLE UPDATE TEST ===\n";
echo "Before: " . $role->permissions->pluck('name')->implode(', ') . "\n";

// Update the role to add view-users and view-products
$newPerms = ['view-dashboard', 'view-categories', 'edit-categories', 'view-users', 'view-products'];
$payload = json_encode(['permissions' => $newPerms]);

$opts = [
    'http' => [
        'method' => 'PUT',
        'header' => "Authorization: Bearer {$adminToken}\r\nAccept: application/json\r\nContent-Type: application/json\r\n",
        'content' => $payload,
        'ignore_errors' => true,
        'timeout' => 10,
    ],
];
$context = stream_context_create($opts);
$response = @file_get_contents("{$baseUrl}/admin/roles/{$role->id}", false, $context);
$httpCode = 0;
if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) {
    $httpCode = (int) $m[0];
}
echo "PUT /admin/roles/{$role->id}: HTTP {$httpCode}\n";
$decoded = json_decode($response, true);
if (isset($decoded['data']['permissions'])) {
    $perms = $decoded['data']['permissions'];
    if (is_array($perms)) {
        $names = array_map(fn($p) => is_array($p) ? ($p['name'] ?? '') : (string)$p, $perms);
        echo "API returned permissions: " . implode(', ', $names) . "\n";
    }
}

// Verify in DB
$role->refresh();
$role->load('permissions');
echo "After (DB): " . $role->permissions->pluck('name')->implode(', ') . "\n";

// Now test the staff user can access the new endpoints
$staff = User::role('Felo Staff')->first();
$staffToken = $staff->createToken('test-staff-updated')->plainTextToken;

// Need to clear Spatie's permission cache
app()->make(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

$opts2 = [
    'http' => [
        'method' => 'GET',
        'header' => "Authorization: Bearer {$staffToken}\r\nAccept: application/json\r\n",
        'ignore_errors' => true,
        'timeout' => 10,
    ],
];
$ctx2 = stream_context_create($opts2);

echo "\n=== POST-UPDATE STAFF TESTS ===\n";
$r1 = @file_get_contents("{$baseUrl}/admin/users", false, $ctx2);
$c1 = 0; if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) $c1 = (int)$m[0];
echo "  GET /admin/users (now has view-users): HTTP {$c1}\n";

$http_response_header = [];
$r2 = @file_get_contents("{$baseUrl}/admin/products", false, $ctx2);
$c2 = 0; if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) $c2 = (int)$m[0];
echo "  GET /admin/products (now has view-products): HTTP {$c2}\n";

$http_response_header = [];
$r3 = @file_get_contents("{$baseUrl}/admin/orders", false, $ctx2);
$c3 = 0; if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) $c3 = (int)$m[0];
echo "  GET /admin/orders (still NO view-orders): HTTP {$c3}\n";

// Revert permissions back
$role->syncPermissions(['view-dashboard', 'view-categories', 'edit-categories']);
echo "\nReverted permissions to original.\n";

// Clean up
$admin->tokens()->where('name', 'test-role-update')->delete();
$staff->tokens()->where('name', 'test-staff-updated')->delete();
echo "Done.\n";
