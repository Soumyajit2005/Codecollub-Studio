// Test script to verify OnlineGDB-style IDE functionality
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test data
const testCodes = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;
    return 0;
}`,

  python: `print("Hello from Python!")
print("Testing Python execution")`,

  javascript: `console.log("Hello from JavaScript!");
console.log("Testing Node.js execution");`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`,

  c: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    return 0;
}`
};

async function testCodeExecution(language, code, input = '') {
  try {
    console.log(`\\n🧪 Testing ${language.toUpperCase()} execution...`);

    const response = await axios.post(`${BASE_URL}/api/ide/execute`, {
      language,
      code,
      input,
      roomId: '507f1f77bcf86cd799439011' // Mock room ID
    }, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      const result = response.data.data;
      console.log(`✅ ${language} execution successful:`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Execution Time: ${result.output.executionTime}ms`);
      console.log(`   Memory Used: ${result.output.memoryUsed}`);
      console.log(`   Output: ${result.output.stdout || 'No output'}`);
      if (result.output.stderr) {
        console.log(`   Error: ${result.output.stderr}`);
      }
      return true;
    } else {
      console.log(`❌ ${language} execution failed:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${language} execution error:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function testSupportedLanguages() {
  try {
    console.log('\\n🔍 Testing supported languages endpoint...');

    const response = await axios.get(`${BASE_URL}/api/ide/languages`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (response.data.success) {
      console.log(`✅ Languages endpoint successful:`);
      console.log(`   Total languages: ${response.data.data.total}`);
      response.data.data.languages.forEach(lang => {
        console.log(`   - ${lang.displayName} (${lang.name})`);
      });
      return true;
    } else {
      console.log('❌ Languages endpoint failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Languages endpoint error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testConnectivity() {
  try {
    console.log('\\n🌐 Testing Judge0 connectivity...');

    const response = await axios.get(`${BASE_URL}/api/ide/connectivity`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (response.data.success) {
      console.log('✅ Connectivity test successful:');
      const data = response.data.data;
      console.log(`   Timestamp: ${data.timestamp}`);
      console.log(`   Total endpoints: ${data.summary.total}`);
      console.log(`   Connected: ${data.summary.connected}`);
      console.log(`   Failed: ${data.summary.failed}`);
      console.log(`   Skipped: ${data.summary.skipped}`);

      data.results.forEach(result => {
        const status = result.status === 'connected' ? '✅' :
                      result.status === 'skipped' ? '⏭️' : '❌';
        console.log(`   ${status} ${result.endpoint}: ${result.message} (${result.responseTime}ms)`);
      });
      return true;
    } else {
      console.log('❌ Connectivity test failed:', response.data.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Connectivity test error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testLanguageTemplate(language) {
  try {
    console.log(`\\n📝 Testing ${language} template...`);

    const response = await axios.get(`${BASE_URL}/api/ide/template/${language}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    });

    if (response.data.success) {
      console.log(`✅ ${language} template retrieved:`);
      console.log(`   Description: ${response.data.data.description}`);
      console.log(`   Template length: ${response.data.data.template.length} characters`);
      return true;
    } else {
      console.log(`❌ ${language} template failed:`, response.data.error);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${language} template error:`, error.response?.data?.message || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting OnlineGDB-style IDE Tests');
  console.log('=====================================');

  const results = {
    connectivity: false,
    languages: false,
    templates: {},
    executions: {}
  };

  // Test connectivity first
  results.connectivity = await testConnectivity();

  // Test supported languages
  results.languages = await testSupportedLanguages();

  // Test language templates
  for (const language of ['cpp', 'python', 'javascript', 'java', 'c']) {
    results.templates[language] = await testLanguageTemplate(language);
  }

  // Test code executions (only if connectivity is working)
  if (results.connectivity) {
    for (const [language, code] of Object.entries(testCodes)) {
      results.executions[language] = await testCodeExecution(language, code);
      // Add delay between executions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    console.log('\\n⚠️  Skipping execution tests due to connectivity issues');
  }

  // Print summary
  console.log('\\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Connectivity Test: ${results.connectivity ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Languages Endpoint: ${results.languages ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\\nTemplate Tests:');
  Object.entries(results.templates).forEach(([lang, passed]) => {
    console.log(`  ${lang}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });

  if (Object.keys(results.executions).length > 0) {
    console.log('\\nExecution Tests:');
    Object.entries(results.executions).forEach(([lang, passed]) => {
      console.log(`  ${lang}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    });
  }

  const totalTests = 2 + Object.keys(results.templates).length + Object.keys(results.executions).length;
  const passedTests = Number(results.connectivity) + Number(results.languages) +
                     Object.values(results.templates).filter(Boolean).length +
                     Object.values(results.executions).filter(Boolean).length;

  console.log(`\\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\\n🎉 All tests passed! OnlineGDB-style IDE is fully functional!');
  } else {
    console.log(`\\n⚠️  ${totalTests - passedTests} test(s) failed. Check the output above for details.`);
  }
}

// Note: This test requires authentication
console.log('⚠️  IMPORTANT: This test requires a valid JWT token.');
console.log('Please update TEST_TOKEN with a valid authentication token before running.');
console.log('You can get a token by logging into the application and checking localStorage.');
console.log('\\nTo run the test with a token:');
console.log('node test-ide.js\\n');

// Uncomment the line below to run tests (after setting TEST_TOKEN)
// runAllTests().catch(console.error);