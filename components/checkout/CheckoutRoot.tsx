'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useCheckoutStore } from '@/stores/checkout';
import { CartAPI } from '@/adapters/cartAdapter';
import { Fulfillment } from '@/adapters/fulfillmentAdapter';
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
import CheckoutErrorBoundary from './CheckoutErrorBoundary';
import Link from 'next/link';

// FIX P1-2: Wrap checkout in error boundary
export default function CheckoutRoot() {
  return (
    <CheckoutErrorBoundary>
      <CheckoutContent />
    </CheckoutErrorBoundary>
  );
}

function CheckoutContent() {
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

  const hasTrackedStartRef = useRef(false);
  const hasPreorderItems = cart.some(item => item.isPreorder);
  const showSideSummary = stage !== 'cart';

  // Scroll to top when stage changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage]);

  useEffect(() => {
    if (hasPreorderItems && fulfillment.type !== 'pickup') {
      clearValidation();
      setFulfillment({
        type: 'pickup',
        pickup: fulfillment.pickup || { locationId: '', date: null },
      });
    }
  }, [hasPreorderItems, fulfillment.type, fulfillment.pickup, clearValidation, setFulfillment]);

  useEffect(() => {
    if (hasTrackedStartRef.current) return;
    hasTrackedStartRef.current = true;
    track('checkout_started', { itemCount: cart.length, total: totals.total });
  }, [cart.length, totals.total]);

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
    const phoneDigits = contact.phone.replace(/\D/g, '');
    if (contact.phone.trim() && phoneDigits.length !== 10) {
      errors.phone = 'Enter a 10-digit phone number or leave it blank';
    }
    
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
      const street = fulfillment.delivery?.address.street || '';
      const city = fulfillment.delivery?.address.city || '';
      const zip = fulfillment.delivery?.address.zip || '';
      
      if (!street) errors['address.street'] = 'Street address is required';
      if (!city) errors['address.city'] = 'City is required';
      if (!zip) {
        errors['address.zip'] = 'ZIP code is required';
      } else if (zip.length !== 5) {
        errors['address.zip'] = 'ZIP code must be 5 digits';
      } else if (!Fulfillment.isZipServiceable(zip)) {
        errors['address.zip'] = "We don't deliver to this area yet";
      }
      if (!fulfillment.delivery?.window) {
        errors.window = 'Please select a delivery window';
      }
      if (
        typeof fulfillment.delivery?.fee !== 'number' ||
        fulfillment.delivery?.quotedSubtotal !== totals.subtotal
      ) {
        errors.deliveryFee = 'Check your delivery fee by mileage before continuing';
      }
    } else if (fulfillment.type === 'shipping') {
      const street = fulfillment.shipping?.address.street || '';
      const city = fulfillment.shipping?.address.city || '';
      const state = fulfillment.shipping?.address.state || '';
      const zip = fulfillment.shipping?.address.zip || '';

      if (!street) errors['address.street'] = 'Street address is required';
      if (!city) errors['address.city'] = 'City is required';
      if (!state || state.length !== 2) errors['address.state'] = 'Two-letter state is required';
      if (!zip) {
        errors['address.zip'] = 'ZIP code is required';
      } else if (!/^\d{5}$/.test(zip)) {
        errors['address.zip'] = 'ZIP code must be 5 digits';
      }
      if (!fulfillment.shipping?.methodId) {
        errors.methodId = 'Choose a shipping method';
      }
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
      <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some items to get started!</p>
          <Link href="/catalog">
            <Button className="bg-emerald-700 hover:bg-emerald-800">
              Browse Products
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <CheckoutProgress 
          currentStage={stage} 
          onStageClick={(clickedStage) => {
            const stageOrder = ['cart', 'details', 'review'];
            const currentIdx = stageOrder.indexOf(stage);
            const clickedIdx = stageOrder.indexOf(clickedStage);
            if (clickedIdx < currentIdx) {
              clearValidation();
              setStage(clickedStage);
            }
          }}
        />

        <div className={`grid grid-cols-1 gap-6 mt-8 ${showSideSummary ? 'lg:grid-cols-3' : ''}`}>
          <div className={showSideSummary ? 'lg:col-span-2' : ''}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
              <AnimatePresence mode="wait">
                {stage === 'cart' && (
                  <motion.div
                    key="cart-stage"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review your cart</h2>
                    <p className="mb-6 text-base text-gray-600">Confirm your items before choosing pickup, local delivery, or shipping.</p>
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Pickup, delivery, or shipping</h3>
                      <p className="mb-4 text-base text-gray-600">
                        Choose how you want to receive your order. Preorders are made for market pickup;
                        eligible ready-to-ship items can ship nationwide with fees shown before payment.
                      </p>
                      <FulfillmentTabs
                        selected={fulfillment.type}
                        hasPreorderItems={hasPreorderItems}
                        onChange={(type) => {
                          // FIX P1-4: Clear ALL validation when switching fulfillment types
                          // Prevents stale validation errors from previous fulfillment type
                          clearValidation();
                          setFulfillment({ type });
                          track('fulfillment_type_selected', { type });
                        }}
                      />

                      <div className="mt-6">
                        <AnimatePresence mode="wait">
                          {fulfillment.type === 'pickup' && (
                            <PickupForm
                              data={fulfillment.pickup || { locationId: '', date: null }}
                              onChange={(data) => setFulfillment({ pickup: { locationId: '', date: null, ...fulfillment.pickup, ...data } })}
                              errors={validation.fulfillment}
                            />
                          )}
                          {fulfillment.type === 'delivery' && (
                            <DeliveryForm
                              data={fulfillment.delivery || { address: { street: '', city: '', state: 'GA', zip: '' }, window: '12-15' }}
                              onChange={(data) => setFulfillment({ delivery: { address: { street: '', city: '', state: 'GA', zip: '' }, window: '', ...fulfillment.delivery, ...data } })}
                              subtotal={totals.subtotal}
                              tip={tip}
                              onTipChange={setTip}
                              errors={validation.fulfillment}
                            />
                          )}
                          {fulfillment.type === 'shipping' && (
                            <ShippingForm
                              data={fulfillment.shipping || { address: { street: '', city: '', state: 'GA', zip: '' }, methodId: '' }}
                              onChange={(data) => setFulfillment({ shipping: { address: { street: '', city: '', state: 'GA', zip: '' }, methodId: '', ...fulfillment.shipping, ...data } })}
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
                <div className="flex justify-between gap-3 mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={stage === 'cart'}
                    className="min-h-12 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>

                  <Button
                    onClick={handleNext}
                    disabled={cart.length === 0}
                    className="min-h-12 bg-emerald-700 hover:bg-emerald-800 flex items-center gap-2"
                  >
                    {stage === 'cart' ? 'Continue to Details' : 'Continue to Review'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {showSideSummary && (
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
                collapsible
              />
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
