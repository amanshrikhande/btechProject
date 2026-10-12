# DevShare Deployment Guide

Comprehensive guide to deploy DevShare with various cloud platforms and deployment strategies.

---

## Quick Comparison: Deployment Options

| Platform | Cost | Ease | Scalability | Best For | Setup Time |
|----------|------|------|-------------|----------|-----------|
| **Vercel** | Free tier + | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Frontend | 5 mins |
| **Railway** | Free tier + | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Full stack | 10 mins |
| **Render** | Free + $7/mo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Full stack | 15 mins |
| **Heroku** | $7+/mo | ⭐⭐⭐⭐ | ⭐⭐⭐ | Full stack | 10 mins |
| **AWS** | Variable | ⭐⭐ | ⭐⭐⭐⭐⭐ | Enterprise | 30+ mins |
| **Docker + VPS** | $5-20/mo | ⭐⭐⭐ | ⭐⭐⭐⭐ | Full control | 20 mins |

---

## 🚀 Option 1: Railway (RECOMMENDED - Easiest & Fastest)

Railway is ideal for full-stack deployment with minimal configuration.

### What is Railway?
- Single platform for frontend, backend, and databases
- Free tier with $5/month credits
- Automatic deployments from GitHub
- Built-in PostgreSQL, MongoDB, Redis

### Step 1: Prepare Repository
```bash
# Ensure your code is committed to GitHub
git add .
git commit -m "Production ready"
git push origin main
```

### Step 2: Connect to Railway
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your DevShare repository

### Step 3: Configure Services
Railway auto-detects your services. Create `railway.json`:

```json
{
  "build": {
    "builder": "nixpacks"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "npm start"
  }
}
```

### Step 4: Environment Variables
In Railway dashboard:
1. Go to Variables
2. Add:
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devshare
JWT_SECRET=your_secret_key
NODE_ENV=production
AI_SERVICE_URL=https://your-rag-service.railway.app
CLIENT_URL=https://your-frontend.railway.app
```

### Step 5: Deploy
```bash
git push origin main
# Railway auto-deploys on push
```

✅ **Result**: Your app is live at a Railway URL!

**Cost**: Free tier ($5/mo credits) or $7-20/mo for production

---

## 🎯 Option 2: Vercel + Railway (Recommended for Scalability)

### Frontend on Vercel
Vercel is optimized for React/Vite frontends.

#### Setup
1. Go to https://vercel.com
2. Import your GitHub repo
3. Select `frontend` directory as root
4. Deploy

#### `vercel.json` in frontend/:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "env": {
    "VITE_API_URL": "@api_url"
  }
}
```

#### Environment in Vercel:
```
VITE_API_URL=https://your-backend.railway.app
VITE_RAG_URL=https://your-rag.railway.app
```

### Backend + RAG on Railway
Deploy backend and RAG service on Railway (follow Option 1).

**Cost**: Vercel free tier + Railway $7-20/mo

---

## 🐳 Option 3: Docker + Docker Compose (Full Control)

Best for complete control and multi-environment deployment.

### Step 1: Create Production Dockerfile

#### Backend - `backend/Dockerfile`
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

#### RAG Service - `ai_service/Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Frontend - `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Step 2: Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: devshare-mongodb-prod
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: devshare
    volumes:
      - mongodb_data:/data/db
    restart: always
    networks:
      - devshare-network

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: devshare-backend-prod
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/devshare
      JWT_SECRET: ${JWT_SECRET}
      AI_SERVICE_URL: http://rag-service:8000
      CLIENT_URL: ${FRONTEND_URL}
    depends_on:
      - mongodb
    restart: always
    networks:
      - devshare-network

  rag-service:
    build:
      context: ./ai_service
      dockerfile: Dockerfile
    container_name: devshare-rag-prod
    ports:
      - "8000:8000"
    environment:
      PYTHONUNBUFFERED: 1
    volumes:
      - ./ai_service/chroma_db:/app/chroma_db
    restart: always
    networks:
      - devshare-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: devshare-frontend-prod
    ports:
      - "80:80"
    environment:
      VITE_API_URL: ${BACKEND_URL}
      VITE_RAG_URL: http://rag-service:8000
    depends_on:
      - backend
    restart: always
    networks:
      - devshare-network

volumes:
  mongodb_data:
    driver: local

networks:
  devshare-network:
    driver: bridge
```

### Step 3: Create `.env.production`
```
MONGO_USER=admin
MONGO_PASSWORD=secure_password_here
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

### Step 4: Deploy
```bash
# Build and run
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
```

**Cost**: $5-20/mo for VPS

---

## ☁️ Option 4: AWS (Enterprise)

### Architecture
```
CloudFront CDN
    ↓
S3 (Frontend Static)
    ↓
API Gateway
    ↓
Lambda/EC2 (Backend)
    ↓
RDS MongoDB/Atlas
```

