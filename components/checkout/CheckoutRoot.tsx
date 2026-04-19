'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useCheckoutStore } from '@/stores/checkout';
import { CartAPI } from '@/adapters/cartAdapter';
import { Button } from '@/components/ui/button';
import { track } from '@/utils/analytics';
import CheckoutProgress from './CheckoutProgress';
import CartSummary from './CartSummary';
import ContactForm from './ContactForm';
import FulfillmentTabs from './FulfillmentTabs';
import PickupForm from './PickupForm';
import DeliveryForm from './DeliveryForm';
import ShippingForm from './ShippingForm';
import ReviewAndPay from './ReviewAndPay';
import Link from 'next/link';

export default function CheckoutRoot() {
  const {
    stage,
    setStage,
    cart,
    updateCart,
    contact,
    setContact,
    fulfillment,
    setFulfillment,
    tip,
    setTip,
    totals,
    validation,
    setValidation,
    clearValidation,
    couponCode,
  } = useCheckoutStore();

  const formContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when stage changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage]);

  useEffect(() => {
    track('checkout_started', { itemCount: cart.length, total: totals.total });
  }, []);

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = document.querySelector('[aria-invalid="true"], .border-red-500');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (firstError as HTMLElement).focus?.();
      }
    }, 100);
  };

  const validateContact = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!contact.firstName.trim()) errors.firstName = 'First name is required';
    if (!contact.lastName.trim()) errors.lastName = 'Last name is required';
    if (!contact.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      errors.email = 'Valid email is required';
    }
    if (!contact.phone.trim()) errors.phone = 'Phone number is required';
    
    if (Object.keys(errors).length > 0) {
      setValidation({ contact: errors });
      scrollToFirstError();
      return false;
    }
    
    return true;
  };

  const validateFulfillment = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (fulfillment.type === 'pickup') {
      if (!fulfillment.pickup?.locationId) errors.locationId = 'Pickup location is required';
      if (!fulfillment.pickup?.date) errors.date = 'Pickup date is required';
    } else if (fulfillment.type === 'delivery') {
      if (!fulfillment.delivery?.address.street) errors['address.street'] = 'Street address is required';
      if (!fulfillment.delivery?.address.city) errors['address.city'] = 'City is required';
      if (!fulfillment.delivery?.address.zip) errors['address.zip'] = 'ZIP code is required';
    } else if (fulfillment.type === 'shipping') {
      if (!fulfillment.shipping?.address?.street) errors['address.street'] = 'Street address is required';
      if (!fulfillment.shipping?.address?.city) errors['address.city'] = 'City is required';
      if (!fulfillment.shipping?.address?.state) errors['address.state'] = 'State is required';
      if (!fulfillment.shipping?.address?.zip) errors['address.zip'] = 'ZIP code is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidation({ fulfillment: errors });
      scrollToFirstError();
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    clearValidation();
    
    if (stage === 'cart') {
      if (cart.length === 0) return;
      setStage('details');
    } else if (stage === 'details') {
      if (!validateContact() || !validateFulfillment()) return;
      setStage('review');
    }
  };

  const handleBack = () => {
    if (stage === 'details') setStage('cart');
    else if (stage === 'review') setStage('details');
  };

  if (cart.length === 0 && stage !== 'cart') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some items to get started!</p>
          <Link href="/catalog">
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600">
              Browse Products
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CheckoutProgress currentStage={stage} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <AnimatePresence mode="wait">
                {stage === 'cart' && (
                  <motion.div
                    key="cart-stage"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Cart</h2>
                    <CartSummary
                      cart={cart}
                      totals={totals}
                      onUpdateQuantity={(id, qty) => {
                        CartAPI.updateQuantity(id, qty);
                        updateCart(CartAPI.getCart());
                      }}
                      onRemoveItem={(id) => {
                        CartAPI.removeItem(id);
                        updateCart(CartAPI.getCart());
                      }}
                      collapsible={false}
                    />
                  </motion.div>
                )}

                {stage === 'details' && (
                  <motion.div
                    key="details-stage"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                  >
                    <ContactForm
                      contact={contact}
                      onChange={setContact}
                      errors={validation.contact}
                    />

                    <div className="border-t pt-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fulfillment Method</h3>
                      <FulfillmentTabs
                        selected={fulfillment.type}
                        onChange={(type) => {
                          setFulfillment({ type });
                          track('fulfillment_type_selected', { type });
                        }}
                      />

                      <div className="mt-6">
                        <AnimatePresence mode="wait">
                          {fulfillment.type === 'pickup' && (
                            <PickupForm
                              data={fulfillment.pickup || { locationId: '', date: null }}
                              onChange={(data) => setFulfillment({ pickup: { ...fulfillment.pickup, ...data } })}
                              errors={validation.fulfillment}
                            />
                          )}
                          {fulfillment.type === 'delivery' && (
                            <DeliveryForm
                              data={fulfillment.delivery || { address: { street: '', city: '', state: 'GA', zip: '' }, window: '12-15' }}
                              onChange={(data) => setFulfillment({ delivery: { ...fulfillment.delivery, ...data } })}
                              tip={tip}
                              onTipChange={setTip}
                              errors={validation.fulfillment}
                            />
                          )}
                          {fulfillment.type === 'shipping' && (
                            <ShippingForm
                              data={fulfillment.shipping || { address: { street: '', city: '', state: '', zip: '' }, methodId: 'standard' }}
                              onChange={(data) => setFulfillment({ shipping: { ...fulfillment.shipping, ...data } })}
                              errors={validation.fulfillment}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

                {stage === 'review' && (
                  <motion.div
                    key="review-stage"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Review & Pay</h2>
                    <ReviewAndPay
                      cart={cart}
                      totals={totals}
                      contact={contact}
                      fulfillment={fulfillment}
                      tip={tip}
                      couponCode={couponCode}
                      onBack={() => setStage('details')}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {stage !== 'review' && (
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={stage === 'cart'}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={cart.length === 0}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 flex items-center gap-2"
                  >
                    {stage === 'cart' ? 'Continue to Details' : 'Continue to Review'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CartSummary
                cart={cart}
                totals={totals}
                onUpdateQuantity={(id, qty) => {
                  CartAPI.updateQuantity(id, qty);
                  updateCart(CartAPI.getCart());
                }}
                onRemoveItem={(id) => {
                  CartAPI.removeItem(id);
                  updateCart(CartAPI.getCart());
                }}
                collapsible={stage !== 'cart'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
