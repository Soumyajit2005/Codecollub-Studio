import mongoose from 'mongoose';

const executionSchema = new mongoose.Schema({
  roomId: {
    type: String, // Changed to String to support UUID format room IDs
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['javascript', 'python', 'cpp', 'csharp', 'java', 'go', 'rust', 'typescript']
  },
  code: {
    type: String,
    required: true
  },
  input: String,
  output: {
    stdout: String,
    stderr: String,
    error: String,
    exitCode: Number,
    executionTime: Number,
    memoryUsed: String
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'timeout'],
    default: 'pending'
  },
  environment: {
    type: String,
    enum: ['local', 'docker', 'sandbox', 'judge0_online'],
    default: 'judge0_online'
  },
  containerId: String,
  executionId: {
    type: String,
    unique: true,
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  timeout: {
    type: Number,
    default: 30000
  },
  resources: {
    cpuLimit: String,
    memoryLimit: String,
    timeLimit: Number
  }
});

executionSchema.index({ roomId: 1, createdAt: -1 });
executionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Execution', executionSchema);