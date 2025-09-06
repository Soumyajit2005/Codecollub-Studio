import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import Execution from '../models/Execution.model.js';

const execAsync = promisify(exec);
const docker = new Docker();

const LANGUAGE_CONFIGS = {
  javascript: {
    image: 'node:18-alpine',
    fileExtension: '.js',
    runCommand: 'node',
    timeout: 30000,
    memoryLimit: '128m'
  },
  typescript: {
    image: 'node:18-alpine',
    fileExtension: '.ts',
    runCommand: 'npx ts-node',
    timeout: 30000,
    memoryLimit: '128m',
    setup: 'npm install -g typescript ts-node'
  },
  python: {
    image: 'python:3.11-alpine',
    fileExtension: '.py',
    runCommand: 'python',
    timeout: 30000,
    memoryLimit: '128m'
  },
  cpp: {
    image: 'gcc:11-alpine',
    fileExtension: '.cpp',
    compileCommand: 'g++ -o program',
    runCommand: './program',
    timeout: 45000,
    memoryLimit: '256m'
  },
  csharp: {
    image: 'mcr.microsoft.com/dotnet/sdk:7.0-alpine',
    fileExtension: '.cs',
    compileCommand: 'dotnet new console --force && cp code.cs Program.cs && dotnet build',
    runCommand: 'dotnet run',
    timeout: 45000,
    memoryLimit: '256m'
  },
  java: {
    image: 'openjdk:17-alpine',
    fileExtension: '.java',
    compileCommand: 'javac',
    runCommand: 'java',
    timeout: 45000,
    memoryLimit: '256m'
  },
  go: {
    image: 'golang:1.21-alpine',
    fileExtension: '.go',
    runCommand: 'go run',
    timeout: 30000,
    memoryLimit: '128m'
  },
  rust: {
    image: 'rust:1.70-alpine',
    fileExtension: '.rs',
    compileCommand: 'rustc -o program',
    runCommand: './program',
    timeout: 60000,
    memoryLimit: '256m'
  }
};

class CodeExecutionService {
  async executeCode(roomId, userId, language, code, input = '') {
    const executionId = uuidv4();
    
    try {
      const execution = new Execution({
        roomId,
        user: userId,
        language,
        code,
        input,
        executionId,
        environment: 'docker'
      });
      await execution.save();

      const config = LANGUAGE_CONFIGS[language];
      if (!config) {
        throw new Error(`Unsupported language: ${language}`);
      }

      const result = await this.runInDocker(executionId, config, code, input);
      
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: result.output,
          status: result.status,
          completedAt: new Date()
        }
      );

      return { executionId, ...result };
    } catch (error) {
      console.error('Code execution error:', error);
      
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: { error: error.message },
          status: 'failed',
          completedAt: new Date()
        }
      );

      throw error;
    }
  }

  async runInDocker(executionId, config, code, input) {
    const containerName = `code-exec-${executionId}`;
    let container;

    try {
      const startTime = Date.now();
      
      container = await docker.createContainer({
        Image: config.image,
        name: containerName,
        WorkingDir: '/app',
        Env: ['NODE_ENV=production'],
        HostConfig: {
          Memory: this.parseMemoryLimit(config.memoryLimit),
          CpuQuota: 50000,
          CpuPeriod: 100000,
          NetworkMode: 'none',
          ReadonlyRootfs: false,
          Tmpfs: {
            '/tmp': 'rw,noexec,nosuid,size=10m'
          }
        },
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      });

      await container.start();

      const filename = `code${config.fileExtension}`;
      await this.writeFileToContainer(container, filename, code);

      if (input) {
        await this.writeFileToContainer(container, 'input.txt', input);
      }

      let commands = [];
      
      if (config.setup) {
        commands.push(config.setup);
      }
      
      if (config.compileCommand) {
        if (language === 'java') {
          const className = this.extractJavaClassName(code) || 'Main';
          commands.push(`${config.compileCommand} ${filename}`);
          commands.push(`${config.runCommand} ${className} ${input ? '< input.txt' : ''}`);
        } else if (language === 'cpp' || language === 'rust') {
          commands.push(`${config.compileCommand} ${filename}`);
          commands.push(`${config.runCommand} ${input ? '< input.txt' : ''}`);
        } else {
          commands.push(config.compileCommand);
          commands.push(`${config.runCommand} ${input ? '< input.txt' : ''}`);
        }
      } else {
        commands.push(`${config.runCommand} ${filename} ${input ? '< input.txt' : ''}`);
      }

      const commandString = commands.join(' && ');
      const exec = await container.exec({
        Cmd: ['sh', '-c', commandString],
        AttachStdout: true,
        AttachStderr: true
      });

      const stream = await exec.start({ Detach: false, Tty: false });
      
      const output = await Promise.race([
        this.streamToString(stream),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Execution timeout')), config.timeout)
        )
      ]);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      const inspectResult = await exec.inspect();
      const exitCode = inspectResult.ExitCode;

      const stats = await container.stats({ stream: false });
      const memoryUsed = this.formatBytes(stats.memory_stats?.usage || 0);

      return {
        output: {
          stdout: output.stdout || '',
          stderr: output.stderr || '',
          exitCode,
          executionTime,
          memoryUsed
        },
        status: exitCode === 0 ? 'completed' : 'failed'
      };

    } catch (error) {
      return {
        output: {
          error: error.message,
          executionTime: 0,
          memoryUsed: '0 B'
        },
        status: error.message.includes('timeout') ? 'timeout' : 'failed'
      };
    } finally {
      if (container) {
        try {
          await container.kill();
          await container.remove();
        } catch (cleanupError) {
          console.error('Container cleanup error:', cleanupError);
        }
      }
    }
  }

  async writeFileToContainer(container, filename, content) {
    const tarStream = await this.createTarStream(filename, content);
    await container.putArchive(tarStream, { path: '/app' });
  }

  createTarStream(filename, content) {
    return new Promise((resolve, reject) => {
      const { Writable } = require('stream');
      const tar = require('tar-stream');
      
      const pack = tar.pack();
      const chunks = [];
      
      const writable = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        }
      });
      
      pack.pipe(writable);
      
      pack.entry({ name: filename }, content, (err) => {
        if (err) return reject(err);
        pack.finalize();
      });
      
      writable.on('finish', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  streamToString(stream) {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      stream.on('data', (chunk) => {
        const data = chunk.toString();
        if (chunk[0] === 1) {
          stdout += data.substring(8);
        } else if (chunk[0] === 2) {
          stderr += data.substring(8);
        }
      });
      
      stream.on('end', () => {
        resolve({ stdout, stderr });
      });
      
      stream.on('error', reject);
    });
  }

  extractJavaClassName(code) {
    const match = code.match(/public\s+class\s+(\w+)/);
    return match ? match[1] : null;
  }

  parseMemoryLimit(limit) {
    const units = { 'k': 1024, 'm': 1024 * 1024, 'g': 1024 * 1024 * 1024 };
    const match = limit.toLowerCase().match(/^(\d+)([kmg]?)b?$/);
    if (!match) return 128 * 1024 * 1024;
    
    const value = parseInt(match[1]);
    const unit = match[2] || '';
    return value * (units[unit] || 1);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getExecutionHistory(roomId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const executions = await Execution.find({ roomId })
      .populate('user', 'username avatar')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-code');

    const total = await Execution.countDocuments({ roomId });
    
    return {
      executions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  async getExecutionById(executionId) {
    return await Execution.findOne({ executionId })
      .populate('user', 'username avatar')
      .populate('roomId', 'name');
  }
}

export default new CodeExecutionService();