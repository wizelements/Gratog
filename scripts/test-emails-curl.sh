#!/bin/bash
# Test All Taste of Gratitude Email Types via Resend API
# Usage: RESEND_API_KEY=re_xxx ./scripts/test-emails-curl.sh [email]

set -e

EMAIL="${1:-silverwatkins@gmail.com}"
API_KEY="${RESEND_API_KEY:-}"
FROM_EMAIL="${RESEND_FROM_EMAIL:-onboarding@resend.dev}"

if [ -z "$API_KEY" ]; then
  echo "❌ ERROR: RESEND_API_KEY not set"
  echo ""
  echo "Usage:"
  echo "  RESEND_API_KEY=re_xxx ./scripts/test-emails-curl.sh $EMAIL"
  echo ""
  echo "Get your API key from: https://resend.com/api-keys"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "TASTE OF GRATITUDE - EMAIL TEST SUITE"
echo "═══════════════════════════════════════════════════════════"
echo "Target Email: $EMAIL"
echo "From Email: $FROM_EMAIL"
echo "API Key: ${API_KEY:0:10}..."
echo "═══════════════════════════════════════════════════════════"

send_email() {
  local SUBJECT="$1"
  local HTML="$2"
  local TEXT="$3"
  
  echo ""
  echo "📧 Sending: $SUBJECT"
  
  RESPONSE=$(curl -s -X POST 'https://api.resend.com/emails' \
    -H "Authorization: Bearer $API_KEY" \
    -H 'Content-Type: application/json' \
    -d "{
      \"from\": \"$FROM_EMAIL\",
      \"to\": [\"$EMAIL\"],
      \"subject\": \"$SUBJECT\",
      \"html\": $(echo "$HTML" | jq -Rs .),
      \"text\": \"$TEXT\"
    }")
  
  if echo "$RESPONSE" | grep -q '"id"'; then
    EMAIL_ID=$(echo "$RESPONSE" | jq -r '.id')
    echo "   ✅ SENT! ID: $EMAIL_ID"
  else
    echo "   ❌ FAILED: $RESPONSE"
  fi
}

# ============== EMAIL TEMPLATES ==============

ORDER_CONFIRMATION_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Confirmation</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
          <p style="margin: 8px 0 0; color: #6c757d; font-size: 14px;">Nourish Your Wellness Journey</p>
        </td></tr>
        <tr><td style="padding: 40px 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
            <h2 style="margin: 0; color: #212529; font-size: 28px;">Thank you for your order!</h2>
          </div>
          <p style="margin: 20px 0; color: #495057; font-size: 16px; text-align: center;">We received your order and are preparing it with care.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px; color: #495057;"><strong>Order #:</strong> TOG-2024-TEST</p>
            <p style="margin: 0 0 10px; color: #495057;"><strong>Customer:</strong> Silver Watkins</p>
            <p style="margin: 0; color: #495057;"><strong>Total:</strong> $167.40</p>
          </div>
          <h3 style="margin: 30px 0 15px; color: #212529; font-size: 18px;">Order Items</h3>
          <table width="100%" cellpadding="10" style="border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="color: #495057;">Sea Moss Gel (16oz) x 2</td>
              <td style="color: #495057; text-align: right;">$70.00</td>
            </tr>
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="color: #495057;">Elderberry Sea Moss Gel x 1</td>
              <td style="color: #495057; text-align: right;">$40.00</td>
            </tr>
            <tr style="border-bottom: 1px solid #dee2e6;">
              <td style="color: #495057;">Sea Moss Capsules (60ct) x 1</td>
              <td style="color: #495057; text-align: right;">$45.00</td>
            </tr>
            <tr style="background-color: #f8f9fa;">
              <td style="padding: 15px 10px; font-weight: bold; color: #212529;">Total</td>
              <td style="padding: 15px 10px; font-weight: bold; color: #D4AF37; text-align: right;">$167.40</td>
            </tr>
          </table>
          <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px; color: white; font-size: 20px;">📍 Pickup Details</h3>
            <p style="margin: 0 0 10px; color: white; font-size: 16px;"><strong>Browns Mill Recreation Center</strong></p>
            <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">Show order #TOG-2024-TEST at pickup</p>
          </div>
        </td></tr>
        <tr><td style="padding: 30px; background-color: #f8f9fa; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #6c757d; font-size: 12px;">© 2024 Taste of Gratitude | hello@tasteofgratitude.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

READY_PICKUP_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Ready for Pickup</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
        </td></tr>
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
          <h2 style="margin: 0 0 15px; color: #212529; font-size: 28px;">Order Ready for Pickup!</h2>
          <p style="margin: 0 0 20px; color: #495057; font-size: 16px;">Your order is ready at Browns Mill Recreation Center.</p>
          <p style="margin: 0; color: #6c757d; font-size: 14px;">Order #TOG-2024-TEST</p>
          <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 25px; border-radius: 8px; margin: 30px 0;">
            <h3 style="margin: 0 0 15px; color: white;">📍 Pickup Location</h3>
            <p style="margin: 0 0 5px; color: white;"><strong>Browns Mill Recreation Center</strong></p>
            <p style="margin: 0; color: rgba(255,255,255,0.9);">Community event area</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

