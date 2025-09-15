import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  Button,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Slider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import {
  Play,
  Square,
  Terminal,
  Settings,
  Code,
  FileText,
  Folder,
  FolderPlus,
  FilePlus,
  Trash2,
  Download,
  Upload,
  Copy,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  Save,
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';
import AceEditor from 'react-ace';

// Import ACE Editor modes and themes
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-c_cpp';
import 'ace-builds/src-noconflict/mode-csharp';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-golang';
import 'ace-builds/src-noconflict/mode-rust';
import 'ace-builds/src-noconflict/mode-ruby';
import 'ace-builds/src-noconflict/mode-php';

// Import ACE Editor themes
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-terminal';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';

// Import extensions
import 'ace-builds/src-noconflict/ext-language_tools';

import toast from 'react-hot-toast';

// Language configurations
const SUPPORTED_LANGUAGES = [
  { id: 63, key: 'javascript', name: 'JavaScript', mode: 'javascript' },
  { id: 71, key: 'python', name: 'Python', mode: 'python' },
  { id: 62, key: 'java', name: 'Java', mode: 'java' },
  { id: 76, key: 'cpp', name: 'C++', mode: 'c_cpp' },
  { id: 75, key: 'c', name: 'C', mode: 'c_cpp' },
  { id: 51, key: 'csharp', name: 'C#', mode: 'csharp' },
  { id: 60, key: 'go', name: 'Go', mode: 'golang' },
  { id: 73, key: 'rust', name: 'Rust', mode: 'rust' },
  { id: 72, key: 'ruby', name: 'Ruby', mode: 'ruby' },
  { id: 68, key: 'php', name: 'PHP', mode: 'php' }
];

const EDITOR_THEMES = [
  'monokai',
  'github',
  'tomorrow',
  'twilight',
  'terminal',
  'solarized_dark',
  'solarized_light'
];

const ProfessionalIDE = ({ 
  roomId, 
  user, 
  socketService, 
  isAdmin = false,
  initialLanguage = 'javascript',
  onLanguageChange,
  onCodeChange
}) => {
  // Core IDE state
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [executionHistory, setExecutionHistory] = useState([]);

  // UI State
  const [showTerminal, setShowTerminal] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Editor Settings
  const [editorSettings, setEditorSettings] = useState({
    theme: 'monokai',
    fontSize: 14,
    tabSize: 4,
    wordWrap: false,
    showGutter: true,
    highlightActiveLine: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  });

  const editorRef = useRef(null);
  const inputRef = useRef(null);

  // Load language template when language changes
  useEffect(() => {
    loadLanguageTemplate(currentLanguage);
  }, [currentLanguage]);

  // Socket listeners for real-time collaboration
  useEffect(() => {
    if (socketService?.socket) {
      const socket = socketService.socket;
      
      socket.on('code-execution-result', handleExecutionResult);
      socket.on('language-changed', handleLanguageChange);
      socket.on('code-updated', handleCodeUpdate);

      return () => {
        socket.off('code-execution-result');
        socket.off('language-changed');
        socket.off('code-updated');
      };
    }
  }, [socketService]);

  const loadLanguageTemplate = async (language) => {
    try {
      const response = await fetch(`/api/code/template/${language}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCode(data.template || await getDefaultTemplate(language));
      } else {
        setCode(await getDefaultTemplate(language));
      }
    } catch (error) {
      console.error('Failed to load language template:', error);
      setCode(await getDefaultTemplate(language));
    }
  };

  const getDefaultTemplate = async (language) => {
    // Try to fetch from API first
    try {
      const response = await fetch(`/api/ide/template/${language}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data.template;
      }
    } catch (error) {
      console.error('Failed to fetch template from API:', error);
    }

    // Fallback templates if API fails
    const templates = {
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
        
        // Interactive input example
        Scanner scanner = new Scanner(System.in);
        // Uncomment to test input:
        // System.out.print("What is your name? ");
        // String name = scanner.nextLine();
        // System.out.println("Hello, " + name + "!");
        scanner.close();
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
    
    // Interactive input example
    // Uncomment to test input:
    // std::string name;
    // std::cout << "What is your name? ";
    // std::getline(std::cin, name);
    // std::cout << "Hello, " << name << "!" << std::endl;
    
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
    
    // Interactive input example
    // Uncomment to test input:
    // char name[100];
    // printf("What is your name? ");
    // fgets(name, sizeof(name), stdin);
    // printf("Hello, %s", name);
    
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
        
        // Interactive input example
        // Uncomment to test input:
        // Console.Write("What is your name? ");
        // string name = Console.ReadLine();
        // Console.WriteLine($"Hello, {name}!");
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
    
    // Interactive input example
    // Uncomment to test input:
    // var name string
    // fmt.Print("What is your name? ")
    // fmt.Scanln(&name)
    // fmt.Printf("Hello, %s!\\n", name)
}`,

      rust: `// Welcome to CodeCollab Studio!
fn main() {
    println!("Hello, World! 🚀");
    
    // Try some Rust here...
    let numbers = vec![1, 2, 3, 4, 5];
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled);
    
    // Interactive input example
    // Uncomment to test input:
    // use std::io;
    // println!("What is your name?");
    // let mut name = String::new();
    // io::stdin().read_line(&mut name).expect("Failed to read line");
    // println!("Hello, {}!", name.trim());
}`,

      ruby: `# Welcome to CodeCollab Studio!
puts "Hello, World! 🚀"

# Try some Ruby here...
numbers = [1, 2, 3, 4, 5]
doubled = numbers.map { |n| n * 2 }
puts "Doubled: #{doubled}"

# Interactive input example
# Uncomment to test input:
# print "What is your name? "
# name = gets.chomp
# puts "Hello, #{name}!"`,

      php: `<?php
// Welcome to CodeCollab Studio!
echo "Hello, World! 🚀\\n";

// Try some PHP here...
$numbers = [1, 2, 3, 4, 5];
$doubled = array_map(function($n) { return $n * 2; }, $numbers);
echo "Doubled: " . implode(" ", $doubled) . "\\n";

// Interactive input example
// Uncomment to test input:
// echo "What is your name? ";
// $name = trim(fgets(STDIN));
// echo "Hello, $name!\\n";
?>`
    };

    return templates[language] || `// Welcome to CodeCollab Studio!
// Start coding in ${language}...
console.log("Hello, World! 🚀");`;
  };

  const handleLanguageChange = useCallback((data) => {
    if (data.userId !== user.id) {
      setCurrentLanguage(data.language);
      toast.info(`${data.username} changed language to ${data.language}`);
    }
  }, [user.id]);

  const handleCodeUpdate = useCallback((data) => {
    if (data.userId !== user.id) {
      setCode(data.code);
    }
  }, [user.id]);

  const handleExecutionResult = useCallback((result) => {
    setExecutionResult(result);
    setIsExecuting(false);
    setShowTerminal(true);
    
    // Add to execution history
    setExecutionHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 executions
    
    if (result.success) {
      toast.success('Code executed successfully!');
    } else {
      toast.error('Code execution failed');
    }
  }, []);

  const onLanguageSelect = (language) => {
    setCurrentLanguage(language);
    
    // Notify other users
    if (socketService?.socket) {
      socketService.socket.emit('language-changed', {
        roomId,
        language,
        userId: user.id,
        username: user.username
      });
    }
    
    // Call parent callback
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  };

  const onCodeEdit = (value) => {
    setCode(value);
    
    // Notify other users
    if (socketService?.socket) {
      socketService.socket.emit('code-change', {
        roomId,
        code: value,
        language: currentLanguage,
        userId: user.id
      });
    }
    
    // Call parent callback
    if (onCodeChange) {
      onCodeChange(value, currentLanguage);
    }
  };

  const executeCode = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    setExecutionResult(null);
    setShowTerminal(true);
    
    toast.loading('Executing code...', { duration: 1000 });
    
    try {
      const response = await fetch(`/api/code/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId,
          language: currentLanguage,
          code,
          input: input.trim()
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        handleExecutionResult(result);
        
        // Broadcast execution result to other users
        if (socketService?.socket) {
          socketService.socket.emit('code-execution-result', {
            roomId,
            result,
            userId: user.id,
            username: user.username
          });
        }
      } else {
        throw new Error(result.error || 'Execution failed');
      }
    } catch (error) {
      console.error('Code execution error:', error);
      
      const errorResult = {
        success: false,
        status: 'failed',
        output: {
          error: error.message,
          stderr: error.message,
          stdout: '',
          exitCode: 1,
          executionTime: 0,
          memoryUsed: '0 KB'
        }
      };
      
      handleExecutionResult(errorResult);
    }
  };

  const stopExecution = () => {
    setIsExecuting(false);
    toast.error('Execution stopped');
  };

  const clearOutput = () => {
    setExecutionResult(null);
    setExecutionHistory([]);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const getCurrentLanguageConfig = () => {
    return SUPPORTED_LANGUAGES.find(lang => lang.key === currentLanguage) || SUPPORTED_LANGUAGES[0];
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e1e' }}>
      {/* Toolbar */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#2d2d30',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          px: 2,
          py: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Language Selection */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={currentLanguage}
                onChange={(e) => onLanguageSelect(e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.23)'
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white'
                  }
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <MenuItem key={lang.key} value={lang.key}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Code size={16} style={{ marginRight: 8 }} />
                      {lang.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Chip
              label={`Judge0 ID: ${getCurrentLanguageConfig().id}`}
              size="small"
              sx={{
                bgcolor: 'rgba(66, 133, 244, 0.1)',
                color: '#4285f4',
                fontFamily: 'monospace'
              }}
            />
          </Box>

          {/* Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Input/Arguments">
              <IconButton
                size="small"
                onClick={() => setShowInput(!showInput)}
                sx={{ 
                  color: showInput ? '#4285f4' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: showInput ? 'rgba(66, 133, 244, 0.1)' : 'transparent'
                }}
              >
                <FileText size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isExecuting ? "Stop Execution" : "Run Code"}>
              <IconButton
                onClick={isExecuting ? stopExecution : executeCode}
                disabled={!code.trim()}
                sx={{
                  color: isExecuting ? '#ea4335' : '#34a853',
                  bgcolor: isExecuting ? 'rgba(234, 67, 53, 0.1)' : 'rgba(52, 168, 83, 0.1)',
                  '&:hover': {
                    bgcolor: isExecuting ? 'rgba(234, 67, 53, 0.2)' : 'rgba(52, 168, 83, 0.2)'
                  }
                }}
              >
                {isExecuting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Play size={18} />
                )}
              </IconButton>
            </Tooltip>

            <Tooltip title={showTerminal ? "Hide Terminal" : "Show Terminal"}>
              <IconButton
                size="small"
                onClick={() => setShowTerminal(!showTerminal)}
                sx={{ 
                  color: showTerminal ? '#4285f4' : 'rgba(255, 255, 255, 0.7)',
                  bgcolor: showTerminal ? 'rgba(66, 133, 244, 0.1)' : 'transparent'
                }}
              >
                <Terminal size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Settings">
              <IconButton
                size="small"
                onClick={() => setShowSettings(true)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                <Settings size={18} />
              </IconButton>
            </Tooltip>

            <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
              <IconButton
                size="small"
                onClick={() => setIsFullscreen(!isFullscreen)}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Input Section */}
        <AnimatePresence>
          {showInput && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Box sx={{ mt: 2, mb: 1 }}>
                <TextField
                  ref={inputRef}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Enter input for your program (stdin)..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      fontFamily: 'monospace',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.4)' },
                      '&.Mui-focused fieldset': { borderColor: '#4285f4' }
                    }
                  }}
                />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Code Editor */}
        <Box sx={{ flex: showTerminal ? 1 : 1, display: 'flex', flexDirection: 'column' }}>
          <AceEditor
            ref={editorRef}
            mode={getCurrentLanguageConfig().mode}
            theme={editorSettings.theme}
            value={code}
            onChange={onCodeEdit}
            width="100%"
            height="100%"
            fontSize={editorSettings.fontSize}
            tabSize={editorSettings.tabSize}
            wrapEnabled={editorSettings.wordWrap}
            showGutter={editorSettings.showGutter}
            highlightActiveLine={editorSettings.highlightActiveLine}
            setOptions={{
              enableBasicAutocompletion: editorSettings.enableBasicAutocompletion,
              enableLiveAutocompletion: editorSettings.enableLiveAutocompletion,
              showLineNumbers: true,
              showPrintMargin: false,
              fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
              enableSnippets: true,
              showFoldWidgets: true
            }}
            editorProps={{ $blockScrolling: true }}
            style={{
              fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace"
            }}
          />
        </Box>

        {/* Terminal/Output Panel */}
        <AnimatePresence>
          {showTerminal && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '50%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  bgcolor: '#1e1e1e',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                {/* Terminal Header */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.87)', fontWeight: 600 }}>
                    OUTPUT
                  </Typography>
                  <Box>
                    <Tooltip title="Clear Output">
                      <IconButton size="small" onClick={clearOutput} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <RotateCcw size={16} />
                      </IconButton>
                    </Tooltip>
                    {executionResult?.output?.stdout && (
                      <Tooltip title="Copy Output">
                        <IconButton 
                          size="small" 
                          onClick={() => copyToClipboard(executionResult.output.stdout)}
                          sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                          <Copy size={16} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Terminal Content */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {isExecuting && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2" sx={{ color: '#4285f4' }}>
                        Executing {getCurrentLanguageConfig().name} code...
                      </Typography>
                    </Box>
                  )}

                  {executionResult ? (
                    <Box>
                      {/* Status */}
                      <Box sx={{ mb: 2 }}>
                        <Chip
                          label={executionResult.statusDescription || executionResult.status}
                          color={executionResult.success ? 'success' : 'error'}
                          size="small"
                        />
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', ml: 2 }}>
                          {executionResult.output?.executionTime}ms | {executionResult.output?.memoryUsed}
                        </Typography>
                      </Box>

                      {/* Output */}
                      {executionResult.output?.stdout && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 600 }}>
                            STDOUT:
                          </Typography>
                          <pre style={{ 
                            color: '#4caf50', 
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            margin: '8px 0',
                            fontSize: '0.875rem'
                          }}>
                            {executionResult.output.stdout}
                          </pre>
                        </Box>
                      )}

                      {/* Errors */}
                      {executionResult.output?.stderr && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 600 }}>
                            STDERR:
                          </Typography>
                          <pre style={{ 
                            color: '#f44336', 
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            margin: '8px 0',
                            fontSize: '0.875rem'
                          }}>
                            {executionResult.output.stderr}
                          </pre>
                        </Box>
                      )}

                      {/* Error details */}
                      {executionResult.output?.error && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ color: '#ff9800', fontWeight: 600 }}>
                            ERROR:
                          </Typography>
                          <pre style={{ 
                            color: '#ff9800', 
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            margin: '8px 0',
                            fontSize: '0.875rem'
                          }}>
                            {executionResult.output.error}
                          </pre>
                        </Box>
                      )}
                    </Box>
                  ) : !isExecuting && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: '100%',
                      color: 'rgba(255, 255, 255, 0.5)',
                      textAlign: 'center'
                    }}>
                      <Box>
                        <Terminal size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                        <Typography variant="body2">
                          Click "Run Code" to see output here
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Settings Dialog */}
      <Dialog 
        open={showSettings} 
        onClose={() => setShowSettings(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>IDE Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Theme</InputLabel>
              <Select
                value={editorSettings.theme}
                onChange={(e) => setEditorSettings(prev => ({ ...prev, theme: e.target.value }))}
                label="Theme"
              >
                {EDITOR_THEMES.map((theme) => (
                  <MenuItem key={theme} value={theme}>
                    {theme.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography gutterBottom>Font Size: {editorSettings.fontSize}px</Typography>
            <Slider
              value={editorSettings.fontSize}
              onChange={(e, value) => setEditorSettings(prev => ({ ...prev, fontSize: value }))}
              min={10}
              max={24}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            <Typography gutterBottom>Tab Size: {editorSettings.tabSize}</Typography>
            <Slider
              value={editorSettings.tabSize}
              onChange={(e, value) => setEditorSettings(prev => ({ ...prev, tabSize: value }))}
              min={2}
              max={8}
              step={1}
              marks
              sx={{ mb: 3 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.wordWrap}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, wordWrap: e.target.checked }))}
                />
              }
              label="Word Wrap"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.showGutter}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, showGutter: e.target.checked }))}
                />
              }
              label="Show Line Numbers"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.enableBasicAutocompletion}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, enableBasicAutocompletion: e.target.checked }))}
                />
              }
              label="Basic Autocompletion"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={editorSettings.enableLiveAutocompletion}
                  onChange={(e) => setEditorSettings(prev => ({ ...prev, enableLiveAutocompletion: e.target.checked }))}
                />
              }
              label="Live Autocompletion"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfessionalIDE;