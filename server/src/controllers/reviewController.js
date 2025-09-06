import mongoose from 'mongoose';
import Review from '../models/Review.model.js';
import Room from '../models/Room.model.js';
import User from '../models/User.model.js';
import { validationResult } from 'express-validator';

export const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { roomId, title, description, files, reviewers = [] } = req.body;

    // Verify room exists and user has access
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    ) || room.owner.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create review
    const review = new Review({
      roomId,
      title,
      description,
      author: req.user._id,
      files,
      reviewers: reviewers.map(reviewerId => ({
        user: reviewerId,
        status: 'pending'
      }))
    });

    await review.save();
    
    // Add review to room
    room.reviews.push(review._id);
    await room.save();

    // Populate review data
    await review.populate([
      { path: 'author', select: 'username avatar email' },
      { path: 'reviewers.user', select: 'username avatar email' }
    ]);

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Server error creating review' });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 10, status, author } = req.query;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Build filter
    const filter = { roomId };
    if (status) filter.status = status;
    if (author) filter.author = author;

    const skip = (page - 1) * limit;
    
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('author', 'username avatar email')
        .populate('reviewers.user', 'username avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter)
    ]);

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error fetching reviews' });
  }
};

export const getReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId)
      .populate('author', 'username avatar email')
      .populate('reviewers.user', 'username avatar email')
      .populate('comments.user', 'username avatar')
      .populate('comments.replies.user', 'username avatar');

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user has access to the room
    const room = await Room.findById(review.roomId);
    const hasAccess = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    ) || room.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Server error fetching review' });
  }
};

export const updateReviewStatus = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, comment } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user is a reviewer or author
    const reviewerIndex = review.reviewers.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
    
    const isAuthor = review.author.toString() === req.user._id.toString();
    
    if (reviewerIndex === -1 && !isAuthor) {
      return res.status(403).json({ error: 'Not authorized to update this review' });
    }

    if (reviewerIndex !== -1) {
      // Update reviewer status
      review.reviewers[reviewerIndex].status = status;
      review.reviewers[reviewerIndex].comment = comment;
      review.reviewers[reviewerIndex].reviewedAt = new Date();
    }

    // Update overall review status based on reviewer responses
    const approvedCount = review.reviewers.filter(r => r.status === 'approved').length;
    const rejectedCount = review.reviewers.filter(r => r.status === 'rejected').length;
    const needsChangesCount = review.reviewers.filter(r => r.status === 'needs-changes').length;
    
    if (rejectedCount > 0) {
      review.status = 'rejected';
    } else if (needsChangesCount > 0) {
      review.status = 'open';
    } else if (approvedCount === review.reviewers.length && review.reviewers.length > 0) {
      review.status = 'approved';
    }

    await review.save();
    
    await review.populate([
      { path: 'author', select: 'username avatar email' },
      { path: 'reviewers.user', select: 'username avatar email' }
    ]);

    res.json({
      message: 'Review status updated',
      review
    });
  } catch (error) {
    console.error('Update review status error:', error);
    res.status(500).json({ error: 'Server error updating review status' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { content, line, file } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user has access
    const room = await Room.findById(review.roomId);
    const hasAccess = room.participants.some(
      p => p.user.toString() === req.user._id.toString()
    ) || room.owner.toString() === req.user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = {
      user: req.user._id,
      content,
      line,
      file,
      timestamp: new Date()
    };

    review.comments.push(comment);
    await review.save();

    await review.populate('comments.user', 'username avatar');
    
    const newComment = review.comments[review.comments.length - 1];

    res.status(201).json({
      message: 'Comment added',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error adding comment' });
  }
};

export const replyToComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const { content } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const comment = review.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const reply = {
      user: req.user._id,
      content,
      timestamp: new Date()
    };

    comment.replies.push(reply);
    await review.save();

    await review.populate('comments.replies.user', 'username avatar');
    
    const updatedComment = review.comments.id(commentId);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];

    res.status(201).json({
      message: 'Reply added',
      reply: newReply
    });
  } catch (error) {
    console.error('Reply to comment error:', error);
    res.status(500).json({ error: 'Server error adding reply' });
  }
};

export const resolveComment = async (req, res) => {
  try {
    const { reviewId, commentId } = req.params;
    const { isResolved = true } = req.body;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const comment = review.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Only author or comment creator can resolve
    const canResolve = review.author.toString() === req.user._id.toString() ||
                      comment.user.toString() === req.user._id.toString();

    if (!canResolve) {
      return res.status(403).json({ error: 'Not authorized to resolve this comment' });
    }

    comment.isResolved = isResolved;
    await review.save();

    res.json({
      message: `Comment ${isResolved ? 'resolved' : 'reopened'}`,
      comment
    });
  } catch (error) {
    console.error('Resolve comment error:', error);
    res.status(500).json({ error: 'Server error resolving comment' });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only author can delete
    if (review.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    // Remove from room
    await Room.findByIdAndUpdate(
      review.roomId,
      { $pull: { reviews: reviewId } }
    );

    await Review.findByIdAndDelete(reviewId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Server error deleting review' });
  }
};

export const getReviewStats = async (req, res) => {
  try {
    const { roomId } = req.params;

    const stats = await Review.aggregate([
      { $match: { roomId: new mongoose.Types.ObjectId(roomId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = await Review.countDocuments({ roomId });
    
    const formattedStats = {
      total,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.json({ stats: formattedStats });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: 'Server error fetching review stats' });
  }
};