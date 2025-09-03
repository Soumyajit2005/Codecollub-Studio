import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  code: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Code',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comments: [{
    line: Number,
    text: String,
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'suggestion'],
      default: 'info'
    },
    resolved: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'changes-requested'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Review', reviewSchema);