# Apple IT Zone — Developer Guide

A full-stack e-commerce platform (Apple IT Zone) with a customer storefront, an
admin panel, and a Node/Express backend. This document maps the codebase so a new
developer can understand the architecture, flows, and conventions quickly.

---

## 1. Repository layout

```
apple-it-zone/
├── backend/        # Node.js + Express + MongoDB API (ESM, "type": "module")
│   ├── server.js   # boot script (connect DB/Redis, migrations, listen, socket)
│   └── src/
│       ├── app.js          # Express app, middleware, route mounting
│       ├── config/         # database, redis, cloudinary
│       ├── middleware/     # auth (protect/adminOnly/superAdminOnly), upload
│       ├── models/         # Mongoose schemas
│       ├── controllers/    # request handlers
│       ├── routes/         # Express routers
│       ├── services/       # emailService, smsService, notificationService
│       ├── socket.js       # Socket.IO (admin real-time notifications)
│       └── utils/          # orderNumber, categoryTree, parseUA, jwt, bcrypt
└── frontend/       # Next.js 16 (App Router) + TypeScript + npm + shadcn/ui
    └── src/
        ├── app/
        │   ├── (store)/     # customer storefront
        │   ├── (admin)/     # admin panel  (/admin/*)
        │   ├── admin/login/ # admin auth entry (outside (admin) layout)
        │   ├── api/[...path]/# server-side proxy for auth calls
        │   ├── sitemap.ts / robots.ts
        │   └── maintenance/ # public maintenance screen
        ├── components/      # ui (shadcn), store, admin, shared
        ├── lib/             # api.ts, axios.ts, serverApi.ts, socket.ts, adminPermissions.ts
        ├── store/           # Zustand store (auth, cart, ui, checkout, compare, wishlist)
        ├── context/         # AuthContext (CartContext/AdminContext are empty stubs)
        ├── hooks/           # useAuth (Context), use-maintenance, useCart (Zustand)...
        └── types/           # product.d.ts, user.d.ts (order.d.ts is empty)
```

> **Package manager:** use **npm** for both apps (`npm install`, `npm run dev`).

---

## 2. Backend

### 2.1 Stack & boot

- **Node + Express 5**, **Mongoose 9** (MongoDB), **Redis** (cache only),
  **Socket.IO** (admin real-time). ESM modules.
- `server.js` boots in order: `connectDB()` → `connectRedis()` (non-fatal) →
  runs backfill migrations (order numbers `#N`, legacy statuses) → `initSocket()`.
- `app.js` middleware order: `helmet` → `cors` → `Cache-Control: no-store`
  (all `/api`) → **rate limiters** → `morgan` → `compression` → body parsing.
- `app.set('trust proxy', TRUST_PROXY)` is configured so `req.ip` reflects the
  real client IP behind a proxy (see §7).

### 2.2 Middleware — auth

`src/middleware/auth.js`:

- `protect` — reads `Authorization: Bearer <token>`, verifies JWT, resolves the
  account from **both** the `User` and `TeamMember` collections. Sets
  `req.user` and `req.isTeam` (`true` when the account is a TeamMember).
- `adminOnly` — allows role in `['admin','super_admin','manager']`.
- `superAdminOnly` — allows **only** `super_admin`.

### 2.3 Roles

There are **two** staff account collections:

- **User** (`User.js`): roles `['super_admin','admin','manager','customer']` (default `customer`). Has `status: active/inactive/suspended`.
- **TeamMember** (`TeamMember.js`): roles `['admin','manager','super_admin']` (default `manager`). Has `active: boolean` (no `customer` role).

Both collections participate in login + 2FA + lockout. `adminOnly` accepts all
three staff roles; `superAdminOnly` is super_admin only.

### 2.4 Key models

