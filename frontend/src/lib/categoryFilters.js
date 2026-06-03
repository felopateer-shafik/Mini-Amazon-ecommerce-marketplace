/**
 * Dynamic category-specific filter definitions.
 *
 * Every category (or sub-category) can declare its own set of facets that
 * appear in the search sidebar.  When the API returns aggregation data for
 * a given category, these definitions tell the UI *which* facets to render
 * and what kind of control to use (checkbox list, range slider, size grid…).
 *
 * Filter types:
 *   checkbox  – multi-select list  (brand, material, features …)
 *   radio     – single-select      (gender, availability …)
 *   range     – min / max slider   (price, weight …)
 *   sizeGrid  – visual size picker (shoe sizes, clothing sizes …)
 *   stars     – star-rating picker
 */

// ── Shared / reusable filter fragments ────────────────────────────────────
const priceFilter = {
  key: "price",
  label: "Price",
  labelAr: "السعر",
  type: "range",
  unit: "EGP",
  min: 0,
  max: 100000,
  step: 50,
};

const brandFilter = {
  key: "brand",
  label: "Brand",
  labelAr: "العلامة التجارية",
  type: "checkbox",
  dynamic: true, // populated from API aggregations
};

const ratingFilter = {
  key: "rating",
  label: "Customer Reviews",
  labelAr: "تقييمات العملاء",
  type: "stars",
};

const availabilityFilter = {
  key: "availability",
  label: "Availability",
  labelAr: "التوفر",
  type: "checkbox",
  options: [
    { value: "in_stock", label: "In Stock", labelAr: "متوفر" },
    { value: "out_of_stock", label: "Out of Stock", labelAr: "غير متوفر" },
    { value: "pre_order", label: "Pre-Order", labelAr: "طلب مسبق" },
  ],
};

const sellerFilter = {
  key: "seller",
  label: "Seller",
  labelAr: "البائع",
  type: "checkbox",
  dynamic: true,
};

const shippingFilter = {
  key: "shipping",
  label: "Shipping",
  labelAr: "الشحن",
  type: "checkbox",
  options: [
    { value: "free_shipping", label: "Free Shipping", labelAr: "شحن مجاني" },
    { value: "express", label: "Express Delivery", labelAr: "توصيل سريع" },
    {
      value: "same_day",
      label: "Same-Day Delivery",
      labelAr: "توصيل في نفس اليوم",
    },
  ],
};

// ── Size definitions ──────────────────────────────────────────────────────
const menShoeSizes = {
  key: "men_shoe_size",
  label: "Men's Shoe Size",
  labelAr: "مقاس حذاء رجالي",
  type: "sizeGrid",
  options: [
    "39",
    "39.5",
    "40",
    "40.5",
    "41",
    "41.5",
    "42",
    "42.5",
    "43",
    "43.5",
    "44",
    "44.5",
    "45",
    "45.5",
    "46",
    "46.5",
    "47",
    "48",
  ].map((v) => ({ value: v, label: v })),
};

const womenShoeSizes = {
  key: "women_shoe_size",
  label: "Women's Shoe Size",
  labelAr: "مقاس حذاء نسائي",
  type: "sizeGrid",
  options: [
    "35",
    "35.5",
    "36",
    "36.5",
    "37",
    "37.5",
    "38",
    "38.5",
    "39",
    "39.5",
    "40",
    "40.5",
    "41",
    "41.5",
    "42",
  ].map((v) => ({ value: v, label: v })),
};

const childrenShoeSizes = {
  key: "children_shoe_size",
  label: "Children's Shoe Size",
  labelAr: "مقاس حذاء أطفال",
  type: "sizeGrid",
  options: [
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
  ].map((v) => ({ value: v, label: v })),
};

const babyShoeSizes = {
  key: "baby_shoe_size",
  label: "Baby's Shoe Size",
  labelAr: "مقاس حذاء أطفال رضع",
  type: "sizeGrid",
  options: ["15", "16", "17", "18", "19", "20", "21"].map((v) => ({
    value: v,
    label: v,
  })),
};

