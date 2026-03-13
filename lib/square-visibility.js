const HIDDEN_ECOM_VISIBILITY_VALUES = new Set(['HIDDEN', 'UNINDEXED']);

function pickFirstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function toOptionalBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return undefined;
}

function toNormalizedVisibility(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && typeof entry.id === 'string') {
        return entry.id.trim();
      }

      return '';
    })
    .filter(Boolean);
}

function resolveStorefrontLocationId(options = {}) {
  const candidate = options.locationId ?? process.env.SQUARE_LOCATION_ID;
  return typeof candidate === 'string' ? candidate.trim() : '';
}

export function normalizeSquareChannels(value) {
  return normalizeStringArray(value);
}

export function extractSquareVisibilityFlags(product = {}, options = {}) {
  const squareData = product?.squareData && typeof product.squareData === 'object'
    ? product.squareData
    : {};

  const isArchivedRaw = pickFirstDefined(
    product?.squareIsArchived,
    product?.isArchived,
    product?.is_archived,
    squareData?.squareIsArchived,
    squareData?.isArchived,
    squareData?.is_archived
  );
  const squareIsArchived = toOptionalBoolean(isArchivedRaw) === true;

  const ecomVisibilityRaw = pickFirstDefined(
    product?.squareEcomVisibility,
    product?.ecomVisibility,
    product?.ecom_visibility,
    squareData?.squareEcomVisibility,
    squareData?.ecomVisibility,
    squareData?.ecom_visibility
  );
  const squareEcomVisibility = toNormalizedVisibility(ecomVisibilityRaw);

  const ecomAvailableRaw = pickFirstDefined(
    product?.squareEcomAvailable,
    product?.ecomAvailable,
    product?.ecom_available,
    squareData?.squareEcomAvailable,
    squareData?.ecomAvailable,
    squareData?.ecom_available
  );
  const parsedEcomAvailable = toOptionalBoolean(ecomAvailableRaw);
  const squareEcomAvailable = typeof parsedEcomAvailable === 'boolean' ? parsedEcomAvailable : null;

  const presentAtAllLocationsRaw = pickFirstDefined(
    product?.squarePresentAtAllLocations,
    product?.presentAtAllLocations,
    product?.present_at_all_locations,
    squareData?.squarePresentAtAllLocations,
    squareData?.presentAtAllLocations,
    squareData?.present_at_all_locations
  );
  const squarePresentAtAllLocations = toOptionalBoolean(presentAtAllLocationsRaw);

  const presentAtLocationIdsRaw = pickFirstDefined(
    product?.squarePresentAtLocationIds,
    product?.presentAtLocationIds,
    product?.present_at_location_ids,
    squareData?.squarePresentAtLocationIds,
    squareData?.presentAtLocationIds,
    squareData?.present_at_location_ids
  );
  const squarePresentAtLocationIds = Array.from(new Set(normalizeStringArray(presentAtLocationIdsRaw)));

  const absentAtLocationIdsRaw = pickFirstDefined(
    product?.squareAbsentAtLocationIds,
    product?.absentAtLocationIds,
    product?.absent_at_location_ids,
    squareData?.squareAbsentAtLocationIds,
    squareData?.absentAtLocationIds,
    squareData?.absent_at_location_ids
  );
  const squareAbsentAtLocationIds = Array.from(new Set(normalizeStringArray(absentAtLocationIdsRaw)));

  const storefrontLocationId = resolveStorefrontLocationId(options);

  const channelCandidates = [
    product?.squareChannels,
    product?.channels,
    squareData?.squareChannels,
    squareData?.channels
  ];

  let hasChannelMetadata = false;
  const mergedChannelIds = [];

  for (const candidate of channelCandidates) {
    if (Array.isArray(candidate)) {
      hasChannelMetadata = true;
      mergedChannelIds.push(...normalizeSquareChannels(candidate));
    }
  }

  const squareChannels = Array.from(new Set(mergedChannelIds));
  const hasAssignedChannel = squareChannels.length > 0;

  const hiddenByEcomVisibility = squareEcomVisibility
    ? HIDDEN_ECOM_VISIBILITY_VALUES.has(squareEcomVisibility)
    : false;
  const hiddenByEcomAvailability = squareEcomAvailable === false;
  const hiddenByChannelAssignment = hasChannelMetadata && !hasAssignedChannel;

  const hasLocationPresenceMetadata =
    typeof squarePresentAtAllLocations === 'boolean' ||
    squarePresentAtLocationIds.length > 0 ||
    squareAbsentAtLocationIds.length > 0;

  let hiddenByLocationAssignment = false;
  if (storefrontLocationId && hasLocationPresenceMetadata) {
    if (squarePresentAtAllLocations === false) {
      hiddenByLocationAssignment = !squarePresentAtLocationIds.includes(storefrontLocationId);
    } else if (squarePresentAtAllLocations === true) {
      hiddenByLocationAssignment = squareAbsentAtLocationIds.includes(storefrontLocationId);
    } else if (squarePresentAtLocationIds.length > 0) {
      hiddenByLocationAssignment = !squarePresentAtLocationIds.includes(storefrontLocationId);
    }
  }

  return {
    squareIsArchived,
    squareEcomVisibility,
    squareEcomAvailable,
    squarePresentAtAllLocations,
    squarePresentAtLocationIds,
    squareAbsentAtLocationIds,
    storefrontLocationId,
    squareChannels,
    hasChannelMetadata,
    hasAssignedChannel,
    hasLocationPresenceMetadata,
    hiddenByEcomVisibility,
    hiddenByEcomAvailability,
    hiddenByChannelAssignment,
    hiddenByLocationAssignment,
    shouldHideFromStorefront:
      squareIsArchived ||
      hiddenByEcomVisibility ||
      hiddenByEcomAvailability ||
      hiddenByChannelAssignment ||
      hiddenByLocationAssignment,
  };
}

export function isSquareProductVisibleOnStorefront(product = {}, options = {}) {
  return !extractSquareVisibilityFlags(product, options).shouldHideFromStorefront;
}
