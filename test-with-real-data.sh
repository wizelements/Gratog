#!/bin/bash
# Test Gratog Queue System with Real Data
# Using: silverwatkins@gmail.com / 404-789-9960

echo "=========================================="
echo "  Gratog Queue System - Live Test"
echo "=========================================="
echo ""

# Test configuration
MARKET_ID="ponce-city-market"
MARKET_NAME="Ponce City Market"
TEST_ORDER_ID="test_order_$(date +%s)"
TEST_ORDER_REF="A-$(shuf -i 100-999 -n 1)"

echo "Test Order ID: $TEST_ORDER_ID"
echo "Test Order Ref: $TEST_ORDER_REF"
echo "Market: $MARKET_NAME"
echo ""

# Step 1: Add order to queue
echo "Step 1: Adding order to queue..."
echo "-----------------------------------"

curl -s -X POST http://localhost:3000/api/queue/join \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$TEST_ORDER_ID\",
    \"orderRef\": \"$TEST_ORDER_REF\",
    \"marketId\": \"$MARKET_ID\",
    \"marketName\": \"$MARKET_NAME\",
    \"customerInfo\": {
      \"name\": \"Silver Watkins\",
      \"phone\": \"4047899960\",
      \"email\": \"silverwatkins@gmail.com\"
    },
    \"items\": [
      { \"name\": \"Thai Milk Tea\", \"quantity\": 1, \"customizations\": {\"sweetness\": \"50%\", \"ice\": \"light\"} },
      { \"name\": \"Brown Sugar Boba\", \"quantity\": 1, \"customizations\": {\"tapioca\": \"extra\"} }
    ]
  }" | tee /tmp/queue_join_response.json | jq -r '
    "Position: \(.position)",
    "Status: \(.status)",
    "Order Ref: \(.orderRef)",
    "Est. Wait: \(.estimatedWaitMinutes) min"
  '

echo ""

# Extract position from response
POSITION=$(cat /tmp/queue_join_response.json | jq -r '.position')
echo "✓ Order added to queue at position $POSITION"
echo ""

# Step 2: Check position
echo "Step 2: Checking queue position..."
echo "-----------------------------------"

curl -s "http://localhost:3000/api/queue/position/$TEST_ORDER_ID" | jq -r '
  "Position in line: \(.ahead) ahead of you",
  "Total in queue: \(.totalInQueue)",
  "Status: \(.status)",
  "Est. wait: \(.estimatedMinutes) min",
  "Making now: \(.makingNow | map(.orderRef) | join(\", \"))"
'

echo ""

# Step 3: Check staff dashboard data
echo "Step 3: Staff dashboard view..."
echo "-----------------------------------"

curl -s "http://localhost:3000/api/queue/active?marketId=$MARKET_ID" | jq -r '
  "Total orders: \(.stats.total)",
  "Queued: \(.stats.queued)",
  "Making: \(.stats.making)",
  "Ready: \(.stats.ready)",
  "",
  "Active orders:",
  (.queue.queued[] | "  [QUEUED] #\(.orderRef) - \(.customerInfo.name) - \(.items | map(.name) | join(\", \"))")
'

echo ""

# Step 4: Simulate staff workflow
echo "Step 4: Simulating staff workflow..."
echo "-----------------------------------"

echo "Staff marks order as MAKING..."
curl -s -X POST http://localhost:3000/api/queue/update \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$TEST_ORDER_ID\", \"status\": \"making\"}" | jq -r '"Status: \(.status)"'

echo ""

echo "Customer view after MAKING:"
curl -s "http://localhost:3000/api/queue/position/$TEST_ORDER_ID" | jq -r '"  Status: \(.status)", "  Message: Your boba is being prepared!"'

echo ""

echo "Staff marks order as READY..."
curl -s -X POST http://localhost:3000/api/queue/update \
  -H "Content-Type: application/json" \
  -d "{\"orderId\": \"$TEST_ORDER_ID\", \"status\": \"ready\"}" | jq -r '"Status: \(.status)"'

echo ""

echo "✓ Order READY - Customer phone would vibrate now!"
echo ""

# Step 5: Final state
echo "Step 5: Final queue state..."
echo "-----------------------------------"

curl -s "http://localhost:3000/api/queue/active?marketId=$MARKET_ID" | jq -r '
  "Queue stats:",
  "  Total: \(.stats.total)",
  "  Queued: \(.stats.queued)",
  "  Making: \(.stats.making)",
  "  Ready: \(.stats.ready)",
  "",
  "Ready for pickup:",
  (.queue.ready[] | "  #\(.orderRef) - \(.customerInfo.name)")
'

echo ""
echo "=========================================="
echo "  Test Complete!"
echo "=========================================="
echo ""
echo "Browser URLs to verify:"
echo "  Customer: http://localhost:3000/order/$TEST_ORDER_ID/queue"
echo "  Staff:    http://localhost:3000/admin/queue?marketId=$MARKET_ID"
echo ""
echo "Test order details:"
echo "  Order ID: $TEST_ORDER_ID"
echo "  Order Ref: $TEST_ORDER_REF"
echo "  Customer: Silver Watkins"
echo "  Email: silverwatkins@gmail.com"
echo "  Phone: 404-789-9960"
