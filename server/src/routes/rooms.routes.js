import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  updateCode
} from '../controllers/roomController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.put('/:roomId/code', updateCode);

export default router;