| Model                                                           | Notes                                                                                                                                                                |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User                                                            | name, email (unique), password (bcrypt, `select:false`), phone, role, status, `twoFactor*`, `loginAttempts`, `lockUntil`                                             |
| TeamMember                                                      | staff accounts; phone + 2FA + lockout fields added recently                                                                                                          |
| Order                                                           | `user`, `items[]` (snapshots), `shippingAddress`, `totalAmount`, `coupon`, `payment{ method,status,tran_id,val_id }`, `orderStatus`, `advanceAmount/advancePaid`     |
| Product                                                         | slug (unique), price/discountPrice, `categories[]`, `images[]`, `imageAlts[]`, `seo{}`, `ratings[]` (reviews live here), `status`, `pcPart{}` (see §2.10 PC Builder) |
| SavedBuild                                                      | saved PC-builder configs: `user`, `name`, `components{}` (slot → {product}), `totalAmount`, `totalWattage`                                                           |
| Category                                                        | name, slug, `parentId`, `sortOrder`, `featured`                                                                                                                      |
| PromoCode                                                       | code, type %, fixed/free_shipping, `computeItemDiscount()`                                                                                                           |
| Invoice                                                         | generated from orders; `INV-<orderId8>`                                                                                                                              |
| Session                                                         | login sessions per user                                                                                                                                              |
| SmsSetting / StoreSetting / PaymentGateway / MaintenanceSetting | singletons/config docs                                                                                                                                               |
| Notification                                                    | category, title, link (drives admin real-time feed)                                                                                                                  |

> Reviews/ratings are **embedded** in `Product.ratings[]` (no `Review` model).
> Questions are their own `Question` model.

### 2.5 Core flows

**Order lifecycle** (`Order.orderStatus`):
`pending → processing → confirmed → send_courier → cancelled`

- `POST /api/orders` (protected): validates stock, snapshots items, applies
  server-side coupon, assigns `#N` order number, sets `orderStatus='pending'`.
  Fires **SMS + email confirmation + admin notification** (all fire-and-forget).
- `PUT /api/orders/:id/status` (admin): advancing the status fires **SMS + email**
  to the customer for every status change. Cancelling restores stock.
- `payment.status` (`pending/paid/failed/cancelled`) is updated separately via
  `PUT /api/orders/:id/payment-status` or the payment gateway callbacks.

**Payments (SSLCommerz)** — `paymentController.js`:

- `POST /api/payment/initiate` (protected) builds the gateway payload; `tran_id`
  is `<orderId>_<ts>` (full) or `<orderId>_adv_<ts>` (advance payment).
- `GET/POST /api/payment/validate`, `POST /api/payment/ipn`, `GET/POST /api/payment/cancel`
  resolve paid/failed/cancelled. Advance payments only record `advancePaid`.
- Credentials come from the `PaymentGateway` doc `name:'sslcommerz'`, falling back
  to `SSL_*` env vars (not currently in `.env` → sandbox test creds used).

**Auth, 2FA, lockout** — `authController.js`:

- Login accepts email/phone; resolves User then TeamMember.
- **2FA (SMS OTP):** triggered for staff when `SmsSetting.twoFactorEnabled` is on.
  OTP is sha256-hashed, stored on the account, expires after `otpExpirySeconds`
  (15–900s), max 5 attempts. In `development`, failed SMS logs the OTP to console.
- **Lockout:** 5 failed passwords (`MAX_LOGIN_ATTEMPTS`, default 5) → account locked
  for `LOCK_TIME_MINUTES` (default 15) → `429`. Correct password resets counters.

### 2.6 Services (non-throwing)

`src/services/` — every send helper returns `{ success, skipped, reason, ... }`
and **never throws**, so order/auth flows never break if email/SMS fails.

- `emailService.js` — Resend. `sendEmail()`, `orderConfirmationTemplate`,
  `orderStatusUpdateTemplate` (per-status meta for pending/processing/confirmed/
  send_courier/cancelled), `notifyOrderConfirmation`, `notifyOrderStatusEmail`.
- `smsService.js` — bulksmsbd.net. `sendSms()`, status templates, `notifyOrderStatusChange`.
- `notificationService.js` — saves `Notification` + emits `notification:new` to the admin Socket.IO room.

### 2.7 Real-time

`src/socket.js`: Socket.IO, joins only the `admin` room for staff accounts.
`emitToAdmins(event, payload)` is used by `notificationService` for live new-order
/ status / payment alerts in the admin sidebar.

### 2.8 Caching (Redis)

- Product list: `products:list:<query>` (TTL `REDIS_TTL`, 300)
- Product detail: `product:id:<id>`, `product:slug:<slug>`
- Categories: `categories:all` (TTL 600)
- Invalidation: product writes/rating → `cacheDel('products:*')` + `cacheDel('product:*')`;
  category writes → `cacheDel('categories:*')`.
