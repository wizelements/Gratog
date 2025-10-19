// Enhanced Atlanta delivery zones - Updated configuration
// Base zones match user requirements: Atlanta Metro ($15), Decatur/DeKalb ($12), South Atlanta ($18)

export const DELIVERY_ZONES = [
  {
    id: 1,
    name: 'South Atlanta',
    fee: 1800, // $18.00 in cents
    freeThreshold: 10000, // Free on $100+
    distance: '5-15 miles',
    estimatedTime: '30-50 min',
    zipcodes: ['30344', '30349', '30354', '30337', '30311', '30331', '30350', '30213', '30268', '30215'],
    areas: ['East Point', 'College Park', 'Union City', 'Hapeville', 'Browns Mill', 'Palmetto', 'Fairburn', 'Serenbe']
  },
  {
    id: 2,
    name: 'Decatur/DeKalb',
    fee: 1200, // $12.00 in cents
    freeThreshold: 8000, // Free on $80+
    distance: '10-20 miles',
    estimatedTime: '40-60 min',
    zipcodes: ['30030', '30032', '30033', '30034', '30035', '30083', '30084', '30087', '30088', '30021'],
    areas: ['Decatur', 'Stone Mountain', 'Avondale Estates', 'Tucker', 'Chamblee', 'DeKalb County']
  },
  {
    id: 3,
    name: 'Atlanta Metro',
    fee: 1500, // $15.00 in cents
    freeThreshold: 9000, // Free on $90+
    distance: '10-25 miles',
    estimatedTime: '45-65 min',
    zipcodes: ['30305', '30306', '30307', '30308', '30309', '30310', '30312', '30313', '30314', '30315', '30316', '30317', '30318', '30324', '30326', '30327', '30328', '30363', '30303', '30022', '30062', '30064', '30067', '30068', '30092', '30342', '30345', '30319', '30329'],
    areas: ['Buckhead', 'Midtown', 'Downtown', 'Virginia Highland', 'Inman Park', 'Little Five Points', 'West End', 'Grant Park', 'Alpharetta', 'Marietta', 'Smyrna', 'Sandy Springs', 'Vinings', 'Brookhaven']
  }
];

// Pickup locations - Only Serenbe per user request
export const PICKUP_LOCATIONS = [
  {
    id: 'serenbe_market',
    name: 'Serenbe Farmers Market',
    address: '10950 Hutcheson Ferry Rd, Palmetto, GA 30268',
    schedule: 'Saturdays 9:00 AM - 1:00 PM',
    booth: 'Booth #12',
    type: 'market',
    available: true,
    readyTime: 'Available during market hours',
    instructions: 'Look for the Taste of Gratitude tent with our gold banners'
  }
];

// Get upcoming events (this would typically come from a database or CMS)
export function getUpcomingEvents() {
  const events = [
    {
      id: 'east_atlanta_village',
      name: 'East Atlanta Village Market',
      date: '2024-12-15',
      address: 'East Atlanta Village, Atlanta, GA 30316',
      time: '10:00 AM - 2:00 PM',
      booth: 'Booth #8',
      available: true
    },
    // Add more events as they're scheduled
  ];
  
  // Filter to future events only
  const today = new Date();
  return events.filter(event => new Date(event.date) >= today);
}

export function getDeliveryZoneByZip(zipcode) {
  if (!zipcode) return null;
  
  const zip = zipcode.toString().substring(0, 5);
  
  for (const zone of DELIVERY_ZONES) {
    if (zone.zipcodes.includes(zip)) {
      return zone;
    }
  }
  
  // Default to Atlanta Metro if not found
  return DELIVERY_ZONES[2];
}

export function calculateDeliveryFee(zipcode, subtotal) {
  const zone = getDeliveryZoneByZip(zipcode);
  if (!zone) return 0;
  
  // Check if eligible for free delivery
  if (subtotal >= zone.freeThreshold) {
    return 0;
  }
  
  return zone.fee;
}

export function getDeliveryTimeSlots() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Saturday (market day)
  if (dayOfWeek === 6) {
    return [
      { value: 'same_day_afternoon', label: 'Today 3pm - 7pm', available: true },
      { value: 'same_day_evening', label: 'Today 7pm - 9pm', available: true }
    ];
  }
  
  // Sunday - Friday
  return [
    { value: 'morning', label: 'Morning (10am - 1pm)', available: true },
    { value: 'afternoon', label: 'Afternoon (2pm - 5pm)', available: true },
    { value: 'evening', label: 'Evening (6pm - 8pm)', available: true }
  ];
}

// Enhanced fulfillment functions
export function getFulfillmentOptions() {
  return [
    {
      id: 'pickup_market',
      type: 'pickup',
      name: 'Pick up at Serenbe Market',
      location: PICKUP_LOCATIONS[0],
      description: 'Serenbe Farmers Market - Saturdays 9AM-1PM',
      icon: 'package',
      available: true,
      fee: 0
    },
    {
      id: 'delivery',
      type: 'delivery',
      name: 'Delivery',
      description: 'Atlanta metro area - fee varies by location',
      icon: 'truck',
      available: true,
      fee: null // Will be calculated based on zone
    }
  ];
}

// Dynamic delivery fee calculation with sliding scale
export function calculateDynamicDeliveryFee(zipcode, subtotal, city = '', state = '') {
  const zone = getDeliveryZoneByZip(zipcode);
  if (!zone) {
    // If zip not found, try to estimate based on city/state
    return estimateFeeByLocation(city, state, subtotal);
  }
  
  // Check if eligible for free delivery
  if (subtotal >= zone.freeThreshold) {
    return { fee: 0, zone, freeDelivery: true };
  }
  
  // Apply sliding scale discount based on order value
  let fee = zone.fee;
  const discountThreshold = zone.freeThreshold * 0.6; // 60% of free threshold
  
  if (subtotal >= discountThreshold) {
    const discountPercent = (subtotal - discountThreshold) / (zone.freeThreshold - discountThreshold);
    fee = Math.round(fee * (1 - discountPercent * 0.5)); // Up to 50% discount
  }
  
  return { fee, zone, freeDelivery: false, discountApplied: fee < zone.fee };
}

// Estimate delivery fee for locations not in predefined zones
function estimateFeeByLocation(city, state, subtotal) {
  if (state && state.toUpperCase() !== 'GA') {
    return { 
      fee: 3000, // $30 for out of state
      zone: { name: 'Out of State', distance: 'Out of GA', estimatedTime: '2-3 days' },
      freeDelivery: false,
      estimated: true
    };
  }
  
  // Georgia cities outside metro Atlanta
  const knownGaCities = ['savannah', 'augusta', 'columbus', 'macon', 'albany'];
  if (city && knownGaCities.includes(city.toLowerCase())) {
    return {
      fee: subtotal >= 15000 ? 0 : 2800, // $28 or free on $150+
      zone: { name: 'Georgia Statewide', distance: '100+ miles', estimatedTime: '2-3 days' },
      freeDelivery: subtotal >= 15000,
      estimated: true
    };
  }
  
  // Default to highest metro zone for unknown locations
  return {
    fee: subtotal >= 15000 ? 0 : 2200,
    zone: DELIVERY_ZONES[2], // Atlanta Metro
    freeDelivery: subtotal >= 15000,
    estimated: true
  };
}
