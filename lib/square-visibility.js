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

export function normalizeSquareChannels(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((channel) => {
      if (typeof channel === 'string') {
        return channel.trim();
      }

      if (channel && typeof channel === 'object' && typeof channel.id === 'string') {
        return channel.id.trim();
      }

      return '';
    })
    .filter(Boolean);
}

export function extractSquareVisibilityFlags(product = {}) {
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

  return {
    squareIsArchived,
    squareEcomVisibility,
    squareEcomAvailable,
    squareChannels,
    hasChannelMetadata,
    hasAssignedChannel,
    hiddenByEcomVisibility,
    hiddenByEcomAvailability,
    hiddenByChannelAssignment,
    shouldHideFromStorefront:
      squareIsArchived ||
      hiddenByEcomVisibility ||
      hiddenByEcomAvailability ||
      hiddenByChannelAssignment,
  };
}

export function isSquareProductVisibleOnStorefront(product = {}) {
  return !extractSquareVisibilityFlags(product).shouldHideFromStorefront;
}
