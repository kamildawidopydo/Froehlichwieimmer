# Supabase → FastAPI Migration Backlog

Stand: Feb 2026 nach Repo-Import

## Files touching Supabase: 70

## Auth-Methoden (8) — P0
| Supabase | FastAPI Endpoint |
|----------|------------------|
| `supabase.auth.signUp` | `POST /api/auth/register` |
| `supabase.auth.signInWithPassword` | `POST /api/auth/login` |
| `supabase.auth.signOut` | `POST /api/auth/logout` |
| `supabase.auth.getUser` | `GET /api/auth/me` |
| `supabase.auth.getSession` | `GET /api/auth/me` (session = JWT cookie) |
| `supabase.auth.onAuthStateChange` | Frontend: React Context state |
| `supabase.auth.updateUser` | `PATCH /api/auth/me` |
| `supabase.auth.resetPasswordForEmail` | `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` |

## MongoDB Collections zu erstellen (29 aus Supabase-Tables)

### P0 — Public Content (statische Daten)
- `banks` — Bank-Stammdaten
- `savings_offers` — Sparangebote (Tagesgeld/Festgeld pro Bank)
- `profiles` — User-Erweiterung (name, avatar_url, role, kyc_status)

### P1 — User-Portfolio
- `user_stock_watchlist`
- `user_stock_positions`
- `user_stock_orders`
- `user_bond_positions`
- `user_depot_contracts`
- `user_price_alerts`
- `user_activity_log`

### P1 — Marktdaten
- `stocks` — Stock-Katalog
- `stock_prices_cache` — Preishistorie
- `ipo_catalog`, `ipo_subscription_requests`
- `bond_catalog`, `bond_purchase_requests`
- `stock_trade_coupons`

### P2 — Forms & Leads
- `applications` — Kontoeröffnungs-Anträge
- `contact_messages`, `support_messages`
- `credit_leads`, `credit_offers`
- `product_inquiry_leads`
- `offer_interests`
- `document_access_codes`, `document_upload_submissions`
- `formular_access_codes`
- `insufficient_buying_power_events`
- `social_preview_messages`

## Edge Functions → FastAPI Endpoints (15)

### P0 — Public read
- `news-public-feed` → `GET /api/news`
- `market-chart-history` → `GET /api/market/chart/:symbol`
- `market-sparklines` → `GET /api/market/sparklines`

### P1 — Market data
- `stock-prices` → `GET /api/stocks/prices` (Alpha Vantage)
- `stock-history` → `GET /api/stocks/:symbol/history`
- `stock-dividends`, `stock-events`, `stock-fundamentals` → `GET /api/stocks/:symbol/*`
- `ipo-sync` → APScheduler cron

### P2 — Emails (Resend)
- `send-application-email` → `POST /api/emails/application`
- `send-stock-email` → `POST /api/emails/stock-alert`
- `send-weekly-digest` → APScheduler cron
- `check-price-alerts` → APScheduler cron
- `auth-email-otp` → `POST /api/auth/otp` (optional)
- `create-admin-user` → `POST /api/admin/users` (protected)

## Storage (Cloudinary + Supabase Storage)
- `avatars` bucket → Cloudinary folder `avatars`
- Legacy Supabase Storage `remove()` in `lib/documentStorage.js` → Cloudinary destroy API

## Migration Order (empfohlen)
1. **Phase 1a** (this session): FastAPI Auth Backend + Frontend `apiClient` — Auth durchgängig
2. **Phase 1b**: `banks`, `savings_offers`, `profiles` Collections + Endpoints — Marketing-Landing ohne Supabase lauffähig
3. **Phase 2**: Marktdaten via Alpha Vantage — `stocks`, `stock_prices_cache`, `ipo_catalog`
4. **Phase 3**: User-Portfolio (`watchlist`, `positions`, `orders`, `alerts`)
5. **Phase 4**: Forms/Leads/Admin
6. **Phase 5**: Emails (Resend) + PDF-Microservice (Node-Puppeteer aus `/app/legacy_source/scripts`)
