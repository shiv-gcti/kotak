# Production Deployment Guide

## 🚀 Deploying to Production

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] SSL certificates ready
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] Rate limiting enabled
- [ ] Firewall rules set

---

## Option 1: Using PM2 (Recommended)

### Installation

```bash
npm install -g pm2
```

### Backend Setup

```bash
cd backend

# Start with PM2
pm2 start server.js --name "kotak-trading-api" --env production

# Enable restart on reboot
pm2 startup
pm2 save
```

### Frontend Setup

```bash
cd frontend

# Build production bundle
npm run build

# Serve with PM2
pm2 serve build 3000 --name "kotak-trading-frontend"

# Or use nginx (recommended)
```

### Monitor

```bash
pm2 status
pm2 logs kotak-trading-api
pm2 monit
```

---

## Option 2: Using Docker

### Backend Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY backend/ .

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "server.js"]
```

### Frontend Dockerfile

```dockerfile
FROM node:16-alpine AS build

WORKDIR /app

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ .

RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: kotakneo_trading
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  mysql_data:
```

### Run with Docker Compose

```bash
docker-compose up -d
```

---

## Option 3: Using Vercel (Frontend Only)

### Build

```bash
cd frontend
npm run build
```

### Deploy

```bash
npm install -g vercel
vercel deploy --prod
```

---

## Option 4: Using AWS EC2

### 1. Launch Instance

```bash
# Create security group
aws ec2 create-security-group \
  --group-name kotak-trading \
  --description "Kotak Trading App"

# Add rules
aws ec2 authorize-security-group-ingress \
  --group-name kotak-trading \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name kotak-trading \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name kotak-trading \
  --protocol tcp --port 5000 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name kotak-trading \
  --protocol tcp --port 3306 --cidr 10.0.0.0/8
```

### 2. Setup EC2 Instance

```bash
#!/bin/bash

# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
sudo apt install -y mysql-server

# Install Git
sudo apt install -y git

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo> /home/ubuntu/kotak-trading
cd /home/ubuntu/kotak-trading

# Setup backend
cd backend
npm install
cp .env.example .env
# Edit .env with production values

# Setup database
node ../database/migrate.js

# Setup frontend
cd ../frontend
npm install
npm run build

# Start with PM2
pm2 start ../backend/server.js --name api
pm2 serve build 3000 --name frontend
pm2 save
```

### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Setup auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 4. Configure Nginx

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5000/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### 1. Application Logging

```javascript
// backend/server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({ 
      format: winston.format.simple() 
    }),
  ],
});

module.exports = logger;
```

### 2. Performance Monitoring

```bash
# Install New Relic
npm install newrelic

# Add to server.js
require('newrelic');
const express = require('express');
```

### 3. Database Monitoring

```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Monitor table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM INFORMATION_SCHEMA.TABLES
WHERE table_schema = "kotakneo_trading";
```

### 4. Uptime Monitoring

```bash
# Using Uptime Robot
# Monitor: https://yourdomain.com/health
# Check every 5 minutes
# Alert on down
```

---

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DB_NAME="kotakneo_trading"
DB_USER="root"
DB_PASSWORD="${DB_PASSWORD}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

### Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup.sh >> /var/log/backup.log 2>&1
```

### Restore

```bash
# Restore from backup
gunzip < /backups/backup_20240101_020000.sql.gz | mysql -u root -p kotakneo_trading
```

---

## Security Hardening

### 1. Enable HTTPS

```bash
# Already covered in Let's Encrypt section
```

### 2. Firewall Rules

```bash
# UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. Rate Limiting

```javascript
// backend/server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

### 4. Input Validation

```javascript
// Implement Joi validation on all endpoints
const schema = Joi.object({
  symbol: Joi.string().length(10).required(),
  quantity: Joi.number().min(1).max(1000).required(),
  // ...
});
```

### 5. Environment Security

```bash
# Use AWS Secrets Manager or HashiCorp Vault
# Never commit .env files

# Use IAM roles for EC2 instances
```

---

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_symbol ON trades(symbol);
CREATE INDEX idx_date ON trades(created_at);
CREATE INDEX idx_status ON trades(order_status);

-- Monitor query performance
EXPLAIN SELECT * FROM trades WHERE symbol = 'INFY';
```

### 2. Caching

```javascript
const redis = require('redis');
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Cache API responses
app.get('/api/trades/stats/summary', async (req, res) => {
  const cached = await client.get('stats');
  if (cached) return res.json(JSON.parse(cached));
  
  // Fetch and cache
  const stats = await fetchStats();
  await client.setex('stats', 300, JSON.stringify(stats)); // 5 min cache
  res.json(stats);
});
```

### 3. CDN for Frontend

```
Use CloudFlare or AWS CloudFront for static assets
- Images
- CSS
- JavaScript bundles
```

### 4. Load Balancing

```nginx
upstream backend {
  server backend1:5000;
  server backend2:5000;
  server backend3:5000;
}

server {
  location /api {
    proxy_pass http://backend;
  }
}
```

---

## Scaling

### 1. Horizontal Scaling

```bash
# Run multiple backend instances
pm2 start server.js -i max  # Use all CPU cores
pm2 start server.js -i 4    # Use 4 instances

# Use sticky sessions
proxy_set_header X-Real-IP $remote_addr;
```

### 2. Message Queue

```bash
npm install bull redis
```

```javascript
const Queue = require('bull');
const signalQueue = new Queue('trading-signals');

// Process signals asynchronously
signalQueue.process(async (job) => {
  await processSignal(job.data);
});
```

### 3. Database Replication

```sql
-- Master-Slave replication
CHANGE MASTER TO MASTER_HOST='master_ip', 
  MASTER_USER='repl_user', 
  MASTER_PASSWORD='password',
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=123;

START SLAVE;
```

---

## Rollback Plan

### Version Control

```bash
# Tag releases
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0

# Checkout specific version
git checkout v1.0.0
```

### Quick Rollback

```bash
# With PM2
pm2 restart api

# Or
pm2 stop api
git checkout previous_version
npm install
pm2 start server.js --name api
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
curl https://yourdomain.com/health
curl https://yourdomain.com/api/trades/stats/summary
```

### 2. Monitor Logs

```bash
pm2 logs api
tail -f /var/log/nginx/error.log
```

### 3. Test Trading

- Place test order
- Verify P&L tracking
- Check real-time updates
- Confirm notifications

### 4. User Communication

- Update API documentation
- Announce new features
- Provide support contact
- Schedule maintenance windows

---

## Maintenance

### Weekly

- [ ] Review error logs
- [ ] Check database size
- [ ] Verify backups
- [ ] Monitor performance

### Monthly

- [ ] Update dependencies
- [ ] Review security patches
- [ ] Analyze user feedback
- [ ] Optimize queries

### Quarterly

- [ ] Load testing
- [ ] Disaster recovery test
- [ ] Security audit
- [ ] Performance review

---

**Production deployment complete! 🚀**
