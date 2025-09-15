import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import EnhancedCodeExecutionService from '../services/enhancedCodeExecution.service.js';
import { body, param, query } from 'express-validator';
import { validationResult } from 'express-validator';

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Execute code - Enhanced endpoint for OnlineGDB-style execution
 */
router.post('/execute', [
  authenticate,
  body('language').isIn(['c', 'cpp', 'java', 'python', 'javascript', 'csharp', 'go', 'rust', 'php', 'ruby'])
    .withMessage('Unsupported language'),
  body('code').isLength({ min: 1, max: 50000 })
    .withMessage('Code must be between 1 and 50000 characters'),
  body('input').optional().isLength({ max: 10000 })
    .withMessage('Input must be less than 10000 characters'),
  body('roomId').isUUID().withMessage('Invalid room ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { language, code, input = '', roomId } = req.body;
    const userId = req.user.id;

    console.log(`IDE Execute Request: ${language} code execution by user ${userId} in room ${roomId}`);

    const result = await EnhancedCodeExecutionService.executeCode(
      roomId,
      userId,
      language,
      code,
      input
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('IDE execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Code execution failed',
      message: error.message
    });
  }
});

/**
 * Get supported languages
 */
router.get('/languages', authenticate, async (req, res) => {
  try {
    const languages = EnhancedCodeExecutionService.getSupportedLanguages();

    res.json({
      success: true,
      data: {
        languages,
        total: languages.length
      }
    });

  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported languages',
      message: error.message
    });
  }
});

/**
 * Get execution history for a room
 */
router.get('/history/:roomId', [
  authenticate,
  param('roomId').isMongoId().withMessage('Invalid room ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const history = await EnhancedCodeExecutionService.getExecutionHistory(roomId, page, limit);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution history',
      message: error.message
    });
  }
});

/**
 * Get single execution details
 */
router.get('/execution/:executionId', [
  authenticate,
  param('executionId').isUUID().withMessage('Invalid execution ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { executionId } = req.params;

    const execution = await EnhancedCodeExecutionService.getExecutionById(executionId);

    if (!execution) {
      return res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
    }

    res.json({
      success: true,
      data: execution
    });

  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch execution details',
      message: error.message
    });
  }
});

/**
 * Test Judge0 connectivity
 */
router.get('/connectivity', authenticate, async (req, res) => {
  try {
    const connectivityTest = await EnhancedCodeExecutionService.testConnectivity();

    res.json({
      success: true,
      data: connectivityTest
    });

  } catch (error) {
    console.error('Connectivity test error:', error);
    res.status(500).json({
      success: false,
      error: 'Connectivity test failed',
      message: error.message
    });
  }
});

/**
 * Get service statistics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = EnhancedCodeExecutionService.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch service statistics',
      message: error.message
    });
  }
});

/**
 * Get language template/boilerplate
 */
