#!/bin/bash

# Production Deployment Script for Taste of Gratitude
# This script prepares the application for production deployment

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for Taste of Gratitude"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error "Error: .env.production not found. Please create production environment file."
    exit 1
fi

# 1. Environment Setup
print_status "Setting up production environment..."
cp .env.production .env
export NODE_ENV=production

# 2. Install dependencies
print_status "Installing production dependencies..."
yarn install --frozen-lockfile --production=false

# 3. Build the application
print_status "Building Next.js application for production..."
yarn build

# 4. Database setup
print_status "Setting up production database..."
node scripts/setup-database.js

# 5. Create necessary directories
print_status "Creating production directories..."
mkdir -p logs
mkdir -p uploads
mkdir -p backups

# 6. Set file permissions
print_status "Setting file permissions..."
chmod 755 .
chmod -R 644 .next/
chmod +x scripts/*.sh

# 7. Generate sitemap
print_status "Generating sitemap..."
node scripts/generate-sitemap.js

# 8. Optimize images
print_status "Optimizing images for production..."
if command -v imagemin &> /dev/null; then
    find public/images -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" | xargs imagemin --out-dir=public/images/
else
    print_warning "imagemin not found. Consider installing for better performance."
fi

# 9. Security checks
print_status "Running security checks..."
if command -v npm-audit &> /dev/null; then
    yarn audit --level moderate
else
    print_warning "npm-audit not found. Consider running security audit."
fi

# 10. Performance checks
print_status "Checking bundle size..."
if [ -f ".next/analyze/client.html" ]; then
    print_status "Bundle analysis available at .next/analyze/client.html"
fi

# 11. Health check endpoint test
print_status "Testing health check endpoint..."
node -e "
const http = require('http');
const server = require('./.next/standalone/server.js');
setTimeout(() => {
    http.get('http://localhost:3000/api/health', (res) => {
        if (res.statusCode === 200) {
            console.log('✅ Health check passed');
        } else {
            console.log('❌ Health check failed');
        }
        process.exit(0);
    });
}, 2000);
" &

# 12. Generate robots.txt
print_status "Generating robots.txt..."
cat > public/robots.txt << EOF
User-agent: *
Allow: /

# Important pages
Allow: /catalog
Allow: /about
Allow: /contact
Allow: /order

# Sitemaps
Sitemap: https://tasteofgratitude.shop/sitemap.xml

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/

# SEO optimization
Crawl-delay: 1
EOF

# 13. Create .htaccess for Apache (if needed)
print_status "Creating .htaccess file..."
cat > public/.htaccess << 'EOF'
# Security headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
</IfModule>
EOF

# 14. Final checks
print_status "Running final production checks..."

# Check critical files exist
CRITICAL_FILES=(
    ".next/standalone/server.js"
    "public/robots.txt"
    ".env"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status "Found: $file"
    else
        print_error "Missing critical file: $file"
        exit 1
    fi
done

# Display deployment summary
echo ""
echo "=================================================="
print_status "Production Deployment Complete! 🎉"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Upload files to your production server"
echo "2. Install Node.js 18+ on the server"
echo "3. Install MongoDB and configure connection"
echo "4. Set up SSL certificate"
echo "5. Configure reverse proxy (nginx/apache)"
echo "6. Start the application: npm start"
echo "7. Set up monitoring and backups"
echo ""
echo "Important files created:"
echo "- .next/standalone/server.js (Production server)"
echo "- public/robots.txt (SEO)"
echo "- .env (Environment variables)"
echo ""
print_warning "Remember to:"
echo "- Update DNS records to point to new server"
echo "- Configure production Square credentials"
echo "- Set up SSL certificate for HTTPS"
echo "- Configure email/SMS services"
echo "- Set up monitoring and alerts"
echo ""
print_status "Deployment preparation completed successfully!"