const menClothingSizes = {
  key: "men_clothing_size",
  label: "Men's Size",
  labelAr: "مقاس رجالي",
  type: "sizeGrid",
  options: ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"].map((v) => ({
    value: v,
    label: v,
  })),
};

const womenClothingSizes = {
  key: "women_clothing_size",
  label: "Women's Size",
  labelAr: "مقاس نسائي",
  type: "sizeGrid",
  options: ["XS", "S", "M", "L", "XL", "XXL", "3XL"].map((v) => ({
    value: v,
    label: v,
  })),
};

const childrenClothingSizes = {
  key: "children_clothing_size",
  label: "Children's Size",
  labelAr: "مقاس أطفال",
  type: "sizeGrid",
  options: ["2T", "3T", "4T", "5", "6", "7", "8", "10", "12", "14", "16"].map(
    (v) => ({ value: v, label: v }),
  ),
};

const genderFilter = {
  key: "gender",
  label: "Gender",
  labelAr: "الجنس",
  type: "radio",
  options: [
    { value: "men", label: "Men", labelAr: "رجال" },
    { value: "women", label: "Women", labelAr: "نساء" },
    { value: "unisex", label: "Unisex", labelAr: "للجنسين" },
    { value: "boys", label: "Boys", labelAr: "أولاد" },
    { value: "girls", label: "Girls", labelAr: "بنات" },
  ],
};

