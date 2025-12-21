import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Truck, RefreshCw, FileText, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Policies | Taste of Gratitude",
  description: "View our Terms of Service, Shipping Policy, Refund Policy, and other important policies for shopping with Taste of Gratitude.",
};

export default function PoliciesPage() {
  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Store Policies</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about shopping with Taste of Gratitude
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="#terms" className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
            <FileText className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-medium">Terms</span>
          </a>
          <a href="#shipping" className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
            <Truck className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-medium">Shipping</span>
          </a>
          <a href="#refunds" className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
            <RefreshCw className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-medium">Refunds</span>
          </a>
          <Link href="/privacy" className="flex flex-col items-center gap-2 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
            <Shield className="h-6 w-6 text-emerald-600" />
            <span className="text-sm font-medium">Privacy</span>
          </Link>
        </div>

        {/* Terms of Service */}
        <Card id="terms">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Terms of Service
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <p className="text-muted-foreground">
              Last updated: December 21, 2025
            </p>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">1. Agreement to Terms</h3>
              <p>
                By accessing and using the Taste of Gratitude website and services, you agree to be 
                bound by these Terms of Service. If you do not agree to these terms, please do not 
                use our services.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">2. Products and Orders</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>All products are handcrafted and made fresh to order</li>
                <li>Product availability may vary based on seasonal ingredients</li>
                <li>We reserve the right to limit quantities or refuse orders</li>
                <li>Prices are subject to change without notice</li>
                <li>All orders are subject to acceptance and availability</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">3. Pickup and Delivery</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Pickup orders must be collected at the specified time and location</li>
                <li>Delivery is available within our service area only</li>
                <li>Delivery times are estimates and may vary due to conditions</li>
                <li>Someone must be available to receive delivery orders</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">4. Payment</h3>
              <p>
                We accept major credit cards and debit cards. Payment is processed securely 
                through Square. By placing an order, you authorize us to charge the payment 
                method provided for the total order amount.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">5. Intellectual Property</h3>
              <p>
                All content on this website, including text, graphics, logos, and images, is the 
                property of Taste of Gratitude and is protected by copyright and trademark laws.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">6. Limitation of Liability</h3>
              <p>
                Taste of Gratitude shall not be liable for any indirect, incidental, special, 
                or consequential damages arising from the use of our products or services.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Shipping Policy */}
        <Card id="shipping">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Shipping & Delivery Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section className="space-y-3">
              <h3 className="font-semibold text-base">Pickup Options</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Free pickup available at all our market locations</li>
                <li>Pickup times are scheduled during market hours</li>
                <li>Orders not picked up within the designated time may be forfeited</li>
                <li>Please bring your order confirmation for pickup</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Local Delivery</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Available within our delivery service area</li>
                <li>Delivery fee varies based on distance and order size</li>
                <li>Minimum order may apply for delivery</li>
                <li>Delivery times are scheduled based on availability</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Shipping</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Select products available for shipping</li>
                <li>Shipping costs calculated at checkout based on weight and destination</li>
                <li>Standard shipping typically takes 3-7 business days</li>
                <li>Expedited shipping options available at additional cost</li>
                <li>Products are carefully packaged to maintain freshness</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Order Processing</h3>
              <p>
                Orders are typically processed within 1-2 business days. You will receive 
                an email confirmation when your order is ready for pickup or has shipped.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Refund Policy */}
        <Card id="refunds">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-emerald-600" />
              Refund & Return Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            <section className="space-y-3">
              <h3 className="font-semibold text-base">Our Satisfaction Guarantee</h3>
              <p>
                We take pride in our products and want you to be completely satisfied. 
                If you are not happy with your order, please contact us within 24 hours 
                of receiving your order.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Refund Eligibility</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Product quality issues or damage during delivery</li>
                <li>Missing items from your order</li>
                <li>Incorrect items received</li>
                <li>Orders not picked up due to our error (e.g., wrong market date)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Non-Refundable Situations</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Change of mind after order is placed</li>
                <li>Orders not picked up at scheduled time without prior notice</li>
                <li>Delivery orders where recipient was unavailable</li>
                <li>Products stored improperly after delivery</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">How to Request a Refund</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Contact us within 24 hours of receiving your order</li>
                <li>Provide your order number and description of the issue</li>
                <li>Include photos if applicable (damaged or incorrect items)</li>
                <li>We will respond within 1-2 business days</li>
              </ol>
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold text-base">Refund Processing</h3>
              <p>
                Approved refunds will be processed to the original payment method within 
                5-10 business days. In some cases, we may offer store credit or a 
                replacement product instead of a monetary refund.
              </p>
            </section>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">Questions About Our Policies?</h2>
              <p className="text-muted-foreground">
                We&apos;re here to help. Contact us with any questions or concerns.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link 
                  href="/contact" 
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                >
                  <Mail className="h-4 w-4" />
                  Contact Us
                </Link>
                <span className="hidden sm:inline text-muted-foreground">|</span>
                <a 
                  href="tel:+1-555-GRATOG" 
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                >
                  <Phone className="h-4 w-4" />
                  Call Us
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
