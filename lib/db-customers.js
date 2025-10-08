import { connectToDatabase } from './db-admin';

export async function getCustomers() {
  const { db } = await connectToDatabase();
  return db.collection('customers');
}

export async function getWaitlist() {
  const { db } = await connectToDatabase();
  return db.collection('waitlist');
}

export async function getCommunications() {
  const { db } = await connectToDatabase();
  return db.collection('communications');
}

export async function createOrUpdateCustomer(customerData) {
  const customers = await getCustomers();
  
  // Check if customer exists by email or phone
  const existing = await customers.findOne({
    $or: [
      { email: customerData.email },
      { phone: customerData.phone }
    ]
  });
  
  if (existing) {
    // Update existing customer
    await customers.updateOne(
      { _id: existing._id },
      {
        $set: {
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          updatedAt: new Date()
        }
      }
    );
    return existing._id;
  }
  
  // Create new customer
  const newCustomer = {
    _id: customerData._id || require('uuid').v4(),
    name: customerData.name,
    email: customerData.email.toLowerCase(),
    phone: customerData.phone,
    address: customerData.address || {},
    preferences: {
      fulfillmentType: 'pickup',
      deliveryInstructions: '',
      favoriteProducts: []
    },
    stats: {
      totalOrders: 0,
      totalSpent: 0,
      averageOrder: 0,
      lastOrderDate: null,
      firstOrderDate: new Date(),
      lifetimeValue: 0
    },
    segment: 'new',
    marketingConsent: {
      sms: true,
      email: true
    },
    notes: '',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const result = await customers.insertOne(newCustomer);
  return newCustomer._id;
}

export async function updateCustomerStats(customerId, orderAmount) {
  const customers = await getCustomers();
  const customer = await customers.findOne({ _id: customerId });
  
  if (!customer) return;
  
  const totalOrders = (customer.stats?.totalOrders || 0) + 1;
  const totalSpent = (customer.stats?.totalSpent || 0) + orderAmount;
  const averageOrder = Math.round(totalSpent / totalOrders);
  
  // Determine segment
  let segment = 'new';
  if (totalOrders >= 10 || totalSpent >= 50000) segment = 'vip';
  else if (totalOrders >= 3) segment = 'regular';
  
  await customers.updateOne(
    { _id: customerId },
    {
      $set: {
        'stats.totalOrders': totalOrders,
        'stats.totalSpent': totalSpent,
        'stats.averageOrder': averageOrder,
        'stats.lastOrderDate': new Date(),
        'stats.lifetimeValue': totalSpent,
        segment,
        updatedAt: new Date()
      }
    }
  );
}
