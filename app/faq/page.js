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
        answer: 'Sea moss (Irish moss) is a mineral-rich seaweed that customers often use as part of a daily wellness routine. Taste of Gratitude keeps the education ingredient-focused and avoids medical claims: choose the products that fit your flavor, routine, and guidance from your healthcare provider.'
      },
      {
        question: 'How should I consume sea moss gel?',
        answer: 'Most customers start with 1-2 tablespoons in smoothies, teas, juices, bowls, or as a chilled spoonful. Store refrigerated, use a clean spoon, and follow the freshness window on your product label.'
      },
      {
        question: 'Are your products organic and all-natural?',
        answer: 'Our weekly menu is ingredient-forward, small-batch, and made with real fruits, herbs, roots, sea moss, alkaline water, agave, or honey depending on the product. Check each product page for its full ingredient list and allergens.'
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
        answer: 'Browse our catalog, add products to your cart, and proceed to checkout. You can choose pickup at our market locations, local delivery (select ZIP codes), or shipping. Complete your payment securely through Square.'
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
        answer: 'Enter your coupon code at checkout in the "Coupon Code" field before completing payment. Coupons can be earned through our Spin & Win wheel, loyalty rewards, or promotional campaigns. Check your email for exclusive offers!'
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
        answer: 'Current market pickup is structured around Serenbe Farmers Market and Dunwoody Farmers Market. Select your preferred market at checkout and check /markets for current pickup windows and preorder guidance.'
      },
      {
        question: 'Do you offer local delivery?',
        answer: 'Yes! We offer same-day and next-day delivery to select ZIP codes in South Fulton, Atlanta Metro, Decatur, and surrounding areas. Enter your ZIP code at checkout to see if delivery is available in your area. Delivery fees vary by zone ($12-$18).'
      },
      {
        question: 'What are your shipping options?',
        answer: 'We ship via USPS Priority Mail (2-3 business days) to all US states. Shipping starts at $8.99 and is FREE on orders $50+. Orders are packed with ice packs to maintain freshness during transit.'
      },
      {
        question: 'How long does shipping take?',
        answer: 'Orders ship within 1-2 business days. USPS Priority Mail takes 2-3 business days. You will receive a tracking number via email once your order ships. Note: Sea moss products are perishable and should be refrigerated immediately upon arrival.'
      },
      {
        question: 'Do you ship to PO Boxes?',
        answer: 'Yes, we ship to PO Boxes via USPS. However, due to the perishable nature of sea moss products, we recommend using a physical address where someone can receive and refrigerate the products immediately.'
      },
      {
        question: 'What if my package arrives warm or damaged?',
        answer: 'We pack orders with ice packs, but warm arrival can occur in hot weather or delivery delays. If your product arrives warm but sealed and within the expected delivery window, refrigerate immediately - it should be fine. If damaged or spoiled, contact us within 24 hours with photos for a replacement or refund.'
      }
    ]
  },
  {
    id: 'rewards',
    title: 'Rewards & Loyalty',
    icon: Heart,
    questions: [
      {
        question: 'What is the Gratitude Passport?',
        answer: 'The Gratitude Passport is the rewards direction for recurring customers. The frontend is prepared for loyalty, referrals, reviews, and reorder reminders while the backend reward rules are finalized.'
      },
      {
        question: 'How do I earn stamps?',
        answer: 'Future rewards can be tied to purchases, quiz completions, market visits, referrals, reviews, and community participation. Join the weekly list so you hear when rewards go live.'
      },
      {
        question: 'What is the Spin & Win wheel?',
        answer: 'New customers get one free spin to win instant discounts ($1-$5 off). Provide your email to spin. Prizes are valid for 24 hours. Existing customers can earn additional spins through our rewards program.'
      },
      {
        question: 'How do I redeem my rewards?',
        answer: 'Rewards automatically generate coupon codes that are emailed to you when earned. Simply enter the coupon code at checkout to apply your discount or free item. Check your Gratitude Passport to see available rewards.'
      }
    ]
  },
  {
    id: 'community',
    title: 'Community & Challenges',
    icon: HelpCircle,
    questions: [
      {
        question: 'What is the #SpicyBloomChallenge?',
        answer: 'Spicy Bloom is the tart floral wellness shot with hibiscus, citrus, cranberry, jalapeño heat, and sea moss. Community challenges can feature customer routines, market pickup moments, and honest product reactions when campaigns are active.'
      },
      {
        question: 'How do I participate in community challenges?',
        answer: 'Follow Taste of Gratitude on Instagram and join weekly menu updates. When a challenge is active, we will share the hashtag, rules, reward, and submission path clearly before asking customers to post.'
      },
      {
        question: 'Can I share my sea moss journey on your platform?',
        answer: `Absolutely! We love hearing wellness stories. Share your photos, videos, and testimonials by tagging us on Instagram (@tasteofgratitude) or emailing ${SUPPORT_EMAIL}. You might be featured when we request community stories.`
      },
      {
        question: 'Do you offer wellness workshops or events?',
        answer: 'Yes! We host seasonal workshops at our market locations covering topics like sea moss benefits, healthy recipes, and holistic wellness. Follow us on social media or subscribe to our newsletter for event announcements.'
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
        answer: 'Yes! We stand behind our products 100%. If you are not completely satisfied with your purchase, contact us within 7 days and we will make it right with a refund, replacement, or store credit. Your wellness journey is our priority.'
      },
      {
        question: 'How do I track my order?',
        answer: 'You will receive an email with tracking information once your order ships. For pickup orders, you will get a confirmation email with market location and hours. For delivery orders, you will receive SMS/email updates on delivery status.'
      },
      {
        question: 'Can I visit your facility or kitchen?',
        answer: 'Our prep space is not open for public visits, but you can meet the team at active market locations such as Serenbe and Dunwoody when scheduled. Check /markets for current pickup details.'
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
        className="w-full py-4 flex items-start justify-between text-left hover:text--emerald-500 transition-colors group"
      >
        <span className="font-medium pr-8 flex-1">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text--emerald-500 transition-transform flex-shrink-0 ${
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
        <div className="bg-gradient-to-r from--emerald-500/10 to--emerald-600/10 p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg--emerald-500/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text--emerald-500" />
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
            <div className="inline-flex items-center gap-2 px-4 py-2 bg--emerald-500/10 rounded-full text-sm font-semibold text--emerald-500 mb-6">
              <HelpCircle className="h-4 w-4" />
              Frequently Asked Questions
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              We're Here to Help
            </h1>
            <p className="text-lg text-muted-foreground">
              Find answers to common questions about our products, ordering process, and wellness benefits.
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
      <div className="bg-gradient-to-br from--emerald-500/10 via--emerald-600/10 to--emerald-500/10 border-y">
        <div className="container py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-muted-foreground mb-8">
              Can't find the answer you're looking for? Our friendly customer support team is here to help.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg--emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    📧
                  </div>
                  <h3 className="font-semibold mb-2">Email Us</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Response within 24 hours
                  </p>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-sm text--emerald-500 hover:underline font-medium"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg--emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    📞
                  </div>
                  <h3 className="font-semibold mb-2">Phone Support</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {HAS_PUBLIC_PHONE ? SUPPORT_HOURS_LABEL : 'Callback requests handled within support hours'}
                  </p>
                  <a
                    href={PHONE_SUPPORT_LINK}
                    className="text-sm text--emerald-500 hover:underline font-medium"
                  >
                    {PHONE_SUPPORT_LABEL}
                  </a>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg--emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    🛍️
                  </div>
                  <h3 className="font-semibold mb-2">Visit Markets</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Talk to us in person
                  </p>
                  <a
                    href="/markets"
                    className="text-sm text--emerald-500 hover:underline font-medium"
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
