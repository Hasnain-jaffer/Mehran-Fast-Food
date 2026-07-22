# Mehran Fast Food

A full-stack food ordering platform built for a real fast food shop — customers browse the menu, order online, and track their order, while staff and management run the whole operation (menu, categories, deals, coupons, orders, and analytics) from a role-based admin panel.

Built with **Node.js/Express + MongoDB** on the backend and **React (Vite) + Tailwind CSS** on the frontend. A React Native/Expo mobile app is planned as the next phase, reusing this same backend.

## Features

### Customer-facing
- 🍔 **Menu browsing** by category, with item variants (e.g. sizes) and per-item add-ons
- 🛒 **Cart & checkout** — card payments via Stripe or cash on delivery, with a minimum order amount and flat delivery fee
- 📦 **Order tracking** — customers can check order status and cancel their own order while it's still in the `placed` state
- 🏷️ **Coupons** — percentage-off discount codes at checkout
- ⭐ **Reviews** — customers can review items, gated to verified (delivered) purchases only
- 🔔 **Push notifications** for order status updates

### Admin / staff
- 🔐 **Role-based access control** with a granular role hierarchy (`customer`, `support`, `delivery`, `cashier`, `kitchenStaff`, `staff`, `manager`, `admin`, `superAdmin`) — a single source of truth in `constants/roles.js`, not scattered role strings across route files
- 📋 **Full catalog management** — categories, menu items (with variants/add-ons/optional stock tracking), and deals
- 📦 **Order management** — view and update order status
- 🎟️ **Coupon management**
- 📊 **Analytics dashboard** with sales/order stats
- 🖼️ **Image uploads** via Cloudinary

### Security & auth (backend)
- 🔑 **JWT access + refresh token** auth, with refresh token rotation
- 📱 **Session management** — list and revoke active sessions per device, plus a "logout everywhere" option
- 🕵️ **Login history** per user
- 🛡️ **Hardened by default** — Helmet security headers, CORS restricted to an allow-list in production, rate limiting on auth and general API routes, MongoDB query sanitization (`express-mongo-sanitize`), and HTTP parameter pollution protection (`hpp`)
- ✅ **Startup environment validation** — the server refuses to boot with missing or weak secrets instead of failing silently later
- 🚫 **Deliberately can't self-promote to `superAdmin`** via the API — that tier can only be set directly in the database, closing off a privilege-escalation path

## Tech Stack

| Layer      | Technology                                            |
|------------|--------------------------------------------------------|
| Backend    | Node.js, Express, MongoDB (Mongoose)                   |
| Auth       | JWT (access + refresh), bcryptjs, express-validator     |
| Payments   | Stripe (card) + Cash on Delivery                        |
| Storage    | Cloudinary (menu item images)                            |
| Security   | Helmet, CORS allow-list, express-rate-limit, express-mongo-sanitize, hpp |
| Frontend   | React 18, Vite, React Router, Tailwind CSS               |
| Frontend payments | @stripe/react-stripe-js                          |

## Project Structure

```
Mehran-Fast-Food/
├── backend/
│   ├── config/          # DB, Cloudinary, Stripe, env validation
│   ├── constants/        # Roles, order status, payment constants — single source of truth
│   ├── controllers/      # Route handlers (auth, orders, menu, coupons, reviews, stats, etc.)
│   ├── middleware/        # authenticate, authorize, rate limiters, validation, error handling
│   ├── models/            # Mongoose schemas: User, MenuItem, Category, Order, Coupon, Deal, Review
│   ├── routes/            # REST route definitions, mounted under /api
│   ├── services/          # Business logic (auth, orders, coupons, reviews, stats, uploads)
│   ├── utils/              # ApiError, apiResponse, tokens, cookies, push notifications, DB seed script
│   ├── validators/         # express-validator schemas per resource
│   ├── app.js              # Express app setup (middleware, routes, error handling)
│   └── server.js           # Entry point
└── website/
    ├── src/
    │   ├── pages/           # Home, Menu, Cart, Track Order, Admin Login/Dashboard/Orders/Menu/Categories/Coupons
    │   ├── components/       # Layout, ProtectedRoute (RequireAuth/RequireAdmin), StripeCardForm, UI states
    │   ├── context/           # App-level React context (auth/cart)
    │   └── hooks/              # Custom hooks
    └── vite.config.js
```

## How It Works

1. **Auth** — customers self-register (always as `customer`); staff accounts are created directly by a manager/admin/superAdmin via `POST /api/auth/staff`, never through public signup. Login returns an access + refresh token pair; refreshing rotates the refresh token.
2. **Ordering** — a customer builds a cart from available menu items (choosing variants/add-ons), applies a coupon if they have one, and checks out via Stripe or COD. Orders move through a status pipeline: `placed → confirmed → preparing → out_for_delivery → delivered` (or `cancelled`).
3. **Admin operations** — `RequireAdmin` on the frontend and `authorize(...)` middleware on the backend gate every admin route to the appropriate role tier, so, for example, only `manager`/`admin`/`superAdmin` can change another user's role or create staff accounts.
4. **Stripe webhooks** are mounted with a raw body parser *before* the global JSON parser, since Stripe's signature verification needs the exact original request bytes.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- A [Cloudinary](https://cloudinary.com/) account (for image uploads)
- A [Stripe](https://stripe.com/) account (for card payments)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with at least:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=a_long_random_string_32_chars_or_more
JWT_REFRESH_SECRET=a_different_long_random_string_32_chars_or_more
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

> The server validates these at startup and will refuse to boot with missing/weak secrets — this is intentional, not a bug, so check the console output if it exits immediately.

```bash
npm run seed   # optional: populate categories/menu items/deals for local testing
npm run dev    # starts on nodemon
```

### Website Setup

```bash
cd website
npm install
npm run dev
```

Set the API base URL for the frontend (check `website/src` for the relevant `.env`/config variable name) to point at your running backend, typically `http://localhost:<backend-port>/api`.

## Roadmap

- [ ] React Native / Expo mobile app, sharing this same backend, with role-based access for both customers and staff on-device
- [ ] Move deployment from local/manual to Render (backend) + Vercel (website)
- [ ] Real client photos for menu items (currently using stock/AI-generated placeholders)
- [ ] Broader automated test coverage (unit tests with a mocked DB are in progress)

## License

No license file is currently included — add one if you intend to open this up beyond the immediate client project.

## Author

**Hasnain Jaffer**
- GitHub: [@Hasnain-jaffer](https://github.com/Hasnain-jaffer)
