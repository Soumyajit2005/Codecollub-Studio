import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs-changes'],
      default: 'pending'
    },
    comment: String,
    reviewedAt: Date
  }],
  files: [{
    filename: String,
    language: String,
    content: String,
    changes: [{
      line: Number,
      type: String,
      oldContent: String,
      newContent: String
    }]
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    line: Number,
    file: String,
    isResolved: {
      type: Boolean,
      default: false
    },
    replies: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      content: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'open', 'approved', 'merged', 'rejected', 'closed'],
    default: 'draft'
  },
  labels: [String],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

reviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Review', reviewSchema);