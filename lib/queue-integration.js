/**
 * Queue Integration Helper
 * Adds orders to the queue system after checkout
 */

export async function addOrderToQueue(orderData) {
  try {
    const response = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.id,
        orderRef: orderData.orderRef || orderData.id?.slice(-6).toUpperCase(),
        marketId: orderData.marketId || orderData.fulfillmentDetails?.marketId,
        marketName: orderData.marketName || orderData.fulfillmentDetails?.marketName,
        customerInfo: {
          name: orderData.customer?.name,
          phone: orderData.customer?.phone,
          email: orderData.customer?.email
        },
        items: orderData.cart?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          customizations: item.modifiers || item.customizations
        })) || []
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to add to queue');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Queue join error:', error);
    return null;
  }
}

export function shouldUseQueue(fulfillmentType, orderData) {
  // Use queue for pickup orders at markets
  return fulfillmentType?.includes('pickup') || 
         orderData?.fulfillmentDetails?.type === 'pickup' ||
         orderData?.marketId;
}

export function getQueueRedirectUrl(orderId) {
  return `/order/${orderId}/queue`;
}
