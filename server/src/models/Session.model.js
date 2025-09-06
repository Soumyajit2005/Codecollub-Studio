import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    cursor: {
      line: Number,
      column: Number,
      selection: {
        startLine: Number,
        startColumn: Number,
        endLine: Number,
        endColumn: Number
      }
    },
    permissions: {
      canEdit: { type: Boolean, default: true },
      canExecute: { type: Boolean, default: true },
      canInvite: { type: Boolean, default: false }
    }
  }],
  videoCall: {
    isActive: { type: Boolean, default: false },
    participants: [String],
    startedAt: Date,
    endedAt: Date
  },
  screenShare: {
    isActive: { type: Boolean, default: false },
    sharedBy: String,
    startedAt: Date,
    endedAt: Date
  },
  chat: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'code', 'system'],
      default: 'text'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  duration: Number,
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  }
});

sessionSchema.pre('save', function(next) {
  if (this.endedAt && this.startedAt) {
    this.duration = this.endedAt - this.startedAt;
  }
  next();
});

export default mongoose.model('Session', sessionSchema);