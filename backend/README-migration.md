# NestJS and Neon migration status

## Current status

The API host now runs on NestJS and can be started with:

- `npm run dev` — start with Node.js watch mode.
- `npm run start` — start the server.
- `GET /` — service status.
- `GET /api/health` — health response backed by Neon.
- Public `GET /api/categories` and `GET /api/categories/:id`, plus admin-only
  `POST /`, `PUT /:id`, `PUT /reorder`, and `DELETE /:id` — NestJS/Drizzle
  category management with the existing Cloudinary image and banner uploads.
- `GET /api/cart`, `POST /api/cart`, `PUT /api/cart`,
  `DELETE /api/cart/:productId`, and `DELETE /api/cart/clear` — NestJS/Drizzle
  cart endpoints, authenticated with the existing JWT/user accounts.
- `GET /api/holiday` and admin-only `PUT /api/holiday` — NestJS/Drizzle
  holiday configuration endpoints.
- `GET /api/home-content` and admin-only `PUT`/`DELETE /api/home-content` —
  NestJS/Drizzle singleton page-content endpoints.
- `GET /api/home-slider-texts/setting` and admin-only
  `PUT /api/home-slider-texts/setting` — NestJS/Drizzle visibility setting.
- `GET /api/home-slider-texts`, `GET /:id`, and admin-only
  `POST /`, `PUT /:id`, `PUT /reorder`, and `DELETE /:id` —
  NestJS/Drizzle slider text management.
- Public `GET /api/sliders`, `GET /:id`, and admin-only create/update/delete,
  reorder, and autoplay settings use NestJS/Drizzle. Slider image uploads retain
  the existing Cloudinary folder and transformations.
- `GET /api/service-finders`, `GET /:id`, and admin-only
  `POST /`, `PUT /:id`, `PUT /reorder`, and `DELETE /:id` —
  NestJS/Drizzle home page "service finder" cards (icon key, title, subtitle,
  optional link, homepage visibility), rendered by the storefront
  `components/homeComponents/ServiceBox.tsx`. `GET /api/service-finders/setting`
  and admin-only `PUT` expose the section-level switch that hides or shows the
  whole block at once.
- Admin SMS settings, balance checks, sending, and paginated send history are
  served by NestJS and use Neon.
- `GET /api/maintenance/status` and super-admin-only `PUT /api/maintenance` —
  NestJS/Drizzle maintenance and selling-mode settings.
- Public `GET /api/offers`, `GET /slug/:slug`, and `GET /:id`, plus admin-only
  `POST /`, `PUT /:id`, and `DELETE /:id` — NestJS/Drizzle offer management.
- Order creation, customer order reads, admin list/stats/status/payment-status/
  advance updates, and staff-created orders use NestJS/Drizzle
  (`customer_orders`). SSLCommerz callback routes are registered in NestJS and
  share the Drizzle order repository; existing analytics, dashboard, customer
  summaries, and invoice generation also read the Drizzle order table.
- `GET /api/dashboard` (admin-only, Express + Drizzle) returns the KPI payload
  the admin dashboard renders: `revenue`, `orders`, `pendingOrders`,
  `ordersByStatus`, `customers`, `products`, `productsSold`, `recentOrders`,
  `topProducts`, `salesByCategory`, `monthlyRevenue`, plus `lowStock` (active
  products at or below `DASHBOARD_LOW_STOCK_THRESHOLD`, default 5) and
  `recentActivity` (latest mutating audit entries; read-only requests and
  logins-only noise are filtered out, and audit-store failures degrade to an
  empty list instead of failing the whole dashboard).
- Super-admin permission-group CRUD uses NestJS/Drizzle. TeamMember records and
  permission-group usage counts now use Neon.
- Physical store CRUD, ordering, storefront banner settings, and banner uploads
  use NestJS/Drizzle.
