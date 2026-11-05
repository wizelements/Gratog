'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDown, HelpCircle, ShoppingCart, Package, Truck, CreditCard, Leaf, Heart } from 'lucide-react';
import {
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  HAS_PUBLIC_PHONE,
  SUPPORT_EMAIL,
  SUPPORT_HOURS_LABEL,
  WHOLESALE_EMAIL,
} from '@/lib/site-config';

const PHONE_SUPPORT_LINK = HAS_PUBLIC_PHONE
  ? CONTACT_PHONE_HREF
  : `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Phone Support Request')}`;

const PHONE_SUPPORT_LABEL = HAS_PUBLIC_PHONE
  ? CONTACT_PHONE_DISPLAY
  : 'Request a callback by email';

const faqCategories = [
  {
    id: 'products',
    title: 'Products & Ingredients',
    icon: Leaf,
    questions: [
      {
        question: 'What is sea moss and what are its benefits?',
        answer: 'Sea moss is a mineral-containing seaweed. Many people enjoy it in smoothies, drinks, or meals. Choose what works for your routine, and ask a healthcare professional if you have questions about iodine or medication.'
      },
      {
        question: 'How should I consume sea moss gel?',
        answer: 'Most customers start with 1-2 tablespoons in smoothies, teas, juices, bowls, or as a chilled spoonful. Store refrigerated, use a clean spoon, and follow the freshness window on your product label.'
      },
      {
        question: 'Are your products made with clean ingredients?',
        answer: 'We make small batches with fruits, herbs, roots, and other ingredients that vary by flavor. Check each product’s ingredient list for exactly what’s inside and any allergens.'
      },
      {
        question: 'What is the shelf life of sea moss products?',
        answer: 'Refrigerated sea moss gel lasts 3-4 weeks. Our ginger lemonades last 2 weeks refrigerated. Shots should be consumed within 1 week. Always check the product label for specific dates and store properly in the refrigerator.'
      },
      {
        question: 'Can I take sea moss if I have thyroid issues?',
        answer: 'Sea moss is naturally high in iodine. If you have a thyroid condition, are pregnant or nursing, or take thyroid medication, talk to your healthcare provider before adding sea moss to your routine.'
      },
      {
        question: 'Are there any side effects?',
        answer: 'Most people enjoy sea moss as part of a balanced diet. Some may notice mild digestive adjustment when first starting. Begin with a smaller serving and see how your body responds. If you have iodine sensitivity, thyroid conditions, or are pregnant/nursing, consult your healthcare provider first.'
      }
    ]
  },
  {
    id: 'ordering',
    title: 'Ordering & Payment',
    icon: ShoppingCart,
    questions: [
      {
        question: 'How do I place an order?',
        answer: 'For Serenbe pickup, see the weekly menu and follow the preorder steps. For other pickup, delivery, or Georgia shipping, send us your order details. We’ll confirm availability and the full price before you pay through Square.'
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover), debit cards, Apple Pay, and Google Pay through our secure Square payment system.'
      },
      {
        question: 'Can I modify or cancel my order?',
        answer: `You can modify or cancel orders within 2 hours of placing them by contacting us at ${SUPPORT_EMAIL}. Once orders are being prepared or in transit, modifications may not be possible.`
      },
      {
        question: 'Do you offer bulk or wholesale pricing?',
        answer: `Yes. Visit /wholesale or email ${WHOLESALE_EMAIL} for retail, studio, office, community event, and recurring partner order conversations.`
      },
      {
        question: 'How do I use a coupon code?',
        answer: 'Have a current discount code? Mention it when you contact us, and we’ll check whether it applies before payment. Watch our emails for any new offers.'
      }
    ]
  },
  {
    id: 'fulfillment',
    title: 'Pickup, Delivery & Shipping',
    icon: Truck,
    questions: [
      {
        question: 'Where can I pick up my order?',
        answer: 'For market pickup, visit our Serenbe Farmers Market booth on scheduled Saturdays. See /markets for current details and preorder deadlines.'
      },
      {
        question: 'Do you offer local delivery?',
        answer: 'Local delivery depends on your address and what you’re ordering. Share your Georgia address with your order request and we’ll confirm availability and any delivery fee before you pay.'
      },
      {
        question: 'Do you ship outside Georgia?',
        answer: 'We currently consider shipping requests within Georgia only. We’ll check whether your items can ship and confirm the timing and cost before you pay.'
      },
      {
        question: 'How long does shipping take?',
        answer: 'Shipping times depend on the eligible item and selected Georgia shipping method. Review the estimate before paying and follow any storage instructions on the product label.'
      },
      {
        question: 'Do you ship to PO Boxes?',
        answer: 'PO Box eligibility depends on the shipping method and product. We only fulfill to Georgia addresses, and recommend a physical address for perishable items.'
      },
      {
        question: 'What if my package arrives warm or damaged?',
        answer: 'If an order arrives damaged or at an unsafe temperature, do not consume it. Contact us promptly with photos and the order details so we can review a replacement or refund.'
      }
    ]
  },
    {
    id: 'rewards',
    title: 'Rewards & Loyalty',
    icon: Heart,
    questions: [
      {
        question: 'Will Taste of Gratitude have a rewards program?',
        answer: 'We’re working on ways to thank our regulars. Join the weekly menu emails for news when a rewards program is ready.'
      },
      {
        question: 'Can I get coupons or discounts right now?',
        answer: 'Promotional codes are emailed to newsletter subscribers and announced at market pickups. Sign up for the weekly menu email to receive current offers.'
      }
    ]
  },
    {
    id: 'community',
    title: 'Community & Challenges',
    icon: HelpCircle,
    questions: [
      {
        question: 'Are community challenges active?',
        answer: 'Community challenges are planned for future market seasons. When active, we will share the hashtag, rules, reward, and submission path clearly before asking customers to post. Follow us on Instagram (@tasteofgratitude) and join the weekly email for announcements.'
      },
      {
        question: 'Do you offer market events or pop-ups?',
        answer: 'We share event news by email and on social media. For now, you can find us at Serenbe.'
      },
      {
        question: 'Can I share my sea moss journey on your platform?',
        answer: `Absolutely! We love hearing honest customer stories. Share your photos, videos, and testimonials by tagging us on Instagram (@tasteofgratitude) or emailing ${SUPPORT_EMAIL}. You might be featured when we request community stories.`
      }
    ]
  },
  {
    id: 'support',
    title: 'Customer Support',
    icon: Package,
    questions: [
      {
        question: 'How can I contact customer support?',
        answer: HAS_PUBLIC_PHONE
          ? `Email: ${SUPPORT_EMAIL}, Phone: ${CONTACT_PHONE_DISPLAY}, Hours: ${SUPPORT_HOURS_LABEL}. We respond to emails within 24 hours. For urgent order issues, please call during business hours.`
          : `Email: ${SUPPORT_EMAIL}. Phone support is available by callback request during ${SUPPORT_HOURS_LABEL}. We respond to emails within 24 hours.`
      },
      {
        question: 'What is your return and refund policy?',
        answer: 'We want you to love our products! If you are not satisfied, contact us within 7 days of receipt. Due to the perishable nature of sea moss, we cannot accept returns but will gladly issue refunds or replacements for quality issues, damaged products, or dissatisfaction. Photo proof required.'
      },
      {
        question: 'Do you have a satisfaction guarantee?',
        answer: 'Yes! We stand behind our products 100%. If you are not completely satisfied with your purchase, contact us within 7 days and we will make it right with a refund, replacement, or store credit. Your satisfaction is our priority.'
      },
      {
        question: 'How do I track my order?',
        answer: 'You will receive an email with tracking information once your order ships. For pickup orders, you will get a confirmation email with market location and hours. For delivery orders, you will receive email updates on delivery status.'
      },
      {
        question: 'Can I visit your facility or kitchen?',
        answer: 'Our prep space is not open for public visits, but you can meet our team at Serenbe Farmers Market on scheduled Saturdays. Check /markets for current pickup details.'
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-start justify-between text-left hover:text-emerald-800 transition-colors group"
      >
        <span className="font-medium pr-8 flex-1">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-emerald-800 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed animate-slide-up">
          {answer}
        </div>
      )}
    </div>
  );
}