### Setup Steps

1. **Frontend to S3 + CloudFront**
```bash
npm run build
aws s3 sync frontend/dist s3://your-bucket/
```

2. **Backend to Elastic Beanstalk**
```bash
eb init
eb create devshare-env
eb deploy
```

3. **Database**: Use MongoDB Atlas or AWS DocumentDB

4. **RAG Service**: Lambda or EC2

**Cost**: $50+/mo

---

## 🔄 Option 5: Netlify + Railway

### Frontend on Netlify (Free)
1. Go to https://netlify.com
2. Connect GitHub repo
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`

#### `netlify.toml`
```toml
[build]
  command = "cd frontend && npm run build"
  publish = "frontend/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
```

### Backend & RAG on Railway
(Follow Option 1)

**Cost**: Netlify free + Railway $7-20/mo

---

## 🚀 RECOMMENDED DEPLOYMENT STRATEGY

### For BTech Project (Best Price/Performance)
```
Frontend → Vercel (Free)
Backend → Railway ($7/mo)
RAG Service → Railway (included)
Database → MongoDB Atlas (Free tier)
```

**Total Cost**: ~$7-15/month  
**Setup Time**: 20 minutes

### Production-Grade (Scalable)
```
Frontend → Vercel (Free tier)
Backend → Railway or Render ($12-20/mo)
RAG Service → Railway (included)
Database → MongoDB Atlas Pro ($57/mo)
CDN → Cloudflare (Free)
```

**Total Cost**: ~$70-100/month

---

## 📋 Deployment Checklist

Before deploying:

- [ ] All environment variables configured
- [ ] Database connected and seeded
- [ ] Frontend build completes without errors
- [ ] Backend tests pass
- [ ] RAG service embeddings working
- [ ] CORS configured properly
- [ ] SSL/HTTPS enabled
- [ ] Error logging configured
- [ ] Monitoring/alerts set up
- [ ] Database backups configured

---

## 🔧 Pre-Deployment Steps

### 1. Update Environment Files

#### Production `.env`
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devshare
JWT_SECRET=long_random_secret_key_here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=https://your-rag-service.com
CLIENT_URL=https://your-frontend.com
PORT=5000
```

### 2. Build Frontend
```bash
cd frontend
npm run build
# Creates optimized build in dist/
```

### 3. Test Production Build
```bash
npm run build
npm start
# Test at http://localhost:5000
```

### 4. Set Git Tags
```bash
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

---

## 📊 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy DevShare

on:
  push:
    branches: [main, production]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run test
      - run: cd frontend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: railway deploy
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 🔐 Security Checklist

- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/SSL
- [ ] Set secure CORS headers
- [ ] Use strong JWT secrets
- [ ] Enable rate limiting
- [ ] Add request validation
- [ ] Use helmet.js for HTTP headers
- [ ] Enable MongoDB authentication
- [ ] Set up firewall rules
- [ ] Regular security audits

---

## 📈 Monitoring & Logging

### Recommended Tools
- **Logging**: DataDog, LogRocket, or ELK Stack
- **Monitoring**: New Relic, Datadog, or AWS CloudWatch
- **Error Tracking**: Sentry, Rollbar
- **Performance**: Lighthouse, WebPageTest

### Setup Sentry for Error Tracking
```bash
npm install @sentry/node @sentry/tracing
```

#### In backend/index.js:
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## 🚀 Quick Deploy Commands

### Railway
```bash
npm install -g @railway/cli
railway link
git push origin main  # Auto-deploys
```

### Vercel (Frontend)
```bash
npm install -g vercel
vercel --prod
```

### Docker
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💡 Cost Optimization

1. **Use Free Tiers**: Vercel, Railway, Netlify free plans
2. **Database**: MongoDB Atlas free tier (512MB)
3. **CDN**: Cloudflare free (auto with Vercel/Netlify)
4. **Monitoring**: Sentry free tier
5. **CI/CD**: GitHub Actions free for public repos

**Minimum Cost**: $0/mo (free tier only)  
**Comfortable Setup**: $10-20/mo

---

## ❓ FAQ

### Q: Which is easiest to deploy?
**A**: Railway or Vercel + Railway combo. Just connect GitHub and deploy.

### Q: Can I use free tier forever?
**A**: Yes, but with limitations (512MB DB, limited compute). Good for demos.

### Q: How do I scale?
**A**: Use auto-scaling (Railway, AWS) or upgrade instances.

### Q: What about database backups?
**A**: MongoDB Atlas and Railway handle automatic backups.

### Q: How do I add a custom domain?
**A**: Buy domain (Namecheap, GoDaddy), update DNS, point to deployment platform.

---

## 📞 Support Resources

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com
- Docker Docs: https://docs.docker.com
- GitHub Actions: https://docs.github.com/en/actions

---

**Start with Railway or Vercel - easiest and fastest! 🚀**
