import { v4 as uuidv4 } from 'uuid';
import Execution from '../models/Execution.model.js';
import OnlineCodeExecutionService from './onlineCodeExecution.service.js';

// Language templates
const LANGUAGE_TEMPLATES = {
  javascript: `// Welcome to CodeCollab Studio!
console.log("Hello, World! 🚀");

// Try some JavaScript here...
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);`,

  python: `# Welcome to CodeCollab Studio!
print("Hello, World! 🚀")

# Try some Python here...
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]
print("Doubled:", doubled)`,

  java: `// Welcome to CodeCollab Studio!
import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World! 🚀");
        
        // Try some Java here...
        int[] numbers = {1, 2, 3, 4, 5};
        System.out.print("Doubled: ");
        for (int num : numbers) {
            System.out.print(num * 2 + " ");
        }
        System.out.println();
    }
}`,

  cpp: `// Welcome to CodeCollab Studio!
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World! 🚀" << std::endl;
    
    // Try some C++ here...
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    std::cout << "Doubled: ";
    for (int num : numbers) {
        std::cout << num * 2 << " ";
    }
    std::cout << std::endl;
    
    return 0;
}`,

  c: `// Welcome to CodeCollab Studio!
#include <stdio.h>

int main() {
    printf("Hello, World! 🚀\\n");
    
    // Try some C here...
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    printf("Doubled: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", numbers[i] * 2);
    }
    printf("\\n");
    
    return 0;
}`,

  csharp: `// Welcome to CodeCollab Studio!
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World! 🚀");
        
        // Try some C# here...
        int[] numbers = {1, 2, 3, 4, 5};
        Console.Write("Doubled: ");
        foreach (int num in numbers) {
            Console.Write(num * 2 + " ");
        }
        Console.WriteLine();
    }
}`,

  go: `// Welcome to CodeCollab Studio!
package main

import "fmt"

func main() {
    fmt.Println("Hello, World! 🚀")
    
    // Try some Go here...
    numbers := []int{1, 2, 3, 4, 5}
    fmt.Print("Doubled: ")
    for _, num := range numbers {
        fmt.Print(num * 2, " ")
    }
    fmt.Println()
}`,

  rust: `// Welcome to CodeCollab Studio!
fn main() {
    println!("Hello, World! 🚀");
    
    // Try some Rust here...
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled);
}`,

  ruby: `# Welcome to CodeCollab Studio!
puts "Hello, World! 🚀"

# Try some Ruby here...
numbers = [1, 2, 3, 4, 5]
doubled = numbers.map { |n| n * 2 }
puts "Doubled: #{doubled}"`,

  php: `<?php
// Welcome to CodeCollab Studio!
echo "Hello, World! 🚀\\n";

// Try some PHP here...
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map(function($n) { return $n * 2; }, $numbers);
echo "Doubled: " . implode(" ", $doubled) . "\\n";
?>`
};

// Map our language names to Judge0 language IDs
const LANGUAGE_ID_MAP = {
  'javascript': 63, // JavaScript (Node.js 14.15.4)
  'python': 71,     // Python (3.8.1)
  'java': 62,       // Java (OpenJDK 13.0.1)
  'cpp': 76,        // C++ (Clang 7.0.1)
  'c': 75,          // C (Clang 7.0.1)
  'csharp': 51,     // C# (Mono 6.6.0.161)
  'go': 60,         // Go (1.13.5)
  'rust': 73,       // Rust (1.40.0)
  'ruby': 72,       // Ruby (2.7.0)
  'php': 68,        // PHP (7.4.1)
  'swift': 83,      // Swift (5.2.3)
  'kotlin': 78      // Kotlin (1.3.70)
};

class CodeExecutionService {
  async executeCode(roomId, userId, language, code, input = '') {
    const executionId = uuidv4();
    
    try {
      console.log(`Executing code for user ${userId} in room ${roomId}, language: ${language}`);
      
      // Save execution record
      const execution = new Execution({
        roomId,
        user: userId,
        language,
        code,
        input,
        executionId,
        environment: 'judge0_online'
      });
      await execution.save();

      // Get Judge0 language ID
      const languageId = LANGUAGE_ID_MAP[language];
      if (!languageId) {
        throw new Error(`Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_ID_MAP).join(', ')}`);
      }

      console.log(`Using Judge0 language ID ${languageId} for ${language}`);

      // Execute code using Judge0 online service
      const startTime = Date.now();
      const result = await OnlineCodeExecutionService.executeCode(
        languageId,
        code,
        input,
        15, // 15 second time limit
        128000 // 128MB memory limit
      );
      
      const executionTime = Date.now() - startTime;
      console.log(`Execution completed in ${executionTime}ms, result:`, result);

      // Update execution record
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: {
            stdout: result.output.stdout,
            stderr: result.output.stderr,
            exitCode: result.output.exitCode,
            executionTime: result.output.executionTime * 1000, // Convert to milliseconds
            memoryUsed: `${result.output.memoryUsage} KB`
          },
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date(),
          rawResult: result.raw // Store raw Judge0 response for debugging
        }
      );

