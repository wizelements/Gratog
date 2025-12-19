# Taste of Gratitude - Production Deployment Guide

## 🚀 Production Deployment to Replace tasteofgratitude.shop

This guide covers the complete production deployment process for the Taste of Gratitude e-commerce platform.

---

## 📋 Pre-Deployment Checklist

### 1. Domain & DNS Configuration
- [ ] Domain ownership verified: `tasteofgratitude.shop`
- [ ] DNS records ready for update
- [ ] SSL certificate obtained (Let's Encrypt recommended)
- [ ] CDN configured (Cloudflare recommended)

### 2. Server Requirements
- [ ] Ubuntu 20.04+ LTS or similar
- [ ] Node.js 18+ installed
- [ ] MongoDB 6.0+ installed and configured
- [ ] Nginx/Apache reverse proxy configured
- [ ] Firewall configured (ports 80, 443, 3000)
- [ ] SSL certificates installed

### 3. Third-Party Service Credentials
- [ ] **Square Production Credentials**:
  - Application ID (starts with `sq0idp-`)
  - Location ID
  - Access Token (starts with `sq0atp-` for production)
  - Webhook Signature Key
- [ ] **Twilio Production**:
  - Account SID
  - Auth Token
  - Phone Number
- [ ] **Resend Production**:
  - API Key
- [ ] **Google Analytics** (Optional):
  - GA4 Measurement ID

---

## 🛠 Production Setup Process

### Step 1: Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install Nginx
sudo apt install nginx -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Yarn
npm install -g yarn
```

### Step 2: Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/tasteofgratitude
sudo chown $USER:$USER /var/www/tasteofgratitude

# Clone or upload application files
cd /var/www/tasteofgratitude
# Upload your built application files here

# Install dependencies
yarn install --production

# Set up environment variables
cp .env.production .env

# Edit production environment variables
nano .env
```

### Step 3: Environment Configuration

Edit `/var/www/tasteofgratitude/.env`:

```bash
# Production Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=taste_of_gratitude_prod

# Square Production Credentials
NEXT_PUBLIC_SQUARE_APP_ID=sq0idp-YOUR_PRODUCTION_APP_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=YOUR_PRODUCTION_LOCATION_ID
SQUARE_ACCESS_TOKEN=sq0atp-YOUR_PRODUCTION_ACCESS_TOKEN
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_PRODUCTION_WEBHOOK_KEY

# Communication Services
TWILIO_ACCOUNT_SID=YOUR_TWILIO_SID
TWILIO_AUTH_TOKEN=YOUR_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=YOUR_TWILIO_NUMBER
RESEND_API_KEY=YOUR_RESEND_KEY

# Site Configuration
NEXT_PUBLIC_SITE_NAME=Taste of Gratitude
NEXT_PUBLIC_SITE_URL=https://tasteofgratitude.shop
NODE_ENV=production

# Security
ADMIN_JWT_SECRET=YOUR_SUPER_SECURE_JWT_SECRET_32_CHARS_MINIMUM
```

### Step 4: Database Setup

```bash
# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Initialize production database
cd /var/www/tasteofgratitude
node scripts/setup-database.js
```

### Step 5: Build and Start Application

```bash
# Build for production
yarn build

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'taste-of-gratitude',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/var/www/tasteofgratitude',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};
```

### Step 6: Nginx Configuration

Create `/etc/nginx/sites-available/tasteofgratitude.shop`:

```nginx
server {
    listen 80;
    server_name tasteofgratitude.shop www.tasteofgratitude.shop;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tasteofgratitude.shop www.tasteofgratitude.shop;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/tasteofgratitude.shop/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasteofgratitude.shop/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private no_last_modified no_etag auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml+rss;

    # Static Assets
    location /_next/static {
        alias /var/www/tasteofgratitude/.next/static;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /images {
        alias /var/www/tasteofgratitude/public/images;
        add_header Cache-Control "public, max-age=31536000";
    }

    # Main Application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/tasteofgratitude.shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d tasteofgratitude.shop -d www.tasteofgratitude.shop

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔄 DNS Migration Process

### 1. Current Site Backup
- [ ] Backup existing tasteofgratitude.shop data
- [ ] Note current DNS settings
- [ ] Inform customers of maintenance window

### 2. DNS Update Process
```bash
# Example DNS records (update with your server IP)
A    tasteofgratitude.shop    YOUR_SERVER_IP
A    www.tasteofgratitude.shop    YOUR_SERVER_IP
CNAME api.tasteofgratitude.shop    tasteofgratitude.shop
```

### 3. Go-Live Checklist
- [ ] Update DNS records
- [ ] Test all functionality on new server
- [ ] Monitor for 24 hours
- [ ] Update any hardcoded URLs
- [ ] Notify customers of successful migration

---

## 📊 Post-Deployment Monitoring

### 1. Application Health Monitoring

```bash
# Check application status
pm2 status
pm2 logs taste-of-gratitude

# Check health endpoint
curl https://tasteofgratitude.shop/api/health

# Monitor system resources
htop
df -h
free -h
```

### 2. Database Monitoring

```bash
# MongoDB status
sudo systemctl status mongod

# Check database connections
mongo --eval "db.adminCommand('connPoolStats')"

# Database size monitoring
mongo taste_of_gratitude_prod --eval "db.stats()"
```

### 3. Performance Monitoring

```bash
# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Application logs
pm2 logs taste-of-gratitude

# System performance
vmstat 1
iotop
```

---

## 🚨 Backup & Recovery

### 1. Automated Database Backups

Create `/home/backup/mongodb-backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="taste_of_gratitude_prod"

mkdir -p $BACKUP_DIR
mongodump --db $DB_NAME --out $BACKUP_DIR/backup_$DATE

# Keep only last 7 days
find $BACKUP_DIR -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE
```

Set up cron job:
```bash
sudo crontab -e
# Add: 0 2 * * * /home/backup/mongodb-backup.sh
```

### 2. Application Backups

```bash
#!/bin/bash
# Backup application files
BACKUP_DIR="/home/backup/application"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/tasteofgratitude

# Keep only last 30 days
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +30 -delete
```

---

## 🔧 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   pm2 logs taste-of-gratitude
   # Check for missing environment variables or database connection issues
   ```

2. **Database connection failed**
   ```bash
   sudo systemctl status mongod
   sudo systemctl restart mongod
   ```

3. **Nginx configuration errors**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **SSL certificate issues**
   ```bash
   sudo certbot certificates
   sudo certbot renew --dry-run
   ```

### Performance Issues

1. **High memory usage**
   ```bash
   pm2 restart taste-of-gratitude
   # Consider increasing server resources
   ```

2. **Slow database queries**
   ```bash
   mongo taste_of_gratitude_prod
   db.setProfilingLevel(2)
   db.system.profile.find().pretty()
   ```

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- [ ] **Daily**: Monitor application logs and performance
- [ ] **Weekly**: Review security logs and update dependencies
- [ ] **Monthly**: Update SSL certificates, backup verification
- [ ] **Quarterly**: Security audit, performance optimization

### Emergency Contacts

- **Technical Support**: your-tech-team@company.com
- **Hosting Provider**: support@your-host.com
- **Domain Registrar**: support@your-registrar.com

### Rollback Procedure

If issues arise during deployment:

```bash
# Stop new application
pm2 stop taste-of-gratitude

# Restore previous version
# (Implement based on your backup strategy)

# Update DNS back to old server (if necessary)
# Notify customers of temporary issues
```

---

## ✅ Production Launch Checklist

- [ ] All environment variables configured
- [ ] Database initialized with production data
- [ ] SSL certificates installed and working
- [ ] All third-party integrations tested (Square, Twilio, Resend)
- [ ] Performance testing completed
- [ ] Security scan completed
- [ ] Backup systems operational
- [ ] Monitoring systems active
- [ ] DNS updated and propagated
- [ ] Customer notification sent
- [ ] Team trained on production procedures

---

**🎉 Congratulations! Your Taste of Gratitude e-commerce platform is now live in production!**

For ongoing support and updates, refer to this documentation and maintain regular backups and monitoring.