// ── Category-specific filter configs ──────────────────────────────────────
const CATEGORY_FILTERS = {
  // ── Shoes / Footwear ──────────────────────────────────────────────────
  shoes: [
    brandFilter,
    priceFilter,
    genderFilter,
    menShoeSizes,
    womenShoeSizes,
    childrenShoeSizes,
    babyShoeSizes,
    {
      key: "shoe_type",
      label: "Shoe Type",
      labelAr: "نوع الحذاء",
      type: "checkbox",
      options: [
        { value: "sneakers", label: "Sneakers", labelAr: "أحذية رياضية" },
        { value: "boots", label: "Boots", labelAr: "بوت" },
        { value: "sandals", label: "Sandals", labelAr: "صندل" },
        { value: "loafers", label: "Loafers", labelAr: "لوفر" },
        { value: "heels", label: "Heels", labelAr: "كعب عالي" },
        { value: "flats", label: "Flats", labelAr: "فلات" },
        { value: "slippers", label: "Slippers", labelAr: "شبشب" },
        { value: "formal", label: "Formal", labelAr: "رسمي" },
      ],
    },
    {
      key: "material",
      label: "Material",
      labelAr: "الخامة",
      type: "checkbox",
      options: [
        { value: "leather", label: "Leather", labelAr: "جلد" },
        { value: "synthetic", label: "Synthetic", labelAr: "صناعي" },
        { value: "canvas", label: "Canvas", labelAr: "قماش كانفاس" },
        { value: "suede", label: "Suede", labelAr: "شمواه" },
        { value: "mesh", label: "Mesh/Knit", labelAr: "شبكي" },
        { value: "rubber", label: "Rubber", labelAr: "مطاط" },
      ],
    },
    {
      key: "closure",
      label: "Closure Type",
      labelAr: "نوع الإغلاق",
      type: "checkbox",
      options: [
        { value: "lace_up", label: "Lace-Up", labelAr: "رباط" },
        { value: "slip_on", label: "Slip-On", labelAr: "بدون رباط" },
        { value: "velcro", label: "Velcro", labelAr: "فيلكرو" },
        { value: "buckle", label: "Buckle", labelAr: "إبزيم" },
        { value: "zipper", label: "Zipper", labelAr: "سحاب" },
      ],
    },
    {
      key: "color",
      label: "Color",
      labelAr: "اللون",
      type: "checkbox",
      options: [
        { value: "black", label: "Black", labelAr: "أسود" },
        { value: "white", label: "White", labelAr: "أبيض" },
        { value: "brown", label: "Brown", labelAr: "بني" },
        { value: "blue", label: "Blue", labelAr: "أزرق" },
        { value: "red", label: "Red", labelAr: "أحمر" },
        { value: "grey", label: "Grey", labelAr: "رمادي" },
        { value: "multi", label: "Multi-Color", labelAr: "متعدد الألوان" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        { value: "waterproof", label: "Waterproof", labelAr: "مقاوم للماء" },
        { value: "arch_support", label: "Arch Support", labelAr: "دعم القوس" },
        { value: "memory_foam", label: "Memory Foam", labelAr: "ميموري فوم" },
        { value: "breathable", label: "Breathable", labelAr: "قابل للتنفس" },
        { value: "non_slip", label: "Non-Slip", labelAr: "مقاوم للانزلاق" },
        { value: "lightweight", label: "Lightweight", labelAr: "خفيف الوزن" },
        { value: "orthopaedic", label: "Orthopaedic", labelAr: "طبي" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Clothing / Fashion ────────────────────────────────────────────────
  clothing: [
    brandFilter,
    priceFilter,
    genderFilter,
    menClothingSizes,
    womenClothingSizes,
    childrenClothingSizes,
    {
      key: "clothing_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "t_shirts", label: "T-Shirts", labelAr: "تيشيرت" },
        { value: "shirts", label: "Shirts", labelAr: "قمصان" },
        { value: "pants", label: "Pants", labelAr: "بنطلون" },
        { value: "jeans", label: "Jeans", labelAr: "جينز" },
        { value: "dresses", label: "Dresses", labelAr: "فساتين" },
        { value: "jackets", label: "Jackets", labelAr: "جاكيت" },
        { value: "activewear", label: "Activewear", labelAr: "ملابس رياضية" },
        { value: "underwear", label: "Underwear", labelAr: "ملابس داخلية" },
        { value: "sleepwear", label: "Sleepwear", labelAr: "ملابس نوم" },
      ],
    },
    {
      key: "fabric",
      label: "Fabric / Material",
      labelAr: "القماش / الخامة",
      type: "checkbox",
      options: [
        { value: "cotton", label: "Cotton", labelAr: "قطن" },
        { value: "polyester", label: "Polyester", labelAr: "بوليستر" },
        { value: "linen", label: "Linen", labelAr: "كتان" },
        { value: "silk", label: "Silk", labelAr: "حرير" },
        { value: "wool", label: "Wool", labelAr: "صوف" },
        { value: "denim", label: "Denim", labelAr: "جينز" },
        { value: "nylon", label: "Nylon", labelAr: "نايلون" },
        { value: "blend", label: "Blend", labelAr: "مزيج" },
      ],
    },
    {
      key: "color",
      label: "Color",
      labelAr: "اللون",
      type: "checkbox",
      options: [
        { value: "black", label: "Black", labelAr: "أسود" },
        { value: "white", label: "White", labelAr: "أبيض" },
        { value: "blue", label: "Blue", labelAr: "أزرق" },
        { value: "red", label: "Red", labelAr: "أحمر" },
        { value: "grey", label: "Grey", labelAr: "رمادي" },
        { value: "green", label: "Green", labelAr: "أخضر" },
        { value: "beige", label: "Beige", labelAr: "بيج" },
        { value: "multi", label: "Multi-Color", labelAr: "متعدد الألوان" },
      ],
    },
    {
      key: "pattern",
      label: "Pattern",
      labelAr: "النمط",
      type: "checkbox",
      options: [
        { value: "solid", label: "Solid", labelAr: "سادة" },
        { value: "striped", label: "Striped", labelAr: "مخطط" },
        { value: "plaid", label: "Plaid", labelAr: "كاروهات" },
        { value: "printed", label: "Printed", labelAr: "مطبوع" },
        { value: "floral", label: "Floral", labelAr: "زهري" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        {
          value: "wrinkle_free",
          label: "Wrinkle-Free",
          labelAr: "مقاوم للتجعد",
        },
        {
          value: "stain_resistant",
          label: "Stain-Resistant",
          labelAr: "مقاوم للبقع",
        },
        { value: "stretch", label: "Stretch", labelAr: "مطاط" },
        {
          value: "uv_protection",
          label: "UV Protection",
          labelAr: "حماية من الأشعة",
        },
        { value: "quick_dry", label: "Quick Dry", labelAr: "سريع الجفاف" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Electronics ───────────────────────────────────────────────────────
  electronics: [
    brandFilter,
    priceFilter,
    {
      key: "electronics_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "smartphones", label: "Smartphones", labelAr: "هواتف ذكية" },
        { value: "laptops", label: "Laptops", labelAr: "لابتوب" },
        { value: "tablets", label: "Tablets", labelAr: "تابلت" },
        { value: "headphones", label: "Headphones", labelAr: "سماعات" },
        { value: "cameras", label: "Cameras", labelAr: "كاميرات" },
        { value: "tvs", label: "TVs", labelAr: "تلفزيونات" },
        { value: "gaming", label: "Gaming", labelAr: "ألعاب" },
        { value: "accessories", label: "Accessories", labelAr: "إكسسوارات" },
        {
          value: "wearables",
          label: "Wearables",
          labelAr: "أجهزة قابلة للارتداء",
        },
      ],
    },
    {
      key: "screen_size",
      label: "Screen Size",
      labelAr: "حجم الشاشة",
      type: "checkbox",
      options: [
        { value: "under_5", label: 'Under 5"', labelAr: 'أقل من 5"' },
        { value: "5_7", label: '5" - 7"', labelAr: '5" - 7"' },
        { value: "7_13", label: '7" - 13"', labelAr: '7" - 13"' },
        { value: "13_17", label: '13" - 17"', labelAr: '13" - 17"' },
        { value: "above_17", label: '17" & above', labelAr: '17" وأكثر' },
      ],
    },
    {
      key: "storage",
      label: "Storage",
      labelAr: "التخزين",
      type: "checkbox",
      options: [
        { value: "32gb", label: "32 GB" },
        { value: "64gb", label: "64 GB" },
        { value: "128gb", label: "128 GB" },
        { value: "256gb", label: "256 GB" },
        { value: "512gb", label: "512 GB" },
        { value: "1tb", label: "1 TB" },
        { value: "2tb", label: "2 TB+" },
      ],
    },
    {
      key: "ram",
      label: "RAM",
      labelAr: "الرام",
      type: "checkbox",
      options: [
        { value: "2gb", label: "2 GB" },
        { value: "4gb", label: "4 GB" },
        { value: "6gb", label: "6 GB" },
        { value: "8gb", label: "8 GB" },
        { value: "12gb", label: "12 GB" },
        { value: "16gb", label: "16 GB" },
        { value: "32gb", label: "32 GB+" },
      ],
    },
    {
      key: "color",
      label: "Color",
      labelAr: "اللون",
      type: "checkbox",
      options: [
        { value: "black", label: "Black", labelAr: "أسود" },
        { value: "white", label: "White", labelAr: "أبيض" },
        { value: "silver", label: "Silver", labelAr: "فضي" },
        { value: "gold", label: "Gold", labelAr: "ذهبي" },
        { value: "blue", label: "Blue", labelAr: "أزرق" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        { value: "5g", label: "5G", labelAr: "5G" },
        {
          value: "wireless_charging",
          label: "Wireless Charging",
          labelAr: "شحن لاسلكي",
        },
        {
          value: "water_resistant",
          label: "Water Resistant",
          labelAr: "مقاوم للماء",
        },
        {
          value: "noise_cancelling",
          label: "Noise Cancelling",
          labelAr: "عزل الضوضاء",
        },
        { value: "fast_charging", label: "Fast Charging", labelAr: "شحن سريع" },
        { value: "dual_sim", label: "Dual SIM", labelAr: "شريحتين" },
        { value: "bluetooth", label: "Bluetooth", labelAr: "بلوتوث" },
      ],
    },
    {
      key: "operating_system",
      label: "Operating System",
      labelAr: "نظام التشغيل",
      type: "checkbox",
      options: [
        { value: "android", label: "Android", labelAr: "أندرويد" },
        { value: "ios", label: "iOS", labelAr: "iOS" },
        { value: "windows", label: "Windows", labelAr: "ويندوز" },
        { value: "macos", label: "macOS", labelAr: "ماك" },
        { value: "chromeos", label: "Chrome OS", labelAr: "كروم" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    sellerFilter,
    shippingFilter,
  ],

  // ── Home & Garden ─────────────────────────────────────────────────────
  "home-garden": [
    brandFilter,
    priceFilter,
    {
      key: "home_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "furniture", label: "Furniture", labelAr: "أثاث" },
        { value: "decor", label: "Decor", labelAr: "ديكور" },
        { value: "kitchen", label: "Kitchen", labelAr: "مطبخ" },
        { value: "bedding", label: "Bedding", labelAr: "مفروشات" },
        { value: "bathroom", label: "Bathroom", labelAr: "حمام" },
        { value: "lighting", label: "Lighting", labelAr: "إضاءة" },
        { value: "garden", label: "Garden & Outdoor", labelAr: "حديقة" },
        { value: "storage", label: "Storage & Organization", labelAr: "تخزين" },
      ],
    },
    {
      key: "material",
      label: "Material",
      labelAr: "الخامة",
      type: "checkbox",
      options: [
        { value: "wood", label: "Wood", labelAr: "خشب" },
        { value: "metal", label: "Metal", labelAr: "معدن" },
        { value: "glass", label: "Glass", labelAr: "زجاج" },
        { value: "plastic", label: "Plastic", labelAr: "بلاستيك" },
        { value: "fabric", label: "Fabric", labelAr: "قماش" },
        { value: "ceramic", label: "Ceramic", labelAr: "سيراميك" },
      ],
    },
    {
      key: "color",
      label: "Color",
      labelAr: "اللون",
      type: "checkbox",
      options: [
        { value: "white", label: "White", labelAr: "أبيض" },
        { value: "black", label: "Black", labelAr: "أسود" },
        { value: "grey", label: "Grey", labelAr: "رمادي" },
        { value: "beige", label: "Beige", labelAr: "بيج" },
        { value: "brown", label: "Brown", labelAr: "بني" },
        { value: "blue", label: "Blue", labelAr: "أزرق" },
        { value: "green", label: "Green", labelAr: "أخضر" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        {
          value: "eco_friendly",
          label: "Eco-Friendly",
          labelAr: "صديق للبيئة",
        },
        { value: "handmade", label: "Handmade", labelAr: "صناعة يدوية" },
        {
          value: "easy_assembly",
          label: "Easy Assembly",
          labelAr: "تجميع سهل",
        },
        {
          value: "smart_home",
          label: "Smart Home Compatible",
          labelAr: "متوافق مع المنزل الذكي",
        },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Beauty & Personal Care ────────────────────────────────────────────
  beauty: [
    brandFilter,
    priceFilter,
    {
      key: "beauty_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "skincare", label: "Skincare", labelAr: "عناية بالبشرة" },
        { value: "makeup", label: "Makeup", labelAr: "مكياج" },
        { value: "haircare", label: "Hair Care", labelAr: "عناية بالشعر" },
        { value: "fragrance", label: "Fragrance", labelAr: "عطور" },
        { value: "nails", label: "Nails", labelAr: "أظافر" },
        { value: "tools", label: "Tools & Brushes", labelAr: "أدوات" },
      ],
    },
    {
      key: "skin_type",
      label: "Skin Type",
      labelAr: "نوع البشرة",
      type: "checkbox",
      options: [
        { value: "dry", label: "Dry", labelAr: "جافة" },
        { value: "oily", label: "Oily", labelAr: "دهنية" },
        { value: "combination", label: "Combination", labelAr: "مختلطة" },
        { value: "sensitive", label: "Sensitive", labelAr: "حساسة" },
        { value: "all", label: "All Skin Types", labelAr: "جميع الأنواع" },
      ],
    },
    {
      key: "ingredients",
      label: "Key Ingredients",
      labelAr: "المكونات الرئيسية",
      type: "checkbox",
      options: [
        { value: "vitamin_c", label: "Vitamin C", labelAr: "فيتامين سي" },
        { value: "retinol", label: "Retinol", labelAr: "ريتينول" },
        {
          value: "hyaluronic",
          label: "Hyaluronic Acid",
          labelAr: "حمض الهيالورونيك",
        },
        {
          value: "salicylic",
          label: "Salicylic Acid",
          labelAr: "حمض الساليسيليك",
        },
        { value: "niacinamide", label: "Niacinamide", labelAr: "نياسيناميد" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        {
          value: "cruelty_free",
          label: "Cruelty-Free",
          labelAr: "خالي من القسوة",
        },
        { value: "organic", label: "Organic", labelAr: "عضوي" },
        { value: "vegan", label: "Vegan", labelAr: "نباتي" },
        {
          value: "paraben_free",
          label: "Paraben-Free",
          labelAr: "خالي من البارابين",
        },
        { value: "spf", label: "SPF Protection", labelAr: "حماية من الشمس" },
      ],
    },
    genderFilter,
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Sports & Outdoors ─────────────────────────────────────────────────
  sports: [
    brandFilter,
    priceFilter,
    genderFilter,
    menClothingSizes,
    womenClothingSizes,
    menShoeSizes,
    womenShoeSizes,
    {
      key: "sport_type",
      label: "Sport / Activity",
      labelAr: "الرياضة / النشاط",
      type: "checkbox",
      options: [
        { value: "running", label: "Running", labelAr: "جري" },
        { value: "football", label: "Football", labelAr: "كرة قدم" },
        { value: "gym", label: "Gym & Fitness", labelAr: "جيم" },
        { value: "swimming", label: "Swimming", labelAr: "سباحة" },
        { value: "cycling", label: "Cycling", labelAr: "دراجات" },
        { value: "camping", label: "Camping", labelAr: "تخييم" },
        { value: "yoga", label: "Yoga", labelAr: "يوغا" },
      ],
    },
    {
      key: "material",
      label: "Material",
      labelAr: "الخامة",
      type: "checkbox",
      options: [
        { value: "polyester", label: "Polyester", labelAr: "بوليستر" },
        { value: "nylon", label: "Nylon", labelAr: "نايلون" },
        { value: "cotton", label: "Cotton", labelAr: "قطن" },
        { value: "rubber", label: "Rubber", labelAr: "مطاط" },
        {
          value: "carbon_fiber",
          label: "Carbon Fiber",
          labelAr: "ألياف كربون",
        },
      ],
    },
    {
      key: "color",
      label: "Color",
      labelAr: "اللون",
      type: "checkbox",
      options: [
        { value: "black", label: "Black", labelAr: "أسود" },
        { value: "white", label: "White", labelAr: "أبيض" },
        { value: "blue", label: "Blue", labelAr: "أزرق" },
        { value: "red", label: "Red", labelAr: "أحمر" },
        { value: "grey", label: "Grey", labelAr: "رمادي" },
        { value: "green", label: "Green", labelAr: "أخضر" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Books ─────────────────────────────────────────────────────────────
  books: [
    priceFilter,
    {
      key: "genre",
      label: "Genre",
      labelAr: "التصنيف",
      type: "checkbox",
      options: [
        { value: "fiction", label: "Fiction", labelAr: "خيال" },
        { value: "non_fiction", label: "Non-Fiction", labelAr: "واقعي" },
        { value: "science", label: "Science", labelAr: "علوم" },
        { value: "history", label: "History", labelAr: "تاريخ" },
        { value: "children", label: "Children's Books", labelAr: "كتب أطفال" },
        { value: "self_help", label: "Self-Help", labelAr: "تطوير ذات" },
        { value: "religion", label: "Religion", labelAr: "دين" },
        { value: "cooking", label: "Cooking", labelAr: "طبخ" },
      ],
    },
    {
      key: "format",
      label: "Format",
      labelAr: "الشكل",
      type: "checkbox",
      options: [
        { value: "paperback", label: "Paperback", labelAr: "غلاف ورقي" },
        { value: "hardcover", label: "Hardcover", labelAr: "غلاف صلب" },
        { value: "ebook", label: "E-Book", labelAr: "كتاب إلكتروني" },
        { value: "audiobook", label: "Audiobook", labelAr: "كتاب صوتي" },
      ],
    },
    {
      key: "language",
      label: "Language",
      labelAr: "اللغة",
      type: "checkbox",
      options: [
        { value: "arabic", label: "Arabic", labelAr: "عربي" },
        { value: "english", label: "English", labelAr: "إنجليزي" },
        { value: "french", label: "French", labelAr: "فرنسي" },
      ],
    },
    {
      key: "author",
      label: "Author",
      labelAr: "المؤلف",
      type: "checkbox",
      dynamic: true,
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Toys / Games ──────────────────────────────────────────────────────
  toys: [
    brandFilter,
    priceFilter,
    {
      key: "age_range",
      label: "Age Range",
      labelAr: "الفئة العمرية",
      type: "checkbox",
      options: [
        { value: "0_2", label: "0-2 Years", labelAr: "0-2 سنة" },
        { value: "3_5", label: "3-5 Years", labelAr: "3-5 سنوات" },
        { value: "6_8", label: "6-8 Years", labelAr: "6-8 سنوات" },
        { value: "9_12", label: "9-12 Years", labelAr: "9-12 سنة" },
        { value: "13_plus", label: "13+ Years", labelAr: "13+ سنة" },
      ],
    },
    {
      key: "toy_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        {
          value: "action_figures",
          label: "Action Figures",
          labelAr: "شخصيات أكشن",
        },
        { value: "board_games", label: "Board Games", labelAr: "ألعاب لوحية" },
        { value: "puzzles", label: "Puzzles", labelAr: "ألغاز" },
        { value: "dolls", label: "Dolls", labelAr: "دمى" },
        {
          value: "building_blocks",
          label: "Building Blocks",
          labelAr: "مكعبات",
        },
        { value: "educational", label: "Educational", labelAr: "تعليمي" },
        { value: "outdoor", label: "Outdoor", labelAr: "ألعاب خارجية" },
        {
          value: "remote_control",
          label: "Remote Control",
          labelAr: "ريموت كنترول",
        },
      ],
    },
    genderFilter,
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Automotive ────────────────────────────────────────────────────────
  automotive: [
    brandFilter,
    priceFilter,
    {
      key: "auto_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "parts", label: "Parts & Accessories", labelAr: "قطع غيار" },
        { value: "tools", label: "Tools & Equipment", labelAr: "أدوات" },
        {
          value: "interior",
          label: "Interior Accessories",
          labelAr: "إكسسوارات داخلية",
        },
        {
          value: "exterior",
          label: "Exterior Accessories",
          labelAr: "إكسسوارات خارجية",
        },
        {
          value: "electronics",
          label: "Car Electronics",
          labelAr: "إلكترونيات سيارات",
        },
        { value: "cleaning", label: "Cleaning", labelAr: "تنظيف" },
      ],
    },
    {
      key: "vehicle_type",
      label: "Vehicle Type",
      labelAr: "نوع السيارة",
      type: "checkbox",
      options: [
        { value: "sedan", label: "Sedan", labelAr: "سيدان" },
        { value: "suv", label: "SUV", labelAr: "SUV" },
        { value: "truck", label: "Truck", labelAr: "شاحنة" },
        { value: "motorcycle", label: "Motorcycle", labelAr: "دراجة نارية" },
        { value: "universal", label: "Universal", labelAr: "عالمي" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Health ────────────────────────────────────────────────────────────
  health: [
    brandFilter,
    priceFilter,
    {
      key: "health_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        {
          value: "vitamins",
          label: "Vitamins & Supplements",
          labelAr: "فيتامينات ومكملات",
        },
        {
          value: "personal_care",
          label: "Personal Care",
          labelAr: "عناية شخصية",
        },
        {
          value: "medical_supplies",
          label: "Medical Supplies",
          labelAr: "مستلزمات طبية",
        },
        {
          value: "fitness",
          label: "Fitness & Nutrition",
          labelAr: "لياقة وتغذية",
        },
        { value: "baby_care", label: "Baby Care", labelAr: "عناية بالأطفال" },
      ],
    },
    {
      key: "special_features",
      label: "Special Features",
      labelAr: "مميزات خاصة",
      type: "checkbox",
      options: [
        { value: "organic", label: "Organic", labelAr: "عضوي" },
        { value: "sugar_free", label: "Sugar-Free", labelAr: "خالي من السكر" },
        {
          value: "gluten_free",
          label: "Gluten-Free",
          labelAr: "خالي من الغلوتين",
        },
        { value: "vegan", label: "Vegan", labelAr: "نباتي" },
      ],
    },
    genderFilter,
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],

  // ── Grocery ───────────────────────────────────────────────────────────
  grocery: [
    brandFilter,
    priceFilter,
    {
      key: "grocery_type",
      label: "Type",
      labelAr: "النوع",
      type: "checkbox",
      options: [
        { value: "fresh", label: "Fresh Food", labelAr: "طعام طازج" },
        { value: "snacks", label: "Snacks & Sweets", labelAr: "سناكس وحلويات" },
        { value: "beverages", label: "Beverages", labelAr: "مشروبات" },
        { value: "pantry", label: "Pantry Staples", labelAr: "أساسيات المطبخ" },
        { value: "frozen", label: "Frozen", labelAr: "مجمدات" },
        { value: "dairy", label: "Dairy & Eggs", labelAr: "ألبان وبيض" },
      ],
    },
    {
      key: "dietary",
      label: "Dietary",
      labelAr: "حمية",
      type: "checkbox",
      options: [
        { value: "halal", label: "Halal", labelAr: "حلال" },
        { value: "organic", label: "Organic", labelAr: "عضوي" },
        {
          value: "gluten_free",
          label: "Gluten-Free",
          labelAr: "خالي من الغلوتين",
        },
        { value: "sugar_free", label: "Sugar-Free", labelAr: "خالي من السكر" },
        { value: "vegan", label: "Vegan", labelAr: "نباتي" },
      ],
    },
    ratingFilter,
    availabilityFilter,
    shippingFilter,
  ],
};

// ── Fallback / global filters for categories not explicitly defined ──────
const DEFAULT_FILTERS = [
  brandFilter,
  priceFilter,
  ratingFilter,
  availabilityFilter,
  sellerFilter,
  shippingFilter,
];

/**
 * Return the filter definitions for a given category slug.
 * Falls back to the generic set when no category-specific config exists.
 *
 * @param {string|null} categorySlug
 * @returns {Array} filter definition objects
 */
export function getFiltersForCategory(categorySlug) {
  if (!categorySlug) return DEFAULT_FILTERS;
  // Exact match first, then try matching a parent slug (e.g. "mens-shoes" → "shoes")
  if (CATEGORY_FILTERS[categorySlug]) return CATEGORY_FILTERS[categorySlug];
  // Try parent match
  for (const key of Object.keys(CATEGORY_FILTERS)) {
    if (categorySlug.includes(key)) return CATEGORY_FILTERS[key];
  }
  return DEFAULT_FILTERS;
}

export { CATEGORY_FILTERS, DEFAULT_FILTERS };
