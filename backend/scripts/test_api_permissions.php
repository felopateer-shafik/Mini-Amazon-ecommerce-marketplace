<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\User;

// Get system admin token
$admin = User::find(User::resolveSystemAdminId());
$adminToken = $admin->createToken('test-admin')->plainTextToken;

// Get staff user token (Felo Staff)
$staff = User::role('Felo Staff')->first();
$staffToken = $staff ? $staff->createToken('test-staff')->plainTextToken : null;

$baseUrl = 'http://localhost:8000/api/v1';

function apiTest($url, $token, $label) {
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "Authorization: Bearer {$token}\r\nAccept: application/json\r\n",
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ];
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    $httpCode = 0;
    if (isset($http_response_header[0]) && preg_match('/\d{3}/', $http_response_header[0], $m)) {
        $httpCode = (int) $m[0];
    }
    echo "  {$label}: HTTP {$httpCode}\n";
    return $httpCode;
}

echo "=== SYSTEM ADMIN TESTS ===\n";
apiTest("{$baseUrl}/admin/users", $adminToken, "GET /admin/users (needs view-users)");
apiTest("{$baseUrl}/admin/categories", $adminToken, "GET /admin/categories (needs view-categories)");
apiTest("{$baseUrl}/admin/settings", $adminToken, "GET /admin/settings (needs view-settings)");
apiTest("{$baseUrl}/admin/roles", $adminToken, "GET /admin/roles (needs view-roles)");
apiTest("{$baseUrl}/admin/analytics", $adminToken, "GET /admin/analytics (needs view-dashboard)");

if ($staffToken) {
    echo "\n=== STAFF USER TESTS (Felo Staff: view-dashboard, view-categories, edit-categories) ===\n";
    apiTest("{$baseUrl}/admin/analytics", $staffToken, "GET /admin/analytics (has view-dashboard)");
    apiTest("{$baseUrl}/admin/categories", $staffToken, "GET /admin/categories (has view-categories)");
    apiTest("{$baseUrl}/admin/users", $staffToken, "GET /admin/users (NO view-users)");
    apiTest("{$baseUrl}/admin/settings", $staffToken, "GET /admin/settings (NO view-settings)");
    apiTest("{$baseUrl}/admin/roles", $staffToken, "GET /admin/roles (NO view-roles)");
    apiTest("{$baseUrl}/admin/products", $staffToken, "GET /admin/products (NO view-products)");
    apiTest("{$baseUrl}/admin/orders", $staffToken, "GET /admin/orders (NO view-orders)");
    apiTest("{$baseUrl}/admin/staff", $staffToken, "GET /admin/staff (NO view-staff)");
}

// Clean up test tokens
$admin->tokens()->where('name', 'test-admin')->delete();
if ($staff) $staff->tokens()->where('name', 'test-staff')->delete();

echo "\nDone.\n";
