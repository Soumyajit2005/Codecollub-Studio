import axios from 'axios';

// Judge0 CE API Configuration
const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const JUDGE0_API_KEY = process.env.RAPIDAPI_KEY || 'demo-key'; // You'll need to get a free API key from RapidAPI

// Alternative free Judge0 instances (no auth required)
const FREE_JUDGE0_INSTANCES = [
  'https://ce.judge0.com',
  'https://api.judge0.com',
];

class OnlineCodeExecutionService {
  constructor() {
    this.currentInstanceIndex = 0;
    this.maxRetries = 3;
  }

  /**
   * Execute code using Judge0 API with fallback instances
   */
  async executeCode(languageId, sourceCode, input = '', timeLimit = 10, memoryLimit = 128000) {
    const submissionData = {
      language_id: languageId,
      source_code: sourceCode,
      stdin: input,
      cpu_time_limit: timeLimit,
      memory_limit: memoryLimit,
      wall_time_limit: timeLimit + 5,
      expected_output: null,
      enable_per_process_and_thread_time_limit: true,
      enable_per_process_and_thread_memory_limit: true
    };

    // Try RapidAPI first if API key is available
    if (JUDGE0_API_KEY !== 'demo-key') {
      try {
        return await this.executeWithRapidAPI(submissionData);
      } catch (error) {
        console.warn('RapidAPI execution failed, trying free instances:', error.message);
      }
    }

    // Try free instances
    return await this.executeWithFreeInstances(submissionData);
  }

  /**
   * Execute using RapidAPI (paid tier with better reliability)
   */
  async executeWithRapidAPI(submissionData) {
    const headers = {
      'X-RapidAPI-Key': JUDGE0_API_KEY,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'Content-Type': 'application/json'
    };

    // Create submission
    const submissionResponse = await axios.post(
      `${JUDGE0_API_URL}/submissions?wait=true&base64_encoded=false`,
      submissionData,
      { headers, timeout: 30000 }
    );

    return this.processResult(submissionResponse.data);
  }

  /**
   * Execute using free Judge0 instances
   */
  async executeWithFreeInstances(submissionData) {
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const instanceUrl = FREE_JUDGE0_INSTANCES[this.currentInstanceIndex % FREE_JUDGE0_INSTANCES.length];
      
      try {
        console.log(`Attempting execution with instance: ${instanceUrl}`);
        
        // Create submission
        const submissionResponse = await axios.post(
          `${instanceUrl}/submissions?base64_encoded=false&wait=false`,
          submissionData,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );

        const token = submissionResponse.data.token;
        
        // Poll for result
        const result = await this.pollForResult(instanceUrl, token);
        return this.processResult(result);

      } catch (error) {
        console.error(`Execution failed with instance ${instanceUrl}:`, error.message);
        lastError = error;
        this.currentInstanceIndex++;
      }
    }

