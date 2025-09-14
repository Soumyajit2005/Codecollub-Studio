import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import codeExecutionService from '../services/codeExecution.service.js';

const router = express.Router();

router.use(authenticate);

// Execute code
router.post('/execute', async (req, res) => {
  try {
    const { roomId, code, language, input = '' } = req.body;
    
    if (!roomId || !code || !language) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, code, language' 
      });
    }
    
    console.log(`Code execution request from user ${req.user._id} for room ${roomId}, language: ${language}`);
    
    const result = await codeExecutionService.executeCode(
      roomId, 
      req.user._id, 
      language, 
      code, 
      input
    );
    
    res.json(result);
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ 
      error: error.message || 'Code execution failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get language template/boilerplate
router.get('/template/:language', async (req, res) => {
  try {
    const { language } = req.params;
    const template = codeExecutionService.getLanguageTemplate(language);
    
    res.json({ 
      language,
      template,
      message: 'Language template retrieved successfully'
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ 
      error: 'Failed to get language template',
      template: '// Welcome to CodeCollab Studio!\n// Start coding here...'
    });
  }
});

// Get supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await codeExecutionService.getSupportedLanguages();
    
    res.json({
      languages,
      count: languages.length,
      message: 'Supported languages retrieved successfully'
    });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ 
      error: 'Failed to get supported languages',
      languages: []
    });
  }
});

// Get execution history for a room
router.get('/executions/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const history = await codeExecutionService.getExecutionHistory(
      roomId, 
      parseInt(page), 
      parseInt(limit)
    );
    
    res.json(history);
  } catch (error) {
    console.error('Get execution history error:', error);
    res.status(500).json({ 
      error: 'Failed to get execution history',
      executions: [],
      pagination: { currentPage: 1, totalPages: 0, totalItems: 0 }
    });
  }
});

// Get execution by ID
router.get('/execution/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = await codeExecutionService.getExecutionById(executionId);
    
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    
    res.json(execution);
  } catch (error) {
    console.error('Get execution error:', error);
    res.status(500).json({ error: 'Failed to get execution details' });
  }
});

// Test API connectivity
router.get('/test-connectivity', async (req, res) => {
  try {
    const result = await codeExecutionService.testConnectivity();
    res.json(result);
  } catch (error) {
    console.error('Test connectivity error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Connectivity test failed',
      error: error.message
    });
  }
});

// Get service statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = codeExecutionService.getServiceStats();
    res.json({
      status: 'success',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      status: 'error',
      message: 'Failed to get service statistics'
    });
  }
});

export default router;