router.get('/template/:language', [
  authenticate,
  param('language').isIn(['c', 'cpp', 'java', 'python', 'javascript', 'csharp', 'go', 'rust', 'php', 'ruby'])
    .withMessage('Unsupported language'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { language } = req.params;

    // Import the comprehensive language templates
    const templates = {
      'c': `// Welcome to CodeCollab Studio IDE!
// C programming example

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Function prototypes
int factorial(int n);
void greetUser(char* name);

int main() {
    printf("Hello, World! 🚀\\n");
    printf("This is a C program\\n\\n");

    // Example: Calculate factorial
    int num = 5;
    printf("Factorial of %d: %d\\n", num, factorial(num));

    // Example: Working with arrays
    int numbers[] = {1, 2, 3, 4, 5};
    int size = sizeof(numbers) / sizeof(numbers[0]);

    printf("Original array: ");
    for(int i = 0; i < size; i++) {
        printf("%d ", numbers[i]);
    }
    printf("\\n");

    printf("Doubled array: ");
    for(int i = 0; i < size; i++) {
        printf("%d ", numbers[i] * 2);
    }
    printf("\\n");

    return 0;
}

// Function implementations
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

void greetUser(char* name) {
    printf("Nice to meet you, %s!\\n", name);
}`,

      'cpp': `// Welcome to CodeCollab Studio IDE!
// C++ programming example

#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

// Function prototypes
int factorial(int n);
void greetUser(const string& name);

int main() {
    cout << "Hello, World! 🚀" << endl;
    cout << "This is a C++ program" << endl << endl;

    // Example: Calculate factorial
    int num = 5;
    cout << "Factorial of " << num << ": " << factorial(num) << endl;

    // Example: Working with vectors
    vector<int> numbers = {1, 2, 3, 4, 5};
    vector<int> doubled;

    // Transform using lambda
    transform(numbers.begin(), numbers.end(),
              back_inserter(doubled), [](int n) { return n * 2; });

    cout << "Original vector: ";
    for(int n : numbers) cout << n << " ";
    cout << endl;

    cout << "Doubled vector: ";
    for(int n : doubled) cout << n << " ";
    cout << endl;

    return 0;
}

// Function implementations
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

void greetUser(const string& name) {
    cout << "Nice to meet you, " << name << "!" << endl;
}`,

      'java': `// Welcome to CodeCollab Studio IDE!
// Java programming example

import java.util.*;
import java.util.stream.Collectors;

public class Main {

    public static void main(String[] args) {
        System.out.println("Hello, World! 🚀");
        System.out.println("This is a Java program");
        System.out.println();

        // Example: Calculate factorial
        int num = 5;
        System.out.println("Factorial of " + num + ": " + factorial(num));

        // Example: Working with collections
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);
        List<Integer> doubled = numbers.stream()
                                      .map(n -> n * 2)
                                      .collect(Collectors.toList());

        System.out.println("Original list: " + numbers);
        System.out.println("Doubled list: " + doubled);

        // Example: Working with objects
        Person person = new Person("Alice", 30);
        System.out.println("Person: " + person);
    }

    // Method to calculate factorial
    public static long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }

    // Simple Person class
    static class Person {
        private String name;
        private int age;

        public Person(String name, int age) {
            this.name = name;
            this.age = age;
        }

        @Override
        public String toString() {
            return name + " (age: " + age + ")";
        }
    }
}`,

      'python': `# Welcome to CodeCollab Studio IDE!
# Python programming example

import math
import sys

def factorial(n):
    """Calculate factorial of n"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def greet_user(name):
    """Greet the user"""
    print(f"Nice to meet you, {name}!")

def main():
    print("Hello, World! 🚀")
    print("This is a Python program")
    print()

    # Example: Calculate factorial
    num = 5
    print(f"Factorial of {num}: {factorial(num)}")

    # Example: Working with lists
    numbers = [1, 2, 3, 4, 5]
    doubled = [n * 2 for n in numbers]

    print(f"Original list: {numbers}")
    print(f"Doubled list: {doubled}")

    # Example: Dictionary operations
    person = {
        'name': 'Alice',
        'age': 30,
        'city': 'New York'
    }

    print(f"Person info: {person}")

    # Example: Mathematical operations
    print(f"Square root of 16: {math.sqrt(16)}")
    print(f"Pi value: {math.pi:.2f}")

if __name__ == "__main__":
    main()`,

      'javascript': `// Welcome to CodeCollab Studio IDE!
// JavaScript example with input/output

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Hello, World! 🚀");
console.log("This is a JavaScript program running on Node.js");

// Example: Calculate factorial
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log("Factorial of 5:", factorial(5));

// Example: Working with arrays
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log("Original:", numbers);
console.log("Doubled:", doubled);

// Close readline interface
rl.close();`,

      'csharp': `// Welcome to CodeCollab Studio IDE!
// C# programming example

using System;
using System.Collections.Generic;
using System.Linq;

namespace CodeCollabStudio
{
    // Person class
    public class Person
    {
        public string Name { get; set; }
        public int Age { get; set; }

        public Person(string name, int age)
        {
            Name = name;
            Age = age;
        }

        public void Greet()
        {
            Console.WriteLine($"Nice to meet you, {Name}!");
        }

        public override string ToString()
        {
            return $"{Name} (age: {Age})";
        }
    }

    class Program
    {
        // Method to calculate factorial
        static long Factorial(int n)
        {
            if (n <= 1) return 1;
            return n * Factorial(n - 1);
        }

        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World! 🚀");
            Console.WriteLine("This is a C# program");
            Console.WriteLine();

            // Example: Calculate factorial
            int num = 5;
            Console.WriteLine($"Factorial of {num}: {Factorial(num)}");

            // Example: Working with collections
            var numbers = new List<int> { 1, 2, 3, 4, 5 };
            var doubled = numbers.Select(n => n * 2).ToList();

            Console.WriteLine($"Original list: [{string.Join(", ", numbers)}]");
            Console.WriteLine($"Doubled list: [{string.Join(", ", doubled)}]");

            // Example: Working with objects
            var person = new Person("Alice", 30);
            Console.WriteLine($"Person object: {person}");
        }
    }
}`,

      'go': `// Welcome to CodeCollab Studio IDE!
// Go programming example

package main

import (
    "fmt"
    "math"
)

// Person struct
type Person struct {
    Name string
    Age  int
}

// Method for Person
func (p Person) String() string {
    return fmt.Sprintf("%s (age: %d)", p.Name, p.Age)
}

// Function to calculate factorial
func factorial(n int) int {
    if n <= 1 {
        return 1
    }
    return n * factorial(n-1)
}

func main() {
    fmt.Println("Hello, World! 🚀")
    fmt.Println("This is a Go program")
    fmt.Println()

    // Example: Calculate factorial
    num := 5
    fmt.Printf("Factorial of %d: %d\\n", num, factorial(num))

    // Example: Working with slices
    numbers := []int{1, 2, 3, 4, 5}
    var doubled []int

    for _, n := range numbers {
        doubled = append(doubled, n*2)
    }

    fmt.Printf("Original slice: %v\\n", numbers)
    fmt.Printf("Doubled slice: %v\\n", doubled)

    // Example: Working with structs
    person := Person{Name: "Alice", Age: 30}
    fmt.Printf("Person: %s\\n", person)

    // Example: Mathematical operations
    fmt.Printf("Square root of 16: %.2f\\n", math.Sqrt(16))
    fmt.Printf("Pi value: %.2f\\n", math.Pi)
}`,

      'rust': `// Welcome to CodeCollab Studio IDE!
// Rust programming example

use std::f64;

// Struct definition
#[derive(Debug)]
struct Person {
    name: String,
    age: u32,
}

impl Person {
    fn new(name: String, age: u32) -> Self {
        Person { name, age }
    }
}

// Function to calculate factorial
fn factorial(n: u64) -> u64 {
    match n {
        0 | 1 => 1,
        _ => n * factorial(n - 1),
    }
}

fn main() {
    println!("Hello, World! 🚀");
    println!("This is a Rust program");
    println!();

    // Example: Calculate factorial
    let num = 5;
    println!("Factorial of {}: {}", num, factorial(num));

    // Example: Working with vectors
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();

    println!("Original vector: {:?}", numbers);
    println!("Doubled vector: {:?}", doubled);

    // Example: Working with structs
    let person = Person::new("Alice".to_string(), 30);
    println!("Person: {:?}", person);

    // Example: Mathematical operations
    println!("Square root of 16: {:.2}", (16.0_f64).sqrt());
    println!("Pi value: {:.2}", f64::consts::PI);
}`,

      'php': `<?php
// Welcome to CodeCollab Studio IDE!
// PHP programming example

// Person class
class Person {
    private $name;
    private $age;

    public function __construct($name, $age) {
        $this->name = $name;
        $this->age = $age;
    }

    public function greet() {
        echo "Nice to meet you, " . $this->name . "!\\n";
    }

    public function __toString() {
        return $this->name . " (age: " . $this->age . ")";
    }
}

// Function to calculate factorial
function factorial($n) {
    if ($n <= 1) return 1;
    return $n * factorial($n - 1);
}

// Main program
echo "Hello, World! 🚀\\n";
echo "This is a PHP program\\n\\n";

// Example: Calculate factorial
$num = 5;
echo "Factorial of $num: " . factorial($num) . "\\n";

// Example: Working with arrays
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map(function($n) { return $n * 2; }, $numbers);

echo "Original array: " . implode(", ", $numbers) . "\\n";
echo "Doubled array: " . implode(", ", $doubled) . "\\n";

// Example: Working with objects
$person = new Person("Alice", 30);
echo "Person object: " . $person . "\\n";

// Example: String manipulation
$text = "Hello, PHP World!";
echo "Original: $text\\n";
echo "Uppercase: " . strtoupper($text) . "\\n";
echo "Word count: " . str_word_count($text) . "\\n";
?>`,

      'ruby': `# Welcome to CodeCollab Studio IDE!
# Ruby programming example

# Person class
class Person
  attr_accessor :name, :age

  def initialize(name, age)
    @name = name
    @age = age
  end

  def greet
    puts "Nice to meet you, #{@name}!"
  end

  def to_s
    "#{@name} (age: #{@age})"
  end
end

# Method to calculate factorial
def factorial(n)
  return 1 if n <= 1
  n * factorial(n - 1)
end

# Main program
puts "Hello, World! 🚀"
puts "This is a Ruby program"
puts

# Example: Calculate factorial
num = 5
puts "Factorial of #{num}: #{factorial(num)}"

# Example: Working with arrays
numbers = [1, 2, 3, 4, 5]
doubled = numbers.map { |n| n * 2 }

puts "Original array: #{numbers}"
puts "Doubled array: #{doubled}"

# Example: Working with objects
person = Person.new("Alice", 30)
puts "Person object: #{person}"

# Example: String manipulation
text = "Hello, Ruby World!"
puts "Original: #{text}"
puts "Uppercase: #{text.upcase}"
puts "Word count: #{text.split.length}"`
    };

    const template = templates[language];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: {
        language,
        template,
        description: `Default ${language.toUpperCase()} template`
      }
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch language template',
      message: error.message
    });
  }
});

export default router;