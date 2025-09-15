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
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'editor'
    },
    permissions: {
      canChat: { type: Boolean, default: true },
      canCode: { type: Boolean, default: true },
      canWhiteboard: { type: Boolean, default: true },
      canVideo: { type: Boolean, default: true },
      canScreenShare: { type: Boolean, default: false },
      canExecuteCode: { type: Boolean, default: true },
      canManageFiles: { type: Boolean, default: false },
      canInviteUsers: { type: Boolean, default: false },
      canKickUsers: { type: Boolean, default: false }
    },
    status: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
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
  joinRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    message: {
      type: String,
      trim: true
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewMessage: {
      type: String,
      trim: true
    }
  }],
  settings: {
    allowGuests: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 10 },
    autoSave: { type: Boolean, default: true },
    autoSaveInterval: { type: Number, default: 30 },
    requireApproval: { type: Boolean, default: false },
    codeExecution: { type: Boolean, default: true },
    videoChat: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: true },
    whiteboard: { type: Boolean, default: true },
    fileSystem: { type: Boolean, default: true },
    terminal: { type: Boolean, default: true }
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
  fileSystem: {
    files: [mongoose.Schema.Types.Mixed], // Support nested structures
    activeFile: {
      type: String,
      default: null
    },
    lastSync: {
      type: Date,
      default: Date.now
    },
    version: {
      type: Number,
      default: 1
    }
  },
  ideSettings: {
    theme: {
      type: String,
      enum: ['monokai', 'github', 'twilight', 'terminal', 'solarized_dark', 'solarized_light', 'textmate', 'tomorrow', 'xcode'],
      default: 'monokai'
    },
    fontSize: {
      type: Number,
      min: 8,
      max: 32,
      default: 14
    },
    tabSize: {
      type: Number,
      min: 1,
      max: 8,
      default: 4
    },
    wordWrap: {
      type: Boolean,
      default: false
    },
    autoIndent: {
      type: Boolean,
      default: true
    },
    showGutter: {
      type: Boolean,
      default: true
    },
    highlightActiveLine: {
      type: Boolean,
      default: true
    },
    enableBasicAutocompletion: {
      type: Boolean,
      default: true
    },
    enableLiveAutocompletion: {
      type: Boolean,
      default: true
    }
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