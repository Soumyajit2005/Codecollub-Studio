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
  body('roomId').isMongoId().withMessage('Invalid room ID'),
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

    const templates = {
      'c': `#include <stdio.h>

int main() {
    printf("Hello World\\n");
    return 0;
}`,

      'cpp': `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`,

      'java': `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,

      'python': `print("Hello World")`,

      'javascript': `console.log("Hello World");`,

      'csharp': `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello World");
    }
}`,

      'go': `package main

import "fmt"

func main() {
    fmt.Println("Hello World")
}`,

      'rust': `fn main() {
    println!("Hello World");
}`,

      'php': `<?php
echo "Hello World\\n";
?>`,

      'ruby': `puts "Hello World"`
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