# 🚀 CodeCollab Studio - Deployment Guide

This guide covers various deployment options for CodeCollab Studio, from development to production-ready deployments.

## 📋 Prerequisites

### Required Software
- **Docker** 20.10+ and Docker Compose 2.0+
- **Node.js** 18+ (for local development)
- **Git** for version control

### System Requirements

#### Minimum (Development)
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 10GB
- **OS**: Linux, macOS, or Windows with WSL2

#### Recommended (Production)
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **OS**: Linux (Ubuntu 22.04+ recommended)

## 🏠 Local Development Setup

### Option 1: Quick Start with Docker (Recommended)

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/codecollab-studio.git
cd codecollab-studio
```

2. **Set up environment variables:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit with your preferred editor
nano .env
# or
code .env
```

3. **Start all services with Docker:**
```bash
# Start all services (MongoDB, Redis, Server, Client, etc.)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

4. **Access the application:**
- **Client**: http://localhost:3000
- **Server API**: http://localhost:5000/api
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001

### Option 2: Manual Development Setup

#### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

#### 2. Start Database Services

**Option A: Using Docker (Recommended)**
```bash
# Start MongoDB
docker run -d \
  --name codecollab-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -v mongodb_data:/data/db \
  mongo:7.0

# Start Redis
docker run -d \
  --name codecollab-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option B: Local Installation**

**Ubuntu/Debian:**
```bash
# Install MongoDB
sudo apt-get install -y software-properties-common gnupg
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Redis
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb/brew/mongodb-community

# Install Redis
brew install redis
brew services start redis
```

**Windows:**
```bash
# Use Docker Desktop or WSL2 with Linux instructions above
# Or download MongoDB Community Server and Redis for Windows
```

#### 3. Configure Environment

Create a `.env` file in the root directory:

```env
# Database Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_development_jwt_secret_key_here_min_32_chars
JWT_EXPIRE=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5174
ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174

# Client Configuration (for Vite)
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

#### 4. Start the Applications

**Terminal 1 - Start Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start Client:**
```bash
cd client
npm run dev
```

The server will start on http://localhost:5000 and the client will start on http://localhost:5174

## 🧪 Testing the Setup

### 1. Verify Services

**Check Server Health:**
```bash
curl http://localhost:5000/health
```

**Check Database Connection:**
```bash
# If using MongoDB with authentication
mongosh "mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin"

# Test Redis connection
redis-cli ping
```

### 2. Test Application Features

1. **Open the client**: http://localhost:5174
2. **Register a new account**
3. **Create a new room**
4. **Test code editor functionality**
5. **Test real-time collaboration**
6. **Test whiteboard features**

### 3. Development Tools

**Check Application Logs:**
```bash
# Server logs
cd server
npm run dev

# Client logs (in browser)
# Open DevTools (F12) -> Console tab

# Docker logs (if using Docker)
docker-compose logs -f server
docker-compose logs -f client
```

**Database Inspection:**
```bash
# MongoDB
mongosh "mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin"
> show dbs
> use codecollab_dev
> show collections
> db.users.find().pretty()

# Redis
redis-cli
> keys *
> get "key_name"
```

## ☁️ Production Deployment

### Docker Compose Production Setup

1. **Create production environment file:**
```bash
cp .env.example .env.production
```

2. **Configure production variables:**
```env
# Production Environment
NODE_ENV=production
SERVER_PORT=5000

# Database (use your production MongoDB URI)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codecollab_prod

# Security
JWT_SECRET=super_secure_production_jwt_secret_minimum_32_characters
JWT_EXPIRE=7d

# CORS (your production domain)
CORS_ORIGIN=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Client URLs
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

# Database credentials for Docker
MONGO_USERNAME=codecollab_prod
MONGO_PASSWORD=super_secure_password_123
MONGO_DATABASE=codecollab_production

# Redis
REDIS_PASSWORD=secure_redis_password_456

# Monitoring
GRAFANA_PASSWORD=secure_grafana_password
```

3. **Set up SSL certificates:**
```bash
# Create SSL directory
mkdir -p ssl

