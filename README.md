# 🚀 CodeCollab Studio

A real-time collaborative code editor and development platform with integrated whiteboard, video calls, and code execution capabilities.

## ✨ Features

- **Real-time Collaborative Code Editor** - Multiple developers can edit code simultaneously with live cursors
- **Interactive Whiteboard** - Draw, sketch, and brainstorm together in real-time
- **Video & Voice Calls** - Built-in WebRTC communication for team discussions
- **Code Execution** - Run code in multiple languages with secure sandboxed environments
- **Room-based Collaboration** - Create private or public rooms for different projects
- **Code Review System** - Review, comment, and approve code changes
- **User Authentication** - Secure login system with JWT tokens
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- Git ([Download](https://git-scm.com/))
- Docker (optional but recommended) ([Download](https://www.docker.com/products/docker-desktop/))

### Option 1: Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/codecollab-studio.git
cd codecollab-studio

# Copy environment file
cp .env.example .env

# Start all services with Docker
docker-compose up -d

# Open the application
# Client: http://localhost:3000
# API: http://localhost:5000
```

### Option 2: Manual Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/yourusername/codecollab-studio.git
cd codecollab-studio

# Install server dependencies
cd server && npm install

# Install client dependencies  
cd ../client && npm install && cd ..

# 2. Set up databases (using Docker)
docker run -d --name codecollab-mongo -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0
docker run -d --name codecollab-redis -p 6379:6379 redis:7-alpine

# 3. Configure environment
cp .env.example .env
# Edit .env if needed

# 4. Start the applications
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

### 🧪 Verify Setup

1. **Server Health**: `curl http://localhost:5000/health`
2. **Client**: Open http://localhost:5174
3. **Create Account**: Register and test the application

## 📁 Project Structure

```
codecollab-studio/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # State management
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Custom middleware
│   │   └── config/        # Configuration files
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker services
├── .env.example           # Environment template
├── LOCAL_SETUP.md         # Detailed setup guide
└── DEPLOYMENT.md          # Deployment guide
```

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern React with hooks
- **Vite** - Fast development server and build tool
- **Material-UI** - Component library for consistent UI
- **Monaco Editor** - VS Code editor for the web
- **Konva** - 2D canvas library for whiteboard
- **Socket.IO Client** - Real-time communication
- **Zustand** - Lightweight state management

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - Document database
- **Mongoose** - MongoDB ODM
- **Redis** - Caching and session storage
- **JWT** - Authentication tokens
- **Docker** - Code execution sandbox

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and static file serving
- **Prometheus** - Metrics collection
- **Grafana** - Monitoring dashboards

## 🔧 Development

### Available Scripts

**Server:**
```bash
cd server
npm run dev      # Start development server with hot reload
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Run tests
```

**Client:**
```bash
cd client
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Making Changes

1. **Backend changes**: Edit files in `server/src/` - server auto-restarts
2. **Frontend changes**: Edit files in `client/src/` - browser auto-refreshes
3. **Database changes**: Use MongoDB Compass or command line tools

### Environment Variables

Key variables in `.env`:

```env
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/codecollab_dev?authSource=admin

# Server
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:5174
ALLOWED_ORIGINS=http://localhost:5174

# Client
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## 📚 Documentation

- **[Local Setup Guide](LOCAL_SETUP.md)** - Detailed development setup
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment options
- **[API Documentation](docs/api.md)** - Backend API reference
- **[Architecture](docs/architecture.md)** - System architecture overview

## 🚨 Common Issues & Solutions

### "Port already in use"
```bash
# Find and kill process using the port
lsof -ti:5000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :5000   # Windows
```

### "Cannot connect to database"
```bash
# Check MongoDB container
docker ps | grep mongo
docker logs codecollab-mongo

# Restart MongoDB
docker restart codecollab-mongo
```

### "Module not found"
```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Monaco Editor** - VS Code editor component
- **Socket.IO** - Real-time communication
- **Material-UI** - React component library
- **Docker** - Containerization platform

## 📞 Support

- **Documentation**: Check the guides in the `docs/` folder
- **Issues**: [GitHub Issues](https://github.com/yourusername/codecollab-studio/issues) for bug reports
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/codecollab-studio/discussions) for questions
- **Community**: Join our Discord server for real-time help

---

## 🎯 Status

- ✅ **Core Features**: Code editing, real-time collaboration, authentication
- ✅ **Infrastructure**: Docker setup, CI/CD, monitoring
- 🚧 **Advanced Features**: Code execution, video calls, advanced whiteboard tools
- 🚧 **Mobile**: Responsive design improvements
- 📋 **Planned**: Plugin system, themes, advanced permissions

**Current Version**: 1.0.0  
**Status**: Active Development

---

**Made with ❤️ by the CodeCollab Team**