- All helpers degrade gracefully when Redis is disabled/unavailable.

### 2.9 PC Builder — backend

**`Product.pcPart` subdocument** (`enabled`, `type`, `socket`, `platform`, `formFactor`, `wattage`):

- `type` enum: `cpu`, `cpu_cooler`, `motherboard`, `ram`, `storage`, `gpu`, `psu`, `casing`, `monitor`, `casing_cooler`, `keyboard`, `mouse`, `speaker`, `headphone`, `wifi_adapter`, `antivirus`, `ups`.
- `socket`/`platform`: used for client-side CPU↔motherboard/cooler compatibility matching (`LGA*` → intel, `AM*` → amd).
- `parsePcPart()` helper in `productController.js` normalizes the value (accepts JSON string or object).
- Admin product create/update routes handle `pcPart` via `FormData.append('pcPart', JSON.stringify(...))`.

**`GET /api/products/pc-parts`** (`productController.getPcParts`):

- Returns active products that have `pcPart.enabled = true`, filtered by optional `?type=`, `?socket=`, `?platform=`, `?formFactor=`.
- Light projection (only fields needed by the builder UI).
- Registered **before** `/:id` in `productRoutes.js` (must not be shadowed).

**`SavedBuild`** model + `pcBuildController` (`/api/pc-builder`):

- `protect` middleware required; `getMyBuilds` is `GET`, `saveBuild` is `POST`, `deleteBuild` is `DELETE`.
- Server recomputes `totalAmount`/`totalWattage` from the live Product collection (client cannot forge prices).

### 2.10 Render deployment

Both apps deploy as **Render Web Services** from the monorepo:

| Service  | Root        | Build                          | Start       |
| -------- | ----------- | ------------------------------ | ----------- |
| Backend  | `backend/`  | `npm install`                  | `npm start` |
| Frontend | `frontend/` | `npm install && npm run build` | `npm start` |

Render uses the npm lockfile generated in each service root.

**Pre-deploy env checklist (per service):**

- Backend: `NODE_ENV=production`, strong `JWT_SECRET`, `FRONTEND_URL`/`BACKEND_URL` pointing at prod, `CORS_ORIGINS` = prod origin only, `TRUST_PROXY=1`, SSL live credentials (`SSL_IS_LIVE=true`), verified Resend domain + real `RESEND_FROM`.
- Frontend: `NEXT_PUBLIC_API_URL` (must include `/api`), `API_BASE_URL` (server-only), `NEXT_PUBLIC_SITE_URL`.
- ⚠️ `NEXT_PUBLIC_*` vars are **inlined at build time** — set them in Render **before** running the first build.
- Free Render instances spin down after ~15 min idle; use a paid instance for production.

### 2.9 Environment variables (backend `.env`)