- Public `GET /api/store/public` and admin `GET`/`PUT /api/store` settings use
  NestJS/Drizzle. Email and SMS templates read store contact details from the
  same Neon singleton.
- The public store settings include the JSONB `footer_config` managed by the
  admin Footer CMS. Apply migration
  `drizzle/20261026090600_footer_cms/migration.sql` before deploying the
  frontend footer editor.
- Public `GET /api/popup-offer` and admin-only `PUT /api/popup-offer` use
  NestJS/Drizzle, retaining popup validation and scoped Cloudinary image uploads.
- Product browsing, PC-part filters, SKU/product-code generation, ratings, and
  admin product CRUD use NestJS/Drizzle; product images keep the existing
  Cloudinary upload flow.
- Public promo validation and admin promo-code CRUD/statistics use
  NestJS/Drizzle; orders redeem promo codes against the same Neon records.
- Public product questions, authenticated question submission, and admin
  question management/statistics use NestJS/Drizzle.
- User registration/login, two-factor and password recovery, profile and saved
  addresses, admin user management, and initial super-admin setup use
  NestJS/Neon. Team/staff CRUD, login and two-factor checks, permissions, and
  socket authorization now use Neon-backed TeamMember accounts. User login
  session tracking and management also use Neon.
- Authenticated saved PC builds use NestJS/Neon, including product-backed
  component pricing and user-scoped deletion.
- Admin notification history, read/unread controls, order/payment notification
  persistence, and real-time Socket.IO events use NestJS/Neon.

The default `npm start` and `npm run dev` commands start the NestJS host. It
mounts the remaining Express compatibility API — invoices, audit log, payment
settings, customers, reviews, dashboard, analytics, visitors, upload, and Meta
catalog status — for features not yet ported to NestJS. Cart, category,
product, promo, popup-offer, question, permission-group, physical-store,
store-settings, sliders, SMS, PC-builder saved-build, notifications, team,
staff, auth, setup, and user-management APIs use NestJS.
This keeps existing API URLs while the remaining features are migrated.

> Maintenance note: Nest registers controller routes in method-declaration
> order, so any `PUT /reorder` handler must be declared **before** the
> `PUT /:id` handler or the static path is shadowed by the parameter route.
> The service-finder, slider, category, home-slider-text and physical-store
> controllers follow this order.

NestJS, PostgreSQL, and Drizzle are installed. Normalized Drizzle schemas and
generated SQL are provided for migrated features; JSONB staging tables remain
for legacy collections not yet migrated. Neither staging schemas nor normalized
schemas import MongoDB records. Mongoose is no longer a runtime dependency:
the API host is fully MongoDB-free. Only the historical one-off importers in
`scripts/` still read MongoDB, and they load the Mongoose driver on demand
(install it with `npm i -D mongoose` before running one).

## Category migration

`src/models/Category.js` defines the normalized Drizzle `category_entries`
table with unique slugs and an index for parent/ordering queries. Public
category reads, admin CRUD, reordering, and category image/banner uploads are
handled by NestJS. The existing category API envelopes and direct-child
cascade deletion behavior are preserved. Promo category expansion now reads
from the normalized Neon table. Existing Mongo categories are not imported
automatically; the previous JSONB staging table is retained as `categories`.

## Popup offer migration

`src/models/PopupOffer.js` defines the normalized `popup_offer_settings` table.
The public popup-offer read and admin update use NestJS/Drizzle, including the
existing bounds and Cloudinary upload folder. Existing MongoDB popup-offer
records are not imported automatically; the former JSONB staging table remains
available as `popup_offers`.

## Product migration

`src/models/Product.js` defines the normalized `product_entries` table,
including product, SEO, PC-part, flexible specification/content, and embedded
rating fields. The product API now uses NestJS/Drizzle, and cart/order,
dashboard/analytics, promo, saved-build, review, and question lookups use the
Neon product records. Existing MongoDB products are not imported automatically;
the old JSONB staging table remains available as `products`.

## Promo-code migration

