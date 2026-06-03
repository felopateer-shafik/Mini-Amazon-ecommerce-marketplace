<p align="center">
  <h1 align="center">🛒 Mini-Amazon E-commerce Marketplace</h1>
  <p align="center">
    A production-grade, multi-vendor e-commerce marketplace with full admin panel, merchant portal, and customer storefront.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=for-the-badge&logo=laravel&logoColor=white" alt="Laravel 12" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/i18n-AR%20%7C%20EN-green?style=for-the-badge" alt="i18n AR/EN" />
</p>

---

## 📖 Overview

Mini-Amazon is a **full-stack, multi-vendor e-commerce platform** built with a **Laravel 12** REST API backend and a **React 18** single-page application frontend. The platform supports three distinct user roles — **Customer**, **Merchant**, and **Admin** — each with dedicated interfaces, features, and permission-controlled access.

> **Scale at a glance:** 32 Eloquent models · 43 database tables · 57 migrations · 74 RBAC permissions · 67 frontend routes · 27 admin pages · 100+ React Query hooks · Full Arabic/English bilingual i18n

---

## ✨ Key Features

### 🛍️ Customer Storefront
- Product browsing with advanced filters, search autocomplete, and image zoom
- Shopping cart (guest + authenticated sync), wishlist, and product comparison (up to 4)
- Multi-step checkout with wallet payment, loyalty points, and coupon support
- Order tracking, cancellation, and refund requests
- Real-time notifications via Server-Sent Events (SSE)
- Customer-to-merchant messaging

### 🏪 Merchant Portal
- Sales dashboard with Recharts analytics and revenue tracking
- Product CRUD (5 types: Simple, Variable, Digital, Catalog, Classified) with rich text, image upload, and variants
- Order management with status updates, payout requests, and review replies
- Store branding, shipping configuration, and coupon management

### 🔧 Admin Panel (27 pages)
- User management (CRUD, ban/unban), merchant verification, and staff RBAC (74 permissions)
- Product moderation, category/brand management, and review moderation
- Finance dashboard (wallets, transactions, payouts, refunds)
- Marketing tools (campaigns, coupons, flash deals, bulk SMS, newsletter)
- **Point of Sale (POS)** system, **CMS** (blog, pages), media library
- Live theme customization (7 presets + custom), reporting, and system monitoring

### 🔒 Security & Platform
- AES-256-CBC encryption at rest for PII with HMAC blind indexes
- Social OAuth (Google, Facebook, Apple) + OTP login + 2FA
- Token-based auth (Laravel Sanctum, 24h expiry)
- Role-based access via Spatie Permission v7
- Full bilingual support (Arabic RTL / English LTR)
- Dynamic theming, dark mode, SEO optimization, Facebook Pixel

---

## 🛠️ Tech Stack

| Layer | Backend | Frontend |
|-------|---------|----------|
| **Framework** | Laravel 12 (PHP 8.2+) | React 18.3 |
| **Build** | Vite 7 | Vite 7.3 |
| **Database** | PostgreSQL 16+ / Redis | — |
| **Styling** | — | Tailwind CSS v4 |
| **State** | — | Zustand 5 + TanStack React Query 5 |
| **Auth** | Sanctum + Socialite + Spatie Permission | React Router v7 guards |
| **Payment** | Stripe (stripe/stripe-php) | — |
| **Forms** | Form Requests | React Hook Form + Zod |
| **Charts** | — | Recharts 3 |
| **Maps** | — | Leaflet + React-Leaflet |
| **i18n** | — | Custom (AR 116KB / EN 90KB) |
| **Email** | SMTP / SES / Postmark / Resend | — |
| **Testing** | PHPUnit 11.5 | — |
| **CI/CD** | GitHub Actions (PHP 8.2/8.3/8.4) | — |

---

## 🚀 Quick Start

### Prerequisites

- PHP 8.2+, Composer, Node.js 16+, npm, PostgreSQL 16+, Redis, Git

### Backend

```bash
cd backend
composer install
cp .env.example .env        # Configure DB, Redis, Stripe, OAuth keys
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve            # → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # → http://localhost:3000
```

### Docker (Alternative)

```bash
cd backend
./vendor/bin/sail up
```

> **Dev shortcut:** `cd backend && composer dev` — runs serve, queue worker, Pail logger, and Vite concurrently.

---

## 📚 Documentation

For comprehensive documentation including architecture diagrams, full API reference, database ERD, security details, and more, see:

### **[📄 Full Documentation →](./DOCUMENTATION.md)**

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using Laravel & React
</p>
