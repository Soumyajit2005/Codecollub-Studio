import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createRoom,
  getRooms,
  getRoom,
  joinRoom,
  joinRoomByCode,
  getPublicRooms,
  updateCode,
  leaveRoom,
  deleteRoom
} from '../controllers/roomController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/public', getPublicRooms);
router.get('/:roomId', getRoom);
router.post('/:roomId/join', joinRoom);
router.post('/:roomId/leave', leaveRoom);
router.delete('/:roomId', deleteRoom);
router.post('/join-by-code', joinRoomByCode);
router.put('/:roomId/code', updateCode);

export default router;