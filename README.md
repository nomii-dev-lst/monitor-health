# MonitorHealth - Self-Hosted API Monitoring System

A comprehensive self-hosted monitoring application that performs scheduled health checks of protected API endpoints, logs results, triggers email alerts on failure or recovery, and provides a beautiful dashboard for configuration, status monitoring, metrics visualization, and logs.

## 🚀 Features

- **Scheduled Health Checks**: Automatically monitor API endpoints at configurable intervals (default: 30 minutes)
- **Multiple Authentication Methods**: Support for Basic Auth, Token-based, and Session-based authentication
- **Smart Validation**: Validate HTTP status codes, JSON response structure, and custom conditions
- **Email Alerts**: Automatic failure and recovery notifications via SMTP
- **Beautiful Dashboard**: Modern, responsive UI built with Next.js and TailwindCSS
- **Real-time Metrics**: View uptime percentages, response times, and check history
- **Visual Charts**: Latency trends and uptime visualization with Recharts
- **Manual Checks**: Trigger on-demand health checks for any monitor
- **Self-Hosted**: Complete control over your monitoring infrastructure

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **MongoDB** 4.x or higher (local or remote)
- **SMTP Email Account** (Gmail, SendGrid, Mailgun, or any SMTP provider)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd monitorhealth
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/monitorhealth

# JWT Secret (change to a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Default Admin User
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@example.com

# SMTP Email Configuration (optional, can be configured via dashboard)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@monitorhealth.com
```

**Important**: For Gmail, create an App Password:
1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in `SMTP_PASS`

Start MongoDB (if running locally):

```bash
# Linux/Mac
mongod

# Windows
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

Start the backend server:

```bash
npm run dev
```

The backend will be running at `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

The frontend will be running at `http://localhost:3000`

### 4. First Login

1. Open `http://localhost:3000` in your browser
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. **Important**: Change the default password immediately after first login

### 5. Configure SMTP (via Dashboard)

1. Navigate to **Settings** page
2. Configure your SMTP settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your email
   - Password: Your app password
   - From Address: `noreply@monitorhealth.com`
3. Click **Save SMTP Settings**
4. Send a test email to verify configuration

### 6. Create Your First Monitor

1. Navigate to **Monitors** page
2. Click **+ Add Monitor**
3. Fill in the form:
   - **Name**: My API
   - **URL**: `https://api.example.com/health`
   - **Check Interval**: `30` minutes
   - **Alert Emails**: `admin@example.com`
   - Configure authentication if needed
   - Set validation rules (e.g., status code 200)
4. Click **Save Monitor**

The monitor will be checked automatically based on the interval, or you can trigger a manual check.

## 🔧 Configuration

### Monitor Configuration

Each monitor supports:

- **Name**: Friendly name for the monitor
- **URL**: Target API endpoint
- **Authentication Types**:
  - **None**: No authentication
  - **Basic**: Username/password HTTP Basic Auth
  - **Token**: Fetch token from endpoint, use in Authorization header
  - **Login**: Session-based login with cookies
- **Validation Rules**:
  - Expected HTTP status code
  - Required JSON keys (comma-separated)
  - Custom validation expressions
- **Check Interval**: Minutes between checks (minimum: 1)
- **Alert Emails**: Comma-separated list of recipients
- **Enabled/Disabled**: Toggle monitoring on/off

### Validation Rules Examples

**Simple Status Check**:
```json
{
  "statusCode": 200
}
```

**Check JSON Structure**:
```json
{
  "statusCode": 200,
  "requiredKeys": ["data", "status", "timestamp"]
}
```

**Nested Keys**:
```json
{
  "statusCode": 200,
  "requiredKeys": ["data.users", "data.count"]
}
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=monitorhealth

  backend:
    build:
      context: ./backend
      dockerfile: ../Dockerfile.backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MONGODB_URI=mongodb://mongodb:27017/monitorhealth
      - JWT_SECRET=${JWT_SECRET}
      - DEFAULT_ADMIN_USERNAME=${DEFAULT_ADMIN_USERNAME}
      - DEFAULT_ADMIN_PASSWORD=${DEFAULT_ADMIN_PASSWORD}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SMTP_FROM=${SMTP_FROM}
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      dockerfile: ../Dockerfile.frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000
    depends_on:
      - backend

volumes:
  mongodb_data:
```