`src/models/PromoCode.js` defines the normalized `promo_code_entries` table and
the shared active/date/usage/category discount rules. Public validation,
admin CRUD/statistics, and checkout redemption all use Neon. Existing MongoDB
promo codes are not imported automatically; the previous JSONB staging table
remains available as `promo_codes`.

## User and authentication migration

`src/models/User.js` defines normalized `user_entries` storage for credentials,
profiles, saved addresses, account status, lockout state, and OTP state. NestJS
now serves registration, login, two-factor verification, password reset,
profile/address/session endpoints, setup, and admin user management. Existing
JWT user lookups, customer summaries, order population, review/question names,
and product ratings read Neon. SMS settings are served from Neon.

Mongo user documents are not imported automatically. After reviewing and
applying the generated user migration in the intended environment, inspect the
import with `npm run db:import-users -- --dry-run`. To explicitly write data,
run `npm run db:import-users -- --execute --confirm-import-users`. The importer
preserves Mongo IDs and bcrypt hashes, writes in a transaction, skips IDs
already present in Neon, and stops on invalid records or conflicting email
uniqueness. It was not run as part of this migration.

`src/models/Session.js` defines normalized `session_entries` storage for login
session device details, IP/location, current-session state, and timestamps.
Session creation, listing, and revocation use Neon/Drizzle. A new login clears
previous current-session flags and records its session within one transaction.
The existing JSONB staging table remains named `sessions`.

Mongo session rows are not imported automatically. After reviewing and
applying the generated session migration, inspect the import with
`npm run db:import-sessions -- --dry-run`. To explicitly write them, run
`npm run db:import-sessions -- --execute --confirm-import-sessions`. The
importer preserves session/user IDs and metadata, runs in a transaction, and
skips records whose IDs already exist. It was not run.

## Saved PC build migration

`src/models/SavedBuild.js` defines normalized `saved_build_entries` storage for
user-owned component configurations. The authenticated PC builder list, save,
and delete endpoints use NestJS/Neon. Saved build prices and product details
continue to be refreshed from Neon product records when a build is saved.

Mongo saved builds are not imported automatically. After reviewing and applying
the generated migration, inspect the import with
`npm run db:import-saved-builds -- --dry-run`. To explicitly copy records, run
`npm run db:import-saved-builds -- --execute --confirm-import-saved-builds`.
The importer reads the Mongoose `SavedBuild` collection (`savedbuilds`),
preserves IDs and timestamps, and skips rows whose IDs already exist in Neon.
It was not run.

## Notification migration

`src/models/Notification.js` defines normalized `notification_entries` storage
for admin notifications. The authenticated admin list, unread-count, mark-read,
and mark-all-read endpoints use NestJS/Neon. Order and payment workflows persist
notifications in Neon and continue broadcasting the existing
`notification:new` Socket.IO event.

Mongo notifications are not imported automatically. After reviewing and
applying the generated migration, inspect the import with
`npm run db:import-notifications -- --dry-run`. To explicitly copy records, run
`npm run db:import-notifications -- --execute --confirm-import-notifications`.
The importer reads the Mongoose `Notification` collection (`notifications`),
preserves IDs and timestamps, and skips rows whose IDs already exist in Neon.
It was not run.

## SMS settings migration

`src/models/SmsSetting.js` defines the `sms_setting_entries` singleton table
for provider credentials, gateway configuration, sender/signature, enabled
state, and two-factor OTP settings. SMS settings CRUD, provider balance checks,
manual sends, and paginated send history use NestJS; the shared SMS delivery
service and login two-factor flow read their configuration from Neon. SMS send
logs are stored in Neon (`sms_log_entries`). The staging table remains named
`sms_settings`.