    // If all instances fail, try the synchronous approach
    try {
      return await this.executeWithSynchronousEndpoint(submissionData);
    } catch (syncError) {
      console.error('Synchronous execution also failed:', syncError.message);
      throw new Error(`Code execution failed: ${lastError?.message || 'All execution methods failed'}`);
    }
  }

  /**
   * Execute using synchronous endpoint (wait=true)
   */
  async executeWithSynchronousEndpoint(submissionData) {
    const instanceUrl = FREE_JUDGE0_INSTANCES[0];
    
    const response = await axios.post(
      `${instanceUrl}/submissions?base64_encoded=false&wait=true`,
      submissionData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000 // Longer timeout for synchronous execution
      }
    );

    return this.processResult(response.data);
  }

  /**
   * Poll for result using submission token
   */
  async pollForResult(instanceUrl, token, maxPolls = 20) {
    const pollInterval = 1000; // 1 second
    
    for (let i = 0; i < maxPolls; i++) {
      try {
        const response = await axios.get(
          `${instanceUrl}/submissions/${token}?base64_encoded=false`,
          { timeout: 10000 }
        );

        const result = response.data;
        
        // Check if processing is complete
        if (result.status.id > 2) { // Status > 2 means processing is done
          return result;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.warn(`Polling attempt ${i + 1} failed:`, error.message);
        if (i === maxPolls - 1) throw error;
      }
    }

    throw new Error('Execution timeout - result polling exceeded maximum attempts');
  }

  /**
   * Process and standardize the result from Judge0
   */
  processResult(result) {
    const status = result.status || {};
    const statusId = status.id || 0;
    const statusDescription = status.description || 'Unknown';

    // Map Judge0 status to our format
    let executionStatus = 'unknown';
    let isSuccess = false;

    switch (statusId) {
      case 1: // In Queue
      case 2: // Processing
        executionStatus = 'processing';
        break;
      case 3: // Accepted
        executionStatus = 'success';
        isSuccess = true;
        break;
      case 4: // Wrong Answer
        executionStatus = 'wrong_answer';
        break;
      case 5: // Time Limit Exceeded
        executionStatus = 'time_limit_exceeded';
        break;
      case 6: // Compilation Error
        executionStatus = 'compilation_error';
        break;
      case 7: // Runtime Error (SIGSEGV)
      case 8: // Runtime Error (SIGXFSZ)
      case 9: // Runtime Error (SIGFPE)
      case 10: // Runtime Error (SIGABRT)
      case 11: // Runtime Error (NZEC)
      case 12: // Runtime Error (Other)
        executionStatus = 'runtime_error';
        break;
      case 13: // Internal Error
        executionStatus = 'internal_error';
        break;
      case 14: // Exec Format Error
        executionStatus = 'exec_format_error';
        break;
      default:
        executionStatus = 'unknown';
    }

    return {
      success: isSuccess,
      status: executionStatus,
      statusDescription,
      output: {
        stdout: result.stdout || '',
        stderr: result.stderr || result.compile_output || '',
        exitCode: statusId,
        executionTime: parseFloat(result.time) || 0,
        memoryUsage: parseInt(result.memory) || 0
      },
      raw: result // Include raw result for debugging
    };
  }

  /**
   * Get supported languages from Judge0
   */
  async getSupportedLanguages(useCache = true) {
    // Cache languages for 1 hour
    if (useCache && this.cachedLanguages && this.cacheExpiry > Date.now()) {
      return this.cachedLanguages;
    }

    try {
      let languages;

      // Try RapidAPI first if available
      if (JUDGE0_API_KEY !== 'demo-key') {
        try {
          const response = await axios.get(`${JUDGE0_API_URL}/languages`, {
            headers: {
              'X-RapidAPI-Key': JUDGE0_API_KEY,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            timeout: 10000
          });
          languages = response.data;
        } catch (error) {
          console.warn('Failed to get languages from RapidAPI:', error.message);
        }
      }

      // Try free instances if RapidAPI failed
      if (!languages) {
        for (const instanceUrl of FREE_JUDGE0_INSTANCES) {
          try {
            const response = await axios.get(`${instanceUrl}/languages`, {
              timeout: 10000
            });
            languages = response.data;
            break;
          } catch (error) {
            console.warn(`Failed to get languages from ${instanceUrl}:`, error.message);
          }
        }
      }

      if (!languages) {
        throw new Error('Failed to retrieve supported languages from all instances');
      }

      // Filter and format languages
      const supportedLanguages = languages
        .filter(lang => !lang.name.includes('(')) // Remove version info for cleaner display
        .map(lang => ({
          id: lang.id,
          name: lang.name,
          fullName: `${lang.name}`,
          isArchived: lang.is_archived || false
        }))
        .filter(lang => !lang.isArchived); // Only active languages

      // Cache for 1 hour
      this.cachedLanguages = supportedLanguages;
      this.cacheExpiry = Date.now() + (60 * 60 * 1000);

      return supportedLanguages;

    } catch (error) {
      console.error('Error fetching supported languages:', error);
      
      // Return fallback list of common languages
      return [
        { id: 63, name: 'JavaScript', fullName: 'JavaScript (Node.js)' },
        { id: 71, name: 'Python', fullName: 'Python (3.8)' },
        { id: 62, name: 'Java', fullName: 'Java (OpenJDK 13)' },
        { id: 76, name: 'C++', fullName: 'C++ (Clang 7)' },
        { id: 75, name: 'C', fullName: 'C (Clang 7)' },
        { id: 51, name: 'C#', fullName: 'C# (Mono 6.6)' },
        { id: 60, name: 'Go', fullName: 'Go (1.13)' },
        { id: 73, name: 'Rust', fullName: 'Rust (1.40)' },
        { id: 72, name: 'Ruby', fullName: 'Ruby (2.7)' },
        { id: 68, name: 'PHP', fullName: 'PHP (7.4)' }
      ];
    }
  }

  /**
   * Test API connectivity
   */
  async testConnectivity() {
    try {
      const testCode = 'console.log("Hello, World!");';
      const result = await this.executeCode(63, testCode, '', 5, 64000);
      
      return {
        status: 'connected',
        message: 'Successfully connected to Judge0 API',
        testResult: result.success
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Connection failed: ${error.message}`,
        testResult: false
      };
    }
  }

  /**
   * Get execution statistics
   */
  getStats() {
    return {
      currentInstance: FREE_JUDGE0_INSTANCES[this.currentInstanceIndex % FREE_JUDGE0_INSTANCES.length],
      totalInstances: FREE_JUDGE0_INSTANCES.length,
      hasRapidAPIKey: JUDGE0_API_KEY !== 'demo-key',
      languagesCached: !!this.cachedLanguages,
      cacheExpiry: this.cacheExpiry
    };
  }
}

export default new OnlineCodeExecutionService();