OUT_FOR_DELIVERY_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Out for Delivery</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
        </td></tr>
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">🚚</div>
          <h2 style="margin: 0 0 15px; color: #212529; font-size: 28px;">Out for Delivery!</h2>
          <p style="margin: 0 0 20px; color: #495057; font-size: 16px;">Your order is on its way. Expect arrival within 30-60 minutes.</p>
          <p style="margin: 0; color: #6c757d; font-size: 14px;">Order #TOG-2024-TEST</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

DELIVERED_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Delivered</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center; border-bottom: 3px solid #D4AF37;">
          <h1 style="margin: 0; color: #D4AF37; font-size: 32px;">Taste of Gratitude</h1>
        </td></tr>
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
          <h2 style="margin: 0 0 15px; color: #212529; font-size: 28px;">Order Delivered!</h2>
          <p style="margin: 0 0 20px; color: #495057; font-size: 16px;">Your order has been delivered. Enjoy your wellness products!</p>
          <p style="margin: 0; color: #6c757d; font-size: 14px;">Order #TOG-2024-TEST</p>
          <p style="margin: 30px 0 0; color: #D4AF37; font-size: 16px;">💚 Thank you for supporting Taste of Gratitude!</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

WELCOME_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">🌿</div>
          <h1 style="margin: 0 0 20px; color: #D4AF37; font-size: 32px;">Welcome to Taste of Gratitude!</h1>
          <p style="margin: 0 0 20px; color: #495057; font-size: 18px;">Dear Silver,</p>
          <p style="margin: 0 0 30px; color: #495057; font-size: 16px;">Thank you for joining our wellness community! We are excited to have you on this journey to better health with our premium sea moss products.</p>
          <a href="https://tasteofgratitude.com/catalog" style="display: inline-block; padding: 15px 40px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Shop Now</a>
          <p style="margin: 30px 0 0; color: #6c757d; font-size: 14px;">🎁 New members get 10% off first order with code: WELCOME10</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

COUPON_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Coupon</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">🎁</div>
          <h1 style="margin: 0 0 30px; color: #D4AF37; font-size: 28px;">You Got a Special Offer!</h1>
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border: 3px dashed #D4AF37; border-radius: 12px; margin: 0 0 30px;">
            <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Coupon Code</p>
            <p style="margin: 0 0 15px; color: #78350f; font-size: 36px; font-weight: bold; letter-spacing: 4px;">SEAWELLNESS25</p>
            <p style="margin: 0; color: #D4AF37; font-size: 24px; font-weight: bold;">Save $25!</p>
          </div>
          <p style="margin: 0 0 10px; color: #495057; font-size: 14px;">⏰ Expires: January 31, 2026</p>
          <p style="margin: 0 0 30px; color: #6c757d; font-size: 14px;">Min order: $50</p>
          <a href="https://tasteofgratitude.com/order" style="display: inline-block; padding: 15px 40px; background-color: #D4AF37; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Use Coupon Now</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

NEWSLETTER_HTML='<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Newsletter Confirmed</title></head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; max-width: 600px;">
        <tr><td style="padding: 40px 30px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
          <h1 style="margin: 0 0 20px; color: #D4AF37; font-size: 28px;">You are Subscribed!</h1>
          <p style="margin: 0 0 20px; color: #495057; font-size: 18px;">Thank you, Silver!</p>
          <p style="margin: 0 0 30px; color: #495057; font-size: 16px;">You will now receive wellness tips, exclusive offers, and updates about our latest sea moss products.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p style="margin: 0; color: #6c757d; font-size: 14px;">📬 Expect weekly wellness insights<br>🎁 Subscriber-only discounts<br>🌿 New product announcements</p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>'

# ============== SEND ALL EMAILS ==============

echo ""
echo "1️⃣  ORDER CONFIRMATION EMAIL"
send_email "✅ Order Confirmation - TOG-2024-TEST" "$ORDER_CONFIRMATION_HTML" "Order confirmation for TOG-2024-TEST. Total: \$167.40"

echo ""
echo "2️⃣  ORDER STATUS: READY FOR PICKUP"
send_email "🎉 Order Ready for Pickup! - TOG-2024-TEST" "$READY_PICKUP_HTML" "Your order is ready for pickup at Browns Mill Recreation Center."

echo ""
echo "3️⃣  ORDER STATUS: OUT FOR DELIVERY"
send_email "🚚 Out for Delivery! - TOG-2024-TEST" "$OUT_FOR_DELIVERY_HTML" "Your order is on its way!"

echo ""
echo "4️⃣  ORDER STATUS: DELIVERED"
send_email "✅ Order Delivered! - TOG-2024-TEST" "$DELIVERED_HTML" "Your order has been delivered. Enjoy!"

echo ""
echo "5️⃣  WELCOME EMAIL"
send_email "🌿 Welcome to Taste of Gratitude!" "$WELCOME_HTML" "Welcome to Taste of Gratitude, Silver!"

echo ""
echo "6️⃣  COUPON EMAIL"
send_email "🎁 Your Exclusive Coupon: SEAWELLNESS25" "$COUPON_HTML" "Your coupon code: SEAWELLNESS25 - Save \$25!"

echo ""
echo "7️⃣  NEWSLETTER CONFIRMATION"
send_email "📧 Newsletter Subscription Confirmed" "$NEWSLETTER_HTML" "Thank you for subscribing to our newsletter!"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "ALL TESTS COMPLETE!"
echo "Check $EMAIL inbox for 7 test emails"
echo "═══════════════════════════════════════════════════════════"