function FAQCategory({ category }) {
  const Icon = category.icon;
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-emerald-800" />
            </div>
            <h3 className="font-semibold text-lg">{category.title}</h3>
          </div>
        </div>
        <div className="p-6">
          {category.questions.map((item, index) => (
            <FAQItem key={index} question={item.question} answer={item.answer} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-b">
        <div className="container py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full text-sm font-semibold text-emerald-800 mb-6">
              <HelpCircle className="h-4 w-4" />
              Frequently Asked Questions
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              We're Here to Help
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our products, ordering process, and flavor and routine.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Categories */}
      <div className="container py-12">
        <div className="max-w-5xl mx-auto space-y-6">
          {faqCategories.map((category) => (
            <FAQCategory key={category.id} category={category} />
          ))}
        </div>
      </div>

      {/* Still Have Questions */}
      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-600/10 to-emerald-500/10 border-y">
        <div className="container py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-muted-foreground mb-8">
              Can't find the answer you're looking for? Our friendly customer support team is here to help.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    📧
                  </div>
                  <h3 className="font-semibold mb-2">Email Us</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Response within 24 hours
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-sm text-emerald-800 hover:underline font-medium"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    📞
                  </div>
                  <h3 className="font-semibold mb-2">Phone Support</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {HAS_PUBLIC_PHONE ? SUPPORT_HOURS_LABEL : 'Callback requests handled within support hours'}
                  </p>
                  <a
                    href={PHONE_SUPPORT_LINK}
                    className="text-sm text-emerald-800 hover:underline font-medium"
                  >
                    {PHONE_SUPPORT_LABEL}
                  </a>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    🛍️
                  </div>
                  <h3 className="font-semibold mb-2">Visit Markets</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Talk to us in person
                  </p>
                  <a
                    href="/markets"
                    className="text-sm text-emerald-800 hover:underline font-medium"
                  >
                    See Market Locations
                  </a>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
