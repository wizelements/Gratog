export const PUBLIC_REVIEW_FILTER = {
  approved: true,
  hidden: { $ne: true },
};

export function isPublicReview(review) {
  return review?.approved === true && review?.hidden !== true;
}
