import { v4 as uuidv4 } from 'uuid';
import Execution from '../models/Execution.model.js';
import axios from 'axios';

// Enhanced Judge0 Service with better error handling and multiple endpoints
class EnhancedCodeExecutionService {
  constructor() {
    // Multiple Judge0 instances for better reliability
    this.endpoints = [
      'https://judge0-ce.p.rapidapi.com',
      'https://ce.judge0.com',
      'https://api.judge0.com'
    ];

    this.currentEndpointIndex = 0;
    this.maxRetries = 3;
    this.timeout = 30000;

    // Language mappings for better compatibility
    this.languageMap = {
      'c': { id: 75, name: 'C (Clang 7.0.1)' },
      'cpp': { id: 76, name: 'C++ (Clang 7.0.1)' },
      'java': { id: 62, name: 'Java (OpenJDK 13.0.1)' },
      'python': { id: 71, name: 'Python (3.8.1)' },
      'python3': { id: 71, name: 'Python (3.8.1)' },
      'javascript': { id: 63, name: 'JavaScript (Node.js 14.15.4)' },
      'node': { id: 63, name: 'JavaScript (Node.js 14.15.4)' },
      'csharp': { id: 51, name: 'C# (Mono 6.6.0.161)' },
      'go': { id: 60, name: 'Go (1.13.5)' },
      'rust': { id: 73, name: 'Rust (1.40.0)' },
      'php': { id: 68, name: 'PHP (7.4.1)' },
      'ruby': { id: 72, name: 'Ruby (2.7.0)' },
      'swift': { id: 83, name: 'Swift (5.2.3)' },
      'kotlin': { id: 78, name: 'Kotlin (1.3.70)' }
    };

    // Execution statistics
    this.stats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      endpointFailures: new Map()
    };
  }

  /**
   * Execute code with enhanced error handling and fallback mechanisms
   */
  async executeCode(roomId, userId, language, code, input = '') {
    const executionId = uuidv4();
    const startTime = Date.now();

    try {
      console.log(`[${executionId}] Starting execution: ${language} for user ${userId} in room ${roomId}`);

      // Validate language
      const langConfig = this.languageMap[language.toLowerCase()];
      if (!langConfig) {
        throw new Error(`Unsupported language: ${language}. Supported: ${Object.keys(this.languageMap).join(', ')}`);
      }

      // Save initial execution record
      const execution = new Execution({
        roomId,
        user: userId,
        language,
        code,
        input,
        executionId,
        environment: 'judge0_enhanced',
        status: 'processing'
      });
      await execution.save();

      // Prepare submission data
      const submissionData = {
        language_id: langConfig.id,
        source_code: this.preprocessCode(code, language),
        stdin: input,
        cpu_time_limit: 15,
        memory_limit: 256000, // 256MB
        wall_time_limit: 20,
        expected_output: null,
        enable_per_process_and_thread_time_limit: true,
        enable_per_process_and_thread_memory_limit: true,
        enable_network: false // Security measure
      };

      console.log(`[${executionId}] Using language ID ${langConfig.id} for ${language}`);

      // Execute with fallback mechanism
      const result = await this.executeWithFallback(submissionData, executionId);

      const totalTime = Date.now() - startTime;
      this.updateStats(true, totalTime);

      // Update execution record with results
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: {
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            exitCode: result.status?.id || 0,
            executionTime: Math.round((result.time || 0) * 1000),
            memoryUsed: `${result.memory || 0} KB`,
            compileOutput: result.compile_output || ''
          },
          status: this.getStatusFromResult(result),
          completedAt: new Date(),
          rawResult: result
        }
      );

      const response = {
        executionId,
        success: this.isSuccessfulExecution(result),
        status: this.getStatusFromResult(result),
        statusDescription: result.status?.description || 'Unknown',
        output: {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: result.status?.id || 0,
          executionTime: Math.round((result.time || 0) * 1000),
          memoryUsed: `${result.memory || 0} KB`,
          compileOutput: result.compile_output || ''
        },
        language: langConfig.name,
        totalProcessingTime: totalTime
      };

      console.log(`[${executionId}] Execution completed successfully in ${totalTime}ms`);
      return response;

    } catch (error) {
      console.error(`[${executionId}] Execution failed:`, error);
      this.updateStats(false, Date.now() - startTime);

      // Update execution record with error
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: {
            error: error.message,
            stderr: error.message,
            stdout: '',
            exitCode: -1,
            executionTime: 0,
            memoryUsed: '0 KB'
          },
          status: 'failed',
          completedAt: new Date()
        }
      );

      return {
        executionId,
        success: false,
        status: 'failed',
        statusDescription: 'Execution Failed',
        output: {
          error: error.message,
          stderr: error.message,
          stdout: '',
          exitCode: -1,
          executionTime: 0,
          memoryUsed: '0 KB'
        }
      };
    }
  }

  /**
   * Execute with fallback mechanism across multiple endpoints
   */
  async executeWithFallback(submissionData, executionId) {
    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const endpoint = this.endpoints[this.currentEndpointIndex % this.endpoints.length];

      try {
        console.log(`[${executionId}] Attempt ${attempt + 1}: Using endpoint ${endpoint}`);

        // Try synchronous execution first (faster for small programs)
        if (endpoint.includes('rapidapi.com')) {
          return await this.executeWithRapidAPI(submissionData, executionId);
        } else {
          return await this.executeWithFreeEndpoint(endpoint, submissionData, executionId);
        }

      } catch (error) {
        console.warn(`[${executionId}] Endpoint ${endpoint} failed:`, error.message);
        lastError = error;

        this.recordEndpointFailure(endpoint);
        this.currentEndpointIndex++;

        // Wait before retry
        if (attempt < this.maxRetries - 1) {
          await this.sleep(1000 * (attempt + 1));
        }
      }
    }

    throw new Error(`All endpoints failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Execute using RapidAPI endpoint
   */
  async executeWithRapidAPI(submissionData, executionId) {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey || apiKey === 'demo-key') {
      throw new Error('RapidAPI key not configured');
    }

    const response = await axios.post(
      `${this.endpoints[0]}/submissions?wait=true&base64_encoded=false`,
      submissionData,
      {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      }
    );

    return response.data;
  }

  /**
   * Execute using free Judge0 endpoints
   */
  async executeWithFreeEndpoint(endpoint, submissionData, executionId) {
    // Try synchronous execution first
    try {
      console.log(`[${executionId}] Trying synchronous execution`);
      const syncResponse = await axios.post(
        `${endpoint}/submissions?wait=true&base64_encoded=false`,
        submissionData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: this.timeout
        }
      );
      return syncResponse.data;
    } catch (syncError) {
      console.log(`[${executionId}] Synchronous failed, trying asynchronous`);
    }

    // Fall back to asynchronous execution with polling
    const submitResponse = await axios.post(
      `${endpoint}/submissions?base64_encoded=false&wait=false`,
      submissionData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      }
    );

    const token = submitResponse.data.token;
    console.log(`[${executionId}] Submission created with token: ${token}`);

    // Poll for result
    return await this.pollForResult(endpoint, token, executionId);
  }

  /**
   * Poll for execution result
   */
  async pollForResult(endpoint, token, executionId, maxPolls = 30) {
    const pollInterval = 1000; // 1 second

    for (let i = 0; i < maxPolls; i++) {
      try {
        console.log(`[${executionId}] Polling attempt ${i + 1}/${maxPolls}`);

        const response = await axios.get(
          `${endpoint}/submissions/${token}?base64_encoded=false`,
          { timeout: 10000 }
        );

        const result = response.data;
        const statusId = result.status?.id || 0;

        console.log(`[${executionId}] Poll result - Status ID: ${statusId}, Description: ${result.status?.description || 'Unknown'}`);

        // Status 1 = In Queue, Status 2 = Processing
        if (statusId > 2) {
          console.log(`[${executionId}] Execution completed with status: ${result.status?.description}`);
          return result;
        }

        // Wait before next poll
        await this.sleep(pollInterval);

      } catch (error) {
        console.warn(`[${executionId}] Polling attempt ${i + 1} failed:`, error.message);
        if (i === maxPolls - 1) throw error;
        await this.sleep(pollInterval);
      }
    }

    throw new Error(`[${executionId}] Execution timeout - exceeded maximum polling attempts`);
  }

  /**
   * Preprocess code based on language-specific requirements
   */
  preprocessCode(code, language) {
    switch (language.toLowerCase()) {
      case 'java':
        // Ensure main class is named "Main"
        if (code.includes('class ') && !code.includes('class Main')) {
          code = code.replace(/class\s+\w+/g, 'class Main');
        }
        break;

      case 'python':
      case 'python3':
        // Add proper encoding if missing
        if (!code.includes('# -*- coding:') && !code.includes('# coding:')) {
          code = '# -*- coding: utf-8 -*-\n' + code;
        }
        break;

      case 'cpp':
      case 'c':
        // Add common headers if missing
        if (!code.includes('#include')) {
          const headers = language === 'cpp' ? '#include <iostream>\nusing namespace std;\n\n' : '#include <stdio.h>\n\n';
          code = headers + code;
        }
        break;
    }

    return code;
  }

  /**
   * Determine if execution was successful
   */
  isSuccessfulExecution(result) {
    const statusId = result.status?.id || 0;
    return statusId === 3; // Status 3 = Accepted
  }

  /**
   * Get status string from result
   */
  getStatusFromResult(result) {
    const statusId = result.status?.id || 0;
    const statusMap = {
      1: 'queued',
      2: 'processing',
      3: 'completed',
      4: 'wrong_answer',
      5: 'time_limit_exceeded',
      6: 'compilation_error',
      7: 'runtime_error',
      8: 'runtime_error',
      9: 'runtime_error',
      10: 'runtime_error',
      11: 'runtime_error',
      12: 'runtime_error',
      13: 'internal_error',
      14: 'exec_format_error'
    };

    return statusMap[statusId] || 'unknown';
  }

  /**
   * Update execution statistics
   */
  updateStats(success, executionTime) {
    this.stats.totalExecutions++;
    if (success) {
      this.stats.successfulExecutions++;
    } else {
      this.stats.failedExecutions++;
    }

    this.stats.averageExecutionTime =
      (this.stats.averageExecutionTime * (this.stats.totalExecutions - 1) + executionTime) /
      this.stats.totalExecutions;
  }

  /**
   * Record endpoint failure for monitoring
   */
  recordEndpointFailure(endpoint) {
    const failures = this.stats.endpointFailures.get(endpoint) || 0;
    this.stats.endpointFailures.set(endpoint, failures + 1);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Object.entries(this.languageMap).map(([key, config]) => ({
      id: config.id,
      name: key,
      displayName: config.name,
      supported: true
    }));
  }

  /**
   * Test connectivity to Judge0 services
   */
  async testConnectivity() {
    const testCode = {
      'cpp': '#include <iostream>\nint main() { std::cout << "Hello"; return 0; }',
      'python': 'print("Hello")',
      'javascript': 'console.log("Hello");'
    };

    const results = [];

    for (const endpoint of this.endpoints) {
      try {
        const startTime = Date.now();

        let response;
        if (endpoint.includes('rapidapi.com')) {
          // Skip RapidAPI test if no key
          if (!process.env.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY === 'demo-key') {
            results.push({
              endpoint,
              status: 'skipped',
              message: 'RapidAPI key not configured',
              responseTime: 0
            });
            continue;
          }

          response = await axios.post(
            `${endpoint}/submissions?wait=true&base64_encoded=false`,
            {
              language_id: 76, // C++
              source_code: testCode.cpp,
              stdin: '',
              cpu_time_limit: 5
            },
            {
              headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          );
        } else {
          response = await axios.post(
            `${endpoint}/submissions?wait=true&base64_encoded=false`,
            {
              language_id: 63, // JavaScript
              source_code: testCode.javascript,
              stdin: '',
              cpu_time_limit: 5
            },
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 15000
            }
          );
        }

        const responseTime = Date.now() - startTime;
        results.push({
          endpoint,
          status: 'connected',
          message: 'Successfully connected',
          responseTime,
          result: response.data.status?.description || 'OK'
        });

      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          message: error.message,
          responseTime: 0
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: this.endpoints.length,
        connected: results.filter(r => r.status === 'connected').length,
        failed: results.filter(r => r.status === 'error').length,
        skipped: results.filter(r => r.status === 'skipped').length
      }
    };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      endpoints: this.endpoints,
      currentEndpoint: this.endpoints[this.currentEndpointIndex % this.endpoints.length],
      supportedLanguages: Object.keys(this.languageMap).length,
      endpointFailures: Object.fromEntries(this.stats.endpointFailures)
    };
  }

  /**
   * Get execution history for a room
   */
  async getExecutionHistory(roomId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const executions = await Execution.find({ roomId })
      .populate('user', 'username avatar')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-code -rawResult'); // Exclude large fields

    const total = await Execution.countDocuments({ roomId });

    return {
      executions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      stats: {
        totalExecutions: total,
        successfulExecutions: await Execution.countDocuments({ roomId, status: 'completed' }),
        failedExecutions: await Execution.countDocuments({ roomId, status: 'failed' })
      }
    };
  }

  /**
   * Get single execution details
   */
  async getExecutionById(executionId) {
    return await Execution.findOne({ executionId })
      .populate('user', 'username avatar')
      .populate('roomId', 'name');
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new EnhancedCodeExecutionService();