| Variable                                         | Purpose                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `NODE_ENV`, `PORT`                               | runtime env / port (5000)                                                                        |
| `DB_URI`                                         | MongoDB connection string                                                                        |
| `JWT_SECRET`                                     | HS256 signing secret (tokens expire in 3h)                                                       |
| `FRONTEND_URL`                                   | CORS allow + payment success/fail/cancel base                                                    |
| `BACKEND_URL`                                    | SSLCommerz IPN base                                                                              |
| `CORS_ORIGINS`                                   | comma-separated allowed origins (`*` supported)                                                  |
| `TRUST_PROXY`                                    | proxy hops for `req.ip` (`1` default; `true`/`false`/number/IP list)                             |
| `CLOUDINARY_*`                                   | image uploads                                                                                    |
| `REDIS_*`                                        | `REDIS_ENABLED`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_TTL`, `REDIS_TLS`, `REDIS_USERNAME/PASSWORD` |
| `RESEND_API_KEY`, `RESEND_FROM`, `EMAIL_ENABLED` | transactional email                                                                              |
| `SSL_*` (optional)                               | SSLCommerz store id/password/live (else uses `PaymentGateway` doc)                               |
| `MAX_LOGIN_ATTEMPTS`, `LOCK_TIME_MINUTES`        | lockout tuning (default 5 / 15)                                                                  |

---

## 3. Frontend

### 3.1 Stack

Next.js 16 (App Router), React 19, TypeScript, **npm**, **shadcn/ui**,
Tailwind v4, Zustand (state), Axios (API), `socket.io-client`, zod, sonner.

> `next.config.ts` sets `typescript.ignoreBuildErrors: true` — TS errors do **not**
> fail `next build`. Rely on `npm run lint`/editor for type safety.

### 3.2 Route groups

- **`(store)`** — customer UI, wrapped by `TopNav`/`CategoryNav`/`Footer`/`MaintenanceGuard`.
  Home, product pages, checkout, accounts, offers, search, holiday, payment results.
- **`(admin)`** — staff UI, wrapped by `SidebarProvider` + `AppSidebar`. All pages live
  under `admin/<name>` → URL `/admin/<name>` (e.g. `/admin/orders`, `/admin/products`,
  `/admin/settings`, `/admin/customers`, `/admin/users`, `/admin/team`, `/admin/offers`,
  `/admin/slider`, `/admin/invoice` ["Billing"], `/admin/sms`, `/admin/maintenance`, …).
- **`admin/login`** is a separate full-screen login (outside the `(admin)` layout).
- **`(store)/(auth)`** holds customer login/register/forgot/reset under the store chrome.
- **`pc-builders`** — PC Builder page under `(store)`, requiring `useAuth` (Zustand store shape). Users build a PC config by selecting parts with socket-based CPU compatibility filtering, add to cart, or save builds (login required, persisted server-side).

### 3.3a Admin product form components

All admin product form logic lives in a shared **`components/admin/products/ProductForm.tsx`**:

- Exports `ProductForm`, `EMPTY_FORM_VALUE`, `parseSpecifications`, and the `ProductFormValue` / `PcPartFormValue` types.
- Imported by both `admin/products/new/page.tsx` and `admin/products/edits/page.tsx` (each page handles only its data-fetching + `handleSubmit`).
- Sub-editors (`KeySpecsEditor`, `KeyFeaturesEditor`, `SpecsEditor`, `ContentEditor`, `ProfitSummary`) are internal to this file.
- The SEO section's Brand input was removed — brand is entered once in the main info grid and automatically written to both `brand` and `specifications._keySpecs.Brand`.

### 3.3 State management

- **Zustand** (`src/store`): root persisted store `useAppStore`. Slices: `auth`, `cart`,
  `ui`, `checkout`, `compare`, `wishlist`. Auth is **not** persisted (relies on the token).
  Selector hooks: `useAuth`, `useCart`, `useUI`, `useCheckout`, `useCompare`, `useWishlist`.
- **AuthContext** (`src/context/AuthContext.tsx`) is a real React context (`useAuth` from
  `@/hooks/useAuth`) returning `{ user, loading, isAdmin, login, register, logout }`.
  ⚠️ There are **two `useAuth` symbols**: the Zustand one (`@/store`) and the Context one
  (`@/hooks/useAuth`) — different return shapes. Import deliberately.
- Empty stub files to avoid: `context/CartContext.ts`, `context/AdminContext.ts`,
  `hooks/useCart.ts`, `hooks/useWishlist.ts`, `types/order.d.ts`. Use the Zustand store
  and the DTO types defined in `src/lib/api.ts`.

### 3.4 API client (`src/lib`)

- `axios.ts` — `api` instance. `baseURL = NEXT_PUBLIC_API_URL`. Interceptor injects
  `Authorization: Bearer <localStorage.mobile_token>`.
- `api.ts` — typed namespaces (`productApi`, `orderApi`, `authApi`, `customerApi`,
  `paymentApi`, `smsApi`, `pcPartsApi`, `pcBuilderApi`, …) + DTO types.
- `pcPartsApi.list(filters)` — `GET /api/products/pc-parts` (public, no auth).
- `pcBuilderApi.getMyBuilds()` / `.save(name, components)` / `.remove(id)` — `GET/POST/DELETE /api/pc-builder` (auth required).
- `serverApi.ts` — **server-only** `fetch` + React `cache`, `no-store`, base `API_BASE_URL`.
  Used by SSR `generateMetadata` (product page, sitemap, robots). Do **not** use `api`
  inside server components.
- `socket.ts` — `getSocket()` singleton, auth via `mobile_token`, subscribes to `notification:new`.
- `/api/[...path]` — Next Route Handler proxy. Auth calls (login/logout/verify-otp) go
  through this proxy; most data calls hit the backend directly via axios.

**Auth token sharing:** both storefront and admin logins write `mobile_token`
(localStorage) + a `token` cookie. The axios client uses the Bearer header; the
server proxy reads the cookie. One login authenticates both surfaces.

### 3.5 Admin permissions (`src/lib/adminPermissions.ts`)

- `ROLE_RANK`: `manager:1, admin:2, super_admin:3`.
- `ADMIN_ROUTE_ACCESS` map: `super_admin` only → `/admin/users`, `/admin/team`,
  `/admin/payments`, `/admin/sms`, `/admin/promo`, `/admin/maintenance`;
  `admin` (admin **or** super_admin) → `/admin/settings`; everything else defaults to `any`
  (but still gated by the layout's `ADMIN_ROLES`).
- `src/app/(admin)/AdminLayoutClient.tsx` gates: no user → `/admin/login`; not in
  `ADMIN_ROLES = ['admin','super_admin','manager']` → `/`; then per-route
  `canAccessRoute()` → `<AccessDenied>` if insufficient. Staff can access the
  admin panel during maintenance; the storefront remains gated separately.

### 3.6 SEO (products)

`src/app/(store)/product/[slug]/page.tsx` is an **async Server Component**:

- `generateMetadata` builds title/description/canonical/OG from `serverApi.fetchProductBySlug`
  (`seo.metaTitle/metaDescription`, `NEXT_PUBLIC_SITE_URL` or `https://appleitzone.com`).
