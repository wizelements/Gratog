const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { logger } from '@/lib/logger';

/**
 * Delivery Radius Calculator
 * Checks if delivery address is within 5-mile radius of Serenbe or Scotch Bonnet
 */

// Reference locations
const LOCATIONS = {
  serenbe: {
    name: 'Serenbe Farmers Market',
    lat: parseFloat(process.env.SERENBE_LAT || '33.4261'),
    lng: parseFloat(process.env.SERENBE_LNG || '-84.7281'),
    address: '10950 Hutcheson Ferry Rd, Palmetto, GA 30268'
  },
  scotchBonnet: {
    name: 'Scotch Bonnet (Campbellton)',
    lat: parseFloat(process.env.SCOTCH_BONNET_LAT || '33.6892'),
    lng: parseFloat(process.env.SCOTCH_BONNET_LNG || '-84.5226'),
    address: 'Campbellton Rd, Atlanta, GA'
  }
};

const DELIVERY_RADIUS_MILES = parseFloat(process.env.DELIVERY_RADIUS_MILES || '5');

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lng2 - Longitude of point 2
 * @returns {number} Distance in miles
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Geocode an address to coordinates using free geocoding service
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lng: number}>}
 */
async function geocodeAddress(address) {
  try {
    // Using Nominatim (OpenStreetMap) free geocoding API
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'TasteOfGratitude-DeliveryService/1.0'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('Address not found');
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (error) {
    logger.error('Delivery', 'Geocoding error', error);
    throw new Error('Unable to verify delivery address. Please check the address and try again.');
  }
}

/**
 * Check if address is within delivery radius of either location
 * @param {string} address - Full delivery address
 * @returns {Promise<{eligible: boolean, nearestLocation: string, distance: number, message: string}>}
 */
export async function checkDeliveryRadius(address) {
  try {
    // Geocode the customer's address
    const customerCoords = await geocodeAddress(address);
    
    // Calculate distance to both locations
    const distanceToSerenbe = calculateDistance(
      customerCoords.lat,
      customerCoords.lng,
      LOCATIONS.serenbe.lat,
      LOCATIONS.serenbe.lng
    );
    
    const distanceToScotchBonnet = calculateDistance(
      customerCoords.lat,
      customerCoords.lng,
      LOCATIONS.scotchBonnet.lat,
      LOCATIONS.scotchBonnet.lng
    );
    
    // Find nearest location
    const nearestLocation = distanceToSerenbe <= distanceToScotchBonnet 
      ? { name: 'serenbe', distance: distanceToSerenbe, ...LOCATIONS.serenbe }
      : { name: 'scotchBonnet', distance: distanceToScotchBonnet, ...LOCATIONS.scotchBonnet };
    
    const isEligible = nearestLocation.distance <= DELIVERY_RADIUS_MILES;
    
    return {
      eligible: isEligible,
      nearestLocation: nearestLocation.name,
      nearestLocationName: nearestLocation.name === 'serenbe' ? 'Serenbe' : 'Scotch Bonnet',
      distance: Math.round(nearestLocation.distance * 10) / 10, // Round to 1 decimal
      message: isEligible
        ? `✅ Delivery available! You're ${nearestLocation.distance.toFixed(1)} miles from ${nearestLocation.name === 'serenbe' ? 'Serenbe' : 'Scotch Bonnet'}.`
        : `❌ Address is ${nearestLocation.distance.toFixed(1)} miles away. Delivery available within ${DELIVERY_RADIUS_MILES} miles of Serenbe or Scotch Bonnet (Campbellton).`
    };
  } catch (error) {
    logger.error('Delivery', 'Delivery radius check error', error);
    throw error;
  }
}

/**
 * Get all available locations for meet-up options
 */
export function getMeetUpLocations() {
  return [
    {
      id: 'meetup_serenbe',
      name: 'Meet Up After Market - Serenbe',
      location: LOCATIONS.serenbe.name,
      address: LOCATIONS.serenbe.address,
      description: 'Meet us after the Serenbe Farmers Market',
      availableTime: 'Saturdays after 1:00 PM',
      emoji: '🤝',
      type: 'meetup'
    },
    {
      id: 'meetup_scotch_bonnet',
      name: 'Meet Up After Market - Scotch Bonnet',
      location: LOCATIONS.scotchBonnet.name,
      address: LOCATIONS.scotchBonnet.address,
      description: 'Meet us near Scotch Bonnet on Campbellton Rd',
      availableTime: 'Flexible scheduling',
      emoji: '🤝',
      type: 'meetup'
    }
  ];
}

export { LOCATIONS, DELIVERY_RADIUS_MILES };
