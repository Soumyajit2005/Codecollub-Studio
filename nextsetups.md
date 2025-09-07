# CodeCollab Studio - Setup Instructions

## 📋 Prerequisites

Before setting up the CodeCollab Studio, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **MongoDB** (v5.0 or higher) or **MongoDB Atlas** account
- **Docker** (optional, for code execution in isolated containers)

## 🚀 Quick Start Guide

### 1. Environment Configuration

Create environment files for both server and client:

#### Server Environment (`.env` in `/server` directory):

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/codecollab-studio
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/codecollab-studio

# Server Configuration
PORT=5000
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRE=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Cloudinary Configuration (Required for Avatar Uploads)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Code Execution (Optional - for enhanced security)
DOCKER_ENABLED=false
EXECUTION_TIMEOUT=30000
MEMORY_LIMIT=128MB

# WebRTC STUN/TURN Servers (Optional - for better connectivity)
STUN_SERVER_1=stun:stun.l.google.com:19302
STUN_SERVER_2=stun:stun1.l.google.com:19302
TURN_SERVER=turn:openrelay.metered.ca:80
TURN_USERNAME=openrelayproject
TURN_CREDENTIAL=openrelayproject
```

#### Client Environment (`.env` in `/client` directory):

```bash
# API Configuration
VITE_API_URL=http://localhost:5000

# WebSocket Configuration
VITE_SOCKET_URL=http://localhost:5000

# Environment
VITE_NODE_ENV=development
```

### 2. Third-Party Services Setup

#### 🌤️ Cloudinary Setup (Required for Avatar Uploads)

1. **Create a Cloudinary Account:**
   - Visit [Cloudinary.com](https://cloudinary.com/)
   - Sign up for a free account

2. **Get API Credentials:**
   - Go to your Cloudinary Dashboard
   - Copy the `Cloud Name`, `API Key`, and `API Secret`
   - Add them to your server `.env` file

3. **Configure Upload Presets (Optional):**
   - Go to Settings → Upload
   - Create an unsigned upload preset named `codecollab_avatars`
   - Set folder to `/codecollab/avatars`

#### 🗄️ MongoDB Setup

**Option A: Local MongoDB**
```bash
# Install MongoDB Community Edition
# Visit: https://docs.mongodb.com/manual/installation/

# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb/brew/mongodb-community  # macOS
```

**Option B: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster (free tier available)
3. Add your IP address to the whitelist
4. Create a database user
5. Get connection string and add to `.env` file

### 3. Installation & Setup

#### Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

#### Database Initialization

```bash
# The application will automatically create collections when first run
# No manual database setup required
```

### 4. Development Setup

#### Start Development Servers

```bash
# Terminal 1: Start MongoDB (if running locally)
mongod

# Terminal 2: Start the backend server
cd server
npm run dev

# Terminal 3: Start the frontend development server
cd client
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **WebSocket:** ws://localhost:5000

### 5. Production Deployment

#### Environment Variables for Production

Update your production environment variables:

```bash
# Server Production Environment
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret-minimum-32-characters
CORS_ORIGIN=https://your-domain.com
PORT=5000

# Client Production Environment
VITE_API_URL=https://your-api-domain.com
VITE_SOCKET_URL=https://your-api-domain.com
VITE_NODE_ENV=production
```

#### Build Commands

```bash
# Build client for production
cd client
npm run build

# Start production server
cd ../server
npm start
```

## 🔧 Advanced Configuration

### Code Execution Security

For enhanced security when executing user code:

#### Docker Setup (Recommended for Production)

```bash
# Install Docker
# Visit: https://docs.docker.com/get-docker/

# Enable Docker in server .env
DOCKER_ENABLED=true

# The application will automatically create secure containers for code execution
```

#### Language Support

The following programming languages are supported out of the box:
- **JavaScript** (Node.js runtime)
- **Python** (Python 3.x)
- **C++** (G++ compiler)
- **Java** (OpenJDK)
- **Go** (Go compiler)
- **Rust** (Rust compiler)

### WebRTC Configuration

For better peer-to-peer connectivity, consider setting up your own TURN server:

#### Coturn TURN Server Setup

```bash
# Install coturn
sudo apt-get install coturn  # Ubuntu/Debian

# Configure /etc/turnserver.conf
listening-port=3478
fingerprint
use-auth-secret
static-auth-secret=your-secret-key
realm=your-domain.com

# Start coturn service
sudo systemctl start coturn
```

### Performance Optimization