      return {
        executionId,
        success: result.success,
        status: result.success ? 'completed' : 'failed',
        statusDescription: result.statusDescription,
        output: {
          stdout: result.output.stdout,
          stderr: result.output.stderr,
          exitCode: result.output.exitCode,
          executionTime: Math.round(result.output.executionTime * 1000), // Convert to milliseconds
          memoryUsed: `${result.output.memoryUsage} KB`
        }
      };

    } catch (error) {
      console.error('Code execution error:', error);
      
      // Update execution record with error
      await Execution.findOneAndUpdate(
        { executionId },
        {
          output: { 
            error: error.message,
            stderr: error.message,
            stdout: '',
            exitCode: 1,
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
          exitCode: 1,
          executionTime: 0,
          memoryUsed: '0 KB'
        }
      };
    }
  }

  // Get supported languages from Judge0
  async getSupportedLanguages() {
    try {
      return await OnlineCodeExecutionService.getSupportedLanguages();
    } catch (error) {
      console.error('Failed to get supported languages:', error);
      
      // Return fallback list based on our language templates
      return Object.entries(LANGUAGE_ID_MAP).map(([key, id]) => ({
        id,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        fullName: `${key.charAt(0).toUpperCase() + key.slice(1)} (Judge0)`
      }));
    }
  }

  // Get language template/boilerplate code
  getLanguageTemplate(language) {
    try {
      // Import templates dynamically to avoid import issues
      const templates = {
        javascript: `// Welcome to CodeCollab Studio!
console.log("Hello, World! 🚀");

// Try some code here...
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);`,
        
        python: `# Welcome to CodeCollab Studio!
print("Hello, World! 🚀")

# Try some code here...
numbers = [1, 2, 3, 4, 5]
doubled = [n * 2 for n in numbers]
print("Doubled:", doubled)`,
        
        java: `// Welcome to CodeCollab Studio!
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World! 🚀");
        
        // Try some code here...
        int[] numbers = {1, 2, 3, 4, 5};
        for (int num : numbers) {
            System.out.print(num * 2 + " ");
        }
    }
}`,

        cpp: `// Welcome to CodeCollab Studio!
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World! 🚀" << std::endl;
    
    // Try some code here...
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    for (int num : numbers) {
        std::cout << num * 2 << " ";
    }
    
    return 0;
}`,

        c: `// Welcome to CodeCollab Studio!
#include <stdio.h>

int main() {
    printf("Hello, World! 🚀\\n");
    
    // Try some code here...
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);
    
    for (int i = 0; i < size; i++) {
        printf("%d ", numbers[i] * 2);
    }
    
    return 0;
}`,

        csharp: `// Welcome to CodeCollab Studio!
using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World! 🚀");
        
        // Try some code here...
        int[] numbers = {1, 2, 3, 4, 5};
        foreach (int num in numbers) {
            Console.Write(num * 2 + " ");
        }
    }
}`,

        go: `// Welcome to CodeCollab Studio!
package main

import "fmt"

func main() {
    fmt.Println("Hello, World! 🚀")
    
    // Try some code here...
    numbers := []int{1, 2, 3, 4, 5}
    for _, num := range numbers {
        fmt.Print(num * 2, " ")
    }
}`,

        rust: `// Welcome to CodeCollab Studio!
fn main() {
    println!("Hello, World! 🚀");
    
    // Try some code here...
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("{:?}", doubled);
}`,

        ruby: `# Welcome to CodeCollab Studio!
puts "Hello, World! 🚀"

# Try some code here...
numbers = [1, 2, 3, 4, 5]
doubled = numbers.map { |n| n * 2 }
puts "Doubled: #{doubled}"`
      };

      return templates[language] || `// Welcome to CodeCollab Studio!
// ${language.charAt(0).toUpperCase() + language.slice(1)} code here...
`;
    } catch (error) {
      console.error('Error getting language template:', error);
      return '// Welcome to CodeCollab Studio!\n// Start coding here...';
    }
  }

  // Test connectivity to Judge0 API
  async testConnectivity() {
    return await OnlineCodeExecutionService.testConnectivity();
  }

  // Get execution service statistics
  getServiceStats() {
    return OnlineCodeExecutionService.getStats();
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