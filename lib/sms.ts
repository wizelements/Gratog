import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '4047899960';

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

interface OrderNotification {
  orderNumber: string;
  customerName: string;
  total?: number;
  estimatedMinutes?: number;
}

/**
 * Send order confirmation SMS to customer
 */
export async function sendOrderConfirmation(
  to: string,
  order: OrderNotification
): Promise<void> {
  if (!client) {
    console.warn('Twilio not configured, skipping SMS');
    return;
  }

  const message = `Hi ${order.customerName}! Your Taste of Gratitude order #${order.orderNumber} has been received. Estimated ready: ${order.estimatedMinutes} mins. Reply STOP to opt out.`;

  await client.messages.create({
    body: message,
    from: `+1${fromNumber}`,
    to: `+1${to.replace(/\D/g, '')}`,
  });
}

/**
 * Send "order ready" notification
 */
export async function sendOrderReady(
  to: string,
  order: Pick<OrderNotification, 'orderNumber' | 'customerName'>
): Promise<void> {
  if (!client) {
    console.warn('Twilio not configured, skipping SMS');
    return;
  }

  const message = `Hi ${order.customerName}! Your Taste of Gratitude order #${order.orderNumber} is ready for pickup. See you soon! Reply STOP to opt out.`;

  await client.messages.create({
    body: message,
    from: `+1${fromNumber}`,
    to: `+1${to.replace(/\D/g, '')}`,
  });
}

/**
 * Send admin notification for new order
 */
export async function sendAdminNotification(
  order: OrderNotification & { items: Array<{ name: string; quantity: number }> }
): Promise<void> {
  if (!client) {
    console.warn('Twilio not configured, skipping SMS');
    return;
  }

  const adminPhone = process.env.ADMIN_PHONE || '4706633225';
  const items = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  const message = `New order #${order.orderNumber} from ${order.customerName}: ${items} ($${order.total}). Total: $${order.total}`;

  await client.messages.create({
    body: message,
    from: `+1${fromNumber}`,
    to: `+1${adminPhone}`,
  });
}

/**
 * Send daily report summary to admin
 */
export async function sendDailyReport(
  to: string,
  report: {
    date: string;
    summary: {
      totalRevenue: number;
      onlineRevenue: number;
      cashRevenue: number;
      totalOrders: number;
      avgOrderValue: number;
    };
    topItems: Array<{ name: string; count: number; revenue: number }>;
  }
): Promise<void> {
  if (!client) {
    console.warn('Twilio not configured, skipping SMS');
    return;
  }

  const { summary, topItems } = report;
  const topItem = topItems[0];
  
  const message = `📊 Daily Report: $${summary.totalRevenue.toFixed(0)} revenue (${summary.totalOrders} orders). Top: ${topItem?.name || 'N/A'} (${topItem?.count || 0} sold). Online: $${summary.onlineRevenue.toFixed(0)}, Cash: $${summary.cashRevenue.toFixed(0)}.`;

  await client.messages.create({
    body: message,
    from: `+1${fromNumber}`,
    to: `+1${to.replace(/\D/g, '')}`,
  });
}