- Emits **Product JSON-LD** (name, image, brand/sku, offers with price/availability).
- Renders the client component `<ProductDetail>`.
- `sitemap.ts` (per-product/category/offer URLs) and `robots.ts` use `SITE_URL` +
  `API_BASE_URL`. ⚠️ Add `NEXT_PUBLIC_SITE_URL` to env or URLs default to `appleitzone.com`;
  `robots.ts` disallows `/account` (typo — real route is `/accounts`).

### 3.7 Environment variables (frontend `.env.local` / `.env.example`)

- `NEXT_PUBLIC_API_URL` — public backend URL (axios, socket). e.g. `http://localhost:5000/api`
- `API_BASE_URL` — **server-only** backend URL (proxy, serverApi, sitemap, robots)
- `NEXT_PUBLIC_SITE_URL` — public site domain for SEO (defaults to `appleitzone.com`)

---

## 4. Running locally

```bash
# Backend
cd backend
npm install
cp .env.example .env        # edit with your Mongo URI, JWT_SECRET, etc.
npm run dev                 # nodemon server.js on :5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                 # next dev on :3000
```

Open `http://localhost:3000`. Admin login: `http://localhost:3000/admin/login`.

---

## 5. Conventions & gotchas (read before contributing)

1. **npm only** for both applications.
2. **Email/SMS services never throw** — call them fire-and-forget (`.catch(() => {})`).
3. **Two `useAuth` implementations** — know which one you import.
4. **Server vs client data:** use `serverApi` in Server Components/`generateMetadata`;
   use `api` (axios) in client components.
5. **Admin route guards:** add new admin pages to `ADMIN_ROUTE_ACCESS` in
   `adminPermissions.ts` if you want them restricted; otherwise they're `any`
   (still require a staff login at the layout).
6. **Product reviews** are `Product.ratings[]`, not a separate model.
7. **Trust proxy** must be set to match your real deployment topology or rate
   limiting/lockout IP detection breaks (see §7).
8. **New order status values** must be added in three places: `Order.orderStatus`
   enum, `updateOrderStatus` `validStatuses` array, and the `STATUS_TEMPLATES`
   (smsService) / `EMAIL_STATUS_META` (emailService).

---

## 6. Known issues / notes for maintainers

- `smsController.updateSettings` previously referenced an undeclared variable
  (`wantsTwoFactorChange`) that threw on 2FA-setting changes — **fixed** (definition
  restored) as part of documenting this guide.
- `errorHandler.js` is defined but **not wired** into `app.js` (app uses an inline
  handler) — its `MulterError` handling is currently dead code.
- `manager` role cannot enter the admin panel (layout gate). Adjust `ADMIN_ROLES`
  in `(admin)/layout.tsx` if managers should have access.
- SSLCommerz runs in sandbox unless configured via the `PaymentGateway` doc or `SSL_*` env.

---

_Generated to onboard new developers. Keep this file in sync with structural changes._
