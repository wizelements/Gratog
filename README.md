# Gratog - Taste of Gratitude

Premium e-commerce platform for gratitude-based gifts with Square payments, cron-based campaigns, and multi-currency support.

## 🚀 Live

**Production:** https://tasteofgratitude.shop

## 📋 Overview

Gratog is a full-featured Next.js e-commerce platform designed for selling gratitude-themed gifts and experiences. It features sophisticated payment processing, automated marketing campaigns, and comprehensive order management.

## 🏗️ Architecture

### Frontend
- **Framework:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS
- **State:** Zustand (if used) or React Context
- **UI Components:** Radix UI (extensive)
- **3D Visualization:** Three.js for product previews

### Backend
- **API:** Next.js API routes
- **Payments:** Square SDK
- **Email:** Resend
- **SMS:** Twilio
- **Scheduling:** Vercel Cron Jobs
- **Webhooks:** Square webhook handlers

### Infrastructure
- **Hosting:** Vercel
- **Database:** (Configured in env)
- **Caching:** (Configured in env)
- **Monitoring:** Sentry

## 🔧 Getting Started

### Prerequisites
```bash
node 18+
npm or pnpm
```

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm dev
```

### Build
```bash
pnpm build
pnpm start
```

## 📦 Environment Variables

Create `.env.local` with:

```env
# Payments
SQUARE_ACCESS_TOKEN=
SQUARE_APPLICATION_ID=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox

# Email
RESEND_API_KEY=

# SMS
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# App
NEXT_PUBLIC_APP_URL=https://tasteofgratitude.shop
```

## 🔄 Cron Jobs

Automated tasks running on schedule via Vercel Cron:

- **Health Check** (every 5 minutes): `GET /api/cron/health-check`
- **Scheduled Campaigns** (every 5 minutes): `GET /api/cron/scheduled-campaigns`
- **Pickup Reminders** (Fridays at 9 AM): `GET /api/cron/pickup-reminders`
- **Morning Reminders** (Saturdays at 8 AM): `GET /api/cron/morning-reminders`
- **Email Scheduler** (hourly): `GET /api/quiz/email-scheduler`

## 🧪 Testing

```bash
# Unit tests
pnpm test:unit

# E2E tests (Playwright)
pnpm test:e2e:headless

# Smoke tests
pnpm test:smoke

# Lighthouse performance
pnpm lighthouse
```

## 📝 API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order status
- `POST /api/orders/:id/cancel` - Cancel order

### Payments
- `POST /api/payments` - Process payment
- `POST /api/square-webhook` - Handle Square webhooks

### Campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/send` - Send campaign

## 🚀 Deployment

Deployed on Vercel with:
- Automatic deploys on `main` push
- Preview deploys for PRs
- Environment variables configured in Vercel dashboard
- Cron jobs configured in `vercel.json`

### Deploy Status
- Production: https://tasteofgratitude.shop
- Vercel: https://gratog.vercel.app (redirects to production)

## 🛠️ Stack Compliance

✅ Uses official tech stack:
- ✅ Resend for email
- ✅ Square for payments
- ✅ Twilio for SMS
- ❌ SendGrid (deprecated, removed)

## 📊 Key Files

| File | Purpose |
|------|---------|
| `vercel.json` | Deployment config, cron jobs |
| `package.json` | Dependencies and scripts |
| `app/` | Next.js App Router |
| `app/api/` | API routes |
| `lib/` | Utilities and helpers |
| `public/` | Static assets |

## 🤝 Contributing

1. Clone repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Make changes and test: `pnpm test`
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feat/your-feature`
6. Create Pull Request

## 📄 License

(Check LICENSE file)

## 📞 Support

For issues, questions, or suggestions, please create a GitHub issue.

---

**Last Updated:** February 2, 2026  
**Maintainer:** Nomolos Sniktaw
# Sun Apr 19 03:29:23 EDT 2026 - Push to trigger CI
