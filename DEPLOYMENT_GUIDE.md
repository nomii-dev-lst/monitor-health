# MonitorHealth - Deployment Guide

Complete step-by-step guide for deploying MonitorHealth in various environments.

## Table of Contents

- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Ubuntu VPS Production](#ubuntu-vps-production)
- [MongoDB Atlas (Cloud)](#mongodb-atlas-cloud)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [SSL Certificate Setup](#ssl-certificate-setup)

---

## Local Development

### Prerequisites
- Node.js 18+ 
- MongoDB 4+
- Git

### Steps

1. **Install MongoDB locally**

   **Ubuntu/Debian:**
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   sudo apt update
   sudo apt install -y mongodb-org
   sudo systemctl start mongod
   ```

   **macOS:**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community@7.0
   brew services start mongodb-community@7.0
   ```

   **Windows:**
   - Download from https://www.mongodb.com/try/download/community
   - Install and start MongoDB service

2. **Clone and setup**

   ```bash
   git clone <repository-url>
   cd monitorhealth
   
   # Backend
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your settings
   npm run dev
   
   # Frontend (new terminal)
   cd frontend
   npm install
   cp .env.local.example .env.local
   npm run dev
   ```

3. **Access application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - Default login: admin / admin123

---

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Install Docker & Docker Compose**

   **Ubuntu:**
   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER
   ```

   **macOS/Windows:**
   - Install Docker Desktop: https://www.docker.com/products/docker-desktop

2. **Deploy with Docker Compose**

   ```bash
   cd monitorhealth
   
   # Copy and edit environment file
   cp .env.example .env
   nano .env  # Edit with your configuration
   
   # Build and start services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

3. **Access application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

### Individual Docker Containers

**Build images:**
```bash
docker build -f Dockerfile.backend -t monitorhealth-backend .
docker build -f Dockerfile.frontend -t monitorhealth-frontend .
```

**Run MongoDB:**
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7.0
```

**Run Backend:**
```bash
docker run -d \
  --name backend \
  -p 5000:5000 \
  --link mongodb:mongodb \
  -e MONGODB_URI=mongodb://mongodb:27017/monitorhealth \
  -e JWT_SECRET=your-secret \
  monitorhealth-backend
```

**Run Frontend:**
```bash
docker run -d \
  --name frontend \
  -p 3000:3000 \
  --link backend:backend \
  -e NEXT_PUBLIC_API_URL=http://localhost:5000 \
  monitorhealth-frontend
```

---

## Ubuntu VPS Production

Complete production setup on Ubuntu 20.04/22.04 LTS.

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git build-essential

# Create application user
sudo adduser --disabled-password --gecos "" monitorapp
sudo usermod -aG sudo monitorapp
```

### 2. Install Node.js

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x
npm --version
```

### 3. Install MongoDB

```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### 4. Secure MongoDB (Important!)

```bash
# Connect to MongoDB
mongosh

# In MongoDB shell, create admin user:
use admin
db.createUser({
  user: "admin",
  pwd: "SecurePassword123!",
  roles: [ { role: "root", db: "admin" } ]
})

# Create database and app user:
use monitorhealth
db.createUser({
  user: "monitorapp",
  pwd: "AppPassword123!",
  roles: [ { role: "readWrite", db: "monitorhealth" } ]
})

# Exit MongoDB shell
exit
```

Enable authentication:
```bash
sudo nano /etc/mongod.conf
```

Add/modify:
```yaml
security:
  authorization: enabled
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

### 5. Deploy Application

```bash
# Switch to app user
sudo su - monitorapp

# Clone repository
cd ~
git clone <repository-url>
cd monitorhealth

# Setup backend
cd backend
npm install --production
cp .env.example .env
nano .env
```

Edit `.env` with production values:
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://monitorapp:AppPassword123!@localhost:27017/monitorhealth
JWT_SECRET=generate-a-long-random-string-here-min-32-chars
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123!
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

```bash
# Setup frontend
cd ~/monitorhealth/frontend
npm install
cp .env.local.example .env.local
nano .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://your-server-ip:5000
```

Build frontend:
```bash
npm run build
```

### 6. Install and Configure PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend
cd ~/monitorhealth/backend
pm2 start server.js --name monitorhealth-backend

# Start frontend
cd ~/monitorhealth/frontend
pm2 start npm --name monitorhealth-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Run the command that PM2 outputs
```

### 7. Configure Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Check status
sudo ufw status
```

### 8. View Application Logs

```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs monitorhealth-backend
pm2 logs monitorhealth-frontend

# Monitor in real-time
pm2 monit
```

---

## MongoDB Atlas (Cloud)

Use MongoDB Atlas for managed cloud database.

### 1. Create Atlas Account

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Create a database user
4. Whitelist your VPS IP address (or 0.0.0.0/0 for testing)

### 2. Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string

### 3. Update Backend Configuration

Edit `backend/.env`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/monitorhealth?retryWrites=true&w=majority
```

---

## Nginx Reverse Proxy

Route traffic through Nginx for better performance and SSL support.

### 1. Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

### 2. Configure Nginx

Create configuration:
```bash
sudo nano /etc/nginx/sites-available/monitorhealth
```

Add configuration:
```nginx
# HTTP Server (redirects to HTTPS)
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Frontend (Next.js)
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

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/monitorhealth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL Certificate Setup

### Using Let's Encrypt (Free SSL)

1. **Install Certbot**

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**

   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

   Follow the prompts:
   - Enter your email
   - Agree to Terms of Service
   - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

3. **Auto-renewal**

   Certbot installs a cron job automatically. Test renewal:
   ```bash
   sudo certbot renew --dry-run
   ```

4. **Update Frontend Environment**

   Edit `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://yourdomain.com
   ```

   Rebuild and restart:
   ```bash
   cd ~/monitorhealth/frontend
   npm run build
   pm2 restart monitorhealth-frontend
   ```

---

## Maintenance Tasks

### Backup Database

```bash
# Backup MongoDB
mongodump --uri="mongodb://monitorapp:password@localhost:27017/monitorhealth" --out=/backup/$(date +%Y%m%d)

# Compress backup
tar -czf /backup/monitorhealth-$(date +%Y%m%d).tar.gz /backup/$(date +%Y%m%d)
```

### Restore Database

```bash
# Restore from backup
mongorestore --uri="mongodb://monitorapp:password@localhost:27017/monitorhealth" /backup/20240101/monitorhealth
```

### Update Application

```bash
cd ~/monitorhealth
git pull

# Update backend
cd backend
npm install --production
pm2 restart monitorhealth-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart monitorhealth-frontend
```

### Monitor Resources

```bash
# PM2 status
pm2 status

# System resources
pm2 monit

# Disk usage
df -h

# Memory usage
free -h

# MongoDB status
sudo systemctl status mongod
```

---

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
sudo systemctl status mongod

# Check logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh "mongodb://localhost:27017/monitorhealth"
```

### PM2 Services Not Starting

```bash
# Check PM2 logs
pm2 logs

# Delete and restart
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

### Nginx Not Working

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Using strong JWT secret (32+ characters)
- [ ] MongoDB authentication enabled
- [ ] Firewall configured (UFW)
- [ ] SSL certificate installed
- [ ] MongoDB not exposed to internet
- [ ] Regular backups configured
- [ ] System packages up to date
- [ ] PM2 logs rotation enabled
- [ ] Environment files not committed to Git

---

## Support

For issues or questions, please refer to the main README or create an issue on GitHub.