Mongo SMS settings are not imported automatically. After reviewing and
applying the generated migration, run the importer before starting the API or
otherwise accessing SMS settings in Neon: the application initializes a default
singleton on first use, and the importer intentionally preserves an existing
Neon row. Inspect the import with
`npm run db:import-sms-setting -- --dry-run`. To explicitly write the singleton,
run `npm run db:import-sms-setting -- --execute --confirm-import-sms-setting`.
The importer preserves provider credentials and settings, and leaves an
existing Neon singleton untouched. It was not run.

## SMS log migration

`src/models/SmsLog.js` defines normalized `sms_log_entries` storage for message
recipients, delivery status, provider responses, and timestamps. SMS delivery
creates logs in Neon, and the admin history endpoint reads them from the same
table. The generated SQL creates a new table and does not modify Mongo data.

Mongo SMS logs are not imported automatically. After reviewing and applying the
generated migration, inspect the import with `npm run db:import-sms-logs --
--dry-run`. To explicitly copy records, run `npm run db:import-sms-logs --
--execute --confirm-import-sms-logs`. The importer reads the Mongoose
`SmsLog` collection (`smslogs`), preserves IDs, and skips rows already present
in Neon. It was not run.

## Question migration

`src/models/Question.js` defines the normalized `question_entries` table.
Public answered-question reads, authenticated submissions, and admin listing,
statistics, updates, and deletion are handled by NestJS/Drizzle. Product
references now resolve from Neon; user names continue to come from the existing
Neon user accounts. Existing MongoDB questions are not imported
automatically; the JSONB staging table remains available as `questions`.

## Team member migration

`src/models/TeamMember.js` defines normalized `team_member_entries` storage for
staff credentials, roles, lockout and two-factor state, and permission
assignments. Staff login, team/staff management, authentication middleware,
Nest guards, socket authorization, and permission-group usage counts now read
and write Neon. The existing JSONB staging table remains named `team_members`.

Mongo team-member documents are not imported automatically. After reviewing
and applying the generated migration in the intended environment, inspect the
import with `npm run db:import-team-members -- --dry-run`. To explicitly write
data, run
`npm run db:import-team-members -- --execute --confirm-import-team-members`.
The importer preserves Mongo IDs, bcrypt password hashes, permission-group
references, and authentication state; it uses a transaction and skips records
whose IDs already exist. It was not run during this migration.

## Store settings migration

`src/models/StoreSetting.js` defines the normalized
`store_setting_entries` singleton. Public storefront settings and admin
read/update endpoints are handled by NestJS/Drizzle, and email/SMS templates
read the store name and contact details from the same Neon row. Existing Mongo
store settings are not imported automatically; the original JSONB staging
table remains available as `store_settings`.

## Slider migration

`src/models/Slider.js` defines normalized `slider_entries` storage with the
legacy type, active, ordering, image, link, creator, and timestamp fields.
Public slider reads and admin CRUD/reordering are handled by NestJS/Drizzle;
Cloudinary uploads keep the existing destination and transformations.
`src/models/SliderSetting.js` defines a Neon singleton for enabled, auto-slide,
and interval settings, preserving the `/api/sliders/setting` API. The legacy
JSONB staging tables remain named `sliders` and `slider_settings`.

Mongo slider documents and settings are not imported automatically. After
reviewing and applying the generated migrations, inspect the import with
`npm run db:import-sliders -- --dry-run`; only explicitly confirmed execution
with `npm run db:import-sliders -- --execute --confirm-import-sliders` writes
them to Neon. The importer preserves slider IDs, creator references, image
URLs, and timestamps. It was not run.

## Cart migration

`src/models/Cart.js` now defines normalized Drizzle tables for carts and cart
items (`shopping_carts` and `shopping_cart_items`), including one cart per user,
unique products per cart, snapshot price/image fields, nonnegative money checks,
and cascading deletion of cart items. Cart list/add/update/remove/clear
operations use NestJS controllers and services backed by Drizzle. The API keeps
the existing `/api/cart` routes and response envelopes.

