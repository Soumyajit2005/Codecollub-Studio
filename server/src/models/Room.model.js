import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      default: 'editor'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  language: {
    type: String,
    enum: ['javascript', 'python', 'cpp', 'csharp', 'java', 'go', 'rust'],
    default: 'javascript'
  },
  code: {
    type: String,
    default: '// Start coding here...\n'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  whiteboard: {
    data: { type: String, default: null },
    lastModified: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
  },
  settings: {
    allowGuests: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 10 },
    autoSave: { type: Boolean, default: true },
    autoSaveInterval: { type: Number, default: 30 },
    codeExecution: { type: Boolean, default: true },
    videoChat: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: true },
    whiteboard: { type: Boolean, default: true }
  },
  execution: {
    environment: {
      type: String,
      enum: ['local', 'docker', 'sandbox'],
      default: 'sandbox'
    },
    timeout: { type: Number, default: 30 },
    memoryLimit: { type: String, default: '128MB' }
  },
  templates: [{
    name: { type: String, required: true },
    code: { type: String, required: true },
    language: { type: String, required: true },
    description: { type: String, default: '' }
  }],
  activity: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    data: mongoose.Schema.Types.Mixed
  }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  tags: [{ type: String, trim: true }],
  stats: {
    totalSessions: { type: Number, default: 0 },
    totalExecutions: { type: Number, default: 0 },
    linesOfCode: { type: Number, default: 0 },
    activeTime: { type: Number, default: 0 }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 30*24*60*60*1000)
  }
});

export default mongoose.model('Room', roomSchema);