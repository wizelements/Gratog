// Atlanta delivery zones with fair pricing based on gas costs
// Base: $3.50/gal, 20 MPG, $15/hr labor

export const DELIVERY_ZONES = [
  {
    id: 1,
    name: 'Serenbe & Immediate Area',
    fee: 500, // $5.00 in cents
    freeThreshold: 7500, // Free on $75+
    distance: '0-5 miles',
    estimatedTime: '20-30 min',
    zipcodes: ['30268', '30213'],
    areas: ['Palmetto', 'Chattahoochee Hills', 'Serenbe']
  },
  {
    id: 2,
    name: 'South Atlanta',
    fee: 800, // $8.00 in cents
    freeThreshold: 7500, // Free on $75+
    distance: '5-10 miles',
    estimatedTime: '30-45 min',
    zipcodes: ['30344', '30349', '30354', '30337', '30311'],
    areas: ['East Point', 'College Park', 'Union City', 'Hapeville']
  },
  {
    id: 3,
    name: 'Central Atlanta',
    fee: 1200, // $12.00 in cents
    freeThreshold: 10000, // Free on $100+
    distance: '10-20 miles',
    estimatedTime: '45-60 min',
    zipcodes: ['30305', '30306', '30307', '30308', '30309', '30310', '30312', '30313', '30314', '30315', '30316', '30317', '30318', '30324', '30326', '30327', '30328', '30363'],
    areas: ['Buckhead', 'Midtown', 'Downtown', 'Virginia Highland', 'Inman Park', 'Little Five Points', 'West End']
  },
  {
    id: 4,
    name: 'Outer Atlanta',
    fee: 1800, // $18.00 in cents
    freeThreshold: 15000, // Free on $150+
    distance: '20-30 miles',
    estimatedTime: '60-90 min',
    zipcodes: ['30022', '30062', '30064', '30067', '30068', '30092', '30030', '30032', '30033', '30034', '30035', '30083', '30084', '30087', '30088'],
    areas: ['Alpharetta', 'Marietta', 'Decatur', 'Stone Mountain', 'Smyrna', 'Sandy Springs']
  },
  {
    id: 5,
    name: 'Extended Metro',
    fee: 2500, // $25.00 in cents
    freeThreshold: 15000, // Free on $150+
    distance: '30+ miles',
    estimatedTime: '90+ min',
    zipcodes: ['30075', '30076', '30004', '30005', '30044', '30045', '30046', '30047', '30043'],
    areas: ['Roswell', 'Johns Creek', 'Lawrenceville', 'Duluth', 'Cumming']
  }
];

export function getDeliveryZoneByZip(zipcode) {
  if (!zipcode) return null;
  
  const zip = zipcode.toString().substring(0, 5);
  
  for (const zone of DELIVERY_ZONES) {
    if (zone.zipcodes.includes(zip)) {
      return zone;
    }
  }
  
  // Default to zone 5 if not found
  return DELIVERY_ZONES[4];
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
