// New handleCheckout function with dynamic Square checkout
const handleCheckoutNew = `
  // Enhanced checkout process with dynamic Square checkout
  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    try {
      // Create order record via API
      const orderData = {
        cart,
        customer,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : null,
        deliveryTimeSlot: fulfillmentType === 'delivery' ? deliveryTimeSlot : null,
        deliveryInstructions: fulfillmentType === 'delivery' ? deliveryInstructions : null,
        deliveryFee: adjustedDeliveryFee,
        appliedCoupon,
        subtotal,
        couponDiscount,
        total,
        source: 'website',
        deviceInfo: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };
      
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      
      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }
      
      const orderResult = await orderResponse.json();
      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }
      
      const order = orderResult.order;
      
      // Create dynamic Square checkout session
      const checkoutResponse = await fetch('/api/square/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          items: cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            description: item.subtitle || item.description
          })),
          customer: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone
          },
          total,
          subtotal
        })
      });
      
      if (!checkoutResponse.ok) {
        throw new Error('Failed to create Square checkout session');
      }
      
      const checkoutResult = await checkoutResponse.json();
      if (!checkoutResult.success) {
        throw new Error('Failed to create checkout URL');
      }
      
      // Award order completion points
      if (customer.email) {
        try {
          await fetch('/api/rewards/add-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customer.email,
              points: Math.floor(total),
              activityType: 'purchase',
              activityData: {
                orderId: order.id,
                orderTotal: total,
                itemCount: cart.length
              }
            })
          });
        } catch (pointsError) {
          console.warn('Failed to award purchase points:', pointsError);
        }
      }
      
      // Show success message
      toast.success('Order created! Redirecting to Square for payment...');
      
      // Clear cart
      clearCart();
      
      // Redirect to Square checkout
      setTimeout(() => {
        window.location.href = checkoutResult.checkoutUrl;
      }, 1500);
      
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error.message || 'Checkout failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
`;

console.log(handleCheckoutNew);
