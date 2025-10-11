import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: "Privacy Policy | Taste of Gratitude",
  description: "Learn how Taste of Gratitude protects your privacy and handles your personal information when you shop with us.",
});

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">
            Your privacy is important to us. Learn how we protect your information.
          </p>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Personal Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Name, email address, and phone number when you place an order</li>
                <li>Delivery address for delivery orders</li>
                <li>Payment information processed securely through Square</li>
                <li>Order history and preferences</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Device information and browser type</li>
                <li>IP address and general location data</li>
                <li>Website usage patterns and preferences</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Process and fulfill your orders</li>
              <li>Send order confirmations and updates via SMS and email</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve our products and services</li>
              <li>Send promotional materials (with your consent)</li>
              <li>Prevent fraud and ensure security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Information Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              We do not sell, rent, or share your personal information with third parties except in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Service Providers:</strong> Square for payment processing, Twilio for SMS, Resend for email</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In the event of a merger or acquisition</li>
              <li><strong>With Your Consent:</strong> Any other sharing with your explicit permission</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Security</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>SSL encryption for all data transmission</li>
              <li>Secure payment processing through Square</li>
              <li>Regular security updates and monitoring</li>
              <li>Limited access to personal information</li>
              <li>Data backup and recovery procedures</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Rights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Access:</strong> Request information about your personal data</li>
              <li><strong>Correction:</strong> Update or correct your information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format</li>
            </ul>
            <p className="text-sm mt-4">
              To exercise these rights, contact us at{' '}
              <a href="mailto:privacy@tasteofgratitude.shop" className="text-[#D4AF37] hover:underline">
                privacy@tasteofgratitude.shop
              </a>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookies and Tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              We use cookies to enhance your experience and analyze website usage:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Essential Cookies:</strong> Required for basic website functionality</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
              <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="text-sm">
              You can control cookies through your browser settings, but this may affect website functionality.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>Email:</strong> privacy@tasteofgratitude.shop</p>
              <p><strong>Phone:</strong> (404) 555-1234</p>
              <p><strong>Address:</strong> Serenbe Farmers Market, Chattahoochee Hills, GA 30268</p>
            </div>
            <p className="text-sm mt-4">
              We will respond to privacy inquiries within 30 days of receipt.
            </p>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            This privacy policy is effective as of {new Date().toLocaleDateString()} and may be updated periodically.
            We will notify you of any significant changes.
          </p>
        </div>
      </div>
    </div>
  );
}