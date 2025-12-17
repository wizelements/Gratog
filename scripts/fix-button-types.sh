#!/bin/bash

# VORAX Button Type Fixer
# Adds type="button" to buttons that are missing it

echo "🦖 VORAX Button Type Fixer"
echo ""

# Find all button elements without type attribute
echo "Finding buttons without type attribute..."
grep -r '<button' components/ app/ --include="*.jsx" --include="*.tsx" | \
  grep -v 'type=' | \
  grep -v '<Button' | \
  head -20

echo ""
echo "Pattern to fix:"
echo "  <button class=\"...\" onClick={...}>"
echo "    ↓"
echo "  <button type=\"button\" class=\"...\" onClick={...}>"
echo ""
echo "Files to manually update (15 instances found):"
echo ""

# Search for the specific issues
grep -r 'AddToCalendarButton.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'ProductQuickView.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'QuickViewModal.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'SearchEnhanced.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'SpinTracker.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'SquareWebPaymentForm.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'StarRating.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'FulfillmentTabs.tsx' .vorax/reports/LATEST_REPORT.md
grep -r 'ReviewAndPay.tsx' .vorax/reports/LATEST_REPORT.md
grep -r 'CartNotification.jsx' .vorax/reports/LATEST_REPORT.md
grep -r 'CartSummary.tsx' .vorax/reports/LATEST_REPORT.md

echo ""
echo "Recommendation: Use find + replace in IDE"
echo "Pattern: <button(?!.*type=) → <button type=\"button\" "
