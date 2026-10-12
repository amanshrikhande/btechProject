# DevShare Deployment - Quick Start Guide

Choose your preferred deployment method and follow the steps.

---

## 🚀 Option 1: Railway (RECOMMENDED - 10 minutes)

### Prerequisites
- GitHub account
- Railway account (https://railway.app)

### Steps

1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

2. **Connect to Railway**
- Go to https://railway.app/dashboard
- Click "New Project"
- Select "Deploy from GitHub repo"
- Choose your DevShare repository
- Railway auto-detects all services

3. **Configure Environment**
In Railway dashboard → Variables:
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devshare
JWT_SECRET=your_random_secret_key_here
AI_SERVICE_URL=https://your-rag-service.railway.app
CLIENT_URL=https://your-frontend.railway.app
```

4. **Deploy**
- Click "Deploy"
- Wait 5-10 minutes
- Your app is live at railway.app URLs!

### Cost
**Free tier** ($5/mo credits) or **$7-20/mo** for production

### Time
⏱️ **10 minutes**

---

## 🎨 Option 2: Vercel + Railway (Scalable - 15 minutes)

### Frontend on Vercel

1. **Deploy Frontend**
```bash
npm install -g vercel
cd frontend
vercel --prod
```

2. **Set Environment Variables in Vercel**
```
VITE_API_URL=https://your-backend.railway.app
VITE_RAG_URL=https://your-rag.railway.app
```

3. **Your frontend is now live!**

### Backend + RAG on Railway
(Follow Option 1 steps for backend and RAG)

### Cost
**Free tier** (Vercel) + **$7-20/mo** (Railway)

### Time
⏱️ **15 minutes**

---

## 🐳 Option 3: Docker + VPS (Full Control - 20 minutes)

### Prerequisites
- VPS with Docker installed (DigitalOcean, Linode, etc.)
- SSH access to your server

### Steps

1. **Prepare `.env.production`**
```bash
cp .env.production.example .env.production
# Edit with your values
```

2. **Push to Server**
```bash
git push origin main
ssh user@your-server
git clone your-repo
cd your-repo
```

3. **Build & Deploy**
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

4. **Verify**
```bash
docker ps
curl http://localhost:5000/api/health
```

5. **Setup Domain (Optional)**
```bash
# Install Nginx
sudo apt install nginx certbot python3-certbot-nginx

# Configure reverse proxy
sudo nano /etc/nginx/sites-available/devshare
# Point to localhost:5000, :8000, :3000

# SSL Certificate
sudo certbot --nginx -d yourdomain.com
```

### Cost
**$5-20/mo** for VPS + **$12/mo** for MongoDB Atlas

### Time
⏱️ **20 minutes**

---

## ☁️ Option 4: AWS (Enterprise - 30 minutes)

### Architecture
```
CloudFront CDN
    ↓
S3 + Static Frontend
    ↓
API Gateway
    ↓
Lambda/ECS Backend
    ↓
RDS/DocumentDB
```

### Quick Setup

1. **Frontend to S3**
```bash
npm run build
cd frontend/dist
aws s3 sync . s3://your-bucket/
```

2. **Backend to ECS**
```bash
# Create ECS cluster
# Push Docker image to ECR
# Deploy service
```

3. **Database**
```bash
# Use MongoDB Atlas or AWS DocumentDB
```

### Cost
**$50+/mo**

### Time
⏱️ **30+ minutes**

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

### Code Quality
- [ ] All tests pass
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] No commented-out code
- [ ] Linting passes

### Security
- [ ] Environment variables configured
- [ ] JWT secret is random & strong
- [ ] MongoDB user has limited permissions
- [ ] CORS headers configured
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting configured

### Performance
- [ ] Frontend build optimized
- [ ] Backend uses compression
- [ ] Database indexes created
- [ ] Redis cache configured (optional)
- [ ] CDN enabled

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Logging configured
- [ ] Health checks implemented
- [ ] Alerts configured
- [ ] Backup strategy in place

### Documentation
- [ ] README updated
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Deployment process documented
- [ ] Rollback plan documented

---

## 🔧 Configuration Templates

### MongoDB Atlas Connection
```
mongodb+srv://username:password@cluster.mongodb.net/devshare?retryWrites=true&w=majority
```

### JWT Secret Generation
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Variables (Production)
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=https://your-rag.app
CLIENT_URL=https://your-frontend.app
```

---

## 🚨 Common Issues & Solutions

### Issue: Build fails
**Solution**: 
```bash
npm ci  # Use clean install
npm run build
```

### Issue: Database connection fails
**Solution**:
- Verify MongoDB connection string
- Check IP whitelist (MongoDB Atlas)
- Test connection: `mongosh "your-connection-string"`

### Issue: Frontend blank page
**Solution**:
- Check API URL in environment
- Verify backend is running
- Check browser console for errors
- Clear cache: Ctrl+Shift+Delete

### Issue: Port already in use
**Solution**:
```bash
# Change port in .env or:
lsof -i :5000  # Find process
kill -9 PID    # Kill process
```

### Issue: Out of memory
**Solution**:
- Increase Node memory: `NODE_OPTIONS=--max-old-space-size=2048`
- Optimize images in frontend
- Reduce database cache

---

## 📊 Monitoring After Deployment

### Health Checks
```bash
# Backend
curl https://your-api.com/api/health

# RAG Service
curl https://your-rag.com/health

# Frontend
curl https://your-domain.com
```

### View Logs
```bash
# Railway
railway logs

# Docker
docker logs container-name

# Linux
tail -f /var/log/app.log
```

### Performance Monitoring
- Use browser DevTools (Network, Performance tabs)
- Monitor server CPU/Memory (top, htop)
- Check database query performance
- Monitor API response times

---

## 🔄 CI/CD Pipeline

GitHub Actions workflow already configured in `.github/workflows/deploy.yml`

### Triggered on:
- Push to `main` → Staging
- Push to `production` → Production

### What it does:
1. Lint code
2. Run tests
3. Build Docker images
4. Push to registry
5. Deploy to production

### To enable:
```bash
git push origin main
# Check GitHub Actions tab for status
```

---

## 💡 Cost Breakdown (Recommended Setup)

| Service | Price | Notes |
|---------|-------|-------|
| Railway Backend | $7/mo | Includes 100 CPU hours |
| Railway RAG | Included | Shared allocation |
| MongoDB Atlas | Free | 512MB limit, or $57/mo Pro |
| Vercel Frontend | Free | Up to 100GB bandwidth |
| Domain | $10/year | Namecheap, etc. |
| **Total** | **$7-70/mo** | Depends on database |

---

## 🎯 Recommended First Deployment

**Use Railway!**

Why?
- ✅ Easiest setup (10 minutes)
- ✅ All services on one platform
- ✅ Automatic deployments
- ✅ Cheap ($7-20/mo)
- ✅ Free tier available
- ✅ Great documentation

### Step-by-step:
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project"
4. Select your repo
5. Add environment variables
6. Deploy
7. Done! 🎉

---

## 📞 Deployment Support

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
- **Docker Docs**: https://docs.docker.com
- **GitHub Actions**: https://docs.github.com/en/actions

---

**Ready to deploy? Pick Railway and get started! 🚀**
