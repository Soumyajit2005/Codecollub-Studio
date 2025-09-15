import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Add after dotenv.config()
console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 20) + '...');
console.log('Port:', process.env.PORT);

import authRoutes from './routes/auth.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import codeRoutes from './routes/code.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import fileSystemRoutes from './routes/fileSystem.routes.js';
import enhancedFileSystemRoutes from './routes/fileSystem.enhanced.routes.js';
import ideRoutes from './routes/ide.routes.js';
import socketHandler from './config/socket.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    credentials: false
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: "*",
  credentials: false
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/files', fileSystemRoutes);
app.use('/api/files', enhancedFileSystemRoutes);
app.use('/api/ide', ideRoutes);

// Socket.io handling
socketHandler(io);

// Database connection
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Server accessible from any device on network`);
  console.log(`📡 Socket.IO server ready`);
});