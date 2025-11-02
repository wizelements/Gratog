# QA Checklist - Taste of Gratitude

## Pre-Launch Checklist

### Fulfillment System
- [ ] **Pickup** option works
  - [ ] Market selection displays correct locations
  - [ ] Date picker shows correct market days
  - [ ] Confirmation shows correct pickup details
- [ ] **Shipping** option works
  - [ ] Address validation working
  - [ ] Shipping fee calculation correct
  - [ ] Address saves to order
- [ ] **Delivery** option (if enabled)
  - [ ] ZIP code whitelist enforced
  - [ ] Invalid ZIP shows helpful error
  - [ ] Delivery windows load correctly
  - [ ] Window cutoff times enforced
  - [ ] Delivery fee calculation correct
  - [ ] Free delivery threshold working
  - [ ] Tip calculation working
  - [ ] Instructions field saves

### Payment Integration
- [ ] Square credentials configured
  - [ ] Application ID set
  - [ ] Access Token set
  - [ ] Location ID set
  - [ ] Environment (production/sandbox) correct
- [ ] Payment form loads
- [ ] Card payment processing works
- [ ] Payment success redirects correctly
- [ ] Payment failure shows error
- [ ] Order confirmation email sends
- [ ] Order confirmation SMS sends (if enabled)

### Square Webhooks
- [ ] Webhook endpoint configured in Square Dashboard
- [ ] Signature verification enabled
- [ ] `payment.created` event processed
- [ ] `payment.updated` event processed
- [ ] `inventory.count.updated` event processed
- [ ] `catalog.version.updated` event processed
- [ ] Webhook logs accessible

### Order Flow
- [ ] Cart adds items correctly
- [ ] Cart quantity updates
- [ ] Cart removes items
- [ ] Cart total calculation correct
- [ ] Coupon code applies discount
- [ ] Coupon validation works
- [ ] Order creates successfully
- [ ] Order status updates
- [ ] Order tracking page works
- [ ] Order history shows correct orders

### Email/SMS
- [ ] Email library configured (SENDGRID_API_KEY or mock)
- [ ] SMS library configured (TWILIO credentials or mock)
- [ ] Order confirmation email template correct
- [ ] Order confirmation SMS template correct
- [ ] No errors in logs for email/SMS
- [ ] Mock mode works when credentials missing

### Analytics
- [ ] GA4 tracking code installed
- [ ] Mixpanel tracking code installed (optional)
- [ ] `view_item` events firing
- [ ] `add_to_cart` events firing
- [ ] `begin_checkout` events firing
- [ ] `purchase` events firing
- [ ] Custom fulfillment events tracking

### Security
- [ ] No secrets in client bundle
- [ ] No secrets in .md files or docs
- [ ] Webhook signature verification enabled
- [ ] API keys rotated if leaked
- [ ] CORS headers configured correctly
- [ ] Rate limiting configured

### Performance
- [ ] Page load < 2s
- [ ] API response < 500ms
- [ ] Images optimized
- [ ] No console errors
- [ ] Mobile responsive

### Edge Cases
- [ ] Empty cart handled
- [ ] Invalid product ID handled
- [ ] Network errors handled gracefully
- [ ] Session timeout handled
- [ ] Database connection errors handled
- [ ] Payment gateway timeout handled

## Post-Launch Monitoring

### Daily Checks
- [ ] Order volume normal
- [ ] Payment success rate > 95%
- [ ] Email delivery rate > 95%
- [ ] API error rate < 1%
- [ ] No critical errors in logs

### Weekly Checks
- [ ] Review webhook delivery success
- [ ] Check inventory sync accuracy
- [ ] Review customer support tickets
- [ ] Analyze funnel drop-off points
- [ ] Review analytics dashboards

### Monthly Checks
- [ ] Rotate API keys if needed
- [ ] Review and update product catalog
- [ ] Audit security configurations
- [ ] Performance optimization review
- [ ] Backup verification