Create `.env` file in root:

```env
JWT_SECRET=your-secure-random-string
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=change-this-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@monitorhealth.com
```

Start services:

```bash
docker-compose up -d
```

Access the application at `http://localhost:3000`

## 🖥️ Production Deployment (Ubuntu VPS)

### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2
```

### 2. Deploy Application

```bash
# Clone repository
git clone <repository-url>
cd monitorhealth

# Backend setup
cd backend
npm install --production
cp .env.example .env
# Edit .env with your production settings
nano .env

# Frontend setup
cd ../frontend
npm install
cp .env.local.example .env.local
# Edit .env.local
nano .env.local

# Build frontend
npm run build
```

### 3. Start with PM2

```bash
# Start backend
cd backend
pm2 start server.js --name monitorhealth-backend

# Start frontend
cd ../frontend
pm2 start npm --name monitorhealth-frontend -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Configure Nginx (Optional)

```bash
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/monitorhealth
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/monitorhealth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Setup SSL with Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 API Documentation

### Authentication

All API routes except `/api/auth/login` require JWT authentication.

Include token in requests:
```
Authorization: Bearer <token>
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create monitor |
| PUT | `/api/monitors/:id` | Update monitor |
| DELETE | `/api/monitors/:id` | Delete monitor |
| POST | `/api/monitors/:id/check` | Trigger manual check |
| GET | `/api/checks/:monitorId` | Get check history |
| GET | `/api/checks/:monitorId/stats` | Get statistics |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings/:key` | Update setting |

## 🧪 Testing

### Seed Sample Data

```bash
cd backend
npm run seed
```

This creates 3 sample monitors:
- JSONPlaceholder API (working)
- GitHub API (working)
- Example 500 Error API (failing - disabled by default)

### Manual Testing

1. Create a monitor for a public API (e.g., `https://jsonplaceholder.typicode.com/posts/1`)
2. Trigger a manual check
3. View results in the History page
4. Check email alerts (if configured)

## 🔍 Monitoring & Maintenance

### View Logs

```bash
# Backend logs
pm2 logs monitorhealth-backend

# Frontend logs
pm2 logs monitorhealth-frontend

# All logs
pm2 logs
```

### Restart Services

```bash
pm2 restart all
```

### Update Application

```bash
git pull
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart all
```

### Backup MongoDB

```bash
mongodump --db monitorhealth --out /backup/mongodb/$(date +%Y%m%d)
```

## 🛡️ Security Best Practices

1. **Change Default Credentials**: Immediately after first login
2. **Secure JWT Secret**: Use a long, random string (min 32 characters)
3. **HTTPS**: Use SSL certificates in production (Let's Encrypt)
4. **MongoDB Security**: Enable authentication, use strong passwords
5. **Firewall**: Restrict access to MongoDB port (27017)
6. **Environment Variables**: Never commit `.env` files
7. **Regular Updates**: Keep dependencies updated

## 🐛 Troubleshooting

### Backend won't start

- Check MongoDB is running: `sudo systemctl status mongod`
- Verify MongoDB connection: `mongo mongodb://localhost:27017/monitorhealth`
- Check backend logs: `pm2 logs monitorhealth-backend`

### Email alerts not working

- Verify SMTP settings in Settings page
- Send test email
- For Gmail: Ensure 2FA is enabled and using App Password
- Check backend logs for email errors

### Monitors not being checked

- Check backend logs for scheduler errors
- Verify monitor is enabled
- Check `nextCheckTime` is set correctly
- Restart backend: `pm2 restart monitorhealth-backend`

### Frontend can't connect to backend

- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in backend
- Verify backend is running: `curl http://localhost:5000/health`

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📧 Support

For issues and questions, please create an issue on GitHub.

---

**Built with ❤️ using Node.js, MongoDB, Next.js, and TailwindCSS**
#   m o n i t o r - h e a l t h  
 