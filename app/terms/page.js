import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateMetadata, generateViewport } from '@/lib/seo';
import {
  CONTACT_PHONE_DISPLAY,
  HAS_PUBLIC_PHONE,
  MARKET_LOCATION_LABEL,
  SUPPORT_EMAIL,
} from '@/lib/site-config';

export const metadata = generateMetadata({
  title: "Terms of Service | Taste of Gratitude",
  description: "Read our terms of service to understand the conditions for using Taste of Gratitude products and services.",
});

export const viewport = generateViewport();

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground text-lg">
            Please read these terms carefully before using our services.
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: December 21, 2025
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              By accessing and using the Taste of Gratitude website, placing orders, or purchasing our products, 
              you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
            <p className="text-sm">
              If you do not agree with any of these terms, you are prohibited from using or accessing our services.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products and Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Product Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>All product descriptions, images, and prices are subject to change without notice</li>
                <li>We strive for accuracy but do not guarantee that product descriptions are error-free</li>
                <li>Colors and appearance may vary due to monitor settings and natural product variations</li>
                <li>All products are handcrafted and may have slight variations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Availability</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Products are subject to availability and may be discontinued at any time</li>
                <li>We reserve the right to limit order quantities</li>
                <li>Out-of-stock items will be communicated promptly</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders and Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Order Process</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Orders are confirmed upon successful payment processing</li>
                <li>We reserve the right to refuse or cancel any order for any reason</li>
                <li>Order confirmations will be sent via SMS and email</li>
                <li>Changes to orders may not be possible once processing begins</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Payment Terms</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Payment is required at the time of order placement</li>
                <li>We accept major credit cards and digital payments through Square</li>
                <li>All payments are processed securely through our payment partner</li>
                <li>Prices include applicable taxes and fees</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pickup and Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Pickup Orders</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Pickup available at Serenbe Farmers Market on Saturdays 9 AM - 1 PM</li>
                <li>Orders must be picked up within the designated time frame</li>
                <li>Valid ID may be required for order pickup</li>
                <li>Unclaimed orders may be subject to cancellation and refund processing</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Delivery Service</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Delivery available within designated Atlanta metro zones</li>
                <li>Delivery fees vary by location and are calculated at checkout</li>
                <li>Delivery times are estimates and may vary due to traffic or weather</li>
                <li>Someone must be available to receive the delivery</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Returns and Refunds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Refund Policy</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Refunds may be provided for defective or damaged products</li>
                <li>Due to the perishable nature of our products, returns are limited</li>
                <li>Refund requests must be made within 24 hours of purchase</li>
                <li>Refunds will be processed to the original payment method</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Satisfaction Guarantee</h3>
              <p className="text-sm">
                We stand behind the quality of our products. If you're not completely satisfied, 
                please contact us at {SUPPORT_EMAIL} within 24 hours of receipt.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health and Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Product Disclaimers</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Our products are not intended to diagnose, treat, cure, or prevent any disease</li>
                <li>Consult your healthcare provider before using if pregnant, nursing, or have medical conditions</li>
                <li>Individual results may vary</li>
                <li>Keep products refrigerated as directed</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Allergies and Ingredients</h3>
              <p className="text-sm">
                Please review all ingredient lists carefully. If you have allergies or dietary restrictions, 
                contact us before ordering. We are not responsible for allergic reactions.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All content, trademarks, and intellectual property are owned by Taste of Gratitude</li>
              <li>You may not use our content without written permission</li>
              <li>Product names, logos, and branding are protected trademarks</li>
              <li>Unauthorized use of our intellectual property is prohibited</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              To the fullest extent permitted by law, Taste of Gratitude shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of our products or services. 
              Our total liability shall not exceed the amount paid for the specific product or service in question.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Governing Law</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              These terms are governed by the laws of the State of Georgia, United States. 
              Any disputes shall be resolved in the courts of Fulton County, Georgia.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> {SUPPORT_EMAIL}</p>
              <p>
                <strong>Phone:</strong>{' '}
                {HAS_PUBLIC_PHONE
                  ? CONTACT_PHONE_DISPLAY
                  : `Phone support is available by callback request via ${SUPPORT_EMAIL}`}
              </p>
              <p><strong>Address:</strong> {MARKET_LOCATION_LABEL}</p>
            </div>
            <p className="text-sm mt-4">
              For questions about these terms, please contact us using the information above.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            These terms are effective as of December 21, 2025 and may be updated periodically. 
            Continued use of our services constitutes acceptance of any changes.
          </p>
        </div>
      </div>
    </div>
  );
}
