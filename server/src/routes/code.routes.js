import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { executeCode } from '../services/codeExecutor.js';

const router = express.Router();

router.use(authenticate);

router.post('/execute', async (req, res) => {
  try {
    const { code, language } = req.body;
    const result = await executeCode(code, language);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Code execution failed' });
  }
});

export default router;