#### Redis Cache (Optional)

For improved performance with multiple users:

```bash
# Install Redis
sudo apt-get install redis-server  # Ubuntu/Debian
brew install redis  # macOS

# Add to server .env
REDIS_URL=redis://localhost:6379

# The application will automatically use Redis for session management
```

#### MongoDB Indexes

For better database performance, create these indexes:

```javascript
// In MongoDB shell or MongoDB Compass
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
db.rooms.createIndex({ "roomId": 1 }, { unique: true })
db.rooms.createIndex({ "roomCode": 1 }, { unique: true })
db.rooms.createIndex({ "isPublic": 1 })
db.rooms.createIndex({ "owner": 1 })
```

## 🐳 Docker Deployment

Complete Docker setup for easy deployment:

#### Docker Compose Setup

Create `docker-compose.yml` in the root directory:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:5.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

  server:
    build: ./server
    restart: always
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/codecollab-studio?authSource=admin
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-production-jwt-secret-minimum-32-characters
      - CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
      - CLOUDINARY_API_KEY=your-cloudinary-api-key
      - CLOUDINARY_API_SECRET=your-cloudinary-api-secret
    ports:
      - "5000:5000"
    depends_on:
      - mongodb
      - redis

  client:
    build: ./client
    restart: always
    environment:
      - VITE_API_URL=http://localhost:5000
      - VITE_SOCKET_URL=http://localhost:5000
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  mongodb_data:
```

#### Run with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Connection Errors
- **Issue:** Cannot connect to MongoDB
- **Solution:** Check MongoDB service is running and connection string is correct

#### 2. Socket.IO Connection Failed
- **Issue:** Real-time features not working
- **Solution:** Ensure CORS_ORIGIN matches client URL exactly

#### 3. Avatar Upload Failing
- **Issue:** Avatar uploads return 500 error
- **Solution:** Verify Cloudinary credentials in server `.env`

#### 4. Code Execution Not Working
- **Issue:** Code execution returns "Service unavailable"
- **Solution:** Check Docker is running if DOCKER_ENABLED=true, or verify language runtimes are installed

#### 5. Video/Audio Not Working
- **Issue:** WebRTC connections failing
- **Solution:** Check firewall settings, ensure HTTPS in production, verify STUN/TURN configuration

### Debug Mode

Enable verbose logging:

```bash
# Server debug mode
cd server
DEBUG=codecollab:* npm run dev

# Client debug mode
cd client
VITE_DEBUG=true npm run dev
```

### Health Checks

The application provides health check endpoints:

```bash
# Check server health
curl http://localhost:5000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "version": "1.0.0"
}
```

## 📚 Additional Resources

- **MongoDB Documentation:** https://docs.mongodb.com/
- **Cloudinary Documentation:** https://cloudinary.com/documentation
- **Socket.IO Documentation:** https://socket.io/docs/
- **WebRTC Documentation:** https://webrtc.org/getting-started/
- **Docker Documentation:** https://docs.docker.com/

## 🎯 Feature Configuration

### Room Features

Each room can be configured with the following settings:

- **Public/Private:** Toggle room visibility
- **Max Participants:** Limit concurrent users (default: 10)
- **Code Execution:** Enable/disable code running
- **Video Chat:** Enable/disable video calls
- **Screen Share:** Enable/disable screen sharing
- **Whiteboard:** Enable/disable collaborative whiteboard
- **Auto Save:** Automatic code saving interval

### User Subscription Features

The application supports different subscription tiers:

- **Free Tier:** 3 rooms, 5 participants, basic features
- **Pro Tier:** 10 rooms, 25 participants, advanced features
- **Team Tier:** Unlimited rooms, 100 participants, all features

## 🔐 Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secrets (minimum 32 characters)
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up MongoDB authentication
- [ ] Use Docker for code execution isolation
- [ ] Regular security updates for dependencies
- [ ] Configure rate limiting
- [ ] Set up monitoring and logging
- [ ] Regular database backups

---

## 🎉 You're All Set!

Your CodeCollab Studio is now ready to use! Users can:

✅ **Create accounts** and upload profile avatars  
✅ **Create public/private rooms** with unique room codes  
✅ **Collaborate in real-time** with Monaco Editor integration  
✅ **Execute code** in multiple programming languages  
✅ **Video chat** with screen sharing capabilities  
✅ **Use whiteboard** for visual collaboration  
✅ **Chat** with other participants  

For support or feature requests, please check the documentation or contact the development team.

**Happy Coding! 🚀**