# Option A: Let's Encrypt (for production domain)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem

# Option B: Self-signed (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

4. **Deploy with production configuration:**
```bash
# Build and start all services
docker-compose --env-file .env.production up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Kubernetes Deployment

See the full Kubernetes deployment manifests in the `k8s/` directory:

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n codecollab

# Get services
kubectl get services -n codecollab
```

## 🔧 Development Workflow

### 1. Making Changes

**Backend Changes:**
```bash
# Server auto-restarts with nodemon
cd server
npm run dev
```

**Frontend Changes:**
```bash
# Client auto-reloads with Vite HMR
cd client
npm run dev
```

### 2. Database Migrations

**MongoDB Schema Updates:**
```bash
# If you need to run migrations
cd server
npm run migrate

# Or manually update documents
mongosh "mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin"
```

### 3. Testing

**Run Tests:**
```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test

# E2E tests (if configured)
npm run test:e2e
```

### 4. Code Quality

**Linting:**
```bash
# Server linting
cd server
npm run lint

# Client linting
cd client
npm run lint

# Fix linting issues
npm run lint:fix
```

**Type Checking (if using TypeScript):**
```bash
cd client
npm run type-check
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -ti:5000
lsof -ti:5174

# Kill the process
kill -9 <PID>

# Or use different ports in .env
PORT=5001
VITE_PORT=5175
```

#### 2. MongoDB Connection Issues
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB
sudo systemctl start mongod

# Check connection
mongosh "mongodb://localhost:27017"

# If using Docker
docker ps | grep mongo
docker logs codecollab-mongo
```

#### 3. Permission Issues (Linux/macOS)
```bash
# Fix node_modules permissions
sudo chown -R $(whoami) node_modules/
sudo chown -R $(whoami) ~/.npm/

# Or use npm with --unsafe-perm
npm install --unsafe-perm
```

#### 4. Build Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force

# Clear Docker build cache
docker system prune -af
```

### Log Files

**Development Logs:**
- Server logs: Console output
- Client logs: Browser DevTools
- MongoDB logs: `/var/log/mongodb/mongod.log`
- Redis logs: `/var/log/redis/redis-server.log`

**Production Logs (Docker):**
```bash
# Container logs
docker-compose logs server
docker-compose logs client
docker-compose logs mongodb
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f

# Log files in containers
docker exec -it codecollab-server cat /app/logs/app.log
```

## 📈 Performance Optimization

### Development
- Use Docker for consistent environment
- Enable hot reload for faster development
- Use development database with smaller dataset

### Production
- Use production builds (`npm run build`)
- Enable gzip compression in nginx
- Use CDN for static assets
- Implement caching strategies
- Monitor with Prometheus and Grafana

## 🛡️ Security Considerations

### Development
- Use strong passwords for local databases
- Don't commit `.env` files to version control
- Use HTTPS even in development (self-signed certificates)

### Production
- Use environment variables for all secrets
- Implement rate limiting
- Use HTTPS with valid certificates
- Regular security updates
- Firewall configuration
- Regular backups

## 📞 Support

- **Documentation**: Check this guide and code comments
- **Issues**: GitHub Issues for bug reports
- **Discussions**: GitHub Discussions for questions
- **Community**: Discord/Slack for real-time help

---

## Quick Reference Commands

### Development
```bash
# Start everything with Docker
docker-compose up -d

# Start manually
cd server && npm run dev  # Terminal 1
cd client && npm run dev  # Terminal 2

# Check logs
docker-compose logs -f
```

### Production
```bash
# Deploy
docker-compose --env-file .env.production up -d

# Update
git pull
docker-compose build
docker-compose up -d

# Backup
docker exec codecollab-mongo mongodump --out /backup
```

### Health Checks
```bash
curl http://localhost:5000/health        # Server health
curl http://localhost:5174               # Client health
redis-cli ping                          # Redis health
mongosh --eval "db.adminCommand('ping')" # MongoDB health
```

---

**Happy Coding! 🎉**