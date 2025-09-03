import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import Review from '../models/Review.model.js';

const router = express.Router();

router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const { codeId, comments } = req.body;
    
    const review = new Review({
      code: codeId,
      reviewer: req.user._id,
      comments
    });

    await review.save();
    await review.populate('reviewer', 'username avatar');

    res.status(201).json({ review });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.get('/code/:codeId', async (req, res) => {
  try {
    const reviews = await Review.find({ code: req.params.codeId })
      .populate('reviewer', 'username avatar');
    
    res.json({ reviews });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

export default router;