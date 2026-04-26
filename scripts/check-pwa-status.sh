#!/bin/bash
# PWA Status Check Script

echo "=========================================="
echo "PWA STATUS CHECK"
echo "=========================================="
echo ""

BASE_URL="https://tasteofgratitude.shop"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_url() {
    local url="$1"
    local name="$2"
    local expected="$3"
    
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✅${NC} $name (HTTP $status)"
        return 0
    else
        echo -e "${RED}❌${NC} $name (HTTP $status, expected $expected)"
        return 1
    fi
}

echo "Checking PWA Files..."
echo ""

check_url "$BASE_URL/manifest.json" "Manifest" "200"
check_url "$BASE_URL/sw.js" "Service Worker" "200"
check_url "$BASE_URL/offline.html" "Offline Page" "200"
check_url "$BASE_URL/icon-192x192.png" "Icon 192x192" "200"
check_url "$BASE_URL/icon-512x512.png" "Icon 512x512" "200"
check_url "$BASE_URL/apple-touch-icon.png" "Apple Touch Icon" "200"
check_url "$BASE_URL/favicon.ico" "Favicon" "200"

echo ""
echo "Checking Response Headers..."
echo ""

# Check manifest content type
manifest_ct=$(curl -s -I "$BASE_URL/manifest.json" 2>/dev/null | grep -i "content-type:" | head -1)
if echo "$manifest_ct" | grep -q "application/manifest+json"; then
    echo -e "${GREEN}✅${NC} Manifest Content-Type correct"
else
    echo -e "${YELLOW}⚠️${NC}  Manifest Content-Type: $manifest_ct"
fi

# Check service worker headers
sw_headers=$(curl -s -I "$BASE_URL/sw.js" 2>/dev/null | grep -i "service-worker-allowed")
if echo "$sw_headers" | grep -q "/"; then
    echo -e "${GREEN}✅${NC} Service-Worker-Allowed header correct"
else
    echo -e "${YELLOW}⚠️${NC}  Service-Worker-Allowed header missing"
fi

echo ""
echo "Checking Cache Headers..."
echo ""

# Check sw.js cache control
sw_cache=$(curl -s -I "$BASE_URL/sw.js" 2>/dev/null | grep -i "cache-control:" | head -1)
if echo "$sw_cache" | grep -q "must-revalidate"; then
    echo -e "${GREEN}✅${NC} SW cache-control correct (no-cache)"
else
    echo -e "${YELLOW}⚠️${NC}  SW cache-control: $sw_cache"
fi

echo ""
echo "=========================================="
echo "PWA REQUIREMENTS CHECK"
echo "=========================================="
echo ""

# Check HTTPS
if echo "$BASE_URL" | grep -q "https"; then
    echo -e "${GREEN}✅${NC} HTTPS enabled"
else
    echo -e "${RED}❌${NC} HTTPS not detected"
fi

# Check manifest validity
echo ""
echo "Manifest Validity:"
manifest=$(curl -s "$BASE_URL/manifest.json" 2>/dev/null)
if echo "$manifest" | grep -q '"name"'; then echo -e "  ${GREEN}✓${NC} Has name"; else echo -e "  ${RED}✗${NC} Missing name"; fi
if echo "$manifest" | grep -q '"short_name"'; then echo -e "  ${GREEN}✓${NC} Has short_name"; else echo -e "  ${RED}✗${NC} Missing short_name"; fi
if echo "$manifest" | grep -q '"start_url"'; then echo -e "  ${GREEN}✓${NC} Has start_url"; else echo -e "  ${RED}✗${NC} Missing start_url"; fi
if echo "$manifest" | grep -q '"display"'; then echo -e "  ${GREEN}✓${NC} Has display"; else echo -e "  ${RED}✗${NC} Missing display"; fi
if echo "$manifest" | grep -q '"icons"'; then echo -e "  ${GREEN}✓${NC} Has icons"; else echo -e "  ${RED}✗${NC} Missing icons"; fi
if echo "$manifest" | grep -q '"theme_color"'; then echo -e "  ${GREEN}✓${NC} Has theme_color"; else echo -e "  ${RED}✗${NC} Missing theme_color"; fi
if echo "$manifest" | grep -q '"background_color"'; then echo -e "  ${GREEN}✓${NC} Has background_color"; else echo -e "  ${RED}✗${NC} Missing background_color"; fi

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "PWA is $(if [ $? -eq 0 ]; then echo -e "${GREEN}properly configured${NC}"; else echo -e "${YELLOW}needs attention${NC}"; fi)"
echo ""
echo "To test PWA installation:"
echo "1. Open Chrome DevTools → Application → Manifest"
echo "2. Verify 'Add to Home Screen' prompt works"
echo "3. Check Service Worker is registered"
echo "4. Test offline functionality"
echo ""
echo "Lighthouse PWA Audit:"
echo "https://pagespeed.web.dev/?url=https://tasteofgratitude.shop"
echo ""
