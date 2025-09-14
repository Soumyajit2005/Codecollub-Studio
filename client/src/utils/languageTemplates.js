// Language templates with boilerplate code for the online IDE
// Based on Judge0 API language IDs and popular programming languages

export const LANGUAGE_TEMPLATES = {
  // Web Development
  javascript: {
    id: 63,
    name: 'JavaScript (Node.js 14.15.4)',
    extension: 'js',
    mode: 'javascript',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
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

// Interactive input example
rl.question('Enter your name: ', (name) => {
  console.log(\`Nice to meet you, \${name}!\`);
  rl.close();
});`
  },

  // Systems Programming
  c: {
    id: 75,
    name: 'C (Clang 7.0.1)',
    extension: 'c',
    mode: 'c_cpp',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
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
    
    // Interactive input example
    char name[100];
    printf("Enter your name: ");
    if(fgets(name, sizeof(name), stdin) != NULL) {
        // Remove newline character
        name[strcspn(name, "\\n")] = 0;
        greetUser(name);
    }
    
    return 0;
}

// Function implementations
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

void greetUser(char* name) {
    printf("Nice to meet you, %s!\\n", name);
}`
  },

  cpp: {
    id: 76,
    name: 'C++ (Clang 7.0.1)',
    extension: 'cpp',
    mode: 'c_cpp',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
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
    
    // Interactive input example
    string name;
    cout << "Enter your name: ";
    getline(cin, name);
    greetUser(name);
    
    return 0;
}

// Function implementations
int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

void greetUser(const string& name) {
    cout << "Nice to meet you, " << name << "!" << endl;
}`
  },

  python: {
    id: 71,
    name: 'Python (3.8.1)',
    extension: 'py',
    mode: 'python',
    boilerplate: `# Welcome to CodeCollab Studio IDE!
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
    
    # Example: Dictionary and string operations
    person = {
        'name': 'Alice',
        'age': 30,
        'city': 'New York'
    }
    
    print(f"Person info: {person}")
    
    # Interactive input example
    try:
        name = input("Enter your name: ")
        greet_user(name)
    except EOFError:
        print("Input not available in this environment")
    
    # Example: Mathematical operations
    print(f"Square root of 16: {math.sqrt(16)}")
    print(f"Pi value: {math.pi:.2f}")

if __name__ == "__main__":
    main()`
  },

  java: {
    id: 62,
    name: 'Java (OpenJDK 13.0.1)',
    extension: 'java',
    mode: 'java',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
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
        
        // Interactive input example
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your name: ");
        try {
            String name = scanner.nextLine();
            greetUser(name);
        } catch (Exception e) {
            System.out.println("Input not available in this environment");
        }
        scanner.close();
    }
    
    // Method to calculate factorial
    public static long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    
    // Method to greet user
    public static void greetUser(String name) {
        System.out.println("Nice to meet you, " + name + "!");
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
}`
  },

  go: {
    id: 60,
    name: 'Go (1.13.5)',
    extension: 'go',
    mode: 'golang',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
// Go programming example

package main

import (
    "bufio"
    "fmt"
    "math"
    "os"
    "strings"
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

// Function to greet user
func greetUser(name string) {
    fmt.Printf("Nice to meet you, %s!\\n", name)
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
    
    // Interactive input example
    fmt.Print("Enter your name: ")
    reader := bufio.NewReader(os.Stdin)
    if name, err := reader.ReadString('\\n'); err == nil {
        name = strings.TrimSpace(name)
        greetUser(name)
    } else {
        fmt.Println("Input not available in this environment")
    }
    
    // Example: Mathematical operations
    fmt.Printf("Square root of 16: %.2f\\n", math.Sqrt(16))
    fmt.Printf("Pi value: %.2f\\n", math.Pi)
}`
  },

  rust: {
    id: 73,
    name: 'Rust (1.40.0)',
    extension: 'rs',
    mode: 'rust',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
// Rust programming example

use std::io;

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
    
    fn greet(&self) {
        println!("Nice to meet you, {}!", self.name);
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
    
    // Interactive input example
    println!("Enter your name: ");
    let mut input = String::new();
    match io::stdin().read_line(&mut input) {
        Ok(_) => {
            let name = input.trim();
            let user = Person::new(name.to_string(), 25);
            user.greet();
        }
        Err(_) => println!("Input not available in this environment"),
    }
    
    // Example: Pattern matching
    let numbers = vec![1, 2, 3, 4, 5];
    for num in numbers {
        match num {
            1 => println!("One!"),
            2..=4 => println!("Between 2 and 4: {}", num),
            _ => println!("Something else: {}", num),
        }
    }
}`
  },

  ruby: {
    id: 72,
    name: 'Ruby (2.7.0)',
    extension: 'rb',
    mode: 'ruby',
    boilerplate: `# Welcome to CodeCollab Studio IDE!
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

# Example: Working with hashes
person_hash = {
  name: "Alice",
  age: 30,
  city: "New York"
}

puts "Person hash: #{person_hash}"

# Example: Working with objects
person = Person.new("Bob", 25)
puts "Person object: #{person}"

# Interactive input example
print "Enter your name: "
begin
  name = gets.chomp
  user = Person.new(name, 20)
  user.greet
rescue
  puts "Input not available in this environment"
end

# Example: Blocks and iterators
puts "Numbers with their squares:"
(1..5).each do |i|
  puts "#{i}^2 = #{i ** 2}"
end

# Example: String manipulation
text = "Hello, Ruby World!"
puts "Original: #{text}"
puts "Uppercase: #{text.upcase}"
puts "Word count: #{text.split.length}"`
  },

  php: {
    id: 68,
    name: 'PHP (7.4.1)',
    extension: 'php',
    mode: 'php',
    boilerplate: `<?php
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

// Example: Associative arrays
$person_array = [
    'name' => 'Alice',
    'age' => 30,
    'city' => 'New York'
];

echo "Person array: " . json_encode($person_array) . "\\n";

// Example: Working with objects
$person = new Person("Bob", 25);
echo "Person object: " . $person . "\\n";

// Interactive input example (limited in web environment)
echo "Enter your name: ";
$handle = fopen("php://stdin", "r");
if ($handle) {
    $name = trim(fgets($handle));
    $user = new Person($name, 20);
    $user->greet();
    fclose($handle);
} else {
    echo "Input not available in this environment\\n";
}

// Example: String manipulation
$text = "Hello, PHP World!";
echo "Original: $text\\n";
echo "Uppercase: " . strtoupper($text) . "\\n";
echo "Word count: " . str_word_count($text) . "\\n";

// Example: Date and time
echo "Current date: " . date('Y-m-d H:i:s') . "\\n";
?>`
  },

  csharp: {
    id: 51,
    name: 'C# (Mono 6.6.0.161)',
    extension: 'cs',
    mode: 'csharp',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
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
            
            // Example: Working with dictionaries
            var personDict = new Dictionary<string, object>
            {
                { "name", "Alice" },
                { "age", 30 },
                { "city", "New York" }
            };
            
            Console.WriteLine("Person dictionary:");
            foreach (var kvp in personDict)
            {
                Console.WriteLine($"  {kvp.Key}: {kvp.Value}");
            }
            
            // Example: Working with objects
            var person = new Person("Bob", 25);
            Console.WriteLine($"Person object: {person}");
            
            // Interactive input example
            Console.Write("Enter your name: ");
            try
            {
                string name = Console.ReadLine();
                var user = new Person(name, 20);
                user.Greet();
            }
            catch (Exception)
            {
                Console.WriteLine("Input not available in this environment");
            }
            
            // Example: LINQ operations
            var evenNumbers = numbers.Where(n => n % 2 == 0);
            Console.WriteLine($"Even numbers: [{string.Join(", ", evenNumbers)}]");
            
            // Example: String operations
            string text = "Hello, C# World!";
            Console.WriteLine($"Original: {text}");
            Console.WriteLine($"Uppercase: {text.ToUpper()}");
            Console.WriteLine($"Word count: {text.Split(' ').Length}");
        }
    }
}`
  },

  swift: {
    id: 83,
    name: 'Swift (5.2.3)',
    extension: 'swift',
    mode: 'swift',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
// Swift programming example

import Foundation

// Person struct
struct Person {
    let name: String
    let age: Int
    
    func greet() {
        print("Nice to meet you, \\(name)!")
    }
}

// Function to calculate factorial
func factorial(_ n: Int) -> Int {
    if n <= 1 { return 1 }
    return n * factorial(n - 1)
}

// Main program
print("Hello, World! 🚀")
print("This is a Swift program")
print()

// Example: Calculate factorial
let num = 5
print("Factorial of \\(num): \\(factorial(num))")

// Example: Working with arrays
let numbers = [1, 2, 3, 4, 5]
let doubled = numbers.map { $0 * 2 }

print("Original array: \\(numbers)")
print("Doubled array: \\(doubled)")

// Example: Working with dictionaries
let personDict: [String: Any] = [
    "name": "Alice",
    "age": 30,
    "city": "New York"
]

print("Person dictionary: \\(personDict)")

// Example: Working with structs
let person = Person(name: "Bob", age: 25)
print("Person: \\(person.name) (age: \\(person.age))")

// Interactive input example (limited in online environment)
print("Enter your name: ", terminator: "")
if let name = readLine() {
    let user = Person(name: name, age: 20)
    user.greet()
} else {
    print("Input not available in this environment")
}

// Example: Higher-order functions
let evenNumbers = numbers.filter { $0 % 2 == 0 }
print("Even numbers: \\(evenNumbers)")

let sum = numbers.reduce(0, +)
print("Sum of numbers: \\(sum)")

// Example: String manipulation
let text = "Hello, Swift World!"
print("Original: \\(text)")
print("Uppercase: \\(text.uppercased())")
print("Word count: \\(text.components(separatedBy: " ").count)")`
  },

  kotlin: {
    id: 78,
    name: 'Kotlin (1.3.70)',
    extension: 'kt',
    mode: 'kotlin',
    boilerplate: `// Welcome to CodeCollab Studio IDE!
// Kotlin programming example

// Person data class
data class Person(val name: String, val age: Int) {
    fun greet() {
        println("Nice to meet you, $name!")
    }
}

// Function to calculate factorial
fun factorial(n: Int): Long {
    return if (n <= 1) 1 else n * factorial(n - 1)
}

fun main() {
    println("Hello, World! 🚀")
    println("This is a Kotlin program")
    println()
    
    // Example: Calculate factorial
    val num = 5
    println("Factorial of $num: \${factorial(num)}")
    
    // Example: Working with collections
    val numbers = listOf(1, 2, 3, 4, 5)
    val doubled = numbers.map { it * 2 }
    
    println("Original list: $numbers")
    println("Doubled list: $doubled")
    
    // Example: Working with maps
    val personMap = mapOf(
        "name" to "Alice",
        "age" to 30,
        "city" to "New York"
    )
    
    println("Person map: $personMap")
    
    // Example: Working with objects
    val person = Person("Bob", 25)
    println("Person object: $person")
    
    // Interactive input example
    print("Enter your name: ")
    val name = readLine()
    if (name != null) {
        val user = Person(name, 20)
        user.greet()
    } else {
        println("Input not available in this environment")
    }
    
    // Example: Higher-order functions
    val evenNumbers = numbers.filter { it % 2 == 0 }
    println("Even numbers: $evenNumbers")
    
    val sum = numbers.reduce { acc, n -> acc + n }
    println("Sum of numbers: $sum")
    
    // Example: String templates and operations
    val text = "Hello, Kotlin World!"
    println("Original: $text")
    println("Uppercase: \${text.uppercase()}")
    println("Word count: \${text.split(" ").size}")
    
    // Example: When expression
    for (i in 1..5) {
        val description = when (i) {
            1 -> "First"
            2, 3 -> "Second or Third"
            in 4..5 -> "Fourth or Fifth"
            else -> "Other"
        }
        println("$i: $description")
    }
}`
  }
};

// Language categories for better organization
export const LANGUAGE_CATEGORIES = {
  'Web Development': ['javascript'],
  'Systems Programming': ['c', 'cpp', 'rust', 'go'],
  'General Purpose': ['python', 'java', 'csharp'],
  'Scripting': ['ruby', 'php'],
  'Mobile Development': ['swift', 'kotlin']
};

// Get language by ID
export const getLanguageById = (id) => {
  return Object.values(LANGUAGE_TEMPLATES).find(lang => lang.id === id);
};

// Get language by name
export const getLanguageByName = (name) => {
  return LANGUAGE_TEMPLATES[name];
};

// Get all supported languages
export const getAllLanguages = () => {
  return Object.entries(LANGUAGE_TEMPLATES).map(([key, lang]) => ({
    key,
    ...lang
  }));
};

// Get languages by category
export const getLanguagesByCategory = (category) => {
  const languageKeys = LANGUAGE_CATEGORIES[category] || [];
  return languageKeys.map(key => ({
    key,
    ...LANGUAGE_TEMPLATES[key]
  }));
};

export default LANGUAGE_TEMPLATES;