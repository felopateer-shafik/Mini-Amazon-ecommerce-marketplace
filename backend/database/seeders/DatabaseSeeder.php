<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductVariant;
use App\Models\Review;
use App\Models\Vendor;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Real product images organized by category (high-quality Unsplash photos)
     */
    private array $productImages = [
        // SHOES
        'Nike Air Max 270' => [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=600&fit=crop',
        ],
        'Adidas Ultraboost 23' => [
            'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1588361861040-ac9b1018f6d5?w=600&h=600&fit=crop',
        ],
        'Puma RS-X Reinvention' => [
            'https://images.unsplash.com/photo-1608379743498-63cc1e13d6ca?w=600&h=600&fit=crop',
        ],
        'Skechers Go Walk 7' => [
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=600&fit=crop',
        ],
        'New Balance 574 Classic' => [
            'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=600&fit=crop',
        ],
        'Nike Air Force 1 Low' => [
            'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=600&h=600&fit=crop',
        ],
        'Clarks Desert Boot' => [
            'https://images.unsplash.com/photo-1638953887868-8cafe9960754?w=600&h=600&fit=crop',
        ],
        'Converse Chuck Taylor All Star' => [
            'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600&h=600&fit=crop',
        ],

        // CLOTHING
        'Classic Cotton Polo Shirt' => [
            'https://images.unsplash.com/photo-1625910513413-5fc2b02e52a0?w=600&h=600&fit=crop',
        ],
        'Elegant Summer Dress' => [
            'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=600&fit=crop',
        ],
        'Slim Fit Jeans' => [
            'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop',
        ],
        'Linen Summer Shirt' => [
            'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&h=600&fit=crop',
        ],
        'Abaya Modern Design' => [
            'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?w=600&h=600&fit=crop',
        ],
        'Kids Tracksuit Set' => [
            'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=600&h=600&fit=crop',
        ],
        'Formal Business Suit' => [
            'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=600&fit=crop',
        ],
        'Cotton Hijab Set 3-Pack' => [
            'https://images.unsplash.com/photo-1553531384-cc64ac80f931?w=600&h=600&fit=crop',
        ],

        // ELECTRONICS
        'Samsung Galaxy S24 Ultra' => [
            'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop',
        ],
        'MacBook Pro 16 M3 Max' => [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&h=600&fit=crop',
        ],
        'iPhone 15 Pro Max' => [
            'https://images.unsplash.com/photo-1592286927505-1def25115558?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1580910051074-3eb694886f6b?w=600&h=600&fit=crop',
        ],
        'Sony WH-1000XM5' => [
            'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=600&fit=crop',
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
        ],
        'iPad Air M2' => [
            'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&h=600&fit=crop',
        ],
        'Samsung 65 QLED 4K TV' => [
            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&h=600&fit=crop',
        ],
        'Dell XPS 15 Laptop' => [
            'https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=600&h=600&fit=crop',
        ],
        'AirPods Pro 2nd Gen' => [
            'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600&h=600&fit=crop',
        ],
        'PlayStation 5 Console' => [
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&h=600&fit=crop',
        ],
        'Canon EOS R50 Camera' => [
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&h=600&fit=crop',
        ],

        // HOME & GARDEN
        'Stainless Steel Cookware Set' => [
            'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop',
        ],
        'Memory Foam King Mattress' => [
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&h=600&fit=crop',
        ],
        'Robot Vacuum Cleaner' => [
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop',
        ],
        'LED Ceiling Light Modern' => [
            'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600&h=600&fit=crop',
        ],
        'Egyptian Cotton Bedsheet Set' => [
            'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=600&fit=crop',
        ],
        'Air Fryer XXL 5.5L' => [
            'https://images.unsplash.com/photo-1648455326620-65d90a1bffa1?w=600&h=600&fit=crop',
        ],
        'Garden Tool Set 12-Piece' => [
            'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop',
        ],
        'Espresso Coffee Machine' => [
            'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&h=600&fit=crop',
        ],

        // BEAUTY
        'Vitamin C Serum 30ml' => [
            'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop',
        ],
        'Retinol Night Cream' => [
            'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&h=600&fit=crop',
        ],
        'MAC Ruby Woo Lipstick' => [
            'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&h=600&fit=crop',
        ],
        'Moroccan Argan Oil 100ml' => [
            'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop',
        ],
        'SPF 50 Sunscreen Lotion' => [
            'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop',
        ],
        'Professional Hair Dryer' => [
            'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=600&fit=crop',
        ],

        // SPORTS
        'Adjustable Dumbbell Set 20kg' => [
            'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=600&fit=crop',
        ],
        'Yoga Mat Premium 6mm' => [
            'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=600&h=600&fit=crop',
        ],
        'Running Treadmill T500' => [
            'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=600&h=600&fit=crop',
        ],
        'Football Adidas UCL Pro' => [
            'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=600&h=600&fit=crop',
        ],
        'Camping Tent 4-Person' => [
            'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&h=600&fit=crop',
        ],
        'Resistance Band Set' => [
            'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=600&h=600&fit=crop',
        ],

        // BOOKS
        'The Yacoubian Building' => [
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=600&fit=crop',
        ],
        'Atomic Habits' => [
            'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&h=600&fit=crop',
        ],
        'The Alchemist' => [
            'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=600&fit=crop',
        ],
        'Holy Quran Leather Cover' => [
            'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?w=600&h=600&fit=crop',
        ],
        'Python Programming Guide' => [
            'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&h=600&fit=crop',
        ],

        // TOYS
        'LEGO City Police Station' => [
            'https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?w=600&h=600&fit=crop',
        ],
        'Remote Control Car 4WD' => [
            'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=600&fit=crop',
        ],
        'Board Game Collection' => [
            'https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=600&h=600&fit=crop',
        ],
        'Educational Tablet Kids' => [
            'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=600&h=600&fit=crop',
        ],
        'Plush Teddy Bear Giant' => [
            'https://images.unsplash.com/photo-1559715541-5daf8a0296d0?w=600&h=600&fit=crop',
        ],

        // AUTOMOTIVE
        'Car Dash Camera 4K' => [
            'https://images.unsplash.com/photo-1621266876144-1a58791e6746?w=600&h=600&fit=crop',
        ],
        'Premium Car Seat Cover Set' => [
            'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=600&h=600&fit=crop',
        ],
        'Portable Air Compressor' => [
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop',
        ],
        'LED Car Interior Lights' => [
            'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&h=600&fit=crop',
        ],

        // HEALTH
        'Digital Blood Pressure Monitor' => [
            'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&h=600&fit=crop',
        ],
        'Vitamin D3 5000 IU 120 caps' => [
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop',
        ],
        'Whey Protein Isolate 2kg' => [
            'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600&h=600&fit=crop',
        ],
        'Pulse Oximeter' => [
            'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&h=600&fit=crop',
        ],
        'Essential Oils Diffuser' => [
            'https://images.unsplash.com/photo-1602928309765-8dd8fdd38d6c?w=600&h=600&fit=crop',
        ],

        // GROCERY
        'Egyptian Honey Pure 1kg' => [
            'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&h=600&fit=crop',
        ],
        'Medjool Dates Premium 1kg' => [
            'https://images.unsplash.com/photo-1597714026720-8f74c62310ba?w=600&h=600&fit=crop',
        ],
        'Extra Virgin Olive Oil 1L' => [
            'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&h=600&fit=crop',
        ],
        'Mixed Nuts Premium 500g' => [
            'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&h=600&fit=crop',
        ],
        'Egyptian Tea Blend 250g' => [
            'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop',
        ],
        'Tahini Paste 400g' => [
            'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&h=600&fit=crop',
        ],
    ];

    /** Category images */
    private array $categoryImages = [
        'shoes'       => 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        'clothing'    => 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop',
        'electronics' => 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop',
        'home-garden' => 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400&h=400&fit=crop',
        'beauty'      => 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
        'sports'      => 'https://images.unsplash.com/photo-1461896836934-bd45ba8b2cda?w=400&h=400&fit=crop',
        'books'       => 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=400&fit=crop',
        'toys'        => 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&h=400&fit=crop',
        'automotive'  => 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400&h=400&fit=crop',
        'health'      => 'https://images.unsplash.com/photo-1505576399279-0a06b2d6b7b0?w=400&h=400&fit=crop',
        'grocery'     => 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop',
    ];

    public function run(): void
    {
        $this->command->info('Seeding database...');

        // ══════════════════════════════════════════════════════════
        // ROLES & PERMISSIONS
        // ══════════════════════════════════════════════════════════
        $adminRole    = Role::firstOrCreate(['name' => 'admin',    'guard_name' => 'web']);
        $merchantRole = Role::firstOrCreate(['name' => 'merchant', 'guard_name' => 'web']);
        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $staffRole    = Role::firstOrCreate(['name' => 'staff',    'guard_name' => 'web']);

        $this->command->info('Roles created');

        // ══════════════════════════════════════════════════════════
        // USERS
        // ══════════════════════════════════════════════════════════
        $admin = User::firstOrCreate(
            ['email' => 'admin@marketplace.com'],
            ['name' => 'Admin User', 'password' => bcrypt('password'), 'email_verified_at' => now()]
        );
        $admin->forceFill([
            'email_hash' => User::emailHashFor($admin->email),
            'phone_hash' => User::phoneHashFor($admin->phone),
        ])->saveQuietly();
        $admin->syncRoles($adminRole);

        $staff1 = User::firstOrCreate(
            ['email' => 'staff@marketplace.com'],
            ['name' => 'Support Staff', 'password' => bcrypt('password'), 'email_verified_at' => now()]
        );
        $staff1->forceFill([
            'email_hash' => User::emailHashFor($staff1->email),
            'phone_hash' => User::phoneHashFor($staff1->phone),
        ])->saveQuietly();
        $staff1->syncRoles($staffRole);

        // Merchants
        $merchantUsers = [];
        $merchantData = [
            ['email' => 'merchant@marketplace.com',  'name' => 'Ahmed Electronics'],
            ['email' => 'merchant2@marketplace.com', 'name' => 'Sara Fashion House'],
            ['email' => 'merchant3@marketplace.com', 'name' => 'Cairo Home Store'],
            ['email' => 'merchant4@marketplace.com', 'name' => 'Nile Sports'],
            ['email' => 'merchant5@marketplace.com', 'name' => 'Beauty Palace Egypt'],
            ['email' => 'merchant6@marketplace.com', 'name' => 'BookWorm Egypt'],
        ];
        foreach ($merchantData as $m) {
            $u = User::firstOrCreate(['email' => $m['email']], [
                'name' => $m['name'], 'password' => bcrypt('password'), 'email_verified_at' => now(),
            ]);
            $u->forceFill([
                'email_hash' => User::emailHashFor($u->email),
                'phone_hash' => User::phoneHashFor($u->phone),
            ])->saveQuietly();
            $u->syncRoles($merchantRole);
            $merchantUsers[] = $u;
        }

        // Customers
        $customers = [];
        $customerData = [
            ['email' => 'customer@marketplace.com',  'name' => 'Mohamed Ali'],
            ['email' => 'customer2@marketplace.com', 'name' => 'Fatma Hassan'],
            ['email' => 'customer3@marketplace.com', 'name' => 'Omar Khaled'],
            ['email' => 'customer4@marketplace.com', 'name' => 'Nour Ibrahim'],
            ['email' => 'customer5@marketplace.com', 'name' => 'Yasmin Mostafa'],
        ];
        foreach ($customerData as $c) {
            $u = User::firstOrCreate(['email' => $c['email']], [
                'name' => $c['name'], 'password' => bcrypt('password'), 'email_verified_at' => now(),
            ]);
            $u->forceFill([
                'email_hash' => User::emailHashFor($u->email),
                'phone_hash' => User::phoneHashFor($u->phone),
            ])->saveQuietly();
            $u->syncRoles($customerRole);
            $customers[] = $u;
        }

        $this->command->info('Users created');

        // ══════════════════════════════════════════════════════════
        // VENDORS
        // ══════════════════════════════════════════════════════════
        $vendorData = [
            ['user' => $merchantUsers[0], 'business' => 'Ahmed Electronics Store',  'slug' => 'ahmed-electronics',  'desc' => 'Best electronics in Egypt',          'city' => 'Cairo',       'rating' => 4.5, 'commission' => 10],
            ['user' => $merchantUsers[1], 'business' => 'Sara Fashion House',        'slug' => 'sara-fashion',       'desc' => 'Trendy fashion for everyone',         'city' => 'Alexandria',  'rating' => 4.2, 'commission' => 12],
            ['user' => $merchantUsers[2], 'business' => 'Cairo Home Store',          'slug' => 'cairo-home',         'desc' => 'Home and garden essentials',           'city' => 'Cairo',       'rating' => 4.0, 'commission' => 10],
            ['user' => $merchantUsers[3], 'business' => 'Nile Sports',               'slug' => 'nile-sports',        'desc' => 'Sports equipment and outdoor gear',    'city' => 'Giza',        'rating' => 4.3, 'commission' => 11],
            ['user' => $merchantUsers[4], 'business' => 'Beauty Palace Egypt',       'slug' => 'beauty-palace',      'desc' => 'Premium beauty and skincare products', 'city' => 'Cairo',       'rating' => 4.6, 'commission' => 15],
            ['user' => $merchantUsers[5], 'business' => 'BookWorm Egypt',            'slug' => 'bookworm-egypt',     'desc' => 'Books, toys and educational materials','city' => 'Mansoura',    'rating' => 4.1, 'commission' => 8],
        ];
        $vendors = [];
        foreach ($vendorData as $v) {
            $vendors[] = Vendor::firstOrCreate(['user_id' => $v['user']->id], [
                'business_name'   => $v['business'],
                'store_name'      => $v['business'],
                'slug'            => $v['slug'],
                'description'     => $v['desc'],
                'email'           => $v['user']->email,
                'phone'           => '+20' . rand(1000000000, 1999999999),
                'address'         => $v['city'] . ', Egypt',
                'city'            => $v['city'],
                'country'         => 'Egypt',
                'commission_rate' => $v['commission'],
                'is_active'       => true,
                'status'          => 'active',
                'is_verified'     => true,
                'rating'          => $v['rating'],
            ]);
        }

        $this->command->info('Vendors created');

        // ══════════════════════════════════════════════════════════
        // CATEGORIES (matching frontend categoryFilters.js)
        // ══════════════════════════════════════════════════════════
        $cats = [];

        $catDef = [
            ['slug' => 'shoes',        'name' => 'Shoes',              'name_ar' => 'أحذية',              'icon' => 'shoe',      'order' => 1],
            ['slug' => 'clothing',     'name' => 'Clothing',           'name_ar' => 'ملابس',              'icon' => 'shirt',     'order' => 2],
            ['slug' => 'electronics',  'name' => 'Electronics',        'name_ar' => 'إلكترونيات',         'icon' => 'cpu',       'order' => 3],
            ['slug' => 'home-garden',  'name' => 'Home & Garden',      'name_ar' => 'المنزل والحديقة',    'icon' => 'home',      'order' => 4],
            ['slug' => 'beauty',       'name' => 'Beauty & Personal Care','name_ar' => 'جمال وعناية شخصية','icon' => 'sparkles',  'order' => 5],
            ['slug' => 'sports',       'name' => 'Sports & Outdoors',  'name_ar' => 'رياضة وأنشطة خارجية','icon' => 'dumbbell',  'order' => 6],
            ['slug' => 'books',        'name' => 'Books',              'name_ar' => 'كتب',                'icon' => 'book-open', 'order' => 7],
            ['slug' => 'toys',         'name' => 'Toys & Games',       'name_ar' => 'ألعاب',              'icon' => 'gamepad-2', 'order' => 8],
            ['slug' => 'automotive',   'name' => 'Automotive',         'name_ar' => 'سيارات',             'icon' => 'car',       'order' => 9],
            ['slug' => 'health',       'name' => 'Health & Wellness',  'name_ar' => 'صحة وعافية',         'icon' => 'heart-pulse','order' => 10],
            ['slug' => 'grocery',      'name' => 'Grocery & Gourmet',  'name_ar' => 'بقالة وأطعمة فاخرة', 'icon' => 'shopping-basket','order' => 11],
        ];

        foreach ($catDef as $cd) {
            $cats[$cd['slug']] = Category::firstOrCreate(['slug' => $cd['slug']], [
                'name'        => $cd['name'],
                'name_ar'     => $cd['name_ar'],
                'description' => $cd['name'] . ' products',
                'icon'        => $cd['icon'],
                'image'       => $this->categoryImages[$cd['slug']] ?? null,
                'is_active'   => true,
                'sort_order'  => $cd['order'],
            ]);
        }

        // Sub-categories
        $subCats = [
            ['slug' => 'men-shoes',      'name' => "Men's Shoes",       'name_ar' => 'أحذية رجالية',      'parent' => 'shoes'],
            ['slug' => 'women-shoes',    'name' => "Women's Shoes",     'name_ar' => 'أحذية نسائية',      'parent' => 'shoes'],
            ['slug' => 'kids-shoes',     'name' => "Kids' Shoes",       'name_ar' => 'أحذية أطفال',       'parent' => 'shoes'],
            ['slug' => 'men-clothing',   'name' => "Men's Clothing",    'name_ar' => 'ملابس رجالية',      'parent' => 'clothing'],
            ['slug' => 'women-clothing', 'name' => "Women's Clothing",  'name_ar' => 'ملابس نسائية',      'parent' => 'clothing'],
            ['slug' => 'phones',         'name' => 'Phones & Tablets',  'name_ar' => 'هواتف وأجهزة لوحية','parent' => 'electronics'],
            ['slug' => 'laptops',        'name' => 'Laptops',           'name_ar' => 'أجهزة لابتوب',      'parent' => 'electronics'],
            ['slug' => 'headphones',     'name' => 'Headphones',        'name_ar' => 'سماعات',            'parent' => 'electronics'],
            ['slug' => 'kitchen',        'name' => 'Kitchen',           'name_ar' => 'مطبخ',              'parent' => 'home-garden'],
            ['slug' => 'furniture',      'name' => 'Furniture',         'name_ar' => 'أثاث',              'parent' => 'home-garden'],
            ['slug' => 'skincare',       'name' => 'Skincare',          'name_ar' => 'عناية بالبشرة',     'parent' => 'beauty'],
            ['slug' => 'makeup',         'name' => 'Makeup',            'name_ar' => 'مكياج',             'parent' => 'beauty'],
            ['slug' => 'fitness',        'name' => 'Fitness',           'name_ar' => 'لياقة بدنية',       'parent' => 'sports'],
        ];
        foreach ($subCats as $sc) {
            $cats[$sc['slug']] = Category::firstOrCreate(['slug' => $sc['slug']], [
                'name'      => $sc['name'],
                'name_ar'   => $sc['name_ar'],
                'parent_id' => $cats[$sc['parent']]->id,
                'is_active'  => true,
                'sort_order' => 1,
            ]);
        }

        $this->command->info('Categories created (' . count($cats) . ')');

        // ══════════════════════════════════════════════════════════
        // PRODUCTS
        // ══════════════════════════════════════════════════════════
        $allProducts = [];
        $skuCounter = 1;

        $productDefinitions = [
            // SHOES
            ['cat' => 'shoes', 'vendor' => 0, 'items' => [
                ['name' => 'Nike Air Max 270', 'price' => 4599, 'compare' => 5299, 'featured' => true,
                 'desc' => 'Iconic Nike Air Max 270 with visible Air unit for all-day comfort.',
                 'attrs' => ['brand' => 'Nike', 'gender' => 'men', 'material' => 'mesh', 'color' => 'Black/White', 'shoe_type' => 'sneakers', 'sizes' => '40,41,42,43,44,45']],
                ['name' => 'Adidas Ultraboost 23', 'price' => 5999, 'compare' => 6999, 'featured' => true,
                 'desc' => 'Premium Adidas running shoes with Boost midsole technology.',
                 'attrs' => ['brand' => 'Adidas', 'gender' => 'men', 'material' => 'primeknit', 'color' => 'Core Black', 'shoe_type' => 'running', 'sizes' => '40,41,42,43,44']],
                ['name' => 'Puma RS-X Reinvention', 'price' => 3299, 'compare' => 3999, 'featured' => false,
                 'desc' => 'Retro-inspired Puma sneakers with chunky sole.',
                 'attrs' => ['brand' => 'Puma', 'gender' => 'unisex', 'material' => 'synthetic', 'color' => 'White/Blue', 'shoe_type' => 'sneakers', 'sizes' => '38,39,40,41,42,43']],
                ['name' => 'Skechers Go Walk 7', 'price' => 2499, 'compare' => 2999, 'featured' => false,
                 'desc' => 'Ultra-comfortable walking shoes with air-cooled foam insole.',
                 'attrs' => ['brand' => 'Skechers', 'gender' => 'women', 'material' => 'mesh', 'color' => 'Gray/Pink', 'shoe_type' => 'walking', 'sizes' => '36,37,38,39,40']],
                ['name' => 'New Balance 574 Classic', 'price' => 3799, 'compare' => 4299, 'featured' => false,
                 'desc' => 'Timeless New Balance 574 for everyday style and comfort.',
                 'attrs' => ['brand' => 'New Balance', 'gender' => 'unisex', 'material' => 'suede', 'color' => 'Navy/Gray', 'shoe_type' => 'sneakers', 'sizes' => '39,40,41,42,43,44']],
                ['name' => 'Nike Air Force 1 Low', 'price' => 3999, 'compare' => 4599, 'featured' => true,
                 'desc' => 'The legendary Nike Air Force 1 in classic white.',
                 'attrs' => ['brand' => 'Nike', 'gender' => 'unisex', 'material' => 'leather', 'color' => 'White', 'shoe_type' => 'sneakers', 'sizes' => '38,39,40,41,42,43,44,45']],
                ['name' => 'Clarks Desert Boot', 'price' => 5499, 'compare' => 6499, 'featured' => false,
                 'desc' => 'Classic Clarks desert boot in premium suede.',
                 'attrs' => ['brand' => 'Clarks', 'gender' => 'men', 'material' => 'suede', 'color' => 'Sand', 'shoe_type' => 'boots', 'sizes' => '40,41,42,43,44']],
                ['name' => 'Converse Chuck Taylor All Star', 'price' => 1999, 'compare' => 2499, 'featured' => false,
                 'desc' => 'The iconic Converse high-top sneaker.',
                 'attrs' => ['brand' => 'Converse', 'gender' => 'unisex', 'material' => 'canvas', 'color' => 'Black', 'shoe_type' => 'sneakers', 'sizes' => '36,37,38,39,40,41,42,43,44']],
            ]],
            // CLOTHING
            ['cat' => 'clothing', 'vendor' => 1, 'items' => [
                ['name' => 'Classic Cotton Polo Shirt', 'price' => 599, 'compare' => 799, 'featured' => false,
                 'desc' => 'Premium Egyptian cotton polo shirt for everyday elegance.',
                 'attrs' => ['brand' => 'Local Brand', 'gender' => 'men', 'material' => 'cotton', 'color' => 'White', 'clothing_type' => 'shirts', 'sizes' => 'S,M,L,XL,XXL']],
                ['name' => 'Elegant Summer Dress', 'price' => 1299, 'compare' => 1599, 'featured' => true,
                 'desc' => 'Beautiful floral summer dress perfect for all occasions.',
                 'attrs' => ['brand' => 'Sara Fashion', 'gender' => 'women', 'material' => 'chiffon', 'color' => 'Floral Print', 'clothing_type' => 'dresses', 'sizes' => 'S,M,L,XL']],
                ['name' => 'Slim Fit Jeans', 'price' => 899, 'compare' => 1199, 'featured' => false,
                 'desc' => 'Modern slim fit denim jeans with stretch comfort.',
                 'attrs' => ['brand' => 'Local Brand', 'gender' => 'men', 'material' => 'denim', 'color' => 'Dark Blue', 'clothing_type' => 'jeans', 'sizes' => '28,30,32,34,36']],
                ['name' => 'Linen Summer Shirt', 'price' => 749, 'compare' => 999, 'featured' => false,
                 'desc' => 'Breathable linen shirt for hot Egyptian summers.',
                 'attrs' => ['brand' => 'Local Brand', 'gender' => 'men', 'material' => 'linen', 'color' => 'Light Blue', 'clothing_type' => 'shirts', 'sizes' => 'M,L,XL,XXL']],
                ['name' => 'Abaya Modern Design', 'price' => 1899, 'compare' => 2299, 'featured' => true,
                 'desc' => 'Modern stylish abaya with elegant embroidery.',
                 'attrs' => ['brand' => 'Sara Fashion', 'gender' => 'women', 'material' => 'crepe', 'color' => 'Black', 'clothing_type' => 'traditional', 'sizes' => 'S,M,L,XL']],
                ['name' => 'Kids Tracksuit Set', 'price' => 499, 'compare' => 699, 'featured' => false,
                 'desc' => 'Comfortable cotton tracksuit for active kids.',
                 'attrs' => ['brand' => 'Local Brand', 'gender' => 'kids', 'material' => 'cotton', 'color' => 'Navy/Red', 'clothing_type' => 'activewear', 'sizes' => '4Y,6Y,8Y,10Y,12Y']],
                ['name' => 'Formal Business Suit', 'price' => 3999, 'compare' => 4999, 'featured' => false,
                 'desc' => 'Two-piece formal suit in premium wool blend.',
                 'attrs' => ['brand' => 'Local Brand', 'gender' => 'men', 'material' => 'wool', 'color' => 'Charcoal', 'clothing_type' => 'suits', 'sizes' => '48,50,52,54']],
                ['name' => 'Cotton Hijab Set 3-Pack', 'price' => 299, 'compare' => 399, 'featured' => false,
                 'desc' => 'Premium cotton hijab set in complementary colors.',
                 'attrs' => ['brand' => 'Sara Fashion', 'gender' => 'women', 'material' => 'cotton', 'color' => 'Assorted', 'clothing_type' => 'accessories', 'sizes' => 'One Size']],
            ]],
            // ELECTRONICS
            ['cat' => 'electronics', 'vendor' => 0, 'items' => [
                ['name' => 'Samsung Galaxy S24 Ultra', 'price' => 45999, 'compare' => 49999, 'featured' => true,
                 'desc' => 'The latest Samsung flagship with AI features, S Pen, and 200MP camera.',
                 'attrs' => ['brand' => 'Samsung', 'type' => 'smartphones', 'storage' => '256GB', 'ram' => '12GB', 'screen_size' => '6.8"', 'connectivity' => '5G']],
                ['name' => 'MacBook Pro 16 M3 Max', 'price' => 129999, 'compare' => 139999, 'featured' => true,
                 'desc' => 'Professional laptop for creators with M3 Max chip.',
                 'attrs' => ['brand' => 'Apple', 'type' => 'laptops', 'storage' => '1TB', 'ram' => '36GB', 'screen_size' => '16.2"', 'processor' => 'M3 Max']],
                ['name' => 'iPhone 15 Pro Max', 'price' => 59999, 'compare' => 64999, 'featured' => true,
                 'desc' => 'Apple flagship with A17 Pro chip and titanium design.',
                 'attrs' => ['brand' => 'Apple', 'type' => 'smartphones', 'storage' => '256GB', 'ram' => '8GB', 'screen_size' => '6.7"', 'connectivity' => '5G']],
                ['name' => 'Sony WH-1000XM5', 'price' => 8999, 'compare' => 10999, 'featured' => true,
                 'desc' => 'Industry-leading noise canceling wireless headphones.',
                 'attrs' => ['brand' => 'Sony', 'type' => 'headphones', 'connectivity' => 'bluetooth', 'features' => 'noise-canceling,wireless']],
                ['name' => 'iPad Air M2', 'price' => 24999, 'compare' => 27999, 'featured' => false,
                 'desc' => 'Versatile Apple tablet with M2 chip for work and play.',
                 'attrs' => ['brand' => 'Apple', 'type' => 'tablets', 'storage' => '128GB', 'screen_size' => '10.9"', 'connectivity' => 'WiFi']],
                ['name' => 'Samsung 65 QLED 4K TV', 'price' => 34999, 'compare' => 42999, 'featured' => false,
                 'desc' => 'Stunning 4K QLED smart TV with Quantum Processor.',
                 'attrs' => ['brand' => 'Samsung', 'type' => 'tvs', 'screen_size' => '65"', 'resolution' => '4K', 'features' => 'smart-tv,hdr']],
                ['name' => 'Dell XPS 15 Laptop', 'price' => 54999, 'compare' => 59999, 'featured' => false,
                 'desc' => 'Compact 15-inch laptop with Intel Core i7 and OLED display.',
                 'attrs' => ['brand' => 'Dell', 'type' => 'laptops', 'storage' => '512GB', 'ram' => '16GB', 'screen_size' => '15.6"', 'processor' => 'Intel i7']],
                ['name' => 'AirPods Pro 2nd Gen', 'price' => 8499, 'compare' => 9499, 'featured' => false,
                 'desc' => 'Premium wireless earbuds with adaptive audio and USB-C.',
                 'attrs' => ['brand' => 'Apple', 'type' => 'headphones', 'connectivity' => 'bluetooth', 'features' => 'noise-canceling,wireless']],
                ['name' => 'PlayStation 5 Console', 'price' => 24999, 'compare' => 27999, 'featured' => true,
                 'desc' => 'Next-gen Sony gaming console with ultra-fast SSD.',
                 'attrs' => ['brand' => 'Sony', 'type' => 'gaming', 'storage' => '825GB', 'features' => '4K,ray-tracing']],
                ['name' => 'Canon EOS R50 Camera', 'price' => 29999, 'compare' => 34999, 'featured' => false,
                 'desc' => 'Mirrorless camera for content creators and enthusiasts.',
                 'attrs' => ['brand' => 'Canon', 'type' => 'cameras', 'features' => '4K-video,24.2MP']],
            ]],
            // HOME & GARDEN
            ['cat' => 'home-garden', 'vendor' => 2, 'items' => [
                ['name' => 'Stainless Steel Cookware Set', 'price' => 3499, 'compare' => 4299, 'featured' => true,
                 'desc' => '10-piece professional cookware set for the modern kitchen.',
                 'attrs' => ['brand' => 'Tefal', 'type' => 'cookware', 'material' => 'stainless-steel', 'room' => 'kitchen']],
                ['name' => 'Memory Foam King Mattress', 'price' => 8999, 'compare' => 11999, 'featured' => true,
                 'desc' => 'Premium memory foam mattress for a restful sleep.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'bedding', 'material' => 'memory-foam', 'room' => 'bedroom', 'size' => 'King']],
                ['name' => 'Robot Vacuum Cleaner', 'price' => 7999, 'compare' => 9999, 'featured' => false,
                 'desc' => 'Smart robot vacuum with mapping and app control.',
                 'attrs' => ['brand' => 'Xiaomi', 'type' => 'cleaning', 'features' => 'smart-home,app-control', 'room' => 'living-room']],
                ['name' => 'LED Ceiling Light Modern', 'price' => 1299, 'compare' => 1799, 'featured' => false,
                 'desc' => 'Modern LED ceiling light with dimmable warm/cool white.',
                 'attrs' => ['brand' => 'Philips', 'type' => 'lighting', 'room' => 'living-room', 'style' => 'modern']],
                ['name' => 'Egyptian Cotton Bedsheet Set', 'price' => 1899, 'compare' => 2499, 'featured' => false,
                 'desc' => '1000 thread count Egyptian cotton bedsheet set.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'bedding', 'material' => 'egyptian-cotton', 'room' => 'bedroom']],
                ['name' => 'Air Fryer XXL 5.5L', 'price' => 3999, 'compare' => 4999, 'featured' => true,
                 'desc' => 'Large capacity digital air fryer for healthy cooking.',
                 'attrs' => ['brand' => 'Philips', 'type' => 'kitchen-appliances', 'features' => 'digital,large-capacity', 'room' => 'kitchen']],
                ['name' => 'Garden Tool Set 12-Piece', 'price' => 799, 'compare' => 999, 'featured' => false,
                 'desc' => 'Complete garden tool set with carrying case.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'garden-tools', 'material' => 'steel', 'room' => 'garden']],
                ['name' => 'Espresso Coffee Machine', 'price' => 12999, 'compare' => 14999, 'featured' => false,
                 'desc' => 'Professional espresso machine with built-in grinder.',
                 'attrs' => ['brand' => 'DeLonghi', 'type' => 'coffee-machines', 'features' => 'built-in-grinder,15-bar', 'room' => 'kitchen']],
            ]],
            // BEAUTY
            ['cat' => 'beauty', 'vendor' => 4, 'items' => [
                ['name' => 'Vitamin C Serum 30ml', 'price' => 499, 'compare' => 699, 'featured' => true,
                 'desc' => 'Brightening Vitamin C serum for radiant skin.',
                 'attrs' => ['brand' => 'The Ordinary', 'type' => 'skincare', 'skin_type' => 'all', 'concern' => 'brightening', 'gender' => 'unisex']],
                ['name' => 'Retinol Night Cream', 'price' => 799, 'compare' => 999, 'featured' => false,
                 'desc' => 'Anti-aging retinol cream for overnight renewal.',
                 'attrs' => ['brand' => 'CeraVe', 'type' => 'skincare', 'skin_type' => 'mature', 'concern' => 'anti-aging', 'gender' => 'women']],
                ['name' => 'MAC Ruby Woo Lipstick', 'price' => 899, 'compare' => 1099, 'featured' => true,
                 'desc' => 'Classic matte red lipstick.',
                 'attrs' => ['brand' => 'MAC', 'type' => 'makeup', 'category' => 'lips', 'finish' => 'matte', 'gender' => 'women']],
                ['name' => 'Moroccan Argan Oil 100ml', 'price' => 599, 'compare' => 799, 'featured' => false,
                 'desc' => 'Pure argan oil for hair and skin nourishment.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'hair-care', 'concern' => 'nourishing', 'gender' => 'unisex']],
                ['name' => 'SPF 50 Sunscreen Lotion', 'price' => 349, 'compare' => 449, 'featured' => false,
                 'desc' => 'Lightweight SPF 50 sunscreen for Egyptian sun.',
                 'attrs' => ['brand' => 'La Roche-Posay', 'type' => 'skincare', 'skin_type' => 'all', 'concern' => 'sun-protection', 'gender' => 'unisex']],
                ['name' => 'Professional Hair Dryer', 'price' => 2499, 'compare' => 2999, 'featured' => false,
                 'desc' => 'Ionic hair dryer with multiple heat settings.',
                 'attrs' => ['brand' => 'Dyson', 'type' => 'tools', 'features' => 'ionic,lightweight', 'gender' => 'women']],
            ]],
            // SPORTS
            ['cat' => 'sports', 'vendor' => 3, 'items' => [
                ['name' => 'Adjustable Dumbbell Set 20kg', 'price' => 2999, 'compare' => 3999, 'featured' => true,
                 'desc' => 'Space-saving adjustable dumbbell set for home workouts.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'weights', 'sport' => 'fitness', 'material' => 'cast-iron']],
                ['name' => 'Yoga Mat Premium 6mm', 'price' => 599, 'compare' => 799, 'featured' => false,
                 'desc' => 'Non-slip TPE yoga mat for all practice levels.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'yoga', 'sport' => 'yoga', 'material' => 'tpe']],
                ['name' => 'Running Treadmill T500', 'price' => 14999, 'compare' => 18999, 'featured' => true,
                 'desc' => 'Foldable treadmill with incline and heart rate monitor.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'cardio', 'sport' => 'running', 'features' => 'foldable,heart-rate']],
                ['name' => 'Football Adidas UCL Pro', 'price' => 1299, 'compare' => 1599, 'featured' => false,
                 'desc' => 'Official UEFA Champions League match ball.',
                 'attrs' => ['brand' => 'Adidas', 'type' => 'balls', 'sport' => 'football', 'level' => 'professional']],
                ['name' => 'Camping Tent 4-Person', 'price' => 3499, 'compare' => 4499, 'featured' => false,
                 'desc' => 'Waterproof 4-person tent for desert and beach camping.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'camping', 'sport' => 'camping', 'features' => 'waterproof,4-person']],
                ['name' => 'Resistance Band Set', 'price' => 399, 'compare' => 599, 'featured' => false,
                 'desc' => 'Set of 5 resistance bands for home workouts.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'accessories', 'sport' => 'fitness', 'material' => 'latex']],
            ]],
            // BOOKS
            ['cat' => 'books', 'vendor' => 5, 'items' => [
                ['name' => 'The Yacoubian Building', 'price' => 149, 'compare' => 199, 'featured' => true,
                 'desc' => 'Classic Egyptian novel by Alaa Al Aswany.',
                 'attrs' => ['brand' => 'Arabic Literature', 'type' => 'fiction', 'language' => 'arabic', 'format' => 'paperback']],
                ['name' => 'Atomic Habits', 'price' => 349, 'compare' => 449, 'featured' => true,
                 'desc' => 'James Clear bestseller on building good habits.',
                 'attrs' => ['brand' => 'Penguin', 'type' => 'self-help', 'language' => 'english', 'format' => 'paperback']],
                ['name' => 'The Alchemist', 'price' => 249, 'compare' => 349, 'featured' => false,
                 'desc' => 'Paulo Coelho timeless tale of following your dreams.',
                 'attrs' => ['brand' => 'HarperOne', 'type' => 'fiction', 'language' => 'english', 'format' => 'paperback']],
                ['name' => 'Holy Quran Leather Cover', 'price' => 499, 'compare' => 699, 'featured' => true,
                 'desc' => 'Premium leather-bound Holy Quran with gold lettering.',
                 'attrs' => ['brand' => 'Local Publisher', 'type' => 'religious', 'language' => 'arabic', 'format' => 'hardcover']],
                ['name' => 'Python Programming Guide', 'price' => 599, 'compare' => 799, 'featured' => false,
                 'desc' => 'Comprehensive guide to Python programming for beginners.',
                 'attrs' => ['brand' => 'OReilly', 'type' => 'technical', 'language' => 'english', 'format' => 'paperback']],
            ]],
            // TOYS
            ['cat' => 'toys', 'vendor' => 5, 'items' => [
                ['name' => 'LEGO City Police Station', 'price' => 1999, 'compare' => 2499, 'featured' => true,
                 'desc' => '743-piece LEGO set for ages 6+.',
                 'attrs' => ['brand' => 'LEGO', 'type' => 'building', 'age_range' => '6-12', 'material' => 'plastic']],
                ['name' => 'Remote Control Car 4WD', 'price' => 1299, 'compare' => 1599, 'featured' => false,
                 'desc' => 'Off-road RC car with rechargeable battery.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'vehicles', 'age_range' => '8+', 'features' => 'remote-control,rechargeable']],
                ['name' => 'Board Game Collection', 'price' => 899, 'compare' => 1199, 'featured' => false,
                 'desc' => 'Classic board games set: Chess, Backgammon, Checkers.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'board-games', 'age_range' => '6+', 'players' => '2-4']],
                ['name' => 'Educational Tablet Kids', 'price' => 2499, 'compare' => 2999, 'featured' => true,
                 'desc' => 'Kids learning tablet with Arabic and English content.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'educational', 'age_range' => '3-8', 'features' => 'bilingual,wifi']],
                ['name' => 'Plush Teddy Bear Giant', 'price' => 599, 'compare' => 799, 'featured' => false,
                 'desc' => 'Soft giant teddy bear, 120cm tall.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'stuffed-animals', 'age_range' => '0+', 'material' => 'plush']],
            ]],
            // AUTOMOTIVE
            ['cat' => 'automotive', 'vendor' => 3, 'items' => [
                ['name' => 'Car Dash Camera 4K', 'price' => 2499, 'compare' => 2999, 'featured' => true,
                 'desc' => '4K dash camera with night vision and GPS.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'electronics', 'features' => '4K,night-vision,gps', 'vehicle_type' => 'car']],
                ['name' => 'Premium Car Seat Cover Set', 'price' => 1999, 'compare' => 2499, 'featured' => false,
                 'desc' => 'Universal leather car seat cover set for 5 seats.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'interior', 'material' => 'leather', 'vehicle_type' => 'car']],
                ['name' => 'Portable Air Compressor', 'price' => 899, 'compare' => 1199, 'featured' => false,
                 'desc' => 'Digital tire inflator with auto-shutoff.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'tools', 'features' => 'digital,portable', 'vehicle_type' => 'universal']],
                ['name' => 'LED Car Interior Lights', 'price' => 299, 'compare' => 399, 'featured' => false,
                 'desc' => 'RGB LED strip lights with app control.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'lighting', 'features' => 'rgb,app-control', 'vehicle_type' => 'car']],
            ]],
            // HEALTH
            ['cat' => 'health', 'vendor' => 4, 'items' => [
                ['name' => 'Digital Blood Pressure Monitor', 'price' => 1299, 'compare' => 1599, 'featured' => true,
                 'desc' => 'Accurate digital blood pressure monitor with memory.',
                 'attrs' => ['brand' => 'Omron', 'type' => 'monitoring', 'concern' => 'blood-pressure', 'features' => 'digital,memory']],
                ['name' => 'Vitamin D3 5000 IU 120 caps', 'price' => 399, 'compare' => 549, 'featured' => false,
                 'desc' => 'High-potency Vitamin D3 for bone and immune health.',
                 'attrs' => ['brand' => 'NOW Foods', 'type' => 'supplements', 'concern' => 'bone-health', 'form' => 'capsules']],
                ['name' => 'Whey Protein Isolate 2kg', 'price' => 1999, 'compare' => 2499, 'featured' => true,
                 'desc' => 'Premium whey protein isolate, chocolate flavor, 66 servings.',
                 'attrs' => ['brand' => 'Optimum Nutrition', 'type' => 'supplements', 'concern' => 'fitness', 'form' => 'powder', 'flavor' => 'chocolate']],
                ['name' => 'Pulse Oximeter', 'price' => 499, 'compare' => 699, 'featured' => false,
                 'desc' => 'Fingertip pulse oximeter with LED display.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'monitoring', 'concern' => 'oxygen-level', 'features' => 'portable']],
                ['name' => 'Essential Oils Diffuser', 'price' => 899, 'compare' => 1199, 'featured' => false,
                 'desc' => 'Ultrasonic aromatherapy diffuser with LED mood light.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'aromatherapy', 'features' => 'ultrasonic,led,timer']],
            ]],
            // GROCERY
            ['cat' => 'grocery', 'vendor' => 2, 'items' => [
                ['name' => 'Egyptian Honey Pure 1kg', 'price' => 399, 'compare' => 499, 'featured' => true,
                 'desc' => 'Pure natural Egyptian honey from Siwa Oasis.',
                 'attrs' => ['brand' => 'Siwa Oasis', 'type' => 'honey', 'origin' => 'egypt', 'diet' => 'organic,gluten-free']],
                ['name' => 'Medjool Dates Premium 1kg', 'price' => 599, 'compare' => 749, 'featured' => true,
                 'desc' => 'Premium jumbo Medjool dates, naturally sweet.',
                 'attrs' => ['brand' => 'Local Farm', 'type' => 'dried-fruits', 'origin' => 'egypt', 'diet' => 'vegan,gluten-free']],
                ['name' => 'Extra Virgin Olive Oil 1L', 'price' => 349, 'compare' => 449, 'featured' => false,
                 'desc' => 'Cold-pressed Egyptian extra virgin olive oil.',
                 'attrs' => ['brand' => 'Local Farm', 'type' => 'oils', 'origin' => 'egypt', 'diet' => 'organic']],
                ['name' => 'Mixed Nuts Premium 500g', 'price' => 299, 'compare' => 399, 'featured' => false,
                 'desc' => 'Roasted and salted premium mixed nuts.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'nuts', 'diet' => 'gluten-free,high-protein']],
                ['name' => 'Egyptian Tea Blend 250g', 'price' => 149, 'compare' => 199, 'featured' => false,
                 'desc' => 'Traditional Egyptian tea blend with hints of mint.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'beverages', 'origin' => 'egypt', 'diet' => 'vegan']],
                ['name' => 'Tahini Paste 400g', 'price' => 99, 'compare' => 149, 'featured' => false,
                 'desc' => 'Pure sesame tahini paste for authentic Egyptian recipes.',
                 'attrs' => ['brand' => 'Local Brand', 'type' => 'condiments', 'origin' => 'egypt', 'diet' => 'vegan,gluten-free']],
            ]],
        ];

        $brandMap = [];
        foreach ($productDefinitions as $group) {
            foreach ($group['items'] as $item) {
                $brandName = $item['attrs']['brand'] ?? null;
                if (!$brandName) {
                    continue;
                }

                if (!isset($brandMap[$brandName])) {
                    $brandMap[$brandName] = Brand::firstOrCreate(
                        ['slug' => Str::slug($brandName)],
                        [
                            'name' => $brandName,
                            'status' => 'active',
                        ]
                    );
                }
            }
        }

        foreach ($productDefinitions as $group) {
            $cat = $cats[$group['cat']];
            $vendor = $vendors[$group['vendor']];

            foreach ($group['items'] as $item) {
                $sku = 'SKU-' . str_pad($skuCounter++, 5, '0', STR_PAD_LEFT);
                $slug = Str::slug($item['name']);

                // Ensure unique slug
                $existingSlug = Product::where('slug', $slug)->exists();
                if ($existingSlug) {
                    $slug .= '-' . $skuCounter;
                }

                $product = Product::firstOrCreate(['sku' => $sku], [
                    'vendor_id'        => $vendor->id,
                    'category_id'      => $cat->id,
                    'brand_id'         => ($brandMap[$item['attrs']['brand'] ?? ''] ?? null)?->id,
                    'name'             => $item['name'],
                    'slug'             => $slug,
                    'description'      => $item['desc'],
                    'short_description'=> Str::limit($item['desc'], 100),
                    'price'            => $item['price'],
                    'compare_price'    => $item['compare'],
                    'cost_price'       => round($item['price'] * 0.6, 2),
                    'stock_quantity'   => rand(10, 200),
                    'is_active'        => true,
                    'is_featured'      => $item['featured'],
                    'images'           => $this->productImages[$item['name']]
                        ?? ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop'],
                    'tags'             => array_values(array_slice($item['attrs'], 0, 3)),
                ]);

                // Create product attributes for filtering
                foreach ($item['attrs'] as $key => $value) {
                    ProductAttribute::firstOrCreate([
                        'product_id' => $product->id,
                        'key'        => $key,
                    ], [
                        'value' => is_array($value) ? json_encode($value) : $value,
                    ]);
                }

                $allProducts[] = $product;
            }
        }

        foreach ($brandMap as $brand) {
            $brand->update([
                'products_count' => Product::where('brand_id', $brand->id)->count(),
            ]);
        }

        $this->command->info('Products created (' . count($allProducts) . ') with attributes');

        // ══════════════════════════════════════════════════════════
        // PRODUCT VARIANTS
        // ══════════════════════════════════════════════════════════
        $variantProducts = Product::where('name', 'LIKE', '%Nike Air Max%')
            ->orWhere('name', 'LIKE', '%Samsung Galaxy S24%')
            ->orWhere('name', 'LIKE', '%Classic Cotton Polo%')
            ->get();

        foreach ($variantProducts as $vp) {
            if (str_contains($vp->name, 'Nike') || str_contains($vp->name, 'Air Max')) {
                foreach (['Black' => 0, 'White' => 200, 'Red' => 200] as $color => $extra) {
                    foreach ([41, 42, 43, 44] as $size) {
                        ProductVariant::firstOrCreate(
                            ['product_id' => $vp->id, 'sku' => $vp->sku . '-' . strtoupper(substr($color, 0, 3)) . '-' . $size],
                            ['name' => "$color - EU $size", 'price' => $vp->price + $extra, 'stock_quantity' => rand(5, 20),
                             'attributes' => json_encode(['color' => $color, 'size' => "EU $size"]), 'is_active' => true]
                        );
                    }
                }
            } elseif (str_contains($vp->name, 'Samsung')) {
                foreach (['256GB' => 0, '512GB' => 7000, '1TB' => 15000] as $storage => $extra) {
                    foreach (['Titanium Black', 'Titanium Gray', 'Titanium Violet'] as $color) {
                        ProductVariant::firstOrCreate(
                            ['product_id' => $vp->id, 'sku' => $vp->sku . '-' . Str::slug($color) . '-' . $storage],
                            ['name' => "$color - $storage", 'price' => $vp->price + $extra, 'stock_quantity' => rand(5, 15),
                             'attributes' => json_encode(['color' => $color, 'storage' => $storage]), 'is_active' => true]
                        );
                    }
                }
            } elseif (str_contains($vp->name, 'Polo')) {
                foreach (['White', 'Blue', 'Black', 'Red'] as $color) {
                    foreach (['S', 'M', 'L', 'XL'] as $size) {
                        ProductVariant::firstOrCreate(
                            ['product_id' => $vp->id, 'sku' => $vp->sku . '-' . strtoupper(substr($color, 0, 3)) . '-' . $size],
                            ['name' => "$color - $size", 'price' => $vp->price, 'stock_quantity' => rand(10, 50),
                             'attributes' => json_encode(['color' => $color, 'size' => $size]), 'is_active' => true]
                        );
                    }
                }
            }
        }

        $this->command->info('Product variants created');

        // ══════════════════════════════════════════════════════════
        // REVIEWS
        // ══════════════════════════════════════════════════════════
        $reviewTexts = [
            5 => ['Excellent product!', 'Amazing quality, highly recommend.', 'Best purchase ever!', 'Exceeded my expectations.', 'Love it! Will buy again.'],
            4 => ['Very good product.', 'Good quality, minor issues.', 'Satisfied with the purchase.', 'Good value for money.'],
            3 => ['Average product.', 'Decent but could be better.', 'OK for the price.'],
            2 => ['Below expectations.', 'Not great quality.'],
            1 => ['Very disappointed.', 'Would not recommend.'],
        ];

        $reviewCount = 0;
        foreach ($allProducts as $product) {
            $numReviews = rand(2, 8);
            $usedCustomers = [];
            for ($r = 0; $r < $numReviews; $r++) {
                $customer = $customers[array_rand($customers)];
                if (in_array($customer->id, $usedCustomers)) continue;
                $usedCustomers[] = $customer->id;

                $rating = $this->weightedRating();
                $texts = $reviewTexts[$rating];

                Review::firstOrCreate([
                    'user_id'    => $customer->id,
                    'product_id' => $product->id,
                ], [
                    'rating'      => $rating,
                    'title'       => $texts[array_rand($texts)],
                    'comment'     => $texts[array_rand($texts)] . ' The product quality is good and shipping was fast to Egypt.',
                    'is_verified' => (bool) rand(0, 1),
                    'is_approved' => true,
                ]);
                $reviewCount++;
            }
        }

        $this->command->info("Reviews created ($reviewCount)");

        // ══════════════════════════════════════════════════════════
        // ORDERS
        // ══════════════════════════════════════════════════════════
        $orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        $orderCount = 0;
        foreach ($customers as $customer) {
            $numOrders = rand(2, 5);
            for ($o = 0; $o < $numOrders; $o++) {
                $status = $orderStatuses[array_rand($orderStatuses)];
                $orderProducts = collect($allProducts)->random(rand(1, 3));
                $subtotal = 0;
                $city = collect(['Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Mansoura'])->random();

                $order = Order::create([
                    'user_id'          => $customer->id,
                    'order_number'     => 'ORD-' . strtoupper(Str::random(8)),
                    'status'           => $status,
                    'subtotal'         => 0,
                    'shipping_amount'  => 50,
                    'tax_amount'       => 0,
                    'discount_amount'  => 0,
                    'total'            => 0,
                    'currency'         => 'EGP',
                    'shipping_address' => json_encode([
                        'street' => 'Street ' . rand(1, 100) . ', Building ' . rand(1, 50),
                        'city' => $city,
                        'country' => 'Egypt',
                        'postal_code' => str_pad(rand(10000, 99999), 5, '0'),
                    ]),
                    'customer_email'   => $customer->email,
                    'customer_phone'   => '+20' . rand(1000000000, 1999999999),
                    'notes'            => null,
                    'shipped_at'       => in_array($status, ['shipped', 'delivered']) ? now()->subDays(rand(1, 10)) : null,
                    'delivered_at'     => $status === 'delivered' ? now()->subDays(rand(0, 3)) : null,
                ]);

                foreach ($orderProducts as $op) {
                    $qty = rand(1, 3);
                    $price = $op->price;
                    $total = $price * $qty;
                    $subtotal += $total;

                    OrderItem::create([
                        'order_id'     => $order->id,
                        'product_id'   => $op->id,
                        'product_name' => $op->name,
                        'product_sku'  => $op->sku,
                        'quantity'     => $qty,
                        'unit_price'   => $price,
                        'total_price'  => $total,
                    ]);
                }

                $tax = round($subtotal * 0.14, 2);
                $order->update([
                    'subtotal' => $subtotal,
                    'tax_amount' => $tax,
                    'total'    => $subtotal + $tax + 50,
                ]);
                $orderCount++;
            }
        }

        $this->command->info("Orders created ($orderCount)");

        // ══════════════════════════════════════════════════════════
        // WALLETS
        // ══════════════════════════════════════════════════════════
        foreach ($customers as $customer) {
            $balance = rand(0, 5000);
            $wallet = Wallet::firstOrCreate(['user_id' => $customer->id], [
                'balance'      => $balance,
                'total_earned' => $balance + rand(500, 3000),
                'total_spent'  => rand(0, 2000),
                'currency'     => 'EGP',
                'is_active'    => true,
            ]);

            if ($wallet->wasRecentlyCreated) {
                WalletTransaction::create([
                    'wallet_id'    => $wallet->id,
                    'type'         => 'top_up',
                    'amount'       => $balance,
                    'balance_after'=> $balance,
                    'description'  => 'Initial wallet top-up',
                    'reference'    => 'TOPUP-' . strtoupper(Str::random(8)),
                ]);
            }
        }

        $this->command->info('Wallets created');

        // ══════════════════════════════════════════════════════════
        // COUPONS
        // ══════════════════════════════════════════════════════════
        $coupons = [
            ['code' => 'WELCOME10',  'type' => 'percentage', 'value' => 10,  'min' => 200,  'max' => 500,   'desc' => 'Welcome discount - 10% off first order'],
            ['code' => 'SAVE50',     'type' => 'fixed',      'value' => 50,  'min' => 300,  'max' => null,  'desc' => '50 EGP off orders over 300 EGP'],
            ['code' => 'SUMMER25',   'type' => 'percentage', 'value' => 25,  'min' => 500,  'max' => 1000,  'desc' => 'Summer sale - 25% off'],
            ['code' => 'FREESHIP',   'type' => 'fixed',      'value' => 50,  'min' => 0,    'max' => null,  'desc' => 'Free shipping coupon'],
            ['code' => 'MEGA2025',   'type' => 'percentage', 'value' => 15,  'min' => 1000, 'max' => 2000,  'desc' => 'Mega sale 2025 - 15% off'],
            ['code' => 'VIP20',      'type' => 'percentage', 'value' => 20,  'min' => 800,  'max' => 1500,  'desc' => 'VIP members - 20% off'],
        ];

        foreach ($coupons as $c) {
            Coupon::firstOrCreate(['code' => $c['code']], [
                'type'             => $c['type'],
                'value'            => $c['value'],
                'min_order_amount' => $c['min'],
                'max_discount'     => $c['max'],
                'usage_limit'      => rand(50, 500),
                'usage_count'      => rand(0, 20),
                'starts_at'        => now()->subDays(30),
                'expires_at'       => now()->addDays(90),
                'is_active'        => true,
                'description'      => $c['desc'],
            ]);
        }

        $this->command->info('Coupons created');

        // ══════════════════════════════════════════════════════════
        // DONE
        // ══════════════════════════════════════════════════════════
        $this->command->info('');
        $this->command->info('========================================');
        $this->command->info('  DATABASE SEEDED SUCCESSFULLY!');
        $this->command->info('========================================');
        $this->command->info('  Admin:    admin@marketplace.com / password');
        $this->command->info('  Staff:    staff@marketplace.com / password');
        $this->command->info('  Merchant: merchant@marketplace.com / password');
        $this->command->info('  Customer: customer@marketplace.com / password');
        $this->command->info('========================================');
        $this->command->info("  Products: " . count($allProducts));
        $this->command->info("  Categories: " . count($cats));
        $this->command->info("  Vendors: " . count($vendors));
        $this->command->info("  Orders: $orderCount");
        $this->command->info("  Reviews: $reviewCount");
        $this->command->info('  Brands: ' . count($brandMap));
        $this->command->info('========================================');
    }

    private function weightedRating(): int
    {
        $weights = [1 => 5, 2 => 8, 3 => 15, 4 => 35, 5 => 37];
        $rand = rand(1, 100);
        $cumulative = 0;
        foreach ($weights as $rating => $weight) {
            $cumulative += $weight;
            if ($rand <= $cumulative) return $rating;
        }
        return 4;
    }
}
