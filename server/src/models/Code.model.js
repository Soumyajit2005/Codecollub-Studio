import mongoose from 'mongoose';

const codeSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  version: {
    type: Number,
    default: 1
  },
  content: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  changes: [{
    line: Number,
    type: String, // 'add', 'delete', 'modify'
    content: String,
    timestamp: Date
  }]
});

export default mongoose.model('Code', codeSchema);