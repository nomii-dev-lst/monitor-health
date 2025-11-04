# MonitorHealth - Quick Start Guide

Get MonitorHealth running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- MongoDB installed and running
- SMTP email account (Gmail recommended)

## Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (new terminal)
cd frontend
npm install
```

## Step 2: Configure Environment

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` - minimum required:
```env
MONGODB_URI=mongodb://localhost:27017/monitorhealth
JWT_SECRET=my-super-secret-key-change-this
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
```

**Frontend (.env.local):**
```bash
cd frontend
cp .env.local.example .env.local
```

Content should be:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Step 3: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 4: Access & Login

1. Open browser: http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin123`

## Step 5: Create Your First Monitor

1. Click **"+ Add Monitor"**
2. Fill in:
   - Name: `Test Monitor`
   - URL: `https://jsonplaceholder.typicode.com/posts/1`
   - Check Interval: `5` minutes
   - Alert Emails: `your-email@example.com`
3. Click **"Save Monitor"**
4. Click **"Run Check Now"** to test immediately

## Step 6: Configure Email Alerts

1. Go to **Settings** page
2. Enter your SMTP details
3. Click **"Send Test Email"** to verify

## Done! 🎉

Your monitoring system is now running and will automatically check your endpoints every 5 minutes.

## Common Gmail Setup

For Gmail with 2FA:
1. Go to: https://myaccount.google.com/apppasswords
2. Generate "App Password" for "Mail"
3. Use this password in `SMTP_PASS`

## Quick Commands Reference

```bash
# Start MongoDB (if needed)
sudo systemctl start mongod   # Linux
brew services start mongodb-community  # macOS

# Seed sample monitors
cd backend && npm run seed

# View backend logs
cd backend && npm run dev

# Build frontend for production
cd frontend && npm run build
cd frontend && npm start
```

## Troubleshooting

**Backend won't start:**
- Ensure MongoDB is running: `mongosh`
- Check port 5000 is free: `lsof -i :5000`

**Frontend can't connect:**
- Verify backend is at http://localhost:5000
- Check browser console for errors

**Email alerts not working:**
- Verify SMTP credentials
- For Gmail, must use App Password with 2FA
- Check backend logs for errors

## Next Steps

- Add more monitors
- Configure validation rules
- Set up multiple alert recipients
- Deploy to production (see DEPLOYMENT_GUIDE.md)

## Support

See README.md for full documentation or DEPLOYMENT_GUIDE.md for production setup.
