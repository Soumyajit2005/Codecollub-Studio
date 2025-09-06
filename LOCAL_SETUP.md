# 🏠 CodeCollab Studio - Local Development Setup

This guide will help you set up CodeCollab Studio for local development on your machine.

## 📋 Prerequisites

Before starting, make sure you have:

- **Node.js** 18.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Docker Desktop** (optional, but recommended) ([Download](https://www.docker.com/products/docker-desktop/))

## 🚀 Quick Start (5 minutes)

### Option 1: Full Docker Setup (Recommended)

If you have Docker installed:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/codecollab-studio.git
cd codecollab-studio

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Check if everything is running
docker-compose ps

# 5. Open the application
# Client: http://localhost:3000
# API: http://localhost:5000/api
```

That's it! Skip to [Testing Your Setup](#-testing-your-setup).

### Option 2: Manual Setup (Without Docker)

#### Step 1: Install Dependencies

```bash
# Clone and navigate to the project
git clone https://github.com/yourusername/codecollab-studio.git
cd codecollab-studio

# Install server dependencies
cd server
npm install

# Install client dependencies  
cd ../client
npm install

# Go back to root
cd ..
```

#### Step 2: Set Up Databases

**Option A: Using Docker (Recommended)**
```bash
# Start MongoDB
docker run -d \
  --name codecollab-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:7.0

# Start Redis
docker run -d \
  --name codecollab-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option B: Install Locally**

**On Windows:**
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Download Redis for Windows from [redis.io](https://redis.io/download)
3. Install and start both services

**On macOS (using Homebrew):**
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Install Redis
brew install redis
brew services start redis
```

**On Ubuntu/Linux:**
```bash
# Install MongoDB
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

#### Step 3: Configure Environment

The `.env` file is already created with development settings. No changes needed unless you want to customize ports or database settings.

#### Step 4: Start the Applications

**Terminal 1 (Server):**
```bash
cd server
npm run dev
```

**Terminal 2 (Client):**
```bash
cd client  
npm run dev
```

## 🧪 Testing Your Setup

### 1. Verify Services Are Running

**Check Server:**
```bash
curl http://localhost:5000/health
```
Expected response: `{"status":"ok","timestamp":"..."}`

**Check Client:**
Open http://localhost:5174 in your browser. You should see the CodeCollab Studio login page.

**Check Database (if using Docker):**
```bash
# MongoDB
docker exec codecollab-mongo mongosh --eval "db.adminCommand('ping')"

# Redis  
docker exec codecollab-redis redis-cli ping
```

### 2. Test Basic Functionality

1. **Open the application**: http://localhost:5174
2. **Register a new account**:
   - Click "Sign Up"
   - Enter email, username, and password
   - Submit the form
3. **Create a room**:
   - Click "Create New Room"
   - Enter room details
   - Click "Create"
4. **Test features**:
   - Code editor should load
   - Try typing in the editor
   - Test whiteboard (if available)

## 🛠️ Development Workflow

### Making Changes

**Backend/Server Changes:**
- Edit files in `server/src/`
- Server automatically restarts with nodemon
- Check Terminal 1 for any errors

**Frontend/Client Changes:**
- Edit files in `client/src/`
- Browser automatically refreshes with Vite HMR
- Check browser DevTools (F12) for errors

### Common Development Tasks

**View Logs:**
```bash
# Server logs (Terminal 1 output)
cd server
npm run dev

# Client logs (Browser DevTools Console)
# Press F12 -> Console tab

# Database logs (if using Docker)
docker logs codecollab-mongo
docker logs codecollab-redis
```

**Reset Database:**
```bash
# If using Docker
docker stop codecollab-mongo codecollab-redis
docker rm codecollab-mongo codecollab-redis
# Then restart with the docker run commands above

# If installed locally, you can drop the database:
mongosh "mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin"
> db.dropDatabase()
```

**Install New Dependencies:**
```bash
# Server dependency
cd server
npm install package-name
npm run dev  # Restart server

# Client dependency  
cd client
npm install package-name
# Client auto-reloads
```

## 🔧 Configuration Options

### Environment Variables

You can customize these in your `.env` file:

```env
# Change server port
PORT=5001

# Change client API URL (update if you change server port)
VITE_API_URL=http://localhost:5001

# Database URL (change if using different credentials)
MONGODB_URI=mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin

# Enable/disable features
LOG_LEVEL=debug
ENABLE_DEBUG_MODE=true
```

### Port Configuration

**Default Ports:**
- Client: 5174
- Server: 5000
- MongoDB: 27017
- Redis: 6379

**To Change Ports:**
1. Update `.env` file
2. Restart the affected service
3. Update any URLs that reference the old port

## 🚨 Troubleshooting

### Common Issues

#### 1. "Port already in use"
```bash
# Find what's using the port
netstat -ano | findstr :5000  # Windows
lsof -ti:5000                # macOS/Linux

# Kill the process (replace PID)
taskkill /PID <PID> /F       # Windows  
kill -9 <PID>                # macOS/Linux

# Or change the port in .env file
```

#### 2. "Cannot connect to database"
```bash
# Check if MongoDB is running
docker ps | grep mongo                    # Docker
sudo systemctl status mongod             # Linux
brew services list | grep mongodb        # macOS

# Test connection manually
mongosh "mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin"
```

#### 3. "Module not found" errors
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

#### 4. Client not loading/blank page
```bash
# Check browser console (F12 -> Console)
# Common issues:
# - API URL is wrong in .env
# - Server is not running  
# - CORS issues (check server logs)

# Clear browser cache and refresh
# Try in incognito/private mode
```

#### 5. Docker issues
```bash
# Restart Docker Desktop
# Check if containers are running
docker ps

# View container logs
docker logs codecollab-mongo
docker logs codecollab-redis

# Restart containers
docker restart codecollab-mongo codecollab-redis
```

### Getting Help

**Check Logs First:**
1. Server logs (Terminal 1)
2. Client logs (Browser DevTools Console)  
3. Database logs (if using Docker: `docker logs codecollab-mongo`)

**Common Log Patterns:**
- `ECONNREFUSED`: Service is not running
- `EADDRINUSE`: Port is already in use
- `ValidationError`: Check your database schema/data
- `CastError`: Database ID format issues

## 📚 Next Steps

Once you have the basic setup working:

1. **Explore the codebase**:
   - `server/src/` - Backend API code
   - `client/src/` - Frontend React code
   - `server/src/models/` - Database models
   - `client/src/components/` - React components

2. **Read the main documentation**:
   - `README.md` - Project overview
   - `DEPLOYMENT.md` - Production deployment
   - Code comments throughout the project

3. **Set up your IDE**:
   - Install ESLint and Prettier extensions
   - Configure debugging for Node.js and React

4. **Join the community**:
   - GitHub Discussions for questions
   - Discord/Slack for real-time help

## 🎉 Success!

If you can:
- ✅ Access http://localhost:5174
- ✅ Register and login
- ✅ Create a room
- ✅ See the code editor

**Congratulations! Your development environment is ready! 🚀**

---

**Need help?** Check the troubleshooting section above or create an issue on GitHub.