The Cart API now reads and writes PostgreSQL. Existing MongoDB cart documents
are not automatically imported, so a customer's old Mongo cart will appear
empty until a deliberate data migration is performed.

## Holiday configuration migration

`src/models/HolidayConfig.js` defines a normalized `holiday_settings` singleton
table. Public GET and admin-only PUT are served by NestJS and use Drizzle;
updates retain the existing fields, defaults, boolean handling, partial-update
behavior, and `{ success, config }` response envelope. The admin guard resolves
user and team accounts from Neon while preserving the existing JWT behavior.
Holiday settings stored in MongoDB are not imported automatically.

## Home content migration

`src/models/HomeContent.js` defines the normalized `home_page_content`
singleton table. Public GET and admin-only PUT/DELETE are served by NestJS and
Drizzle, preserving the legacy response envelope, missing-row defaults,
partial string/boolean updates, and `updatedBy` field. The admin guard resolves
user and team accounts from Neon to keep JWT behavior intact.
Existing home content is not imported from MongoDB automatically.

## Home slider setting migration

`src/models/HomeSliderSetting.js` defines the normalized
`home_slider_text_settings` table and `src/models/HomeSliderText.js` defines the
normalized `home_slider_text_entries` table. The visibility GET/PUT routes and
slider text CRUD are handled by NestJS/Drizzle, preserving their existing URL
and response envelopes. Admin writes use the shared compatibility guard, which
resolves migrated user/team accounts from Neon. Existing Mongo setting and
slider text values are not imported automatically.

## Maintenance settings migration

`src/models/MaintenanceSetting.js` defines the normalized
`maintenance_config` singleton table. The public status endpoint and
super-admin-only update endpoint use NestJS/Drizzle and preserve the existing
maintenance and browse-only selling fields. Existing Mongo settings are not
imported automatically. Cart and legacy Express purchase guards now read
selling-mode settings from this PostgreSQL-backed service.

## Offer migration

`src/models/Offer.js` defines the normalized `offer_entries` table with unique
slugs, date ranges, active state, descriptions, image URL, author ID, and
timestamps. Public reads and admin create/update/delete endpoints now use
NestJS/Drizzle. Admin create/update retains the existing Cloudinary image upload
field and validation. Existing Mongo offers are not imported automatically.

## Order migration

`src/models/Order.js` defines the normalized PostgreSQL `customer_orders`
table. Order CRUD, customer checkout, staff-created orders, and status/payment
updates are served by NestJS. SSLCommerz callback routes are also handled by
NestJS, reusing the existing gateway integration with a Drizzle-backed order
repository. Payment credentials are read from the `payment_gateways` staging
table with environment fallbacks. Product inventory, customer accounts, coupon
definitions, and payment-gateway administration still depend on legacy
compatibility code. Existing Mongo orders are not imported
automatically. Startup status/number normalization and missing-number backfill
operate only on the Neon `customer_orders` table; they no longer load a
Mongoose Order model.

## Permission group migration

`src/models/PermissionGroup.js` defines normalized `permission_group_entries`
storage, including group metadata, JSONB permission templates, case-insensitive
unique names, and validation constraints. Super-admin list/detail/create/update/
delete routes now run in NestJS. TeamMember records and permission-group usage
counts now use Neon; audit logs are stored in Neon (`audit_logs`). Existing
Mongo permission groups are not copied automatically, so existing linked group
IDs need an explicit data migration before using Neon-backed permission groups.

## Physical store migration

`src/models/PhysicalStore.js` defines the normalized `physical_store_entries`
table, including JSONB phone entries, active/order indexing, and field checks.
`src/models/PhysicalStoreSetting.js` defines the singleton
`physical_store_banner_settings` table. Store CRUD, reorder, public setting
reads, admin setting updates, and existing Cloudinary banner uploads run in
NestJS. Mongo physical-store and setting records are not imported
automatically; their previous JSONB staging tables remain separate.

## Service finder migration

