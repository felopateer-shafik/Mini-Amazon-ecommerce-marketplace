-- ============================================================================
-- MULTI-VENDOR E-COMMERCE MARKETPLACE — COMPLETE DATABASE SCHEMA (PostgreSQL)
-- Laravel 12 · Sanctum · Spatie Permission v7 · Encrypted Fields
-- ============================================================================
-- Generated : 2026-03-10
-- Database  : PostgreSQL 16+
-- Tables    : 43
-- Enums     : 5 custom types  +  CHECK constraints on select columns
-- ============================================================================
--
-- Usage:
--   1. CREATE DATABASE "EcommerceDatabase";
--   2. \c EcommerceDatabase
--   3. Run this script.
--
-- This script represents the FINAL state of all 55 Laravel migrations,
-- including encrypted (TEXT-widened) columns, updated FK behaviours,
-- and additional tables added over time.
--
-- Tables are ordered by dependency so the script can be run top-to-bottom.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- DROP everything in reverse-dependency order (makes script re-runnable)
-- ────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS product_reconsideration_requests CASCADE;
DROP TABLE IF EXISTS brand_requests                    CASCADE;
DROP TABLE IF EXISTS category_requests                 CASCADE;
DROP TABLE IF EXISTS media_assets                      CASCADE;
DROP TABLE IF EXISTS wholesale_products                CASCADE;
DROP TABLE IF EXISTS wholesale_customers               CASCADE;
DROP TABLE IF EXISTS affiliates                        CASCADE;
DROP TABLE IF EXISTS user_notifications                CASCADE;
DROP TABLE IF EXISTS conversation_messages             CASCADE;
DROP TABLE IF EXISTS conversations                     CASCADE;
DROP TABLE IF EXISTS wishlists                         CASCADE;
DROP TABLE IF EXISTS cart_items                        CASCADE;
DROP TABLE IF EXISTS wallet_transactions               CASCADE;
DROP TABLE IF EXISTS loyalty_points                    CASCADE;
DROP TABLE IF EXISTS shipments                         CASCADE;
DROP TABLE IF EXISTS refunds                           CASCADE;
DROP TABLE IF EXISTS reviews                           CASCADE;
DROP TABLE IF EXISTS payments                          CASCADE;
DROP TABLE IF EXISTS order_items                       CASCADE;
DROP TABLE IF EXISTS orders                            CASCADE;
DROP TABLE IF EXISTS product_attributes                CASCADE;
DROP TABLE IF EXISTS product_variants                  CASCADE;
DROP TABLE IF EXISTS products                          CASCADE;
DROP TABLE IF EXISTS coupons                           CASCADE;
DROP TABLE IF EXISTS categories                        CASCADE;
DROP TABLE IF EXISTS brands                            CASCADE;
DROP TABLE IF EXISTS wallets                           CASCADE;
DROP TABLE IF EXISTS addresses                         CASCADE;
DROP TABLE IF EXISTS vendors                           CASCADE;
DROP TABLE IF EXISTS personal_access_tokens            CASCADE;
DROP TABLE IF EXISTS model_has_permissions             CASCADE;
DROP TABLE IF EXISTS model_has_roles                   CASCADE;
DROP TABLE IF EXISTS role_has_permissions               CASCADE;
DROP TABLE IF EXISTS permissions                       CASCADE;
DROP TABLE IF EXISTS roles                             CASCADE;
DROP TABLE IF EXISTS failed_jobs                       CASCADE;
DROP TABLE IF EXISTS job_batches                       CASCADE;
DROP TABLE IF EXISTS jobs                              CASCADE;
DROP TABLE IF EXISTS cache_locks                       CASCADE;
DROP TABLE IF EXISTS cache                             CASCADE;
DROP TABLE IF EXISTS sessions                          CASCADE;
DROP TABLE IF EXISTS password_reset_tokens             CASCADE;
DROP TABLE IF EXISTS users                             CASCADE;

DROP TYPE IF EXISTS coupon_type     CASCADE;
DROP TYPE IF EXISTS loyalty_type    CASCADE;
DROP TYPE IF EXISTS shipment_status CASCADE;
DROP TYPE IF EXISTS payment_status  CASCADE;
DROP TYPE IF EXISTS order_status    CASCADE;


