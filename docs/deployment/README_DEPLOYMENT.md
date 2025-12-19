# Taste of Gratitude - E-commerce Website

A beautiful, mobile-first e-commerce website for premium sea moss gel products with Stripe payment integration.

## 🌟 Features

- ✅ Beautiful responsive design with brand colors (gold #D4AF37)
- ✅ Complete product catalog with 4 sea moss gel variations
- ✅ Stripe checkout integration (test mode ready)
- ✅ Individual product detail pages
- ✅ Markets/locations page
- ✅ About page with brand story
- ✅ Contact form
- ✅ Mobile-friendly navigation
- ✅ Smooth animations and transitions
- ✅ SEO-optimized

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Payment**: Stripe Checkout
- **Database**: MongoDB (for future orders/customer data)
- **Deployment**: Firebase Hosting ready

## 📦 Installation

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build
```

## 🔑 Environment Variables

Required variables in `.env`:

```env
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Site Configuration
NEXT_PUBLIC_SITE_NAME=Taste of Gratitude
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Database (Optional for Phase 1)
MONGO_URL=mongodb://localhost:27017
DB_NAME=taste_of_gratitude
```

## 🛍️ Products

The site currently features 4 products:

1. **Sea Moss Gel — Elderberry** ($35.00) - Elderberry • Echinacea • Apple • Ginger
2. **Sea Moss Gel — Original** ($30.00) - Pure & Simple
3. **Sea Moss Gel — Ginger Turmeric** ($35.00) - Ginger • Turmeric • Black Pepper
4. **Sea Moss Gel — Blueberry** ($35.00) - Wild Blueberry • Lemon

Products are defined in `/app/lib/products.js` with server-side pricing for security.

## 💳 Stripe Integration

### Test Mode Setup

1. Get your test API keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Add keys to `.env` file
3. Test with these cards:
   - **Success**: 4242 4242 4242 4242
   - **Decline**: 4000 0000 0000 0002
   - Any future expiration date
   - Any 3-digit CVC
   - Any 5-digit ZIP

### Production Setup

1. Activate your Stripe account
2. Get production API keys
3. Update `.env` with production keys
4. Test thoroughly before launch

## 📄 Pages

- `/` - Home page with hero, featured products, markets CTA
- `/catalog` - Full product catalog
- `/product/[slug]` - Individual product details
- `/markets` - Farmers market locations
- `/about` - Brand story and mission
- `/contact` - Contact form
- `/checkout/success` - Payment success page
- `/checkout/cancel` - Payment cancelled page

## 🎨 Brand Colors

- **Gold**: #D4AF37 (primary brand color)
- **Brown**: #8B7355 (secondary/accent)
- Gradient: `from-[#D4AF37] to-[#8B7355]`

## 🔄 Customization

### Adding New Products

Edit `/app/lib/products.js`:

```javascript
{
  id: 'unique-product-id',
  slug: 'url-friendly-slug',
  name: 'Product Name',
  subtitle: 'Ingredients description',
  description: 'Full product description',
  image: 'https://image-url.com/image.jpg',
  price: 3500, // Price in cents ($35.00)
  size: '16oz',
  ingredients: ['Ingredient 1', 'Ingredient 2'],
  benefits: ['Benefit 1', 'Benefit 2'],
  featured: true // Show on home page
}
```

### Updating Markets

Edit `/app/lib/products.js` - `MARKETS` array:

```javascript
{
  id: 1,
  name: 'Market Name',
  when: 'Day Time',
  where: 'Address',
  mapsUrl: 'Google Maps URL'
}
```

## 🚢 Deployment

### Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not done)
firebase init hosting

# Build and deploy
yarn build
firebase deploy
```

### Other Platforms

The site is a standard Next.js app and can be deployed to:
- Vercel
- Netlify
- AWS Amplify
- Google Cloud Run
- Any Node.js hosting

## 🧪 Testing

Backend API tests are included. Run with:

```bash
# Test Stripe checkout
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"elderberry-sea-moss-16oz","quantity":1}]}'
```

## 📊 Analytics (Future)

Placeholders are ready for:
- Google Analytics 4
- PostHog
- Facebook Pixel

## 📧 Email (Future)

Placeholder for Resend integration for:
- Order confirmations
- Customer notifications
- Marketing emails

## 🔒 Security

- ✅ Server-side price validation
- ✅ No sensitive data exposed to client
- ✅ Stripe handles all payment processing
- ✅ Environment variables for secrets
- ✅ HTTPS required for production

## 🐛 Troubleshooting

### Stripe checkout not working

1. Verify API keys are correct in `.env`
2. Check keys start with `pk_test_` and `sk_test_`
3. Restart the server after updating `.env`
4. Check browser console for errors

### Images not loading

1. Verify image URLs are accessible
2. Check Next.js image optimization config
3. Images should be HTTPS URLs

### Build errors

```bash
# Clear cache and rebuild
rm -rf .next
yarn build
```

## 📞 Support

For questions or issues:
- Email: hello@tasteofgratitude.com
- Check Stripe Dashboard for payment issues
- Review browser console for frontend errors

## 📝 License

Private - All rights reserved © 2025 Taste of Gratitude

---

**Built with ❤️ for wellness and gratitude**