`src/models/ServiceFinder.js` defines the normalized `service_finder_entries`
table (title, subtitle, icon key, optional link, active flag, order index, and
field checks). CRUD, reorder, and public active filtering run in
`src/service-finders/` on NestJS/Drizzle. The migration seeds the three cards
that used to be hard-coded in `components/homeComponents/ServiceBox.tsx`
(Laptop Finder, Raise a complaint, Service center), so the homepage looks
unchanged while every card becomes editable from `/admin/service-finder`,
including the icon picker and the show/hide switch.

`src/models/ServiceFinderSetting.js` adds the `service_finder_settings`
singleton whose `enabled` flag hides or shows the whole section on the homepage
(the "Show section" switch in the card header). Per-card `active` flags keep
working underneath it: a card is only rendered when both are on.

The homepage reads the cards through `serverApi.fetchServiceFinderItems` /
`fetchServiceFinderSetting`, which are tagged `service-finder` and cached for
60s. Every write from `/admin/service-finder` (create, update, toggle, reorder,
delete, section switch) then calls the frontend's `revalidateStorefront()` helper,
so the tag/path are expired immediately and the storefront shows the change on its
next request — no hard refresh and no waiting out the cache window.

## Counter migration

`src/models/Counter.js` defines the normalized Drizzle `sequence_counters`
table, and `CounterService.next(key)` allocates the next number with a
PostgreSQL atomic upsert. The migration creates a distinct table so the
existing JSONB `counters` staging table is left unchanged.

Order-number and product-code utilities now use the same atomic Drizzle
counter repository, and the Mongo counter model has been removed. Product-code
collision checks and order-number backfills read PostgreSQL tables.
Existing Mongo counter values and orders/products are not copied automatically.
Before enabling these generators against production data, initialize Neon
counter values from verified Mongo order/product records and migrate those
records to PostgreSQL.

## Neon setup

Set `DATABASE_URL` to the Neon connection string in the environment used to run
the NestJS replacement. Do not commit credentials. `DATABASE_SSL` defaults to
enabled; set it to `false` only for a local PostgreSQL database. `DATABASE_POOL_MAX`
sets the PostgreSQL connection pool limit.

Review generated SQL before applying schema changes. Use `npm run db:generate`
to generate Drizzle migrations and `npm run db:migrate` only in an explicitly
configured target environment. Neither command was run against a database for
this scaffold.

## Audit log, invoice, and payment gateway migration

`src/audit/audit.repository.js` writes and queries audit entries through the
JSONB `audit_logs` staging table. The document keeps the pre-migration entry
shape (`actor`, `action`, `eventType`, `target`, `changes`, `ip`, `userAgent`,
`createdAt`), so the audit page, staff-activity feed, and the request/login
recording middleware are unchanged at the API boundary. Audit entries are
observability data with no historical dump, so no importer is provided.

Invoices use the JSONB `invoices` staging table through
`src/invoices/invoices.repository.js`. Documents keep the previous invoice
shape, including `_id`-keyed items and `preparedBy`; `preparedBy` ids are
resolved against both `user_entries` and `team_members` when a page is
returned. Invoices are derived data: after cutover, rebuild them from orders
with `POST /api/invoices/sync`.

Payment gateways use the JSONB `payment_gateways` staging table. The settings
UI upserts `{ name, enabled, config }` documents, and the SSLCommerz payment
initiation reads the `sslcommerz` document with an environment fallback, so an
empty table is a valid initial state.

## Work required before cutover

The remaining legacy routes (invoices, audit log, payment settings, customers,
reviews, dashboard, analytics, visitors, and upload) run on Express and read
and write PostgreSQL through Drizzle; they are mounted as compatibility
middleware inside the NestJS host. Each feature must still be ported to
NestJS, its PostgreSQL schema reviewed, and API behavior verified before the
Express layer can be removed. Population, aggregation, and validation that
MongoDB used to provide are implemented explicitly in the repositories and
services.