-- ============================================================================
-- CUSTOM ENUM TYPES
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE order_status    AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status  AS ENUM ('pending','processing','completed','failed','cancelled','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE shipment_status AS ENUM ('preparing','shipped','in_transit','out_for_delivery','delivered','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE loyalty_type    AS ENUM ('earned','redeemed','expired','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE coupon_type     AS ENUM ('percentage','fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- 1. USERS
-- ============================================================================
-- Many columns are widened to TEXT to hold AES-256-CBC ciphertext.
-- Lookups on email / phone use deterministic HMAC hashes stored in
-- email_hash / phone_hash.
-- ============================================================================
CREATE TABLE users (
    id                          BIGSERIAL       PRIMARY KEY,
    name                        TEXT            NOT NULL,
    email                       TEXT            NOT NULL,
    email_hash                  TEXT            NULL,
    phone                       TEXT            NULL,
    phone_hash                  TEXT            NULL,
    date_of_birth               TEXT            NULL,
    notification_preferences    TEXT            NULL,
    avatar                      TEXT            NULL,
    oauth_provider              VARCHAR(30)     NULL,
    oauth_provider_id           VARCHAR(255)    NULL,
    is_banned                   BOOLEAN         NOT NULL DEFAULT FALSE,
    banned_at                   TIMESTAMP       NULL,
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified_at           TIMESTAMP       NULL,
    password                    VARCHAR(255)    NOT NULL,
    remember_token              VARCHAR(100)    NULL,
    created_at                  TIMESTAMP       NULL,
    updated_at                  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX users_email_unique          ON users (email);
CREATE UNIQUE INDEX users_email_hash_unique     ON users (email_hash);
CREATE UNIQUE INDEX users_phone_hash_unique     ON users (phone_hash);
CREATE INDEX        users_oauth_index           ON users (oauth_provider, oauth_provider_id);


-- ============================================================================
-- 2. PASSWORD RESET TOKENS
-- ============================================================================
CREATE TABLE password_reset_tokens (
    email       VARCHAR(255)    NOT NULL,
    token       VARCHAR(255)    NOT NULL,
    created_at  TIMESTAMP       NULL,
    PRIMARY KEY (email)
);


-- ============================================================================
-- 3. SESSIONS
-- ============================================================================
CREATE TABLE sessions (
    id              VARCHAR(255)    NOT NULL,
    user_id         BIGINT          NULL,
    ip_address      VARCHAR(45)     NULL,
    user_agent      TEXT            NULL,
    payload         TEXT            NOT NULL,
    last_activity   INTEGER         NOT NULL,
    PRIMARY KEY (id)
);

CREATE INDEX sessions_user_id_index       ON sessions (user_id);
CREATE INDEX sessions_last_activity_index ON sessions (last_activity);


-- ============================================================================
-- 4. CACHE
-- ============================================================================
CREATE TABLE cache (
    key         VARCHAR(255)    NOT NULL,
    value       TEXT            NOT NULL,
    expiration  INTEGER         NOT NULL,
    PRIMARY KEY (key)
);

CREATE INDEX cache_expiration_index ON cache (expiration);


-- ============================================================================
-- 5. CACHE LOCKS
-- ============================================================================
CREATE TABLE cache_locks (
    key         VARCHAR(255)    NOT NULL,
    owner       VARCHAR(255)    NOT NULL,
    expiration  INTEGER         NOT NULL,
    PRIMARY KEY (key)
);

CREATE INDEX cache_locks_expiration_index ON cache_locks (expiration);


-- ============================================================================
-- 6. JOBS
-- ============================================================================
CREATE TABLE jobs (
    id              BIGSERIAL       PRIMARY KEY,
    queue           VARCHAR(255)    NOT NULL,
    payload         TEXT            NOT NULL,
    attempts        SMALLINT        NOT NULL DEFAULT 0,
    reserved_at     INTEGER         NULL,
    available_at    INTEGER         NOT NULL,
    created_at      INTEGER         NOT NULL
);

CREATE INDEX jobs_queue_index ON jobs (queue);


-- ============================================================================
-- 7. JOB BATCHES
-- ============================================================================
CREATE TABLE job_batches (
    id              VARCHAR(255)    NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    total_jobs      INTEGER         NOT NULL DEFAULT 0,
    pending_jobs    INTEGER         NOT NULL DEFAULT 0,
    failed_jobs     INTEGER         NOT NULL DEFAULT 0,
    failed_job_ids  TEXT            NOT NULL,
    options         TEXT            NULL,
    cancelled_at    INTEGER         NULL,
    created_at      INTEGER         NOT NULL,
    finished_at     INTEGER         NULL,
    PRIMARY KEY (id)
);


-- ============================================================================
-- 8. FAILED JOBS
-- ============================================================================
CREATE TABLE failed_jobs (
    id          BIGSERIAL       PRIMARY KEY,
    uuid        VARCHAR(255)    NOT NULL,
    connection  TEXT            NOT NULL,
    queue       TEXT            NOT NULL,
    payload     TEXT            NOT NULL,
    exception   TEXT            NOT NULL,
    failed_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX failed_jobs_uuid_unique ON failed_jobs (uuid);


-- ============================================================================
-- 9. PERSONAL ACCESS TOKENS  (Laravel Sanctum)
-- ============================================================================
CREATE TABLE personal_access_tokens (
    id              BIGSERIAL       PRIMARY KEY,
    tokenable_type  VARCHAR(255)    NOT NULL,
    tokenable_id    BIGINT          NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    token           VARCHAR(64)     NOT NULL,
    abilities       TEXT            NULL,
    last_used_at    TIMESTAMP       NULL,
    expires_at      TIMESTAMP       NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE        INDEX personal_access_tokens_tokenable_index ON personal_access_tokens (tokenable_type, tokenable_id);
CREATE UNIQUE INDEX personal_access_tokens_token_unique    ON personal_access_tokens (token);


-- ============================================================================
-- 10. PERMISSIONS  (Spatie Permission v7)
-- ============================================================================
CREATE TABLE permissions (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    guard_name  VARCHAR(255)    NOT NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX permissions_name_guard_unique ON permissions (name, guard_name);


-- ============================================================================
-- 11. ROLES  (Spatie Permission v7)
-- ============================================================================
CREATE TABLE roles (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    guard_name  VARCHAR(255)    NOT NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX roles_name_guard_unique ON roles (name, guard_name);


-- ============================================================================
-- 12. ROLE ↔ PERMISSION PIVOT
-- ============================================================================
CREATE TABLE role_has_permissions (
    permission_id   BIGINT  NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    role_id         BIGINT  NOT NULL REFERENCES roles (id)       ON DELETE CASCADE,
    PRIMARY KEY (permission_id, role_id)
);


-- ============================================================================
-- 13. MODEL ↔ PERMISSION PIVOT
-- ============================================================================
CREATE TABLE model_has_permissions (
    permission_id   BIGINT          NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    model_type      VARCHAR(255)    NOT NULL,
    model_id        BIGINT          NOT NULL,
    PRIMARY KEY (permission_id, model_id, model_type)
);

CREATE INDEX model_has_permissions_model_id_model_type_index
    ON model_has_permissions (model_id, model_type);


-- ============================================================================
-- 14. MODEL ↔ ROLE PIVOT
-- ============================================================================
CREATE TABLE model_has_roles (
    role_id     BIGINT          NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    model_type  VARCHAR(255)    NOT NULL,
    model_id    BIGINT          NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type)
);

CREATE INDEX model_has_roles_model_id_model_type_index
    ON model_has_roles (model_id, model_type);


-- ============================================================================
-- 15. VENDORS
-- ============================================================================
CREATE TABLE vendors (
    id                          BIGSERIAL       PRIMARY KEY,
    user_id                     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    business_name               TEXT            NOT NULL,
    store_name                  TEXT            NULL,
    slug                        VARCHAR(255)    NULL,
    description                 TEXT            NULL,
    email                       TEXT            NOT NULL,
    phone                       TEXT            NULL,
    address                     TEXT            NULL,
    city                        TEXT            NULL,
    state                       TEXT            NULL,
    country                     TEXT            NULL,
    postal_code                 TEXT            NULL,
    tax_id                      TEXT            NULL,
    logo                        TEXT            NULL,
    banner                      TEXT            NULL,
    bank_name                   TEXT            NULL,
    account_name                TEXT            NULL,
    account_number              TEXT            NULL,
    iban                        TEXT            NULL,
    free_shipping_enabled       BOOLEAN         NOT NULL DEFAULT FALSE,
    free_shipping_minimum       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    standard_shipping_rate      DECIMAL(10,2)   NOT NULL DEFAULT 0,
    express_shipping_rate       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    processing_time             INTEGER         NOT NULL DEFAULT 1,
    notification_preferences    TEXT            NULL,
    is_active                   BOOLEAN         NOT NULL DEFAULT TRUE,
    is_verified                 BOOLEAN         NOT NULL DEFAULT FALSE,
    status                      VARCHAR(255)    NOT NULL DEFAULT 'pending',
    rejection_reason            TEXT            NULL,
    commission_rate             DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    rating                      DECIMAL(3,2)    NOT NULL DEFAULT 0.00,
    review_count                INTEGER         NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP       NULL,
    updated_at                  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX vendors_user_id_unique ON vendors (user_id);
CREATE UNIQUE INDEX vendors_slug_unique    ON vendors (slug);
CREATE INDEX        vendors_is_active_idx  ON vendors (is_active);
CREATE INDEX        vendors_status_idx     ON vendors (status);


-- ============================================================================
-- 16. WALLETS
-- ============================================================================
CREATE TABLE wallets (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    balance         DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_earned    DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total_spent     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    currency        VARCHAR(3)      NOT NULL DEFAULT 'USD',
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE UNIQUE INDEX wallets_user_id_unique ON wallets (user_id);


-- ============================================================================
-- 17. ADDRESSES
-- ============================================================================
CREATE TABLE addresses (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    label           TEXT            NULL,
    first_name      TEXT            NOT NULL,
    last_name       TEXT            NOT NULL,
    phone           TEXT            NOT NULL,
    address_line_1  TEXT            NOT NULL,
    address_line_2  TEXT            NULL,
    city            TEXT            NOT NULL,
    state           TEXT            NULL,
    postal_code     TEXT            NULL,
    country         TEXT            NOT NULL DEFAULT 'EG',
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE INDEX addresses_user_id_idx ON addresses (user_id);


-- ============================================================================
-- 18. BRANDS
-- ============================================================================
CREATE TABLE brands (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(255)    NOT NULL,
    slug            VARCHAR(255)    NOT NULL,
    website         VARCHAR(255)    NULL,
    logo            TEXT            NULL,
    products_count  INTEGER         NOT NULL DEFAULT 0,
    status          VARCHAR(255)    NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','pending')),
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE UNIQUE INDEX brands_slug_unique ON brands (slug);


-- ============================================================================
-- 19. CATEGORIES
-- ============================================================================
CREATE TABLE categories (
    id                  BIGSERIAL       PRIMARY KEY,
    parent_id           BIGINT          NULL REFERENCES categories (id) ON DELETE SET NULL,
    name                VARCHAR(255)    NOT NULL,
    name_ar             VARCHAR(255)    NULL,
    slug                VARCHAR(255)    NOT NULL,
    description         TEXT            NULL,
    description_ar      TEXT            NULL,
    image               TEXT            NULL,
    icon                TEXT            NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    sort_order          INTEGER         NOT NULL DEFAULT 0,
    meta_title          TEXT            NULL,
    meta_description    TEXT            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX categories_slug_unique  ON categories (slug);
CREATE INDEX        categories_parent_idx   ON categories (parent_id);
CREATE INDEX        categories_active_idx   ON categories (is_active);
CREATE INDEX        categories_sort_idx     ON categories (sort_order);


-- ============================================================================
-- 20. COUPONS
-- ============================================================================
CREATE TABLE coupons (
    id                  BIGSERIAL       PRIMARY KEY,
    code                VARCHAR(255)    NOT NULL,
    type                coupon_type     NOT NULL DEFAULT 'percentage',
    value               DECIMAL(10,2)   NOT NULL,
    min_order_amount    DECIMAL(10,2)   NULL,
    max_discount        DECIMAL(10,2)   NULL,
    usage_limit         INTEGER         NULL,
    usage_count         INTEGER         NOT NULL DEFAULT 0,
    starts_at           TIMESTAMP       NULL,
    expires_at          TIMESTAMP       NULL,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    description         TEXT            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX coupons_code_unique ON coupons (code);


-- ============================================================================
-- 21. PRODUCTS
-- ============================================================================
-- vendor_id is nullable (admin-created products may not belong to a vendor).
-- Encrypted fields: short_description, meta_title, meta_description,
--   pending_update_note, images, tags, dimensions, pending_update_payload.
-- Non-encrypted searchable: name, description (full-text indexed).
-- ============================================================================
CREATE TABLE products (
    id                              BIGSERIAL       PRIMARY KEY,
    vendor_id                       BIGINT          NULL REFERENCES vendors (id) ON DELETE CASCADE,
    product_type                    VARCHAR(50)     NOT NULL DEFAULT 'simple',
    category_id                     BIGINT          NULL REFERENCES categories (id) ON DELETE SET NULL,
    brand_id                        BIGINT          NULL REFERENCES brands (id) ON DELETE SET NULL,
    name                            VARCHAR(255)    NOT NULL,
    slug                            VARCHAR(255)    NOT NULL,
    description                     TEXT            NOT NULL,
    short_description               TEXT            NULL,
    sku                             VARCHAR(255)    NOT NULL,
    price                           DECIMAL(10,2)   NOT NULL,
    compare_price                   DECIMAL(10,2)   NULL,
    cost_price                      DECIMAL(10,2)   NULL,
    stock_quantity                   INTEGER         NOT NULL DEFAULT 0,
    min_stock_level                  INTEGER         NOT NULL DEFAULT 0,
    sold_count                       INTEGER         NOT NULL DEFAULT 0,
    track_inventory                  BOOLEAN         NOT NULL DEFAULT TRUE,
    is_active                        BOOLEAN         NOT NULL DEFAULT TRUE,
    is_featured                      BOOLEAN         NOT NULL DEFAULT FALSE,
    free_shipping                    BOOLEAN         NOT NULL DEFAULT FALSE,
    min_order_quantity               INTEGER         NOT NULL DEFAULT 1,
    max_order_quantity               INTEGER         NULL,
    moderation_status                VARCHAR(20)     NOT NULL DEFAULT 'pending',
    moderation_note                  TEXT            NULL,
    approved_at                      TIMESTAMP       NULL,
    approved_by                      BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at                      TIMESTAMP       NULL,
    pending_update_payload           TEXT            NULL,
    pending_update_status            VARCHAR(20)     NULL,
    pending_update_note              TEXT            NULL,
    pending_update_submitted_at      TIMESTAMP       NULL,
    pending_update_reviewed_at       TIMESTAMP       NULL,
    pending_update_reviewed_by       BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    weight                           DECIMAL(8,2)    NULL,
    dimensions                       TEXT            NULL,
    images                           TEXT            NULL,
    video_url                        VARCHAR(255)    NULL,
    tags                             TEXT            NULL,
    meta_title                       TEXT            NULL,
    meta_description                 TEXT            NULL,
    created_at                       TIMESTAMP       NULL,
    updated_at                       TIMESTAMP       NULL
);

CREATE UNIQUE INDEX products_slug_unique              ON products (slug);
CREATE UNIQUE INDEX products_sku_unique               ON products (sku);
CREATE INDEX        products_vendor_active_idx         ON products (vendor_id, is_active);
CREATE INDEX        products_is_featured_idx           ON products (is_featured);
CREATE INDEX        products_category_id_idx           ON products (category_id);
CREATE INDEX        products_moderation_status_idx     ON products (moderation_status);
CREATE INDEX        products_pending_update_status_idx ON products (pending_update_status);

-- Full-text search index (name + description are NOT encrypted)
CREATE INDEX products_fulltext_idx
    ON products
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));


-- ============================================================================
-- 22. PRODUCT VARIANTS
-- ============================================================================
CREATE TABLE product_variants (
    id                  BIGSERIAL       PRIMARY KEY,
    product_id          BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    sku                 VARCHAR(255)    NOT NULL,
    name                TEXT            NULL,
    price               DECIMAL(10,2)   NOT NULL,
    compare_price       DECIMAL(10,2)   NULL,
    cost_price          DECIMAL(10,2)   NULL,
    stock_quantity      INTEGER         NOT NULL DEFAULT 0,
    min_stock_level     INTEGER         NOT NULL DEFAULT 0,
    track_inventory     BOOLEAN         NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    weight              DECIMAL(8,2)    NULL,
    attributes          TEXT            NULL,
    images              TEXT            NULL,
    barcode             TEXT            NULL,
    "position"          DECIMAL(8,2)    NOT NULL DEFAULT 0,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX product_variants_sku_unique         ON product_variants (sku);
CREATE UNIQUE INDEX product_variants_product_sku_unique ON product_variants (product_id, sku);
CREATE INDEX        product_variants_active_idx         ON product_variants (product_id, is_active);


-- ============================================================================
-- 23. PRODUCT ATTRIBUTES
-- ============================================================================
CREATE TABLE product_attributes (
    id          BIGSERIAL       PRIMARY KEY,
    product_id  BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    key         VARCHAR(255)    NOT NULL,
    value       TEXT            NOT NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX product_attributes_product_key_idx ON product_attributes (product_id, key);
CREATE INDEX product_attributes_key_idx         ON product_attributes (key);


-- ============================================================================
-- 24. WHOLESALE PRODUCTS
-- ============================================================================
CREATE TABLE wholesale_products (
    id              BIGSERIAL       PRIMARY KEY,
    product_id      BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    wholesale_price DECIMAL(10,2)   NOT NULL,
    min_qty         INTEGER         NOT NULL DEFAULT 10,
    status          VARCHAR(20)     NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE UNIQUE INDEX wholesale_products_product_unique ON wholesale_products (product_id);
CREATE INDEX        wholesale_products_status_idx     ON wholesale_products (status);


-- ============================================================================
-- 25. ORDERS
-- ============================================================================
CREATE TABLE orders (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    coupon_id           BIGINT          NULL REFERENCES coupons (id) ON DELETE SET NULL,
    order_number        VARCHAR(255)    NOT NULL,
    status              order_status    NOT NULL DEFAULT 'pending',
    subtotal            DECIMAL(10,2)   NOT NULL,
    tax_amount          DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_amount     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    shipping_method     TEXT            NULL,
    shipping_zone       TEXT            NULL,
    shipping_min_days   SMALLINT        NULL,
    shipping_max_days   SMALLINT        NULL,
    discount_amount     DECIMAL(10,2)   NOT NULL DEFAULT 0,
    total               DECIMAL(10,2)   NOT NULL,
    currency            VARCHAR(3)      NOT NULL DEFAULT 'USD',
    shipping_address    TEXT            NOT NULL,
    billing_address     TEXT            NULL,
    customer_email      TEXT            NOT NULL,
    customer_phone      TEXT            NULL,
    notes               TEXT            NULL,
    shipped_at          TIMESTAMP       NULL,
    delivered_at        TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX orders_order_number_unique  ON orders (order_number);
CREATE INDEX        orders_user_status_idx      ON orders (user_id, status);
CREATE INDEX        orders_status_idx           ON orders (status);
CREATE INDEX        orders_order_number_idx     ON orders (order_number);
CREATE INDEX        orders_created_at_idx       ON orders (created_at);


-- ============================================================================
-- 26. ORDER ITEMS
-- ============================================================================
-- product_id uses RESTRICT on delete to preserve order history.
-- ============================================================================
CREATE TABLE order_items (
    id                  BIGSERIAL       PRIMARY KEY,
    order_id            BIGINT          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id          BIGINT          NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    product_variant_id  BIGINT          NULL REFERENCES product_variants (id) ON DELETE CASCADE,
    product_name        TEXT            NOT NULL,
    product_sku         TEXT            NOT NULL,
    variant_name        TEXT            NULL,
    quantity            INTEGER         NOT NULL,
    unit_price          DECIMAL(10,2)   NOT NULL,
    total_price         DECIMAL(10,2)   NOT NULL,
    product_attributes  TEXT            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE INDEX order_items_order_product_idx ON order_items (order_id, product_id);


-- ============================================================================
-- 27. PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id                      BIGSERIAL       PRIMARY KEY,
    order_id                BIGINT          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    user_id                 BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    payment_method          TEXT            NOT NULL,
    gateway_transaction_id  VARCHAR(255)    NULL,
    status                  payment_status  NOT NULL DEFAULT 'pending',
    amount                  DECIMAL(10,2)   NOT NULL,
    currency                VARCHAR(3)      NOT NULL DEFAULT 'USD',
    gateway_response        TEXT            NULL,
    notes                   TEXT            NULL,
    paid_at                 TIMESTAMP       NULL,
    created_at              TIMESTAMP       NULL,
    updated_at              TIMESTAMP       NULL
);

CREATE UNIQUE INDEX payments_gateway_txn_unique ON payments (gateway_transaction_id);
CREATE INDEX        payments_order_status_idx   ON payments (order_id, status);
CREATE INDEX        payments_gateway_txn_idx    ON payments (gateway_transaction_id);
CREATE INDEX        payments_user_id_idx        ON payments (user_id);


-- ============================================================================
-- 28. REVIEWS
-- ============================================================================
-- user_id is nullable + SET NULL to preserve reviews when users are deleted.
-- product_id uses RESTRICT to prevent accidental product deletion.
-- ============================================================================
CREATE TABLE reviews (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    product_id      BIGINT          NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
    order_item_id   BIGINT          NULL REFERENCES order_items (id) ON DELETE CASCADE,
    rating          INTEGER         NOT NULL,
    title           TEXT            NULL,
    comment         TEXT            NULL,
    is_verified     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_approved     BOOLEAN         NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN         NOT NULL DEFAULT FALSE,
    helpful_count   INTEGER         NOT NULL DEFAULT 0,
    vendor_reply    TEXT            NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE UNIQUE INDEX reviews_user_product_unique  ON reviews (user_id, product_id);
CREATE INDEX        reviews_product_approved_idx ON reviews (product_id, is_approved, rating);


-- ============================================================================
-- 29. REFUNDS
-- ============================================================================
-- Status and reason use CHECK constraints (updated by migration 44).
-- ============================================================================
CREATE TABLE refunds (
    id                  BIGSERIAL       PRIMARY KEY,
    order_id            BIGINT          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    order_item_id       BIGINT          NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
    user_id             BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status              VARCHAR(255)    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','requested','approved','rejected','processed')),
    reason              VARCHAR(255)    NOT NULL DEFAULT 'other'
                            CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other','late_delivery','order_cancelled')),
    reason_description  TEXT            NULL,
    refund_amount       DECIMAL(10,2)   NOT NULL,
    currency            VARCHAR(3)      NOT NULL DEFAULT 'USD',
    admin_notes         TEXT            NULL,
    processed_at        TIMESTAMP       NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE INDEX refunds_order_status_idx   ON refunds (order_id, status);
CREATE INDEX refunds_user_status_idx    ON refunds (user_id, status);
CREATE INDEX refunds_order_item_idx     ON refunds (order_item_id);


-- ============================================================================
-- 30. SHIPMENTS
-- ============================================================================
CREATE TABLE shipments (
    id                  BIGSERIAL       PRIMARY KEY,
    order_id            BIGINT          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    order_item_id       BIGINT          NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
    tracking_number     TEXT            NOT NULL,
    carrier             TEXT            NOT NULL,
    status              shipment_status NOT NULL DEFAULT 'preparing',
    shipping_address    TEXT            NOT NULL,
    shipping_cost       DECIMAL(10,2)   NOT NULL DEFAULT 0,
    currency            VARCHAR(3)      NOT NULL DEFAULT 'USD',
    tracking_events     TEXT            NULL,
    shipped_at          TIMESTAMP       NULL,
    delivered_at        TIMESTAMP       NULL,
    notes               TEXT            NULL,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX shipments_tracking_unique   ON shipments (tracking_number);
CREATE INDEX        shipments_order_status_idx  ON shipments (order_id, status);
CREATE INDEX        shipments_tracking_idx      ON shipments (tracking_number);


-- ============================================================================
-- 31. LOYALTY POINTS
-- ============================================================================
CREATE TABLE loyalty_points (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    order_id    BIGINT          NULL REFERENCES orders (id) ON DELETE CASCADE,
    type        loyalty_type    NOT NULL DEFAULT 'earned',
    points      INTEGER         NOT NULL,
    description TEXT            NULL,
    metadata    TEXT            NULL,
    expires_at  TIMESTAMP       NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX loyalty_points_user_type_idx   ON loyalty_points (user_id, type);
CREATE INDEX loyalty_points_expires_idx     ON loyalty_points (expires_at);


-- ============================================================================
-- 32. WALLET TRANSACTIONS
-- ============================================================================
CREATE TABLE wallet_transactions (
    id              BIGSERIAL       PRIMARY KEY,
    wallet_id       BIGINT          NOT NULL REFERENCES wallets (id) ON DELETE CASCADE,
    type            VARCHAR(255)    NOT NULL,
    amount          DECIMAL(10,2)   NOT NULL,
    balance_after   DECIMAL(10,2)   NOT NULL,
    description     TEXT            NULL,
    reference       TEXT            NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE INDEX wallet_txn_wallet_idx  ON wallet_transactions (wallet_id);
CREATE INDEX wallet_txn_type_idx    ON wallet_transactions (type);


-- ============================================================================
-- 33. CART ITEMS
-- ============================================================================
CREATE TABLE cart_items (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id          BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    product_variant_id  BIGINT          NULL REFERENCES product_variants (id) ON DELETE CASCADE,
    quantity            INTEGER         NOT NULL DEFAULT 1,
    created_at          TIMESTAMP       NULL,
    updated_at          TIMESTAMP       NULL
);

CREATE UNIQUE INDEX cart_items_user_product_variant_unique
    ON cart_items (user_id, product_id, product_variant_id);


-- ============================================================================
-- 34. WISHLISTS
-- ============================================================================
CREATE TABLE wishlists (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    product_id  BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX wishlists_user_product_unique ON wishlists (user_id, product_id);


-- ============================================================================
-- 35. CONVERSATIONS
-- ============================================================================
CREATE TABLE conversations (
    id                          BIGSERIAL       PRIMARY KEY,
    customer_id                 BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    vendor_id                   BIGINT          NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
    status                      VARCHAR(20)     NOT NULL DEFAULT 'waiting',
    last_message_at             TIMESTAMP       NULL,
    admin_replied_at            TIMESTAMP       NULL,
    customer_chat_expires_at    TIMESTAMP       NULL,
    is_customer_blocked         BOOLEAN         NOT NULL DEFAULT FALSE,
    customer_blocked_at         TIMESTAMP       NULL,
    created_at                  TIMESTAMP       NULL,
    updated_at                  TIMESTAMP       NULL
);

CREATE UNIQUE INDEX conversations_customer_vendor_unique ON conversations (customer_id, vendor_id);
CREATE INDEX        conversations_last_msg_idx           ON conversations (last_message_at);
CREATE INDEX        conversations_status_idx             ON conversations (status);
CREATE INDEX        conversations_chat_expires_idx       ON conversations (customer_chat_expires_at);
CREATE INDEX        conversations_blocked_idx            ON conversations (is_customer_blocked);


-- ============================================================================
-- 36. CONVERSATION MESSAGES
-- ============================================================================
CREATE TABLE conversation_messages (
    id              BIGSERIAL       PRIMARY KEY,
    conversation_id BIGINT          NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    sender_id       BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body            TEXT            NOT NULL,
    read_at         TIMESTAMP       NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE INDEX conv_msgs_conversation_created_idx ON conversation_messages (conversation_id, created_at);
CREATE INDEX conv_msgs_sender_read_idx          ON conversation_messages (sender_id, read_at);


-- ============================================================================
-- 37. USER NOTIFICATIONS
-- ============================================================================
CREATE TABLE user_notifications (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type        VARCHAR(50)     NOT NULL DEFAULT 'default',
    title       TEXT            NOT NULL,
    message     TEXT            NOT NULL,
    link        TEXT            NULL,
    meta        TEXT            NULL,
    read_at     TIMESTAMP       NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX user_notifications_user_read_idx    ON user_notifications (user_id, read_at);
CREATE INDEX user_notifications_user_created_idx ON user_notifications (user_id, created_at);


-- ============================================================================
-- 38. AFFILIATES
-- ============================================================================
CREATE TABLE affiliates (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    name            TEXT            NOT NULL,
    email           TEXT            NULL,
    code            VARCHAR(50)     NOT NULL,
    referrals       INTEGER         NOT NULL DEFAULT 0,
    earnings        DECIMAL(12,2)   NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5,2)    NOT NULL DEFAULT 10,
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
    joined_at       TIMESTAMP       NULL,
    created_at      TIMESTAMP       NULL,
    updated_at      TIMESTAMP       NULL
);

CREATE UNIQUE INDEX affiliates_code_unique  ON affiliates (code);
CREATE INDEX        affiliates_status_idx   ON affiliates (status);
CREATE INDEX        affiliates_code_idx     ON affiliates (code);
CREATE INDEX        affiliates_email_idx    ON affiliates (email);


-- ============================================================================
-- 39. WHOLESALE CUSTOMERS
-- ============================================================================
CREATE TABLE wholesale_customers (
    id          BIGSERIAL       PRIMARY KEY,
    user_id     BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    company     TEXT            NOT NULL,
    email       TEXT            NULL,
    contact     TEXT            NULL,
    orders      INTEGER         NOT NULL DEFAULT 0,
    total_spent DECIMAL(12,2)   NOT NULL DEFAULT 0,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX wholesale_customers_status_idx  ON wholesale_customers (status);
CREATE INDEX wholesale_customers_company_idx ON wholesale_customers (company);


-- ============================================================================
-- 40. MEDIA ASSETS
-- ============================================================================
CREATE TABLE media_assets (
    id          BIGSERIAL       PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    type        VARCHAR(255)    NOT NULL DEFAULT 'image'
                    CHECK (type IN ('image','video','document')),
    size        TEXT            NOT NULL DEFAULT '0 KB',
    url         TEXT            NOT NULL,
    uploaded_by BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);


-- ============================================================================
-- 41. CATEGORY REQUESTS  (vendor → admin workflow)
-- ============================================================================
CREATE TABLE category_requests (
    id          BIGSERIAL       PRIMARY KEY,
    vendor_id   BIGINT          NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
    parent_id   BIGINT          NULL REFERENCES categories (id) ON DELETE SET NULL,
    category_id BIGINT          NULL REFERENCES categories (id) ON DELETE SET NULL,
    name        TEXT            NOT NULL,
    description TEXT            NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending',
    admin_reply TEXT            NULL,
    reviewed_by BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP       NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX category_requests_vendor_status_idx ON category_requests (vendor_id, status);


-- ============================================================================
-- 42. BRAND REQUESTS  (vendor → admin workflow)
-- ============================================================================
CREATE TABLE brand_requests (
    id          BIGSERIAL       PRIMARY KEY,
    vendor_id   BIGINT          NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
    brand_id    BIGINT          NULL REFERENCES brands (id) ON DELETE SET NULL,
    name        TEXT            NOT NULL,
    website     TEXT            NULL,
    description TEXT            NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending',
    admin_reply TEXT            NULL,
    reviewed_by BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP       NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX brand_requests_vendor_status_idx ON brand_requests (vendor_id, status);


-- ============================================================================
-- 43. PRODUCT RECONSIDERATION REQUESTS  (vendor → admin workflow)
-- ============================================================================
CREATE TABLE product_reconsideration_requests (
    id          BIGSERIAL       PRIMARY KEY,
    product_id  BIGINT          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    vendor_id   BIGINT          NOT NULL REFERENCES vendors (id) ON DELETE CASCADE,
    message     TEXT            NOT NULL,
    status      VARCHAR(20)     NOT NULL DEFAULT 'pending',
    admin_reply TEXT            NULL,
    reviewed_by BIGINT          NULL REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP       NULL,
    created_at  TIMESTAMP       NULL,
    updated_at  TIMESTAMP       NULL
);

CREATE INDEX recon_requests_product_status_idx ON product_reconsideration_requests (product_id, status);
CREATE INDEX recon_requests_vendor_status_idx  ON product_reconsideration_requests (vendor_id, status);


-- ============================================================================
-- SEED: DEFAULT PERMISSIONS  (Spatie Permission v7, guard = 'web')
-- ============================================================================
INSERT INTO permissions (name, guard_name, created_at, updated_at)
SELECT p.name, 'web', NOW(), NOW()
FROM (VALUES
    -- Dashboard
    ('view-dashboard'),
    -- Users
    ('view-users'), ('create-users'), ('edit-users'), ('delete-users'), ('ban-users'), ('export-users'),
    -- Merchants
    ('view-merchants'), ('approve-merchants'), ('suspend-merchants'), ('delete-merchants'), ('edit-commission'), ('export-merchants'),
    -- Products
    ('view-products'), ('create-products'), ('edit-products'), ('delete-products'), ('approve-products'), ('export-products'),
    -- Catalog
    ('view-categories'), ('create-categories'), ('edit-categories'), ('delete-categories'), ('approve-categories'),
    ('view-brands'), ('create-brands'), ('edit-brands'), ('delete-brands'), ('approve-brands'),
    -- Orders
    ('view-orders'), ('update-orders'), ('export-orders'),
    -- Finance
    ('view-finance'), ('manage-wallets'), ('export-finance'),
    ('view-refunds'), ('process-refunds'), ('export-refunds'),
    -- Marketing
    ('view-marketing'), ('create-coupons'), ('edit-coupons'), ('delete-coupons'), ('edit-marketing'),
    -- Content
    ('view-content'), ('create-content'), ('edit-content'), ('delete-content'),
    ('view-media'), ('upload-media'), ('delete-media'),
    -- Reviews
    ('view-reviews'), ('moderate-reviews'), ('delete-reviews'),
    -- Chat
    ('view-chats'), ('manage-chats'), ('delete-chats'),
    -- Storefront
    ('view-storefront'), ('edit-storefront'),
    -- Operations
    ('view-reports'), ('export-reports'), ('use-pos'),
    ('view-wholesale'), ('manage-wholesale'),
    ('manage-affiliates'), ('view-rewards'), ('edit-rewards'),
    -- System
    ('view-settings'), ('edit-settings'), ('edit-payment-settings'), ('edit-security-settings'), ('edit-shipping'),
    ('view-system'), ('manage-system'),
    ('view-staff'), ('create-staff'), ('edit-staff'), ('delete-staff'), ('promote-staff'),
    ('view-roles'), ('edit-roles')
) AS p(name)
WHERE NOT EXISTS (
    SELECT 1 FROM permissions WHERE permissions.name = p.name AND permissions.guard_name = 'web'
);


-- ============================================================================
-- SEED: DEFAULT ROLES
-- ============================================================================
INSERT INTO roles (name, guard_name, created_at, updated_at)
SELECT r.name, 'web', NOW(), NOW()
FROM (VALUES
    ('admin'),
    ('merchant'),
    ('customer')
) AS r(name)
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE roles.name = r.name AND roles.guard_name = 'web'
);


-- ============================================================================
-- Done.  43 tables created, 5 enum types, 74 permissions seeded,
-- 3 default roles seeded.
-- ============================================================================
